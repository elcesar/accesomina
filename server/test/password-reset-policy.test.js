import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordResetSmtpReadiness, validatePasswordResetRequest } from '../password-reset.js';

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
    passwordResetSmtpReadiness({ host: 'smtp.example.test', port: 587, from: 'Nexo Klar <acceso@example.test>' }),
    { configured: true, missing: [] },
  );
});
