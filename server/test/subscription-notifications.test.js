import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { deliverSubscriptionReminder, listSubscriptionNotifications, processSubscriptionNotifications, runSubscriptionNotificationTick, scheduleSubscriptionNotifications } from '../subscription-notifications.js';

const SMTP = { host: 'smtp.qa.invalid', port: 587, secure: false, user: 'qa', pass: 'never-send-real-mail', from: 'qa@example.test' };
const reminder = { id: '11111111-1111-4111-8111-111111111111', current_recipient_email: 'admin@example.test',
  company_name: 'Empresa QA', plan_code: 'LA_UNION', days_before: 7, period_ends_at: '2026-11-20T13:00:00Z', timezone: 'America/Santiago' };

test('SMTP acceptance is validated for the intended recipient and carries a stable Message-ID', async () => {
  const messages = [];
  const deliver = async accepted => deliverSubscriptionReminder({ reminder, smtpConfig: SMTP,
    createTransport: () => ({ sendMail: async message => { messages.push(message); return { accepted, messageId: message.messageId }; } }) });
  assert.deepEqual(await deliver(['ADMIN@EXAMPLE.TEST']), { delivered: true, providerReference: `<subscription-${reminder.id}@nexoklar.com>` });
  assert.equal(messages[0].to, reminder.current_recipient_email);
  assert.match(messages[0].text, /Empresa QA/);
  assert.match(messages[0].text, /renovación manual/);
  assert.match(messages[0].text, /20 de noviembre/);
  assert.equal((await deliver(['other@example.test'])).reason, 'DELIVERY_FAILED');
  assert.equal((await deliver([])).reason, 'DELIVERY_FAILED');
  assert.equal(messages[0].messageId, messages[1].messageId);
});

for (const planCode of ['FREE', 'LA_UNION']) {
  test(`email ${planCode} describes the permitted continuation without billing or automatic activation`, async () => {
    const messages = [];
    const result = await deliverSubscriptionReminder({ reminder: { ...reminder, plan_code: planCode }, smtpConfig: SMTP,
      createTransport: () => ({ sendMail: async message => { messages.push(message); return { accepted: [message.to], messageId: message.messageId }; } }) });
    assert.equal(result.delivered, true);
    assert.equal(messages.length, 1);
    const message = messages[0].text;
    if (planCode === 'FREE') {
      assert.match(message, /solicitar la contratación de un plan pagado/);
      assert.doesNotMatch(message, /renovación|renovar/i);
    } else {
      assert.match(message, /solicitar la renovación manual/);
      assert.doesNotMatch(message, /contratación de un plan pagado/);
    }
    assert.match(message, /Este aviso no genera cobros ni cambia tu plan/);
    assert.match(message, /activación.*requiere la confirmación administrativa/);
    assert.match(message, /\/app\/mi-plan/);
  });
}

test('SMTP missing, failures and timeouts retain only safe categories and never secrets', async () => {
  let transports = 0;
  const missing = await deliverSubscriptionReminder({ reminder, smtpConfig: { ...SMTP, host: '' }, createTransport: () => { transports++; } });
  assert.deepEqual(missing, { delivered: false, reason: 'SMTP_NOT_CONFIGURED' });
  assert.equal(transports, 0);
  for (const [code, expected] of [['EAUTH', 'SMTP_AUTH_FAILED'], ['ETIMEDOUT', 'SMTP_CONNECTION_FAILED'], ['OTHER', 'DELIVERY_FAILED']]) {
    const result = await deliverSubscriptionReminder({ reminder, smtpConfig: SMTP,
      createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error('password-provider-secret'), { code }); } }) });
    assert.deepEqual(result, { delivered: false, reason: expected });
    assert.ok(!JSON.stringify(result).includes('secret'));
  }
  let closed = false;
  const timed = await deliverSubscriptionReminder({ reminder, smtpConfig: SMTP, timeoutMs: 5,
    createTransport: () => ({ sendMail: () => new Promise(() => {}), close: () => { closed = true; } }) });
  assert.deepEqual(timed, { delivered: false, reason: 'SMTP_CONNECTION_FAILED' });
  assert.equal(closed, true);
});

test('the runner lists only managed active tenants, leaving legacy companies untouched', async () => {
  const processed = [];
  const count = await runSubscriptionNotificationTick({ queryTenants: async sql => {
    assert.match(sql, /status='active' AND subscription_managed/);
    return { rows: [{ id: 'qa-managed' }] };
  }, processTenant: async id => { processed.push(id); } });
  assert.deepEqual(processed, ['qa-managed']);
  assert.equal(count, 1);
});

