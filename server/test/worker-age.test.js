import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkerBirthDate } from '../worker-age.js';
import { validateTenantState } from '../validation.js';

test('birth date accepts a person exactly at the configured minimum age', () => {
  assert.equal(validateWorkerBirthDate('2008-10-01', { today: '2026-10-01' }).valid, true);
});

test('birth date accepts a person older than the configured minimum age', () => {
  assert.equal(validateWorkerBirthDate('1980-02-10', { today: '2026-10-01' }).valid, true);
});

test('birth date rejects a person one day before the configured minimum age', () => {
  const result = validateWorkerBirthDate('2008-10-02', { today: '2026-10-01' });
  assert.equal(result.code, 'WORKER_UNDERAGE');
  assert.equal(result.message, 'La persona es menor de edad. Debe tener al menos 18 años para ser registrada.');
});

test('birth date rejects a future date with a clear message', () => {
  const result = validateWorkerBirthDate('2026-10-02', { today: '2026-10-01' });
  assert.equal(result.code, 'INVALID_WORKER_BIRTH_DATE');
  assert.equal(result.message, 'La fecha de nacimiento no puede ser posterior a hoy.');
});

test('backend rejects a future birth date sent without frontend validation', () => {
  const state = { trabajadores: [{ id: 'w1', nombre: 'Persona de prueba', rut: '14.567.890-0', nacimiento: '2999-01-01' }] };
  assert.throws(() => validateTenantState(state), error => error.code === 'INVALID_WORKER_BIRTH_DATE');
});

test('backend rejects an underage worker sent without frontend validation', () => {
  const state = { trabajadores: [{ id: 'w1', nombre: 'Persona de prueba', rut: '14.567.890-0', nacimiento: '2020-01-01' }] };
  assert.throws(() => validateTenantState(state), error => error.code === 'WORKER_UNDERAGE');
});
