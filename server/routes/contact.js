import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { isValidChilePhone, normalizeChilePhone, normalizeEmail, sha256, clientIp } from '../security.js';

const DELIVERY_OUTCOMES = new Set([
  'SMTP_ACCEPTED',
  'SMTP_NOT_CONFIGURED',
  'SMTP_RECIPIENT_REJECTED',
  'SMTP_RECIPIENT_PENDING',
  'SMTP_RECIPIENT_NOT_ACCEPTED',
  'SMTP_AUTH_FAILED',
  'SMTP_CONNECTION_FAILED',
  'SMTP_DELIVERY_FAILED',
  'DELIVERY_STATUS_WRITE_FAILED',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

const requestSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  empresa: z.string().trim().max(160).optional().default(''),
  correo: z.string().trim().email().max(254),
  telefono: z.string().trim().max(32).optional().default(''),
  industria: z.string().trim().max(100).optional().default(''),
  dotacion: z.string().trim().max(80).optional().default(''),
  necesidad: z.string().trim().max(2_000).optional().default(''),
}).strict();

const escapeHtml = value => String(value || '').replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[char]);

function contactLimiter() {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'CONTACT_RATE_LIMITED', message: 'Espera unos minutos antes de enviar otra solicitud.' },
  });
}

function normalizedMailbox(value) {
  const raw = String(value || '').trim();
  return raw ? normalizeEmail(raw) : '';
}

function responseCode(value) {
  const code = Number(value);
  return Number.isInteger(code) && code >= 100 && code <= 599 ? code : null;
}

function messageIdHash(value) {
  const messageId = String(value || '').trim();
  return messageId && messageId.length <= 1_024 ? sha256(messageId) : null;
}

function outcome(value) {
  return DELIVERY_OUTCOMES.has(value) ? value : 'SMTP_DELIVERY_FAILED';
}

function deliveryResult(value = {}) {
  const accepted = value?.delivered === true && value?.outcome === 'SMTP_ACCEPTED';
  return {
    delivered: accepted,
    outcome: accepted ? 'SMTP_ACCEPTED' : outcome(value?.outcome),
    smtpResponseCode: responseCode(value?.smtpResponseCode),
    smtpMessageIdHash: SHA256_PATTERN.test(String(value?.smtpMessageIdHash || '')) ? value.smtpMessageIdHash : null,
  };
}

function addresses(values) {
  return new Set((Array.isArray(values) ? values : []).map(normalizedMailbox).filter(Boolean));
}

export function evaluateSmtpDelivery(result, salesContactEmail) {
  const recipient = normalizedMailbox(salesContactEmail);
  if (!recipient) return { delivered: false, outcome: 'SMTP_NOT_CONFIGURED', smtpResponseCode: null, smtpMessageIdHash: null };

  const accepted = addresses(result?.accepted);
  const rejected = addresses(result?.rejected);
  const pending = addresses(result?.pending);
  const diagnostics = {
    smtpResponseCode: responseCode(result?.responseCode),
    smtpMessageIdHash: messageIdHash(result?.messageId),
  };

  if (accepted.has(recipient)) return { delivered: true, outcome: 'SMTP_ACCEPTED', ...diagnostics };
  if (rejected.has(recipient)) return { delivered: false, outcome: 'SMTP_RECIPIENT_REJECTED', ...diagnostics };
  if (pending.has(recipient)) return { delivered: false, outcome: 'SMTP_RECIPIENT_PENDING', ...diagnostics };
  return { delivered: false, outcome: 'SMTP_RECIPIENT_NOT_ACCEPTED', ...diagnostics };
}

