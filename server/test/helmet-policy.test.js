import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HELMET_APPLICABILITY,
  helmetContextFromWorker,
  isHelmetItem,
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
    helmetColorCode: 'azul', helmetColorLabel: 'Azul', helmetClass: 'A', helmetExpiryDate: '2029-12-31', size: 'M',
    brandModel: 'Modelo QA', certification: 'EN 397', lotSerial: 'L-001',
    condition: 'nuevo', deliveredAt: '2026-11-17',
  }, { id: 'delivery-1', createdAt: '2026-11-17T12:00:00.000Z' });
  state.eppDeliveries = [delivery];
  const clean = validateTenantState(state);
  assert.deepEqual(state.trabajadores[0].epp, before);
  assert.equal(clean.eppDeliveries[0].helmetColorLabel, 'Azul');
  assert.equal(clean.eppDeliveries[0].helmetSnapshot.colorCode, 'azul');
  assert.equal(clean.eppDeliveries[0].helmetExpiryDate, '2029-12-31');
  assert.equal(clean.eppDeliveries[0].lotSerial, 'L-001');
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


test('worker PATCH preserves client context for client-scoped helmet policies', () => {
  const state = baseState();
  state.helmetColors = [
    { code: 'azul', label: 'Azul', active: true },
    { code: 'verde', label: 'Verde', active: true },
  ];
  state.helmetPolicies = [{
    id: 'client-policy',
    scope: 'cliente',
    minaId: 'm1',
    allowedColorCodes: ['azul'],
    requireModelClass: true,
  }];
  state.trabajadores[0].epp = requiredHelmet({ modelClass: 'Clase A' });
  const worker = state.trabajadores[0];

  assert.throws(
    () => patchWorkerProfile(
      [worker],
      'w1',
      { epp: requiredHelmet({ colorCode: 'verde', colorLabel: 'Verde', modelClass: 'Clase A' }) },
      recordRevision(worker),
      state,
    ),
    error => error.code === 'HELMET_COLOR_NOT_ALLOWED',
  );
  assert.throws(
    () => patchWorkerProfile(
      [worker],
      'w1',
      { epp: requiredHelmet({ modelClass: '' }) },
      recordRevision(worker),
      state,
    ),
    error => error.code === 'HELMET_MODEL_CLASS_REQUIRED',
  );
});

test('worker PATCH rejects a helmet context outside the worker client scope', () => {
  const state = baseState();
  state.minas.push({ id: 'm2', nombre: 'Cliente ajeno' });
  state.contratos.push({ id: 'c2', minaId: 'm2', numero: 'CTR-2' });
  state.mantenciones.push({ id: 'os-ajena', minaId: 'm2', contratoId: 'c2', nombre: 'OS ajena' });
  state.trabajadores[0].epp = requiredHelmet();
  const worker = state.trabajadores[0];
  assert.throws(
    () => patchWorkerProfile(
      [worker],
      'w1',
      { epp: { ...requiredHelmet(), helmetContext: { mantId: 'os-ajena', minaId: 'm2' } } },
      recordRevision(worker),
      state,
    ),
    error => error.code === 'HELMET_CONTEXT_OUT_OF_SCOPE',
  );
});

test('manual helmet delivery without an order inherits the recipient client policy', () => {
  const state = baseState();
  state.helmetColors = [
    { code: 'azul', label: 'Azul', active: true },
    { code: 'verde', label: 'Verde', active: true },
  ];
  state.helmetPolicies = [{ id: 'client-policy', scope: 'cliente', minaId: 'm1', allowedColorCodes: ['azul'] }];
  state.eppDeliveries = [{
    id: 'manual-delivery',
    workerId: 'w1',
    itemId: 'manual-helmet',
    itemName: 'Casco de seguridad',
    qty: 1,
    deliveryStatus: 'entregado',
    condition: 'nuevo',
    deliveredAt: '2026-11-17',
    helmetColorCode: 'verde',
    helmetColorLabel: 'Verde',
  }];
  assert.throws(() => validateTenantState(state), error => error.code === 'HELMET_COLOR_NOT_ALLOWED');
});