// Use the actual migration so differences in the durable outbox schema fail
// these behavioral tests instead of being hidden by a hand-written imitation.
async function database() {
  const db = new PGlite();
  const files = (await fs.readdir(new URL('../../database/postgres/', import.meta.url))).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) await db.exec((await fs.readFile(new URL(`../../database/postgres/${file}`, import.meta.url), 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, ''));
  return db;
}

function transactions(db, trace = []) {
  let queue = Promise.resolve();
  return async (tenantId, fn) => {
    const previous = queue;
    let release;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      await db.exec('BEGIN'); trace.push('begin');
      await db.query("SELECT set_config('app.current_tenant_id',$1,true)", [tenantId]);
      const result = await fn(db);
      await db.exec('COMMIT'); trace.push('commit');
      return result;
    } catch (error) { await db.exec('ROLLBACK'); trace.push('rollback'); throw error; }
    finally { release(); }
  };
}

async function fixture(db, { endsAt = '2026-11-30T13:00:00Z', managed = true, planCode = 'LA_UNION' } = {}) {
  const tenantId = randomUUID(), adminId = randomUUID(), subscriptionId = randomUUID(), periodId = randomUUID();
  await db.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,subscription_managed) VALUES($1,$2,'Empresa QA',$2,'admin@example.test','active',$3)", [tenantId, `qa-${tenantId}`, managed]);
  await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'admin@example.test','Admin QA','client_admin')", [adminId, tenantId]);
  await db.query("INSERT INTO app_users(tenant_id,email,full_name,role) VALUES($1,'reader@example.test','Consulta QA','consulta')", [tenantId]);
  const plan = (await db.query("SELECT id FROM subscription_plan_versions WHERE code=$1 AND state='PUBLISHED'", [planCode])).rows[0];
  await db.query(`INSERT INTO subscription_contracts(id,tenant_id,plan_version_id,plan_code,snapshot,starts_at,ends_at,grace_ends_at,anchor_day)
    VALUES($1,$2,$3,$4,'{}',$5::timestamptz-interval '6 months',$5,CASE WHEN $4='FREE' THEN $5::timestamptz ELSE $5::timestamptz+interval '30 days' END,30)`, [subscriptionId, tenantId, plan.id, planCode, endsAt]);
  await db.query(`INSERT INTO subscription_periods(id,tenant_id,subscription_id,snapshot,starts_at,ends_at,grace_ends_at)
    VALUES($1,$2,$3,'{}',$4::timestamptz-interval '6 months',$4,CASE WHEN $5::text='FREE' THEN $4::timestamptz ELSE $4::timestamptz+interval '30 days' END)`, [periodId, tenantId, subscriptionId, endsAt, planCode]);
  await db.query('UPDATE subscription_contracts SET current_period_id=$2 WHERE id=$1', [subscriptionId, periodId]);
  return { tenantId, subscriptionId, periodId, adminId };
}

const rowsFor = async (db, tenantId) => (await db.query('SELECT * FROM subscription_notifications WHERE tenant_id=$1 ORDER BY days_before DESC,channel', [tenantId])).rows;

