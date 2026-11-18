import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HELMET_APPLICABILITY,
  materializeHelmetState,
  normalizeHelmetRequirement,
  resolveHelmetPolicy,
} from '../../shared/helmet-policy.js';
import { normalizeWorkerEpp } from '../../nexo-v2/src/config/ppe-catalog.js';
import { buildEppDelivery } from '../../nexo-v2/src/services/epp-delivery.js';
import { validateTenantState } from '../validation.js';
import { patchWorkerProfile, recordRevision } from '../worker-records.js';

const baseState = () => ({
  minas: [{ id: 'm1', nombre: 'Cliente' }],
  contratos: [{ id: 'c1', minaId: 'm1', numero: 'CTR-1' }],
  mantenciones: [{ id: 'os1', minaId: 'm1', contratoId: 'c1', nombre: 'OS 1', inicio: '2026-01-01', termino: '2026-12-31' }],
  trabajadores: [{ id: 'w1', nombre: 'Persona QA', rut: '14.567.890-0', mineras: ['m1'], workerItems: [] }],
});

const requiredHelmet = (overrides = {}) => ({
  casco: 'M',
  helmet: {
    applicability: HELMET_APPLICABILITY.REQUIRED,
    colorCode: 'azul',
    colorLabel: 'Azul',
    size: 'M',
    ...overrides,
  },
});

test('legacy casco Talla única remains readable but has unknown applicability', () => {
  const epp = normalizeWorkerEpp({ casco: 'Talla única' });
  assert.equal(epp.casco, 'Talla única');
  assert.equal(epp.helmet.applicability, HELMET_APPLICABILITY.UNKNOWN);
  assert.equal(normalizeHelmetRequirement({ casco: 'Talla única' }).legacySize, 'Talla única');
});

test('safe tenant default requires colour and size only when helmet is required', () => {
  const notRequired = baseState();
  notRequired.trabajadores[0].epp = { helmet: { applicability: HELMET_APPLICABILITY.NOT_REQUIRED, reason: 'Administrativo' } };
  assert.doesNotThrow(() => validateTenantState(notRequired));

  const missing = baseState();
  missing.trabajadores[0].epp = { helmet: { applicability: HELMET_APPLICABILITY.REQUIRED } };
  assert.throws(() => validateTenantState(missing), error => error.code === 'HELMET_COLOR_REQUIRED');

  const valid = baseState();
  valid.trabajadores[0].epp = requiredHelmet();
  assert.doesNotThrow(() => validateTenantState(valid));
});

test('order policy overrides client policy which overrides tenant policy', () => {
  const state = materializeHelmetState({
    helmetColors: [
      { code: 'azul', label: 'Azul' },
      { code: 'verde', label: 'Verde' },
      { code: 'rojo', label: 'Rojo' },
    ],
    helmetPolicies: [
      { id: 'tenant', scope: 'tenant', allowedColorCodes: ['azul'] },
      { id: 'client', scope: 'cliente', minaId: 'm1', allowedColorCodes: ['verde'] },
      { id: 'order', scope: 'os', mantId: 'os1', allowedColorCodes: ['rojo'] },
    ],
  });
  assert.deepEqual(resolveHelmetPolicy(state, { minaId: 'm1', mantId: 'os1' }).allowedColorCodes, ['rojo']);
  assert.deepEqual(resolveHelmetPolicy(state, { minaId: 'm1' }).allowedColorCodes, ['verde']);
  assert.deepEqual(resolveHelmetPolicy(state, {}).allowedColorCodes, ['azul']);
});

test('renamed or inactive colours retain an unchanged historical worker snapshot', () => {
  const previous = baseState();
  previous.helmetColors = [{ code: 'azul', label: 'Azul', active: true }];
  previous.trabajadores[0].epp = requiredHelmet();
  const next = structuredClone(previous);
  next.helmetColors = [{ code: 'azul', label: 'Azul corporativo', active: false }];
  assert.doesNotThrow(() => validateTenantState(next, { previousState: previous }));
});

test('delivery snapshots the physical helmet without mutating worker requirements', () => {
  const state = baseState();
  state.helmetColors = [{ code: 'azul', label: 'Azul' }];
  state.trabajadores[0].epp = requiredHelmet();
  const before = structuredClone(state.trabajadores[0].epp);
  const delivery = buildEppDelivery({
    workerId: 'w1', orderId: 'os1', itemName: 'Casco de seguridad', quantity: 1,
    helmetColorCode: 'azul', helmetColorLabel: 'Azul', size: 'M',
    brandModel: 'Modelo QA', certification: 'EN 397', lotSerial: 'L-001',
    condition: 'nuevo', deliveredAt: '2026-11-17',
  }, { id: 'delivery-1', createdAt: '2026-11-17T12:00:00.000Z' });
  state.eppDeliveries = [delivery];
  const clean = validateTenantState(state);
  assert.deepEqual(state.trabajadores[0].epp, before);
  assert.equal(clean.eppDeliveries[0].helmetColorLabel, 'Azul');
  assert.equal(clean.eppDeliveries[0].helmetSnapshot.colorCode, 'azul');
});

test('worker PATCH cannot bypass the applicable helmet policy', () => {
  const state = baseState();
  state.trabajadores[0].epp = requiredHelmet();
  const worker = state.trabajadores[0];
  assert.throws(
    () => patchWorkerProfile(
      [worker],
      'w1',
      { epp: { helmet: { applicability: HELMET_APPLICABILITY.REQUIRED, colorCode: '', colorLabel: '', size: 'M' } } },
      recordRevision(worker),
      state,
    ),
    error => error.code === 'HELMET_COLOR_REQUIRED',
  );
});
