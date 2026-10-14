import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTenantState } from '../validation.js';

const state = protocols => ({
  trabajadores: [{ id: 'qa-person', nombre: 'Persona QA', rut: '11.111.111-1' }],
  minas: [{ id: 'qa-client', nombre: 'Cliente QA' }],
  protocolosSalud: protocols,
});
const current = { id: 'qa-protocol', workerId: 'qa-person', protocolo: 'Seguimiento QA', riesgo: 'Ruido', estado: 'seguimiento', fileId: 'qa-file' };

test('accepts the actual health form payload without a client and preserves evidence', () => {
  const saved = validateTenantState(state([current]));
  assert.deepEqual(saved.protocolosSalud, [current]);
});
test('keeps historical worker/client/type records compatible', () => {
  const legacy = { id: 'legacy', trabId: 'qa-person', minaId: 'qa-client', tipo: 'Hipobaria', vence: '2027-01-01' };
  assert.deepEqual(validateTenantState(state([legacy])).protocolosSalud, [legacy]);
});
test('accepts compatible aliases and rejects conflicting identities', () => {
  assert.doesNotThrow(() => validateTenantState(state([{ ...current, trabId: 'qa-person', personaId: 'qa-person' }])));
  assert.throws(() => validateTenantState(state([{ ...current, trabId: 'other-person' }])), e => e.code === 'INVALID_REFERENCE');
});
test('rejects missing or unknown persons and explicit unknown clients', () => {
  for (const row of [{ ...current, workerId: '' }, { ...current, workerId: 'missing' }, { ...current, minaId: 'missing' }]) {
    assert.throws(() => validateTenantState(state([row])), e => e.code === 'INVALID_REFERENCE');
  }
  assert.doesNotThrow(() => validateTenantState(state([{ ...current, minaId: 'qa-client' }])));
});
test('permits distinct current protocols for the same person', () => {
  assert.doesNotThrow(() => validateTenantState(state([current, { ...current, id: 'second', protocolo: 'Otro seguimiento QA' }])));
});
test('rejects equivalent protocols after trimming and case normalization', () => {
  assert.throws(() => validateTenantState(state([current, { ...current, id: 'second', protocolo: ' seguimiento qa ' }])), e => e.code === 'DUPLICATE_HEALTH_PROTOCOL');
});
test('normalizes duplicate identities across the current and historical names', () => {
  assert.throws(() => validateTenantState(state([current, { id: 'legacy', trabId: 'qa-person', tipo: 'Seguimiento QA' }])), e => e.code === 'DUPLICATE_HEALTH_PROTOCOL');
});
test('keeps different clients and historical validity periods distinct', () => {
  const one = { id: 'one', trabId: 'qa-person', minaId: 'qa-client', tipo: 'Hipobaria', vence: '2027-01-01' };
  assert.doesNotThrow(() => validateTenantState(state([one, { ...one, id: 'two', vence: '2028-01-01' }])));
});
