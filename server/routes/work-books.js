import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { withTenant } from '../db.js';
import { allowRoles } from '../middleware.js';
import { appendAudit } from '../audit.js';
import { sanitizeJson } from '../validation.js';
import { canTransitionWorkBookEntry, workBookFolio } from '../work-book.js';
import { tenantIntegration } from './settings.js';

export const workBooksRouter = Router();
const editors = allowRoles('domian_admin', 'client_admin', 'rrhh', 'prevencion', 'acreditacion');
const text = (min, max) => z.string().trim().min(min).max(max);
const entryStates = ['borrador', 'pendiente_firma', 'observado', 'firmado', 'cerrado'];
const evidenceSchema = z.array(z.object({
  objectId: z.string().uuid().optional(),
  name: text(1, 260),
  size: z.number().nonnegative().max(10 * 1024 * 1024).optional(),
  type: z.string().max(160).optional(),
  uploadedAt: z.string().datetime().optional()
})).max(20).default([]);

const entrySchema = z.object({
  mineRef: text(1, 160),
  contractRef: z.string().trim().max(160).default(''),
  projectRef: text(1, 160),
  bookType: z.enum(['maestro', 'seguridad_hsec', 'calidad', 'terreno_avance', 'comunicaciones']).default('maestro'),
  bookTitle: text(3, 240),
  entryType: z.enum(['instruccion', 'consulta', 'respuesta', 'avance', 'incidente', 'acuerdo', 'observacion', 'recepcion', 'otro']),
  occurredAt: z.string().datetime(),
  subject: text(3, 240),
  body: text(3, 12000),
  responsible: z.string().trim().max(200).default(''),
  dueAt: z.string().date().nullable().optional(),
  status: z.enum(entryStates).default('borrador'),
  evidenceFiles: evidenceSchema
});

const updateSchema = z.object({
  status: z.enum(entryStates),
  subject: z.string().trim().min(3).max(240).optional(),
  body: z.string().trim().min(3).max(12000).optional(),
  responsible: z.string().trim().max(200).optional(),
  dueAt: z.string().date().nullable().optional(),
  reason: text(3, 2000),
  evidenceFiles: evidenceSchema.optional()
});

const signatureRequestSchema = z.object({
  signerName: text(2, 200),
  signerEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  signerPhone: z.string().trim().max(30).optional().or(z.literal('')),
  channel: z.enum(['email', 'whatsapp', 'ambos']),
  message: z.string().trim().max(2000).optional().default('')
}).superRefine((value, ctx) => {
  if (['email', 'ambos'].includes(value.channel) && !value.signerEmail) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['signerEmail'], message: 'El correo es obligatorio para este canal' });
  }
  const phone = String(value.signerPhone || '').replace(/\D/g, '');
  if (['whatsapp', 'ambos'].includes(value.channel) && phone.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['signerPhone'], message: 'El teléfono es obligatorio para este canal' });
  }
});

function resolvedIntegration(tenant, fallback) {
  return tenant ? (tenant.enabled ? { ...tenant.publicConfig, ...tenant.secret } : {}) : fallback;
}

function safeSigningUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

async function sendSignatureEmail(settings, { to, signerName, subject, signingUrl, message }) {
  if (!settings.host) return { status: 'no_configurado' };
  const transport = nodemailer.createTransport({
    host: settings.host,
    port: Number(settings.port || 587),
    secure: settings.secure === true,
    auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000
  });
  const textBody = `${message || `Hola ${signerName}, tienes una anotación del Libro de Obra pendiente de firma.`}${signingUrl ? `\n\nFirmar de forma segura: ${signingUrl}` : ''}`;
  const info = await transport.sendMail({ from: settings.from || config.smtp.from, to, subject: `Firma requerida: ${subject}`.slice(0, 200), text: textBody });
  return { status: 'enviado', reference: info.messageId };
}

