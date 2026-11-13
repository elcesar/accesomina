import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { config } from './config.js';
import { query, withTenant } from './db.js';
import { tenantIntegration } from './routes/settings.js';
import { classifySmtpFailure, passwordResetSmtpReadiness } from './password-reset.js';

export const SUBSCRIPTION_REMINDER_DAYS = Object.freeze([30, 15, 7, 3, 1]);
const ADMIN_ROLES = ['client_admin', 'domian_admin'];
const LEASE_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function reminderContinuation(planCode) {
  return planCode === 'FREE'
    ? { action: 'solicitar la contratación de un plan pagado', confirmation: 'Si ya solicitaste la contratación, la activación del plan pagado requiere la confirmación administrativa correspondiente.' }
    : { action: 'solicitar la renovación manual', confirmation: 'Si ya solicitaste la renovación, su activación requiere la confirmación administrativa correspondiente.' };
}

// This function must be called within the same transaction as activation or
// renewal. Nothing here performs external delivery; rollback discards the outbox.
export async function scheduleSubscriptionNotifications(client, { tenantId, subscriptionId, periodId, now = new Date() }) {
  const result = await client.query(`
    WITH period AS (
      SELECT p.*, c.timezone
      FROM subscription_periods p
      JOIN subscription_contracts c ON c.id=p.subscription_id AND c.tenant_id=p.tenant_id
      JOIN tenants t ON t.id=p.tenant_id
      WHERE p.tenant_id=$1 AND p.subscription_id=$2 AND p.id=$3
        AND c.current_period_id=p.id AND c.is_current AND t.subscription_managed
    ), reminders AS (
      SELECT p.*, d.days_before,
        ((p.ends_at AT TIME ZONE p.timezone) - make_interval(days => d.days_before)) AT TIME ZONE p.timezone AS scheduled_at
      FROM period p CROSS JOIN unnest($5::integer[]) d(days_before)
    )
    INSERT INTO subscription_notifications
      (tenant_id,subscription_id,period_id,recipient_user_id,recipient_email,channel,days_before,
       scheduled_at,available_at,expires_at,idempotency_key)
    SELECT r.tenant_id,r.subscription_id,r.id,u.id,u.email,ch.channel,r.days_before,
      r.scheduled_at,r.scheduled_at,LEAST(r.ends_at,r.scheduled_at+interval '1 day'),
      concat(r.id,':',u.id,':',ch.channel,':',r.days_before)
    FROM reminders r
    JOIN app_users u ON u.tenant_id=r.tenant_id AND u.active AND u.role=ANY($6::text[])
    CROSS JOIN (VALUES ('EMAIL'),('IN_APP')) ch(channel)
    WHERE r.scheduled_at>$4 AND r.scheduled_at<r.ends_at
    ON CONFLICT(idempotency_key) DO NOTHING
    RETURNING id`, [tenantId, subscriptionId, periodId, now, SUBSCRIPTION_REMINDER_DAYS, ADMIN_ROLES]);
  return result.rows.length;
}

export async function listSubscriptionNotifications(client, { tenantId, userId }) {
  const rows = (await client.query(`SELECT n.id,n.days_before,n.scheduled_at,n.sent_at,n.read_at,n.created_at,
      p.ends_at,c.plan_code,c.timezone,c.snapshot->'plan'->>'name' AS plan_name
    FROM subscription_notifications n
    JOIN app_users u ON u.id=n.recipient_user_id AND u.tenant_id=n.tenant_id
    JOIN subscription_contracts c ON c.id=n.subscription_id AND c.tenant_id=n.tenant_id
    JOIN subscription_periods p ON p.id=n.period_id AND p.tenant_id=n.tenant_id AND p.subscription_id=c.id
    WHERE n.tenant_id=$1 AND n.recipient_user_id=$2 AND n.channel='IN_APP' AND n.status='sent'
      AND u.active AND u.role=ANY($3::text[])
    ORDER BY n.created_at DESC,n.id DESC LIMIT 100`, [tenantId, userId, ADMIN_ROLES])).rows;
  const iso = value => value ? new Date(value).toISOString() : null;
  return rows.map(row => {
    const endDate = new Intl.DateTimeFormat('es-CL', { timeZone: row.timezone, dateStyle: 'long' }).format(new Date(row.ends_at));
    const continuation = reminderContinuation(row.plan_code);
    return { id: row.id, subject: `Tu suscripción vence en ${row.days_before} días`,
      message: `La suscripción ${row.plan_name || row.plan_code} vence el ${endDate}. Ingresa a Mi plan para ${continuation.action}. Este aviso no genera cobros ni cambia tu plan. ${continuation.confirmation}`,
      threshold: row.days_before, daysBefore: row.days_before, channel: 'IN_APP', status: 'sent',
      scheduledAt: iso(row.scheduled_at), sentAt: iso(row.sent_at), readAt: iso(row.read_at), createdAt: iso(row.created_at),
      periodEndsAt: iso(row.ends_at), planCode: row.plan_code, timezone: row.timezone };
  });
}

