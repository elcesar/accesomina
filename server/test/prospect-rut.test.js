import test from 'node:test';
import assert from 'node:assert/strict';
import { OPPORTUNITY_COLLECTIONS } from '../../shared/opportunity-domain.js';
import { optionalHistoricalRut } from '../../shared/rut.js';
import { sanitizeJson, validateTenantState } from '../validation.js';
import { friendlyApiError } from '../../nexo-v2/src/services/api.js';

const opportunity = { id: 'qa-opportunity', company: 'Empresa ficticia QA', type: 'nuevo_cliente', stage: 'prospecto' };
const cases = [
  { name: 'absent', value: undefined, expected: undefined },
  { name: 'null', value: null, expected: null },
  { name: 'empty', value: '', expected: '' },
  { name: 'whitespace', value: '   ', expected: '' },
  { name: 'formatted', value: '13.848.379-7', expected: '13.848.379-7' },
  { name: 'seven-digit body', value: '1.234.567-4', expected: '1.234.567-4' },
  { name: 'lowercase K', value: '12345670k', expected: '12.345.670-K' },
  { name: 'unformatted', value: '138483797', expected: '13.848.379-7' },
  { name: 'surrounding whitespace', value: ' 13.848.379-7 ', expected: '13.848.379-7' },
  { name: 'invalid verifier', value: '11.111.111-2', invalid: true },
  { name: 'incomplete', value: '12.345', invalid: true },
  { name: 'letters', value: 'x13.848.379-7', invalid: true },
  { name: 'markup', value: '<13.848.379-7>', invalid: true },
  { name: 'control characters', value: '13.848.379-7\u0000', invalid: true },
  { name: 'number', value: 138483797, invalid: true },
  { name: 'boolean', value: false, invalid: true },
  { name: 'array', value: [], invalid: true },
  { name: 'object', value: { rut: '13.848.379-7' }, invalid: true },
  { name: 'excessive format length', value: '.'.repeat(21) + '138483797', invalid: true },
];

