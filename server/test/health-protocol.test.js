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
test('treats each row as an individual evaluation, including renewals with equal dates', () => {
  const first = { ...current, evaluatedOn: '2026-10-14', vence: '2027-10-14' };
  const renewal = { ...current, id: 'second', protocolo: ' seguimiento qa ', evaluatedOn: '2026-10-14', vence: '2027-10-14' };
  assert.doesNotThrow(() => validateTenantState(state([first, renewal])));
});
test('keeps global and client-scoped evaluations separate and validates the explicit scope', () => {
  const global = { ...current, scope: 'global' };
  const byClient = { ...current, id: 'client-evaluation', scope: 'cliente', minaId: 'qa-client' };
  assert.doesNotThrow(() => validateTenantState(state([global, byClient])));
  assert.throws(() => validateTenantState(state([{ ...current, scope: 'cliente' }])), error => error.code === 'INVALID_REFERENCE');
  assert.throws(() => validateTenantState(state([{ ...current, scope: 'global', minaId: 'qa-client' }])), error => error.code === 'INVALID_REFERENCE');
});
test('keeps different clients and historical validity periods distinct', () => {
  const one = { id: 'one', trabId: 'qa-person', minaId: 'qa-client', tipo: 'Hipobaria', vence: '2027-01-01' };
  assert.doesNotThrow(() => validateTenantState(state([one, { ...one, id: 'two', vence: '2028-01-01' }])));
});


test('resolves one canonical person identity across current and historical aliases', () => {
  assert.doesNotThrow(() => validateTenantState(state([{ ...current, workerId: 'qa-person', trabId: 'qa-person', personaId: 'qa-person' }])))
  assert.throws(() => validateTenantState(state([{ ...current, workerId: '', trabId: '', personaId: '' }])), error => error.code === 'INVALID_REFERENCE')
  assert.throws(() => validateTenantState(state([{ ...current, workerId: 'qa-person', trabId: 'other-person' }])), error => error.code === 'INVALID_REFERENCE')
})

test('preserves an unchanged legacy reference while allowing an unrelated save, but rejects a changed contradiction', () => {
  const legacy = { id: 'legacy', workerId: 'qa-person', trabId: 'unknown-person', tipo: 'Seguimiento QA', estado: 'seguimiento' };
  const before = state([legacy]);
  assert.doesNotThrow(() => validateTenantState(state([{ ...legacy, notes: 'Conservado para regularización' }]), { previousState: before }));
  assert.throws(() => validateTenantState(state([{ ...legacy, trabId: 'another-person' }]), { previousState: before }), error => error.code === 'INVALID_REFERENCE');
})