test('durable notifications preserve transaction, period, role and delivery guarantees', async t => {
  const db = await database();
  try {
    for (const planCode of ['FREE', 'LA_UNION']) {
      await t.test(`published ${planCode} panel notices describe the permitted continuation without activating or billing`, async () => {
        const f = await fixture(db, { planCode }), tx = transactions(db);
        await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
        await db.query("UPDATE subscription_notifications SET status='sent',sent_at='2026-11-23T13:00:00Z' WHERE tenant_id=$1 AND days_before=7 AND channel='IN_APP'", [f.tenantId]);
        const notices = await tx(f.tenantId, client => listSubscriptionNotifications(client, { tenantId: f.tenantId, userId: f.adminId }));
        assert.equal(notices.length, 1);
        assert.equal(notices[0].planCode, planCode);
        const message = notices[0].message;
        if (planCode === 'FREE') {
          assert.match(message, /solicitar la contratación de un plan pagado/);
          assert.doesNotMatch(message, /renovación|renovar/i);
        } else {
          assert.match(message, /solicitar la renovación manual/);
          assert.doesNotMatch(message, /contratación de un plan pagado/);
        }
        assert.match(message, /Este aviso no genera cobros ni cambia tu plan/);
        assert.match(message, /activación.*requiere la confirmación administrativa/);
      });
    }

    await t.test('only future calendar thresholds are scheduled, once per channel and active admin', async () => {
      const f = await fixture(db, { endsAt: '2026-09-15T13:00:00Z' }), tx = transactions(db);
      const now = new Date('2026-08-20T14:00:00Z');
      assert.equal(await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now })), 8);
      assert.equal(await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now })), 0);
      const rows = await rowsFor(db, f.tenantId);
      assert.equal(rows.length, 8);
      assert.deepEqual([...new Set(rows.map(row => row.days_before))], [15, 7, 3, 1]);
      assert.ok(rows.every(row => row.recipient_user_id === f.adminId));
      // Santiago changes UTC offset between these dates: keep 10:00 local.
      assert.equal(new Date(rows.find(row => row.days_before === 15).scheduled_at).toISOString(), '2026-08-31T14:00:00.000Z');
      assert.equal(new Date(rows.find(row => row.days_before === 7).scheduled_at).toISOString(), '2026-09-08T13:00:00.000Z');
      const legacy = await fixture(db, { managed: false });
      assert.equal(await tx(legacy.tenantId, client => scheduleSubscriptionNotifications(client, { ...legacy, now })), 0);
    });

    await t.test('rollback removes the outbox and cannot trigger external delivery', async () => {
      const f = await fixture(db), tx = transactions(db);
      await assert.rejects(() => tx(f.tenantId, async client => {
        await scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') });
        throw new Error('abort activation');
      }), /abort activation/);
      assert.equal((await rowsFor(db, f.tenantId)).length, 0);
    });

    await t.test('due delivery starts after commit, cancels backlog and does not resend on repeated ticks', async () => {
      const f = await fixture(db), trace = [], tx = transactions(db, trace);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      let sends = 0;
      const options = { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP,
        deliver: async ({ reminder: row }) => {
          assert.equal(trace.at(-1), 'commit');
          assert.equal(row.days_before, 7);
          sends++;
          return { delivered: true, providerReference: 'qa-accepted' };
        } };
      assert.deepEqual(await processSubscriptionNotifications(f.tenantId, options), { claimed: 2, sent: 2, failed: 0 });
      assert.deepEqual(await processSubscriptionNotifications(f.tenantId, options), { claimed: 0, sent: 0, failed: 0 });
      assert.equal(sends, 1);
      const rows = await rowsFor(db, f.tenantId);
      assert.ok(rows.filter(row => [30, 15].includes(row.days_before)).every(row => row.status === 'cancelled'));
      assert.ok(rows.filter(row => [3, 1].includes(row.days_before)).every(row => row.status === 'pending'));
      assert.equal(rows.filter(row => row.status === 'sent').length, 2);
    });

    await t.test('an SMTP failure keeps panel delivery independent and retries with sanitized errors', async () => {
      const f = await fixture(db), tx = transactions(db);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      const options = { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP,
        deliver: async () => { throw new Error('sensitive-provider-password'); } };
      assert.deepEqual(await processSubscriptionNotifications(f.tenantId, options), { claimed: 2, sent: 1, failed: 1 });
      let rows = await rowsFor(db, f.tenantId);
      assert.equal(rows.find(row => row.days_before === 7 && row.channel === 'EMAIL').last_error, 'DELIVERY_FAILED');
      assert.ok(!JSON.stringify(rows).includes('sensitive-provider-password'));
      assert.equal((await processSubscriptionNotifications(f.tenantId, options)).claimed, 0);
      options.now = new Date('2026-11-23T13:06:01Z');
      options.deliver = async () => ({ delivered: true });
      assert.deepEqual(await processSubscriptionNotifications(f.tenantId, options), { claimed: 1, sent: 1, failed: 0 });
      rows = await rowsFor(db, f.tenantId);
      const retried = rows.find(row => row.days_before === 7 && row.channel === 'EMAIL');
      assert.equal(retried.attempts, 2);
      assert.equal(retried.last_error, null);
    });

    await t.test('an abandoned claim is recovered while a live claim is not stolen', async () => {
      const f = await fixture(db), tx = transactions(db);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      await db.query("UPDATE subscription_notifications SET status='processing',claim_token=$2,claimed_at='2026-11-23T12:54:00Z',attempts=1 WHERE tenant_id=$1 AND days_before=7 AND channel='EMAIL'", [f.tenantId, randomUUID()]);
      await db.query("UPDATE subscription_notifications SET status='processing',claim_token=$2,claimed_at='2026-11-23T13:00:00Z',attempts=1 WHERE tenant_id=$1 AND days_before=7 AND channel='IN_APP'", [f.tenantId, randomUUID()]);
      const result = await processSubscriptionNotifications(f.tenantId, { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP, deliver: async () => ({ delivered: true }) });
      assert.deepEqual(result, { claimed: 1, sent: 1, failed: 0 });
      const rows = await rowsFor(db, f.tenantId);
      assert.equal(rows.find(row => row.days_before === 7 && row.channel === 'IN_APP').status, 'processing');
      assert.equal(rows.find(row => row.days_before === 7 && row.channel === 'EMAIL').attempts, 2);
    });

    await t.test('role removal and replacement periods cannot receive stale reminders', async () => {
      const f = await fixture(db), tx = transactions(db);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      await db.query("UPDATE app_users SET role='consulta' WHERE id=$1", [f.adminId]);
      let sends = 0;
      const options = { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP, deliver: async () => { sends++; return { delivered: true }; } };
      assert.equal((await processSubscriptionNotifications(f.tenantId, options)).claimed, 0);
      assert.equal(sends, 0);
      assert.ok((await rowsFor(db, f.tenantId)).every(row => row.status === 'cancelled'));
      const older = await fixture(db);
      await tx(older.tenantId, client => scheduleSubscriptionNotifications(client, { ...older, now: new Date('2026-10-01T13:00:00Z') }));
      await db.query('UPDATE subscription_contracts SET is_current=false WHERE id=$1', [older.subscriptionId]);
      assert.equal((await processSubscriptionNotifications(older.tenantId, options)).claimed, 0);
      assert.equal(sends, 0);
    });

    await t.test('a crash on the last allowed attempt becomes a visible failure instead of a permanent running claim', async () => {
      const f = await fixture(db), tx = transactions(db);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      await db.query("UPDATE subscription_notifications SET status='processing',claim_token=$2,claimed_at='2026-11-23T12:54:00Z',attempts=5 WHERE tenant_id=$1 AND days_before=7 AND channel='EMAIL'", [f.tenantId, randomUUID()]);
      const result = await processSubscriptionNotifications(f.tenantId, { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP,
        deliver: async () => { assert.fail('exhausted email must not be sent'); } });
      assert.equal(result.sent, 1);
      const row = (await rowsFor(db, f.tenantId)).find(item => item.days_before === 7 && item.channel === 'EMAIL');
      assert.equal(row.status, 'failed');
      assert.equal(row.claim_token, null);
      assert.equal(row.last_error, 'DELIVERY_FAILED');
    });

    await t.test('a late SMTP result cannot overwrite cancellation by renewal', async () => {
      const f = await fixture(db), tx = transactions(db);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      const result = await processSubscriptionNotifications(f.tenantId, { tenantTransaction: tx, now: new Date('2026-11-23T13:01:00Z'), smtpForTenant: async () => SMTP,
        deliver: async () => {
          await tx(f.tenantId, client => client.query("UPDATE subscription_notifications SET status='cancelled',claim_token=NULL WHERE tenant_id=$1 AND status='processing'", [f.tenantId]));
          return { delivered: true };
        } });
      // IN_APP may already have been published before SMTP begins. Cancellation
      // must prevent only the late SMTP result from overwriting the email row.
      assert.ok(result.sent <= 1);
      const email = (await rowsFor(db, f.tenantId)).find(row => row.days_before === 7 && row.channel === 'EMAIL');
      assert.equal(email.status, 'cancelled');
      assert.equal(email.sent_at, null);
      assert.equal(email.provider_reference, null);
    });

    await t.test('published panel notices are scoped to the current administrator and company', async () => {
      const f = await fixture(db), other = await fixture(db), tx = transactions(db);
      const secondAdmin = randomUUID();
      await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'admin2@example.test','Second admin QA','client_admin')", [secondAdmin, f.tenantId]);
      await tx(f.tenantId, client => scheduleSubscriptionNotifications(client, { ...f, now: new Date('2026-10-01T13:00:00Z') }));
      await db.query("UPDATE subscription_notifications SET status='sent',sent_at='2026-11-23T13:00:00Z' WHERE tenant_id=$1 AND days_before=7", [f.tenantId]);
      const notices = await tx(f.tenantId, client => listSubscriptionNotifications(client, { tenantId: f.tenantId, userId: f.adminId }));
      assert.equal(notices.length, 1);
      assert.equal(notices[0].channel, 'IN_APP');
      assert.equal(notices[0].threshold, 7);
      assert.match(notices[0].message, /renovación manual/);
      assert.equal(notices[0].periodEndsAt, '2026-11-30T13:00:00.000Z');
      assert.ok(!JSON.stringify(notices).includes('admin@example.test'));
      assert.equal((await tx(f.tenantId, client => listSubscriptionNotifications(client, { tenantId: f.tenantId, userId: other.adminId }))).length, 0);
      await db.query("UPDATE app_users SET role='consulta' WHERE id=$1", [f.adminId]);
      assert.equal((await tx(f.tenantId, client => listSubscriptionNotifications(client, { tenantId: f.tenantId, userId: f.adminId }))).length, 0);
      await db.query("UPDATE app_users SET role='client_admin',active=false WHERE id=$1", [f.adminId]);
      assert.equal((await tx(f.tenantId, client => listSubscriptionNotifications(client, { tenantId: f.tenantId, userId: f.adminId }))).length, 0);
    });
  } finally { await db.close(); }
});
