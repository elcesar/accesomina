import nodemailer from 'nodemailer';
import { config } from './config.js';
import { withTenant } from './db.js';
import { appendAudit } from './audit.js';
import { randomToken, sha256 } from './security.js';

const resetUrl = (tenantId, token) => `${config.origin}/restablecer-contrasena?tenant=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(token)}`;

export async function createPasswordReset({ tenantId, user, requestedBy = null, ip = '', reason = 'self_service' }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 30 * 60_000);

  await withTenant(tenantId, async client => {
    await client.query(
      'UPDATE password_reset_tokens SET used_at=now() WHERE tenant_id=$1 AND user_id=$2 AND used_at IS NULL',
      [tenantId, user.id],
    );
    await client.query(
      'INSERT INTO password_reset_tokens(tenant_id,user_id,token_hash,requested_by,requested_ip,expires_at) VALUES($1,$2,$3,$4,$5,$6)',
      [tenantId, user.id, sha256(token), requestedBy, String(ip || '').slice(0, 80), expiresAt],
    );
    await appendAudit(client, {
      tenantId,
      userId: requestedBy || user.id,
      entityType: 'user',
      entityId: user.id,
      action: `user.password_reset_requested.${reason}`,
      newValue: { email: user.email, expiresAt: expiresAt.toISOString() },
    });
  });

  return { token, expiresAt, url: resetUrl(tenantId, token) };
}

function transport() {
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

export async function deliverPasswordReset({ email, fullName, url }) {
  const smtp = transport();
  if (!smtp) return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };

  const safeName = String(fullName || '').replace(/[<>&]/g, '');
  await smtp.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Restablece tu contraseña de Nexo Klar',
    text: `Hola ${fullName || ''},\n\nSolicitaste restablecer tu contraseña. Usa este enlace dentro de 30 minutos:\n${url}\n\nSi no realizaste esta solicitud, puedes ignorar este mensaje.`,
    html: `<p>Hola ${safeName},</p><p>Solicitaste restablecer tu contraseña de Nexo Klar.</p><p><a href="${url}">Restablecer contraseña</a></p><p>El enlace vence en 30 minutos y solo puede utilizarse una vez. Si no realizaste esta solicitud, ignora este mensaje.</p>`,
  });
  return { delivered: true };
}

export async function deliverPasswordResetConfirmation({ email, fullName }) {
  const smtp = transport();
  if (!smtp) return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };

  const safeName = String(fullName || '').replace(/[<>&]/g, '');
  await smtp.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Tu contraseña de Nexo Klar fue actualizada',
    text: `Hola ${fullName || ''},\n\nLa contraseña de tu cuenta fue actualizada. Todas las sesiones activas fueron cerradas. Si no realizaste este cambio, contacta al administrador de tu empresa o a soporte de Nexo Klar.`,
    html: `<p>Hola ${safeName},</p><p>La contraseña de tu cuenta fue actualizada. Todas las sesiones activas fueron cerradas.</p><p>Si no realizaste este cambio, contacta al administrador de tu empresa o a soporte de Nexo Klar.</p>`,
  });
  return { delivered: true };
}
