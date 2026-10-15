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

const legacyState = () => ({ trabajadores: [
  { ...worker(' correo-invalido '), id: 'qa-legacy' },
  { id: 'qa-valid', nombre: 'Persona válida QA', rut: '14.507.215-8', email: 'qa@ejemplo.test' },
] });
const validateUpdate = (current, proposed) => validateTenantState(proposed, { previousState: current });

test('a legacy email cannot block editing another valid worker', () => {
  const current = legacyState();
  const proposed = structuredClone(current);
  proposed.trabajadores[1].especialidad = 'Especialidad QA';
  const clean = validateUpdate(current, proposed);
  assert.equal(clean.trabajadores[1].especialidad, 'Especialidad QA');
  assert.deepEqual(clean.trabajadores[0], current.trabajadores[0]);
  assert.deepEqual(current, legacyState());
});

test('unchanged historical email types are preserved during unrelated updates', () => {
  for (const email of ['correo-invalido', 123, { legacy: 'invalid' }]) {
    const current = legacyState();
    current.trabajadores[0].email = email;
    const proposed = structuredClone(current);
    proposed.trabajadores[1].cargo = 'Cargo QA';
    assert.deepEqual(validateUpdate(current, proposed).trabajadores[0].email, email);
  }
});

test('legacy emails do not block a different module, but other validations remain strict', () => {
  const current = legacyState();
  const proposed = { ...structuredClone(current), minas: [{ id: 'qa-client', nombre: 'Cliente QA' }] };
  assert.equal(validateUpdate(current, proposed).minas[0].nombre, 'Cliente QA');
  proposed.trabajadores[1].rut = '14.507.215-0';
  assert.throws(() => validateUpdate(current, proposed), error => error.code === 'INVALID_WORKER_RUT');
});

test('new and changed emails stay strict despite historical invalid values', () => {
  const current = legacyState();
  for (const email of ['correo-nuevo-invalido', 123, {}, 'x'.repeat(250) + '@qa.cl']) {
    const changed = structuredClone(current);
    changed.trabajadores[1].email = email;
    assert.throws(() => validateUpdate(current, changed), invalidEmail);
    const historicalChanged = structuredClone(current);
    historicalChanged.trabajadores[0].email = email;
    assert.throws(() => validateUpdate(current, historicalChanged), invalidEmail);
  }
  const transplanted = structuredClone(current);
  transplanted.trabajadores[0].id = 'qa-new-id';
  assert.throws(() => validateUpdate(current, transplanted), invalidEmail);
});

test('a historical email can be corrected or cleared', () => {
  for (const email of [' corregido@ejemplo.test ', '']) {
    const current = legacyState();
    const proposed = structuredClone(current);
    proposed.trabajadores[0].email = email;
    assert.equal(validateUpdate(current, proposed).trabajadores[0].email, email.trim());
  }
});

test('contextual updates cannot accept a new invalid email through append fallback', () => {
  const current = { trabajadores: [], asignaciones: [{ id: 'qa-stale', trabId: 'missing', mantId: 'missing' }] };
  const proposed = { ...structuredClone(current), trabajadores: [worker('correo-invalido')] };
  assert.throws(() => validateUpdate(current, proposed), invalidEmail);
  assert.throws(() => validateAppendChanges(current, proposed, ['trabajadores']), invalidEmail);
});


test('sanitizeJson preserves direct worker emails byte-for-byte without exempting other email fields', () => {
  const validHistorical = "o'connor@example.com"
  const invalidHistorical = "correo'antiguo-invalido"
  const sanitized = sanitizeJson({
    trabajadores: [
      { id: 'qa-1', email: validHistorical },
      { id: 'qa-2', email: invalidHistorical },
    ],
    contacto: { email: "o'connor@example.com" },
  })

  assert.equal(sanitized.trabajadores[0].email, validHistorical)
  assert.equal(sanitized.trabajadores[1].email, invalidHistorical)
  assert.equal(sanitized.contacto.email, 'o’connor@example.com')
})
