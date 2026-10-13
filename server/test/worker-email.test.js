import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAppendChanges, validateTenantState } from '../validation.js';
import { friendlyApiError } from '../../nexo-v2/src/services/api.js';

const worker = email => ({ id: 'qa-person', nombre: 'Persona QA', rut: '14.567.890-0', email });
const invalidEmail = error => error.status === 409 && error.code === 'INVALID_WORKER_EMAIL';

test('direct state writes reject invalid worker emails before persistence', () => {
  for (const email of ['correo-invalido', 'persona@', 'persona@dominio', 'a..b@dominio.cl', 'a'.repeat(250) + '@qa.cl', 123, {}]) {
    assert.throws(() => validateTenantState({ trabajadores: [worker(email)] }), invalidEmail, String(email));
  }
});

test('optional worker emails stay optional and valid values are trimmed', () => {
  for (const email of [undefined, null, '', '   ', ' qa.persona+prueba@example.com ']) {
    const clean = validateTenantState({ trabajadores: [worker(email)] }).trabajadores[0];
    assert.equal(clean.email, email == null ? email : email.trim());
  }
});

test('append fallback rejects invalid emails despite unrelated legacy references', () => {
  const current = { trabajadores: [], asignaciones: [{ id: 'legacy', trabId: 'missing', mantId: 'missing' }] };
  for (const email of ['correo-invalido', 'persona@dominio', 123]) {
    const proposed = { ...structuredClone(current), trabajadores: [worker(email)] };
    assert.throws(() => validateAppendChanges(current, proposed, ['trabajadores']), invalidEmail);
  }
  const proposed = { ...structuredClone(current), trabajadores: [worker(' qa@example.com ')] };
  assert.equal(validateAppendChanges(current, proposed, ['trabajadores']), true);
  assert.equal(proposed.trabajadores[0].email, 'qa@example.com');
});

test('worker email failures provide a functional Spanish message', () => {
  assert.match(friendlyApiError('INVALID_WORKER_EMAIL', 409), /correo electrónico.*válido/);
});
