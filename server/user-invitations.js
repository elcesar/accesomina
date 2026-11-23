import nodemailer from 'nodemailer';
import { config } from './config.js';
import { withTenant } from './db.js';
import { appendAudit } from './audit.js';
import { hashPassword, randomToken, sha256 } from './security.js';
import { classifySmtpFailure, passwordResetSmtpReadiness } from './password-reset.js';

export const INVITATION_TTL_MS = 24 * 60 * 60_000;
const FAILURE_CODES = new Set(['SMTP_NOT_CONFIGURED','SMTP_AUTH_FAILED','SMTP_CONNECTION_FAILED','DELIVERY_FAILED']);
const escapeHtml = value => String(value || '').replace(/[<>&"']/g, char => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;', "'":'&#39;' })[char]);
const invalidInvitation = () => Object.assign(new Error('El enlace de invitación no es válido o ya venció.'), { status:400, code:'INVITATION_INVALID_OR_EXPIRED' });

export function invitationSummary(row) {
  return row?.status ? { status:row.status, expiresAt:row.expires_at, lastSentAt:row.last_sent_at || null, failureCode:row.failure_code || null } : null;
}

export function invitationInput(input) {
  const tenant = input?.tenant, token = input?.token;
  if (typeof tenant !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant)
    || typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return { tenant, token };
}

// The caller owns the user row lock and transaction. Replacing the hash revokes
// the previous link before the next message can be sent.
export async function createUserInvitation(client, { tenantId, userId, requestedBy, now = Date.now() }) {
  const token = randomToken(32), expiresAt = new Date(now + INVITATION_TTL_MS);
  const row = (await client.query(`INSERT INTO user_invitations(user_id,tenant_id,token_hash,expires_at)
    VALUES($1,$2,$3,$4)
    ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,status='pending',expires_at=EXCLUDED.expires_at,
      last_sent_at=NULL,failure_code=NULL,accepted_at=NULL,updated_at=now()
    WHERE user_invitations.tenant_id=EXCLUDED.tenant_id AND user_invitations.accepted_at IS NULL
    RETURNING status,expires_at,last_sent_at,failure_code`, [userId,tenantId,sha256(token),expiresAt])).rows[0];
  if (!row) throw Object.assign(new Error('La cuenta ya estableció su contraseña.'), {status:409,code:'INVITATION_ALREADY_ACCEPTED'});
  await appendAudit(client, { tenantId,userId:requestedBy,entityType:'user',entityId:userId,action:'user.invitation.created',newValue:{expiresAt:expiresAt.toISOString()} });
  const url = `${config.origin}/aceptar-invitacion?tenant=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(token)}`;
  return { token, url, ...row };
}

export async function deliverUserInvitation({ email,fullName,companyName,companyRut,url,smtpConfig=config.smtp,createTransport=nodemailer.createTransport,timeoutMs=25_000 }) {
  if (!passwordResetSmtpReadiness(smtpConfig).configured) return { delivered:false,reason:'SMTP_NOT_CONFIGURED' };
  let timer,smtp;
  try {
    smtp = createTransport({ host:smtpConfig.host,port:Number(smtpConfig.port),secure:smtpConfig.secure===true,
      auth:smtpConfig.user?{user:smtpConfig.user,pass:smtpConfig.pass}:undefined,connectionTimeout:10_000,greetingTimeout:10_000,socketTimeout:20_000 });
    const deadline = new Promise((resolve,reject)=>{timer=setTimeout(()=>{
      try{smtp.close?.();}catch{}
      reject(Object.assign(new Error('SMTP invitation deadline exceeded'),{code:'ETIMEDOUT'}));
    },timeoutMs);});
    const result = await Promise.race([deadline,smtp.sendMail({ from:smtpConfig.from,to:email,subject:'Tu acceso a Nexo Klar',
      text:`Hola ${fullName || ''},\n\nTe dieron acceso a ${companyName || 'tu empresa'} en Nexo Klar.\nRUT de la empresa: ${companyRut}\nCorreo de acceso: ${email}\n\nCrea tu contraseña personal con este enlace de un solo uso, válido durante 24 horas:\n${url}\n\nDespués ingresa con el RUT de la empresa, tu correo y tu contraseña. La plataforma te guiará para configurar la doble autenticación. Si no esperabas esta invitación, contacta al administrador de tu empresa.`,
      html:`<p>Hola ${escapeHtml(fullName)},</p><p>Te dieron acceso a <strong>${escapeHtml(companyName || 'tu empresa')}</strong> en Nexo Klar.</p><p>RUT de la empresa: ${escapeHtml(companyRut)}<br>Correo de acceso: ${escapeHtml(email)}</p><p><a href="${escapeHtml(url)}">Crear mi contraseña personal</a></p><p>El enlace es de un solo uso y vence en 24 horas. Después ingresa con el RUT de la empresa, tu correo y tu contraseña. La plataforma te guiará para configurar la doble autenticación.</p><p>Si no esperabas esta invitación, contacta al administrador de tu empresa.</p>` })]);
    const recipient = String(email).trim().toLowerCase();
    if (!Array.isArray(result?.accepted) || !result.accepted.some(address => String(address).trim().toLowerCase() === recipient)) return {delivered:false,reason:'DELIVERY_FAILED'};
    return { delivered:true };
  } catch (error) { return { delivered:false,reason:classifySmtpFailure(error) }; }
  finally { clearTimeout(timer); }
}

export function logInvitationEvent({ requestId='' }, logger=console.error) {
  const correlation = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(requestId)) ? requestId : null;
  logger(JSON.stringify({ event:'user.invitation.delivery_status',outcome:'failed',code:'DELIVERY_STATUS_WRITE_FAILED',requestId:correlation }));
}

export async function sendAndRecordUserInvitation({ tenantId,user,invitation,companyName,companyRut,requestedBy,requestId='',deliver=deliverUserInvitation }) {
  const delivery = await deliver({email:user.email,fullName:user.full_name,companyName,companyRut,url:invitation.url});
  const reason = delivery.delivered ? null : FAILURE_CODES.has(delivery.reason) ? delivery.reason : 'DELIVERY_FAILED';
  try {
    return await withTenant(tenantId,async client => {
      // A slow, superseded SMTP result must not overwrite the newer invitation.
      const row = (await client.query(`UPDATE user_invitations SET status=$4,last_sent_at=CASE WHEN $4='sent' THEN now() ELSE NULL END,
        failure_code=$5,updated_at=now() WHERE user_id=$1 AND tenant_id=$2 AND token_hash=$3 AND status='pending'
        RETURNING status,expires_at,last_sent_at,failure_code`,[user.id,tenantId,sha256(invitation.token),delivery.delivered?'sent':'failed',reason])).rows[0];
      if (row) await appendAudit(client,{tenantId,userId:requestedBy,entityType:'user',entityId:user.id,action:delivery.delivered?'user.invitation.delivery.sent':'user.invitation.delivery.failed',newValue:{delivery:delivery.delivered?'accepted_by_smtp':'failed',reason}});
      return invitationSummary(row || (await client.query('SELECT status,expires_at,last_sent_at,failure_code FROM user_invitations WHERE user_id=$1 AND tenant_id=$2',[user.id,tenantId])).rows[0]);
    });
  } catch {
    logInvitationEvent({code:'DELIVERY_STATUS_WRITE_FAILED',requestId});
    return invitationSummary(invitation);
  }
}

const validInvitationSql = `SELECT i.user_id,i.status,i.expires_at,i.accepted_at,u.email,u.full_name,t.company_name,t.rut
  FROM user_invitations i JOIN app_users u ON u.id=i.user_id AND u.tenant_id=i.tenant_id JOIN tenants t ON t.id=i.tenant_id
  WHERE i.tenant_id=$1 AND i.token_hash=$2 AND i.accepted_at IS NULL AND i.status IN ('pending','sent','failed')
    AND i.expires_at>now() AND u.active AND t.status='active'`;

export async function verifyUserInvitation({ tenant,token }) {
  return withTenant(tenant,async client => {
    const row = (await client.query(validInvitationSql,[tenant,sha256(token)])).rows[0];
    if (!row) throw invalidInvitation();
    return {companyName:row.company_name,companyRut:row.rut,email:row.email,fullName:row.full_name,expiresAt:row.expires_at};
  });
}

export async function acceptUserInvitation({ tenant,token,newPassword }) {
  const credentials = await hashPassword(newPassword);
  return withTenant(tenant,async client => {
    const candidate = (await client.query(validInvitationSql,[tenant,sha256(token)])).rows[0];
    if (!candidate) throw invalidInvitation();
    // Keep the same lock order as administrative resends.
    await client.query('SELECT id FROM app_users WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[candidate.user_id,tenant]);
    const row = (await client.query(`${validInvitationSql} FOR UPDATE OF i`,[tenant,sha256(token)])).rows[0];
    if (!row) throw invalidInvitation();
    await client.query("UPDATE user_invitations SET status='accepted',accepted_at=now(),failure_code=NULL,updated_at=now() WHERE user_id=$1 AND tenant_id=$2",[row.user_id,tenant]);
    await client.query('UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=false,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$3 AND tenant_id=$4',[credentials.hash,credentials.salt,row.user_id,tenant]);
    await client.query('UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND tenant_id=$2 AND used_at IS NULL',[row.user_id,tenant]);
    await client.query('UPDATE user_sessions SET revoked_at=now() WHERE user_id=$1 AND tenant_id=$2 AND revoked_at IS NULL',[row.user_id,tenant]);
    await appendAudit(client,{tenantId:tenant,userId:row.user_id,entityType:'user',entityId:row.user_id,action:'user.invitation.accepted',newValue:{passwordEstablished:true,sessionsRevoked:true}});
  });
}

export async function completeUserInvitation(client,tenantId,userId) {
  // A personal password established through recovery also retires an older
  // welcome link, without changing recovery responses or legacy accounts.
  await client.query("UPDATE user_invitations SET status='accepted',accepted_at=now(),failure_code=NULL,updated_at=now() WHERE tenant_id=$1 AND user_id=$2 AND accepted_at IS NULL",[tenantId,userId]);
}