export function evaluateSmtpFailure(error = {}) {
  const code = String(error?.code || '').toUpperCase();
  const failure = code === 'EAUTH' || responseCode(error?.responseCode) === 535
    ? 'SMTP_AUTH_FAILED'
    : ['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'ESOCKET', 'ETIMEDOUT'].includes(code)
      ? 'SMTP_CONNECTION_FAILED'
      : 'SMTP_DELIVERY_FAILED';
  return {
    delivered: false,
    outcome: failure,
    smtpResponseCode: responseCode(error?.responseCode),
    smtpMessageIdHash: null,
  };
}

function smtpTransport(smtpConfig = config.smtp, salesContactEmail = config.salesContactEmail, createTransport = nodemailer.createTransport) {
  const port = Number(smtpConfig?.port);
  if (!String(smtpConfig?.host || '').trim() || !String(smtpConfig?.from || '').trim()
    || !normalizedMailbox(salesContactEmail) || !Number.isInteger(port) || port < 1 || port > 65_535) return null;
  return createTransport({
    host: smtpConfig.host,
    port,
    secure: smtpConfig.secure === true,
    auth: smtpConfig.user ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

export function normalizeDemoRequest(payload) {
  const parsed = requestSchema.parse(payload);
  if (parsed.telefono && !isValidChilePhone(parsed.telefono)) {
    throw Object.assign(new Error('El teléfono ingresado no tiene un formato chileno válido.'), { status: 400, code: 'INVALID_CONTACT_PHONE' });
  }

  return {
    fullName: parsed.nombre,
    companyName: parsed.empresa,
    email: normalizeEmail(parsed.correo),
    phone: parsed.telefono ? normalizeChilePhone(parsed.telefono) : '',
    industry: parsed.industria,
    workforceSize: parsed.dotacion,
    need: parsed.necesidad,
  };
}

function emailBody(request) {
  const lines = [
    'Nombre: ' + request.fullName,
    'Empresa: ' + (request.companyName || 'No indicada'),
    'Correo: ' + request.email,
    'Teléfono: ' + (request.phone || 'No indicado'),
    'Industria: ' + (request.industry || 'No indicada'),
    'Personas a gestionar: ' + (request.workforceSize || 'No indicado'),
    'Necesidad: ' + (request.need || 'No indicada'),
  ];
  const html = lines.map(line => '<p>' + escapeHtml(line) + '</p>').join('');
  return { text: lines.join('\n'), html };
}

export async function deliverToSales(request, {
  smtpConfig = config.smtp,
  salesContactEmail = config.salesContactEmail,
  createTransport = nodemailer.createTransport,
} = {}) {
  const transport = smtpTransport(smtpConfig, salesContactEmail, createTransport);
  if (!transport) return { delivered: false, outcome: 'SMTP_NOT_CONFIGURED', smtpResponseCode: null, smtpMessageIdHash: null };

  const body = emailBody(request);
  try {
    const result = await transport.sendMail({
      from: smtpConfig.from,
      to: salesContactEmail,
      replyTo: request.email,
      subject: ('Nueva solicitud de demostración · ' + (request.companyName || request.fullName)).slice(0, 200),
      text: body.text,
      html: body.html,
    });
    return evaluateSmtpDelivery(result, salesContactEmail);
  } catch (error) {
    return evaluateSmtpFailure(error);
  }
}

function safeOpaqueId(value) {
  const candidate = String(value || '').trim();
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

export function logContactDelivery({ requestId = '', demoRequestId = '', delivery = {} }, logger = console.error) {
  const safe = deliveryResult(delivery);
  logger(JSON.stringify({
    at: new Date().toISOString(),
    service: config.serviceName,
    event: 'contact.smtp_delivery',
    outcome: safe.delivered ? 'accepted_by_smtp' : 'failed',
    code: safe.outcome,
    requestId: safeOpaqueId(requestId),
    demoRequestId: safeOpaqueId(demoRequestId),
    smtpResponseCode: safe.smtpResponseCode,
    smtpMessageIdHash: safe.smtpMessageIdHash,
  }));
}

async function recordDelivery(queryFn, demoRequestId, delivery) {
  const safe = deliveryResult(delivery);
  await queryFn(
    "UPDATE public_demo_requests SET delivery_status=$2,delivery_outcome=$3,delivery_smtp_response_code=$4,delivery_message_id_hash=$5,delivery_attempted_at=now(),delivered_at=CASE WHEN $2='sent' THEN now() ELSE NULL END,delivery_error=$6 WHERE id=$1",
    [demoRequestId, safe.delivered ? 'sent' : 'failed', safe.outcome, safe.smtpResponseCode, safe.smtpMessageIdHash, safe.delivered ? '' : safe.outcome],
  );
  return safe;
}

export function createContactRouter({ deliver = deliverToSales, queryFn = query, logger = console.error } = {}) {
  const router = Router();
  router.post('/contact', contactLimiter(), async (req, res, next) => {
    let stored;
    try {
      const request = normalizeDemoRequest(req.body);
      stored = (await queryFn(
        'INSERT INTO public_demo_requests(full_name,company_name,email,phone,industry,workforce_size,need,request_ip_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [request.fullName, request.companyName, request.email, request.phone, request.industry, request.workforceSize, request.need, sha256(clientIp(req))],
      )).rows[0];

      let delivery;
      try {
        delivery = deliveryResult(await deliver(request));
      } catch (error) {
        delivery = evaluateSmtpFailure(error);
      }

      try {
        delivery = await recordDelivery(queryFn, stored.id, delivery);
      } catch {
        logContactDelivery({
          requestId: req.requestId,
          demoRequestId: stored.id,
          delivery: { delivered: false, outcome: 'DELIVERY_STATUS_WRITE_FAILED' },
        }, logger);
        return res.status(503).json({ error: 'CONTACT_DELIVERY_UNAVAILABLE', requestId: stored.id, message: 'No pudimos registrar la entrega al equipo comercial en este momento.' });
      }

      logContactDelivery({ requestId: req.requestId, demoRequestId: stored.id, delivery }, logger);
      if (!delivery.delivered) {
        return res.status(503).json({ error: 'CONTACT_DELIVERY_UNAVAILABLE', requestId: stored.id, message: 'No pudimos enviar la solicitud al equipo comercial en este momento.' });
      }
      return res.status(201).json({ requestId: stored.id, message: 'Recibimos tu solicitud. El equipo de Nexo Klar te contactará pronto.' });
    } catch (error) {
      return next(error);
    }
  });
  return router;
}

export const contactRouter = createContactRouter();