test('manual helmet delivery without an order rejects ambiguous active orders', () => {
  const state = baseState();
  state.mantenciones.push({ id: 'os2', minaId: 'm1', contratoId: 'c1', nombre: 'OS 2' });
  state.asignaciones = [
    { id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' },
    { id: 'a2', trabId: 'w1', mantId: 'os2', estado: 'confirmado' },
  ];
  state.helmetColors = [{ code: 'azul', label: 'Azul', active: true }];
  state.eppDeliveries = [{
    id: 'ambiguous-delivery',
    workerId: 'w1',
    itemId: 'manual-helmet',
    itemName: 'Casco de seguridad',
    qty: 1,
    deliveryStatus: 'entregado',
    condition: 'nuevo',
    deliveredAt: '2026-11-17',
    helmetColorCode: 'azul',
    helmetColorLabel: 'Azul',
  }];
  assert.throws(() => validateTenantState(state), error => error.code === 'HELMET_POLICY_CONTEXT_REQUIRED');
});

test('ambiguous active policies in the same scope are rejected', () => {
  const state = baseState();
  state.helmetPolicies = [
    { id: 'client-a', scope: 'cliente', minaId: 'm1', active: true },
    { id: 'client-b', scope: 'cliente', minaId: 'm1', active: true },
  ];
  assert.throws(() => validateTenantState(state), error => error.code === 'DUPLICATE_HELMET_POLICY_SCOPE');
});


test('plural helmet labels and a referenced inventory helmet are not bypassed', () => {
  assert.equal(isHelmetItem('Cascos de seguridad'), true);
  const state = baseState();
  state.inventoryItems = [{ id: 'i-helmet', name: 'Cascos de seguridad', category: 'epp', stock: 1, helmetColorCode: 'azul', helmetColorLabel: 'Azul' }];
  state.eppDeliveries = [{
    id: 'd-generic', workerId: 'w1', mantId: 'os1', inventoryId: 'i-helmet',
    itemId: 'i-helmet', itemName: 'EPP genérico', qty: 1,
    deliveryStatus: 'entregado', condition: 'nuevo', deliveredAt: '2026-11-17',
  }];
  assert.throws(() => validateTenantState(state), error => error.code === 'HELMET_DELIVERY_COLOR_REQUIRED');
});

test('current assignment context wins over an old helmet snapshot after reassignment', () => {
  const state = baseState();
  state.mantenciones.push({ id: 'os-old', minaId: 'm1', contratoId: 'c1', nombre: 'OS antigua' });
  state.asignaciones = [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }];
  const worker = {
    ...state.trabajadores[0],
    epp: requiredHelmet({ policySnapshot: { mantId: 'os-old', minaId: 'm1' } }),
  };
  assert.equal(helmetContextFromWorker(worker, state).mantId, 'os1');
});


test('an explicit active-color restriction never falls back to every active colour', () => {
  const state = materializeHelmetState({
    helmetColors: [{ code: 'azul', label: 'Azul', active: false }, { code: 'verde', label: 'Verde', active: true }],
    helmetPolicies: [{ id: 'tenant', scope: 'tenant', allowedColorCodes: ['azul'] }],
  });
  const policy = resolveHelmetPolicy(state, {});
  assert.equal(policy.hasColorRestriction, true);
  assert.deepEqual(policy.allowedColorCodes, []);
});


test('multiple active orders require an explicit helmet context instead of reusing a snapshot', () => {
  const state = baseState();
  state.mantenciones.push({ id: 'os2', minaId: 'm1', contratoId: 'c1', nombre: 'OS 2' });
  state.asignaciones = [
    { id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' },
    { id: 'a2', trabId: 'w1', mantId: 'os2', estado: 'confirmado' },
  ];
  const worker = { ...state.trabajadores[0], epp: requiredHelmet({ policySnapshot: { mantId: 'os1', minaId: 'm1' } }) };
  assert.equal(helmetContextFromWorker(worker, state).multipleActiveOrders, true);
  assert.equal(helmetContextFromWorker(worker, state).mantId, '');
  assert.throws(() => validateTenantState({ ...state, trabajadores: [worker] }, { previousState: state }), error => error.code === 'HELMET_POLICY_CONTEXT_REQUIRED');

  worker.epp.helmetContext = { mantId: 'os2', minaId: 'm1' };
  assert.doesNotThrow(() => validateTenantState({ ...state, trabajadores: [worker] }, { previousState: state }));
});


test('an inactive-only restriction rejects other active colours server-side', () => {
  const state = baseState();
  state.helmetColors = [{ code: 'azul', label: 'Azul', active: false }, { code: 'verde', label: 'Verde', active: true }];
  state.helmetPolicies = [{ id: 'tenant', scope: 'tenant', allowedColorCodes: ['azul'] }];
  state.trabajadores[0].epp = {
    casco: 'M',
    helmet: { applicability: 'required', colorCode: 'verde', colorLabel: 'Verde', size: 'M' },
  };
  assert.throws(() => validateTenantState(state), error => error.code === 'HELMET_COLOR_NOT_ALLOWED');
});