for (const key of OPPORTUNITY_COLLECTIONS) {
  for (const item of cases) {
    test(`${key}: shared policy and authoritative validation agree for ${item.name}`, () => {
      const record = { ...opportunity, rut: item.value };
      const result = optionalHistoricalRut(item.value);
      if (item.invalid) {
        assert.ok(result.error);
        assert.throws(() => validateTenantState({ [key]: [record] }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
      } else {
        assert.equal(result.error, null);
        assert.equal(validateTenantState({ [key]: [record] })[key][0].rut, item.expected);
      }
    });
  }
}

test('persisted identity preserves an unchanged historical RUT while unrelated data changes', () => {
  const old = { ...opportunity, rut: " 'RUT histórico sin regularizar' " };
  const previousState = { opportunities: [old] };
  const current = { prospectos: [{ ...old, phone: 'Teléfono QA' }] };
  assert.equal(validateTenantState(current, { previousState }).prospectos[0].rut, old.rut);
  assert.equal(current.prospectos[0].rut, old.rut);
});

test('new identities and reordered records cannot borrow an invalid historical RUT', () => {
  const old = { ...opportunity, rut: '11.111.111-2' };
  for (const proposed of [{ ...old, id: 'new-id' }, { ...old, id: undefined }, { ...old, rut: '11.111.111-3' }]) {
    assert.throws(() => validateTenantState({ prospectos: [proposed] }, { previousState: { opportunities: [old] } }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
  }
  assert.ok(optionalHistoricalRut(old.rut, { previousValue: old.rut }).error);
});

test('an invalid historical RUT can be cleared or corrected without altering the source record', () => {
  const old = { ...opportunity, rut: '11.111.111-2' };
  for (const [value, expected] of [['', ''], [' 138483797 ', '13.848.379-7']]) {
    assert.equal(validateTenantState({ prospectos: [{ ...old, rut: value }] }, { previousState: { prospectos: [old] } }).prospectos[0].rut, expected);
  }
  assert.equal(old.rut, '11.111.111-2');
});

test('legacy object collections retain identity and strict validation', () => {
  const old = { ...opportunity, rut: " 'RUT antiguo' " };
  const result = validateTenantState({ oportunidades: { old: { ...old, phone: 'QA' } } }, { previousState: { oportunidades: { old } } });
  assert.equal(result.oportunidades.old.rut, old.rut);
  assert.throws(() => validateTenantState({ oportunidades: { new: { ...old, id: 'new-id' } } }, { previousState: { oportunidades: { old } } }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
});

test('server RUT rejections have an actionable field message', () => {
  assert.equal(friendlyApiError('INVALID_OPPORTUNITY_RUT', 409), 'Ingresa un RUT chileno válido o deja el campo vacío.');
});

test('overlapping collection IDs retain each persisted RUT during an unrelated state edit', () => {
  const previousState = {
    prospectos: [{ ...opportunity, stage: 'perdida', rut: '13.848.379-7' }],
    oportunidades: [{ ...opportunity, stage: 'perdida', rut: 'otro RUT histórico' }],
    opportunities: [{ ...opportunity, stage: 'perdida', rut: 'histórico sin regularizar' }],
  };
  const result = validateTenantState({ ...structuredClone(previousState), configuracion: { note: 'changed' } }, { previousState });
  for (const key of OPPORTUNITY_COLLECTIONS) assert.deepEqual(result[key], previousState[key]);
  assert.throws(() => validateTenantState({ ...previousState, opportunities: [{ ...previousState.opportunities[0], rut: 'otro RUT histórico' }] }, { previousState }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
});

test('only the resolved historical winner can migrate into the canonical store', () => {
  const older = { ...opportunity, stage: 'perdida', rut: 'histórico secundario' };
  const winner = { ...older, rut: 'histórico prioritario' };
  const previousState = { oportunidades: [winner], opportunities: [older] };
  const result = validateTenantState({ prospectos: [{ ...winner, phone: 'QA' }], oportunidades: [], opportunities: [] }, { previousState });
  assert.equal(result.prospectos[0].rut, winner.rut);
  assert.throws(() => validateTenantState({ prospectos: [older], oportunidades: [], opportunities: [] }, { previousState }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
});

test('new aliases and existing IDs without a historical RUT cannot borrow another store value', () => {
  const invalid = { ...opportunity, stage: 'perdida', rut: 'histórico sin regularizar' };
  const withoutRut = { ...opportunity, stage: 'perdida' };
  const scenarios = [
    { previous: { prospectos: [invalid] }, proposed: { prospectos: [invalid], opportunities: [invalid] } },
    { previous: { prospectos: [withoutRut], opportunities: [invalid] }, proposed: { prospectos: [invalid], opportunities: [] } },
    { previous: { prospectos: [invalid], opportunities: [withoutRut] }, proposed: { prospectos: [invalid], opportunities: [invalid] } },
  ];
  for (const { previous, proposed } of scenarios) {
    assert.throws(() => validateTenantState(proposed, { previousState: previous }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
  }
});

test('unchanged historical JSON RUTs survive sanitation and JSONB key reordering', () => {
  const old = { ...opportunity, rut: { bad: '<historic>', nested: { a: 1, b: 2 } } };
  const input = { prospectos: [{ ...old, rut: { nested: { b: 2, a: 1 }, bad: '<historic>' }, phone: '<changed>' }] };
  const result = validateTenantState(input, { previousState: { prospectos: [old] } });
  assert.deepEqual(result.prospectos[0].rut, old.rut);
  assert.equal(result.prospectos[0].phone, 'changed');
  result.prospectos[0].rut.bad = 'mutated copy';
  assert.equal(input.prospectos[0].rut.bad, '<historic>');
  assert.equal(old.rut.bad, '<historic>');
});

test('new or modified JSON RUTs including prototype keys cannot become historical after sanitization', () => {
  const old = { ...opportunity, rut: { bad: '<historic>' } };
  for (const key of ['__proto__', 'prototype', 'constructor']) {
    const changed = JSON.parse(`{"bad":"<historic>","${key}":{"polluted":true}}`);
    for (const row of [{ ...old, rut: changed }, { ...old, id: 'new-id' }]) {
      assert.throws(() => validateTenantState({ prospectos: [row] }, { previousState: { prospectos: [old] } }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
    }
  }
  assert.throws(() => validateTenantState({ prospectos: [{ ...old, rut: { bad: 'historic' } }] }, { previousState: { prospectos: [old] } }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
  assert.equal({}.polluted, undefined);
  const clean = sanitizeJson({ prospectos: [{ ...old, rut: JSON.parse('{"bad":"<historic>","__proto__":{"polluted":true}}') }] });
  assert.deepEqual(clean.prospectos[0].rut, { bad: 'historic' });
});

test('preserving a typed historical RUT does not exempt nested unrelated fields from sanitization', () => {
  const old = { ...opportunity, rut: { bad: '<historic>' } };
  const nested = JSON.parse('{"rut":{"bad":"<nested>","__proto__":{"polluted":true}},"note":"<note>"}');
  const result = validateTenantState({ prospectos: [old], configuracion: { prospectos: [nested] } }, { previousState: { prospectos: [old] } });
  assert.deepEqual(result.prospectos[0].rut, old.rut);
  assert.deepEqual(result.configuracion.prospectos[0], { rut: { bad: 'nested' }, note: 'note' });
  assert.equal({}.polluted, undefined);
});