async function sendSignatureWhatsapp(settings, { to, signerName, subject, signingUrl, message }) {
  if (!settings.phoneNumberId || !settings.token) return { status: 'no_configurado' };
  const phone = String(to || '').replace(/\D/g, '');
  const body = `${message || `Hola ${signerName}, tienes una anotación del Libro de Obra pendiente de firma: ${subject}.`}${signingUrl ? `\n${signingUrl}` : ''}`.slice(0, 4096);
  const response = await fetch(`https://graph.facebook.com/${settings.version || config.whatsapp.version}/${settings.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${settings.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
    signal: AbortSignal.timeout(15_000)
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error('WhatsApp no pudo entregar la solicitud'), { status: 502, code: 'WHATSAPP_SIGNATURE_DELIVERY_FAILED' });
  return { status: 'enviado', reference: result.messages?.[0]?.id || '' };
}


async function tenantRefs(client, tenantId) {
  const rows = await client.query(
    `SELECT module_key,data FROM tenant_module_state
     WHERE tenant_id=$1 AND module_key=ANY($2::text[])`,
    [tenantId, ['minas', 'contratos', 'mantenciones']]
  );
  return Object.fromEntries(rows.rows.map(row => [row.module_key, Array.isArray(row.data) ? row.data : []]));
}

function validateReferences(refs, body) {
  const mine = refs.minas?.find(row => String(row.id) === body.mineRef);
  const contract = body.contractRef ? refs.contratos?.find(row => String(row.id) === body.contractRef) : null;
  const project = refs.mantenciones?.find(row => String(row.id) === body.projectRef);
  if (!mine || !project || (body.contractRef && !contract)) {
    throw Object.assign(new Error('Cliente, contrato o proyecto no existe en esta empresa'), { status: 409, code: 'INVALID_WORK_BOOK_REFERENCE' });
  }
  if (String(project.minaId || '') !== body.mineRef || (contract && String(contract.minaId || '') !== body.mineRef)) {
    throw Object.assign(new Error('El contrato o proyecto no pertenece al cliente seleccionado'), { status: 409, code: 'WORK_BOOK_SCOPE_MISMATCH' });
  }
}

const selectEntries = `
  SELECT e.*,b.folio,b.mine_ref,b.contract_ref,b.project_ref,b.book_type,b.title AS book_title,
         u.full_name AS created_by_name
  FROM work_book_entries e
  JOIN work_books b ON b.id=e.book_id AND b.tenant_id=e.tenant_id
  LEFT JOIN app_users u ON u.id=e.created_by
`;

workBooksRouter.get('/entries', async (req, res) => {
  const values = [req.auth.tenantId], clauses = ['e.tenant_id=$1'];
  const add = (sql, value) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };
  if (req.query.mineRef) add('b.mine_ref=?', String(req.query.mineRef));
  if (req.query.contractRef) add('b.contract_ref=?', String(req.query.contractRef));
  if (req.query.projectRef) add('b.project_ref=?', String(req.query.projectRef));
  if (req.query.status) add('e.status=?', String(req.query.status));
  if (req.query.type) add('e.entry_type=?', String(req.query.type));
  if (req.query.year) add('EXTRACT(YEAR FROM e.occurred_at)=?', Number(req.query.year));
  if (req.query.month) add('EXTRACT(MONTH FROM e.occurred_at)=?', Number(req.query.month));
  if (req.query.q) {
    values.push(`%${String(req.query.q).slice(0, 120)}%`);
    clauses.push(`(e.subject ILIKE $${values.length} OR e.body ILIKE $${values.length} OR b.folio ILIKE $${values.length})`);
  }
  const rows = await withTenant(req.auth.tenantId, client =>
    client.query(`${selectEntries} WHERE ${clauses.join(' AND ')} ORDER BY e.occurred_at DESC,e.entry_number DESC LIMIT 1000`, values)
  );
  res.json(rows.rows);
});

workBooksRouter.get('/entries/:id', async (req, res) => {
  const result = await withTenant(req.auth.tenantId, async client => {
    const entry = (await client.query(`${selectEntries} WHERE e.tenant_id=$1 AND e.id=$2`, [req.auth.tenantId, req.params.id])).rows[0];
    if (!entry) return null;
    const history = (await client.query(
      `SELECT h.*,u.full_name AS changed_by_name FROM work_book_entry_history h
       LEFT JOIN app_users u ON u.id=h.changed_by
       WHERE h.tenant_id=$1 AND h.entry_id=$2 ORDER BY h.changed_at DESC`,
      [req.auth.tenantId, req.params.id]
    )).rows;
    const signatureRequests = (await client.query(
      `SELECT id,signer_name,signer_email,signer_phone,channel,status,provider,provider_envelope_id,
              signing_url,delivery_status,requested_at,updated_at
       FROM work_book_signature_requests
       WHERE tenant_id=$1 AND entry_id=$2 ORDER BY requested_at DESC`,
      [req.auth.tenantId, req.params.id]
    )).rows;
    return { ...entry, history, signature_requests: signatureRequests };
  });
  if (!result) return res.status(404).json({ error: 'WORK_BOOK_ENTRY_NOT_FOUND' });
  res.json(result);
});

workBooksRouter.post('/entries/:id/signature-requests', editors, async (req, res) => {
  const body = signatureRequestSchema.parse(req.body);
  const signatureTenant = await tenantIntegration(req.auth.tenantId, 'signature');
  const signature = resolvedIntegration(signatureTenant, config.integrations.signature);
  const initialStatus = signature.url ? 'enviando' : 'pendiente_configuracion';
  const context = await withTenant(req.auth.tenantId, async client => {
    const entry = (await client.query(`${selectEntries} WHERE e.tenant_id=$1 AND e.id=$2`, [req.auth.tenantId, req.params.id])).rows[0];
    if (!entry) return null;
    if (['firmado', 'cerrado'].includes(entry.status)) {
      throw Object.assign(new Error('La anotación ya está firmada o cerrada'), { status: 409, code: 'WORK_BOOK_ENTRY_ALREADY_LOCKED' });
    }
    const active = (await client.query(
      `SELECT id FROM work_book_signature_requests
       WHERE tenant_id=$1 AND entry_id=$2 AND status IN ('enviando','enviada','entregada','vista') LIMIT 1`,
      [req.auth.tenantId, req.params.id]
    )).rows[0];
    if (active) {
      throw Object.assign(new Error('Esta anotación ya tiene una solicitud de firma activa'), { status: 409, code: 'ACTIVE_WORK_BOOK_SIGNATURE_EXISTS' });
    }
    const request = (await client.query(
      `INSERT INTO work_book_signature_requests
       (tenant_id,entry_id,signer_name,signer_email,signer_phone,channel,status,requested_by)
       VALUES($1,$2,$3,NULLIF($4,''),NULLIF($5,''),$6,$7,$8)
       RETURNING *`,
      [req.auth.tenantId, req.params.id, body.signerName, body.signerEmail, body.signerPhone, body.channel, initialStatus, req.auth.userId]
    )).rows[0];
    return { entry, request };
  });
  if (!context) return res.status(404).json({ error: 'WORK_BOOK_ENTRY_NOT_FOUND' });

  if (!signature.url) {
    await withTenant(req.auth.tenantId, async client => {
      await client.query(
        `INSERT INTO work_book_entry_history(tenant_id,entry_id,action,reason,new_value,changed_by)
         VALUES($1,$2,'firma_pendiente_configuracion','Proveedor de firma no configurado',$3::jsonb,$4)`,
        [req.auth.tenantId, req.params.id, JSON.stringify({ requestId: context.request.id, signer: body.signerName, channel: body.channel }), req.auth.userId]
      );
      await appendAudit(client, { tenantId: req.auth.tenantId, userId: req.auth.userId, entityType: 'work_book_entry', entityId: req.params.id, action: 'work_book.signature.pending_configuration', newValue: { requestId: context.request.id, channel: body.channel } });
    });
    return res.status(202).json({ ...context.request, status: 'pendiente_configuracion', message: 'Configure el proveedor de firma electrónica para efectuar el envío.' });
  }

  let providerResult;
  try {
    const providerResponse = await fetch(signature.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(signature.token ? { authorization: `Bearer ${signature.token}` } : {}) },
      body: JSON.stringify({
        tenantId: req.auth.tenantId,
        requestedBy: req.auth.userId,
        entityType: 'work_book_entry',
        entityId: context.entry.id,
        folio: context.entry.folio,
        entryNumber: context.entry.entry_number,
        document: {
          title: context.entry.subject,
          content: context.entry.body,
          evidenceFiles: context.entry.evidence_files || []
        },
        signer: { name: body.signerName, email: body.signerEmail || null, phone: body.signerPhone || null },
        delivery: { channel: body.channel },
        metadata: {
          clientRef: context.entry.mine_ref,
          contractRef: context.entry.contract_ref,
          serviceRef: context.entry.project_ref
        }
      }),
      signal: AbortSignal.timeout(30_000)
    });
    const responseText = await providerResponse.text();
    let responseBody = {};
    try { responseBody = responseText ? JSON.parse(responseText) : {}; } catch { responseBody = { message: responseText.slice(0, 1000) }; }
    if (!providerResponse.ok) throw Object.assign(new Error('El proveedor de firma rechazó la solicitud'), { status: 502, code: 'SIGNATURE_PROVIDER_FAILED', providerBody: responseBody });
    providerResult = {
      envelopeId: String(responseBody.envelopeId || responseBody.envelope_id || responseBody.id || '').slice(0, 300),
      signingUrl: safeSigningUrl(responseBody.signingUrl || responseBody.signing_url || responseBody.url || ''),
      provider: String(responseBody.provider || signature.provider || 'firma_api').slice(0, 120)
    };
  } catch (error) {
    await withTenant(req.auth.tenantId, client => client.query(
      `UPDATE work_book_signature_requests SET status='error',delivery_status=$3::jsonb,updated_at=now()
       WHERE tenant_id=$1 AND id=$2`,
      [req.auth.tenantId, context.request.id, JSON.stringify({ signature: 'error', message: error.message })]
    ));
    throw error;
  }

  const delivery = { signature: 'enviada' };
  const smtp = resolvedIntegration(await tenantIntegration(req.auth.tenantId, 'smtp'), config.smtp);
  const whatsapp = resolvedIntegration(await tenantIntegration(req.auth.tenantId, 'whatsapp'), config.whatsapp);
  if (['email', 'ambos'].includes(body.channel)) {
    try { delivery.email = await sendSignatureEmail(smtp, { to: body.signerEmail, signerName: body.signerName, subject: context.entry.subject, signingUrl: providerResult.signingUrl, message: body.message }); }
    catch (error) { delivery.email = { status: 'error', message: error.message }; }
  }
  if (['whatsapp', 'ambos'].includes(body.channel)) {
    try { delivery.whatsapp = await sendSignatureWhatsapp(whatsapp, { to: body.signerPhone, signerName: body.signerName, subject: context.entry.subject, signingUrl: providerResult.signingUrl, message: body.message }); }
    catch (error) { delivery.whatsapp = { status: 'error', message: error.message }; }
  }

  const saved = await withTenant(req.auth.tenantId, async client => {
    const updated = (await client.query(
      `UPDATE work_book_signature_requests
       SET status='enviada',provider=$3,provider_envelope_id=NULLIF($4,''),signing_url=NULLIF($5,''),
           delivery_status=$6::jsonb,updated_at=now()
       WHERE tenant_id=$1 AND id=$2 RETURNING *`,
      [req.auth.tenantId, context.request.id, providerResult.provider, providerResult.envelopeId, providerResult.signingUrl, JSON.stringify(delivery)]
    )).rows[0];
    await client.query(
      `UPDATE work_book_entries SET status='pendiente_firma',signature_state='pendiente',updated_at=now()
       WHERE tenant_id=$1 AND id=$2`,
      [req.auth.tenantId, req.params.id]
    );
    await client.query(
      `INSERT INTO work_book_entry_history(tenant_id,entry_id,action,reason,new_value,changed_by)
       VALUES($1,$2,'firma_solicitada','Solicitud enviada mediante API',$3::jsonb,$4)`,
      [req.auth.tenantId, req.params.id, JSON.stringify({ requestId: updated.id, signer: body.signerName, channel: body.channel, provider: providerResult.provider, envelopeId: providerResult.envelopeId, delivery }), req.auth.userId]
    );
    await appendAudit(client, { tenantId: req.auth.tenantId, userId: req.auth.userId, entityType: 'work_book_entry', entityId: req.params.id, action: 'work_book.signature.requested', newValue: { requestId: updated.id, channel: body.channel, provider: providerResult.provider, envelopeId: providerResult.envelopeId } });
    return updated;
  });
  res.status(202).json(saved);
});

workBooksRouter.post('/entries', editors, async (req, res) => {
  const body = entrySchema.parse(req.body);
  const row = await withTenant(req.auth.tenantId, async client => {
    validateReferences(await tenantRefs(client, req.auth.tenantId), body);
    const year = new Date(body.occurredAt).getUTCFullYear();
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`work-book:${req.auth.tenantId}:${year}`]);
    let book = (await client.query(
      `SELECT * FROM work_books WHERE tenant_id=$1 AND mine_ref=$2 AND COALESCE(contract_ref,'')=$3
       AND project_ref=$4 AND book_type=$5 AND status<>'cerrado' ORDER BY opened_at DESC LIMIT 1`,
      [req.auth.tenantId, body.mineRef, body.contractRef, body.projectRef, body.bookType]
    )).rows[0];
    if (!book) {
      const sequence = Number((await client.query(
        'SELECT count(*)+1 AS sequence FROM work_books WHERE tenant_id=$1 AND EXTRACT(YEAR FROM opened_at)=$2',
        [req.auth.tenantId, year]
      )).rows[0].sequence);
      book = (await client.query(
        `INSERT INTO work_books(tenant_id,folio,mine_ref,contract_ref,project_ref,book_type,title,opened_at,created_by)
         VALUES($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9) RETURNING *`,
        [req.auth.tenantId, workBookFolio(year, sequence), body.mineRef, body.contractRef, body.projectRef, body.bookType, body.bookTitle, body.occurredAt.slice(0, 10), req.auth.userId]
      )).rows[0];
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`work-book-entry:${book.id}`]);
    const entryNumber = Number((await client.query(
      'SELECT COALESCE(max(entry_number),0)+1 AS sequence FROM work_book_entries WHERE tenant_id=$1 AND book_id=$2',
      [req.auth.tenantId, book.id]
    )).rows[0].sequence);
    const signatureState = body.status === 'pendiente_firma' ? 'pendiente' : body.status === 'firmado' ? 'firmado' : 'sin_firma';
    const entry = (await client.query(
      `INSERT INTO work_book_entries(tenant_id,book_id,entry_number,entry_type,occurred_at,subject,body,responsible,due_at,status,signature_state,evidence_files,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13) RETURNING *`,
      [req.auth.tenantId, book.id, entryNumber, body.entryType, body.occurredAt, body.subject, body.body, body.responsible, body.dueAt || null, body.status, signatureState, JSON.stringify(sanitizeJson(body.evidenceFiles)), req.auth.userId]
    )).rows[0];
    await client.query(
      `INSERT INTO work_book_entry_history(tenant_id,entry_id,action,reason,new_value,changed_by)
       VALUES($1,$2,'creada','Creación de anotación',$3::jsonb,$4)`,
      [req.auth.tenantId, entry.id, JSON.stringify(sanitizeJson(entry)), req.auth.userId]
    );
    await appendAudit(client, { tenantId: req.auth.tenantId, userId: req.auth.userId, entityType: 'work_book_entry', entityId: entry.id, action: 'work_book.entry.created', newValue: { folio: book.folio, entryNumber, status: body.status, projectRef: body.projectRef } });
    return { ...entry, folio: book.folio, mine_ref: book.mine_ref, contract_ref: book.contract_ref, project_ref: book.project_ref, book_type: book.book_type, book_title: book.title };
  });
  res.status(201).json(row);
});

workBooksRouter.patch('/entries/:id', editors, async (req, res) => {
  const body = updateSchema.parse(req.body);
  const result = await withTenant(req.auth.tenantId, async client => {
    const before = (await client.query('SELECT * FROM work_book_entries WHERE tenant_id=$1 AND id=$2 FOR UPDATE', [req.auth.tenantId, req.params.id])).rows[0];
    if (!before) return null;
    if (!canTransitionWorkBookEntry(before.status, body.status)) {
      throw Object.assign(new Error(`No se puede cambiar el estado de ${before.status} a ${body.status}`), { status: 409, code: 'INVALID_WORK_BOOK_TRANSITION' });
    }
    const contentChanged = ['subject', 'body', 'responsible', 'dueAt', 'evidenceFiles'].some(key => body[key] !== undefined);
    if (contentChanged && ['firmado', 'cerrado'].includes(before.status)) {
      throw Object.assign(new Error('Una anotación firmada o cerrada no puede editarse; agregue una anotación rectificatoria'), { status: 409, code: 'WORK_BOOK_ENTRY_IMMUTABLE' });
    }
    const signatureState = body.status === 'pendiente_firma' ? 'pendiente' : body.status === 'firmado' ? 'firmado' : before.signature_state;
    const updated = (await client.query(
      `UPDATE work_book_entries SET status=$3,subject=COALESCE($4,subject),body=COALESCE($5,body),
       responsible=COALESCE($6,responsible),due_at=CASE WHEN $7::boolean THEN $8::date ELSE due_at END,
       evidence_files=COALESCE($9::jsonb,evidence_files),signature_state=$10,updated_at=now()
       WHERE tenant_id=$1 AND id=$2 RETURNING *`,
      [req.auth.tenantId, req.params.id, body.status, body.subject ?? null, body.body ?? null, body.responsible ?? null,
        Object.hasOwn(body, 'dueAt'), body.dueAt || null, body.evidenceFiles === undefined ? null : JSON.stringify(sanitizeJson(body.evidenceFiles)), signatureState]
    )).rows[0];
    await client.query(
      `INSERT INTO work_book_entry_history(tenant_id,entry_id,action,reason,old_value,new_value,changed_by)
       VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)`,
      [req.auth.tenantId, req.params.id, before.status === body.status ? 'actualizada' : 'estado_cambiado', body.reason, JSON.stringify(sanitizeJson(before)), JSON.stringify(sanitizeJson(updated)), req.auth.userId]
    );
    await appendAudit(client, { tenantId: req.auth.tenantId, userId: req.auth.userId, entityType: 'work_book_entry', entityId: req.params.id, action: 'work_book.entry.updated', oldValue: { status: before.status }, newValue: { status: updated.status, reason: body.reason } });
    return updated;
  });
  if (!result) return res.status(404).json({ error: 'WORK_BOOK_ENTRY_NOT_FOUND' });
  res.json(result);
});
