import nodemailer from 'nodemailer';
import { config } from './config.js';

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

const escapeHtml = value => String(value || '').replace(/[<>&]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[char]);

export async function deliverAccountApproval({ email, fullName, companyName }) {
  const smtp = transport();
  if (!smtp) return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };

  const name = escapeHtml(fullName || '');
  const company = escapeHtml(companyName || 'tu empresa');
  await smtp.sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Tu cuenta de Nexo Klar fue aprobada',
    text: `Hola ${fullName || ''},\n\nLa cuenta de ${companyName || 'tu empresa'} fue aprobada por Nexo Klar. Ya puedes ingresar con el RUT de la empresa, tu correo y la contraseña que registraste.\n\nAcceso: ${config.origin}/login`,
    html: `<p>Hola ${name},</p><p>La cuenta de <strong>${company}</strong> fue aprobada por Nexo Klar.</p><p>Ya puedes ingresar con el RUT de la empresa, tu correo y la contraseña que registraste.</p><p><a href="${config.origin}/login">Ingresar a Nexo Klar</a></p>`,
  });
  return { delivered: true };
}
