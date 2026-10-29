import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { isValidChilePhone, normalizeChilePhone, normalizeEmail, sha256, clientIp } from '../security.js';

export const contactRouter = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'CONTACT_RATE_LIMITED', message: 'Espera unos minutos antes de enviar otra solicitud.' },
});

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

function smtpTransport() {
  if (!config.smtp.host) return null;
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: Number(config.smtp.port || 587),
    secure: config.smtp.secure === true,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

function emailBody(request) {
  const lines = [
    `Nombre: ${request.fullName}`,
    `Empresa: ${request.companyName || 'No indicada'}`,
    `Correo: ${request.email}`,
    `Teléfono: ${request.phone || 'No indicado'}`,
    `Industria: ${request.industry || 'No indicada'}`,
    `Personas a gestionar: ${request.workforceSize || 'No indicado'}`,
    `Necesidad: ${request.need || 'No indicada'}`,
  ];
  const html = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');
  return { text: lines.join('\n'), html };
}

async function deliverToSales(request) {
  const transport = smtpTransport();
  if (!transport) throw Object.assign(new Error('El correo comercial no está configurado.'), { code: 'CONTACT_DELIVERY_UNAVAILABLE' });
  const body = emailBody(request);
  await transport.sendMail({
    from: config.smtp.from,
    to: config.salesContactEmail,
    replyTo: request.email,
    subject: `Nueva solicitud de demostración · ${request.companyName || request.fullName}`.slice(0, 200),
    text: body.text,
    html: body.html,
  });
}

contactRouter.post('/contact', contactLimiter, async (req, res, next) => {
  let stored;
  try {
    const request = normalizeDemoRequest(req.body);
    stored = (await query(
      `INSERT INTO public_demo_requests(full_name,company_name,email,phone,industry,workforce_size,need,request_ip_hash)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [request.fullName, request.companyName, request.email, request.phone, request.industry, request.workforceSize, request.need, sha256(clientIp(req))],
    )).rows[0];

    try {
      await deliverToSales(request);
      await query(`UPDATE public_demo_requests SET delivery_status='sent',delivered_at=now() WHERE id=$1`, [stored.id]);
      return res.status(201).json({ requestId: stored.id, message: 'Recibimos tu solicitud. El equipo de Nexo Klar te contactará pronto.' });
    } catch (error) {
      await query(`UPDATE public_demo_requests SET delivery_status='failed',delivery_error=$2 WHERE id=$1`, [stored.id, String(error.code || 'DELIVERY_FAILED').slice(0, 120)]);
      return res.status(503).json({ error: 'CONTACT_DELIVERY_UNAVAILABLE', requestId: stored.id, message: 'No pudimos enviar la solicitud al equipo comercial en este momento.' });
    }
  } catch (error) {
    return next(error);
  }
});
