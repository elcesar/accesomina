import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  classifySmtpFailure,
  deliverPasswordReset,
  logPasswordResetOperationalEvent,
  passwordResetSmtpReadiness,
  recordPasswordResetDelivery,
  validatePasswordResetRequest,
} from '../password-reset.js';

// Delivery is successful only when SMTP explicitly accepts the intended recipient.
const smtpConfig = {
  host: 'smtp.example.test',
  port: 587,
  secure: false,
  from: 'Nexo Klar <acceso@example.test>',
};

test('password recovery accepts a valid company RUT and authorized email format', () => {
  assert.deepEqual(
    validatePasswordResetRequest({ rut: '12.345.678-5', email: ' Persona@Empresa.cl ' }),
    { rutKey: '123456785', email: 'persona@empresa.cl' },
  );
});

test('password recovery rejects a RUT with an invalid verification digit before account lookup', () => {
  const result = validatePasswordResetRequest({ rut: '12.345.678-9', email: 'persona@empresa.cl' });
  assert.equal(result.error, 'INVALID_COMPANY_RUT');
});

test('password recovery rejects malformed or missing email before account lookup', () => {
  for (const email of ['', 'persona@empresa', 'sin-arroba', 'a'.repeat(250) + '@empresa.cl']) {
    const result = validatePasswordResetRequest({ rut: '12.345.678-5', email });
    assert.equal(result.error, 'INVALID_EMAIL', email || 'empty email');
  }
});

test('password reset SMTP readiness reports configuration names without exposing values', () => {
  assert.deepEqual(
    passwordResetSmtpReadiness({ host: '', port: 0, from: '' }),
    { configured: false, missing: ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_FROM'] },
  );
  assert.deepEqual(
    passwordResetSmtpReadiness(smtpConfig),
    { configured: true, missing: [] },
  );
});

test('password recovery returns a safe generic message for syntactically valid requests', () => {
  assert.match(PASSWORD_RESET_GENERIC_MESSAGE, /Revisa tu carpeta de spam/);
  assert.match(PASSWORD_RESET_GENERIC_MESSAGE, /contacta al administrador/i);
  assert.doesNotMatch(PASSWORD_RESET_GENERIC_MESSAGE, /SMTP|credencial|servidor/i);
});

test('SMTP failures are classified without retaining provider details', () => {
  assert.equal(classifySmtpFailure({ code: 'EAUTH' }), 'SMTP_AUTH_FAILED');
  assert.equal(classifySmtpFailure({ responseCode: 535 }), 'SMTP_AUTH_FAILED');
  assert.equal(classifySmtpFailure({ code: 'ECONNREFUSED' }), 'SMTP_CONNECTION_FAILED');
  assert.equal(classifySmtpFailure({ code: 'ETIMEDOUT' }), 'SMTP_CONNECTION_FAILED');
  assert.equal(classifySmtpFailure({ code: 'other-provider-code' }), 'DELIVERY_FAILED');
});

test('password reset distinguishes an accepted SMTP submission from a delivery failure', async () => {
  const accepted = await deliverPasswordReset({
    email: 'persona@example.test',
    fullName: 'Persona',
    url: 'https://example.test/reset?secret=should-not-log',
    smtpConfig,
    createTransport: () => ({ sendMail: async () => ({ accepted: ['persona@example.test'] }) }),
  });
  assert.deepEqual(accepted, { delivered: true, smtpAccepted: true });

  const rejected = await deliverPasswordReset({
    email: 'persona@example.test',
    fullName: 'Persona',
    url: 'https://example.test/reset?secret=should-not-log',
    smtpConfig,
    createTransport: () => ({ sendMail: async () => ({ accepted: [], rejected: ['persona@example.test'] }) }),
  });
  assert.deepEqual(rejected, { delivered: false, smtpAccepted: false, reason: 'DELIVERY_FAILED' });

  const wrongRecipient = await deliverPasswordReset({
    email: 'persona@example.test',
    fullName: 'Persona',
    url: 'https://example.test/reset?secret=should-not-log',
    smtpConfig,
    createTransport: () => ({ sendMail: async () => ({ accepted: ['other@example.test'] }) }),
  });
  assert.deepEqual(wrongRecipient, { delivered: false, smtpAccepted: false, reason: 'DELIVERY_FAILED' });

  const authFailure = await deliverPasswordReset({
    email: 'persona@example.test',
    fullName: 'Persona',
    url: 'https://example.test/reset?secret=should-not-log',
    smtpConfig,
    createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error('bad auth'), { code: 'EAUTH' }); } }),
  });
  assert.deepEqual(authFailure, { delivered: false, reason: 'SMTP_AUTH_FAILED' });

  const notConfigured = await deliverPasswordReset({
    email: 'persona@example.test',
    fullName: 'Persona',
    url: 'https://example.test/reset?secret=should-not-log',
    smtpConfig: { host: '', port: 0, from: '' },
  });
  assert.deepEqual(notConfigured, { delivered: false, reason: 'SMTP_NOT_CONFIGURED' });
});

test('password reset audit persists normalized delivery data without secrets', async () => {
  const events = [];
  await recordPasswordResetDelivery({
    tenantId: 'tenant-1',
    user: { id: 'user-1' },
    delivery: { delivered: false, reason: 'SMTP_CONNECTION_FAILED' },
    withTenantFn: async (_tenantId, callback) => callback({}),
    appendAuditFn: async (_client, event) => events.push(event),
  });
  assert.equal(events[0].action, 'user.password_reset_delivery.failed');
  assert.deepEqual(events[0].newValue, {
    delivery: 'failed',
    smtpAccepted: false,
    reason: 'SMTP_CONNECTION_FAILED',
  });
  assert.doesNotMatch(JSON.stringify(events[0]), /password|secret|reset\?/i);
});

test('operational logs use correlation data and exclude sensitive reset values', () => {
  const lines = [];
  logPasswordResetOperationalEvent({
    event: 'password_reset.smtp_delivery',
    code: 'SMTP_AUTH_FAILED',
    requestId: 'request-123',
  }, line => lines.push(line));
  assert.match(lines[0], /SMTP_AUTH_FAILED/);
  assert.match(lines[0], /request-123/);
  assert.doesNotMatch(lines[0], /token|password|https?:\/\//i);
});