const currentReminderSql = `
  SELECT n.*, u.email AS current_recipient_email, t.company_name, c.timezone,
    c.plan_code, p.ends_at AS period_ends_at
  FROM subscription_notifications n
  JOIN subscription_contracts c ON c.id=n.subscription_id AND c.tenant_id=n.tenant_id
  JOIN subscription_periods p ON p.id=n.period_id AND p.subscription_id=c.id AND p.tenant_id=n.tenant_id
  JOIN tenants t ON t.id=n.tenant_id
  JOIN app_users u ON u.id=n.recipient_user_id AND u.tenant_id=n.tenant_id
  WHERE n.tenant_id=$1 AND n.id=$2 AND n.claim_token=$3 AND n.status='processing'
    AND t.subscription_managed AND t.status='active' AND c.is_current AND c.current_period_id=n.period_id
    AND u.active AND u.role=ANY($4::text[]) AND n.expires_at>$5`;

export async function deliverSubscriptionReminder({ reminder, smtpConfig = config.smtp, createTransport = nodemailer.createTransport, timeoutMs = 25_000 }) {
  if (!passwordResetSmtpReadiness(smtpConfig).configured) return { delivered: false, reason: 'SMTP_NOT_CONFIGURED' };
  let timer, transport;
  try {
    const endDate = new Intl.DateTimeFormat('es-CL', { timeZone: reminder.timezone || 'America/Santiago', dateStyle: 'long' }).format(new Date(reminder.period_ends_at));
    const continuation = reminderContinuation(reminder.plan_code);
    const recipient = String(reminder.current_recipient_email || reminder.recipient_email).trim();
    transport = createTransport({ host: smtpConfig.host, port: Number(smtpConfig.port), secure: smtpConfig.secure === true,
      auth: smtpConfig.user ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 });
    const deadline = new Promise((resolve, reject) => { timer = setTimeout(() => {
      try { transport.close?.(); } catch {}
      reject(Object.assign(new Error('Subscription SMTP deadline exceeded'), { code: 'ETIMEDOUT' }));
    }, timeoutMs); });
    const result = await Promise.race([deadline, transport.sendMail({
      from: smtpConfig.from, to: recipient,
      // Stable across retries; SMTP acceptance is not an exactly-once guarantee.
      messageId: `<subscription-${reminder.id}@nexoklar.com>`,
      subject: `Nexo Klar: tu suscripción vence en ${reminder.days_before} días`,
      text: `Hola,\n\nLa suscripción ${reminder.plan_code} de ${reminder.company_name} vence el ${endDate}.\nFaltan ${reminder.days_before} días para finalizar el período vigente.\n\nIngresa a Mi plan para revisar tus condiciones y ${continuation.action}:\n${config.origin}/app/mi-plan\n\nEste aviso no genera cobros ni cambia tu plan. ${continuation.confirmation}`
    })]);
    if (!Array.isArray(result?.accepted) || !result.accepted.some(value => String(value).trim().toLowerCase() === recipient.toLowerCase())) return { delivered: false, reason: 'DELIVERY_FAILED' };
    return { delivered: true, providerReference: String(result.messageId || '').slice(0, 250) || null };
  } catch (error) {
    return { delivered: false, reason: classifySmtpFailure(error) };
  } finally { clearTimeout(timer); }
}

export async function processSubscriptionNotifications(tenantId, {
  tenantTransaction = withTenant, now = new Date(), deliver = deliverSubscriptionReminder,
  smtpForTenant = async id => {
    const tenant = await tenantIntegration(id, 'smtp');
    return tenant ? (tenant.enabled ? { ...tenant.publicConfig, ...tenant.secret, from: tenant.publicConfig.from || config.smtp.from } : {}) : config.smtp;
  }
} = {}) {
  const claimToken = randomUUID();
  const due = await tenantTransaction(tenantId, async client => {
    // Reconcile before claiming: old periods, expired windows and inactive
    // recipients cannot replay a backlog after downtime or renewal.
    await client.query(`UPDATE subscription_notifications n SET status='cancelled',claim_token=NULL,claimed_at=NULL,updated_at=$2
      WHERE n.tenant_id=$1 AND n.status IN ('pending','failed','processing') AND (
        n.expires_at<=$2 OR NOT EXISTS (
          SELECT 1 FROM subscription_contracts c JOIN tenants t ON t.id=c.tenant_id
          JOIN app_users u ON u.id=n.recipient_user_id AND u.tenant_id=n.tenant_id
          WHERE c.id=n.subscription_id AND c.tenant_id=n.tenant_id AND c.is_current AND c.current_period_id=n.period_id
            AND t.subscription_managed AND t.status='active' AND u.active AND u.role=ANY($3::text[])))`, [tenantId, now, ADMIN_ROLES]);
    await client.query(`UPDATE subscription_notifications SET status='failed',claim_token=NULL,claimed_at=NULL,
      last_error='DELIVERY_FAILED',updated_at=$2
      WHERE tenant_id=$1 AND status='processing' AND attempts>=$3 AND claimed_at<$2::timestamptz-interval '${LEASE_MINUTES} minutes'`,
    [tenantId, now, MAX_ATTEMPTS]);
    return client.query(`WITH due AS (
      SELECT id FROM subscription_notifications
      WHERE tenant_id=$1 AND available_at<=$2 AND scheduled_at<=$2 AND expires_at>$2 AND attempts<$4
        AND (status IN ('pending','failed') OR (status='processing' AND claimed_at<$2::timestamptz-interval '${LEASE_MINUTES} minutes'))
      ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 20
    ) UPDATE subscription_notifications n SET status='processing',claim_token=$3,claimed_at=$2,attempts=n.attempts+1,updated_at=$2
      FROM due WHERE n.id=due.id RETURNING n.id,n.attempts`, [tenantId, now, claimToken, MAX_ATTEMPTS]);
  });
  let sent = 0, failed = 0;
  for (const candidate of due.rows) {
    // The claim transaction is committed before SMTP; the token prevents a late
    // result from overwriting a replacement claim or a renewal cancellation.
    const reminder = await tenantTransaction(tenantId, async client => (await client.query(currentReminderSql,
      [tenantId, candidate.id, claimToken, ADMIN_ROLES, now])).rows[0]);
    if (!reminder) continue;
    let result;
    if (reminder.channel === 'IN_APP') result = { delivered: true, providerReference: null };
    else {
      try { result = await deliver({ reminder, smtpConfig: await smtpForTenant(tenantId) }); }
      catch { result = { delivered: false, reason: 'DELIVERY_FAILED' }; }
    }
    const reason = result.delivered ? null : ['SMTP_NOT_CONFIGURED', 'SMTP_AUTH_FAILED', 'SMTP_CONNECTION_FAILED', 'DELIVERY_FAILED'].includes(result.reason) ? result.reason : 'DELIVERY_FAILED';
    const recorded = await tenantTransaction(tenantId, client => client.query(`UPDATE subscription_notifications
      SET status=$4,claim_token=NULL,claimed_at=NULL,last_error=$5,provider_reference=$6,
        recipient_email=$7,sent_at=CASE WHEN $4='sent' THEN $8::timestamptz ELSE NULL END,
        available_at=$8::timestamptz+make_interval(mins => LEAST(60,attempts*5)),updated_at=$8
      WHERE tenant_id=$1 AND id=$2 AND claim_token=$3 AND status='processing'
      RETURNING id`, [tenantId, reminder.id, claimToken, result.delivered ? 'sent' : 'failed', reason,
      result.delivered ? result.providerReference || null : null, reminder.current_recipient_email, now]));
    if (recorded.rows.length) result.delivered ? sent++ : failed++;
  }
  return { claimed: due.rows.length, sent, failed };
}

export async function runSubscriptionNotificationTick({ queryTenants = query, processTenant = processSubscriptionNotifications } = {}) {
  const tenants = await queryTenants("SELECT id FROM tenants WHERE status='active' AND subscription_managed");
  for (const tenant of tenants.rows) await processTenant(tenant.id);
  return tenants.rows.length;
}
