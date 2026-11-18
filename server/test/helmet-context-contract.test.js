import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTenantState } from '../validation.js';

const clone = value => structuredClone(value);
const helmet = (overrides = {}) => ({
  casco: 'M',
  helmet: {
    applicability: 'required',
    colorCode: 'azul',
    colorLabel: 'Azul',
    size: 'M',
    ...overrides,
  },
});

function baseState() {
  return {
    helmetColors: [
      { code: 'azul', label: 'Azul', active: true },
      { code: 'verde', label: 'Verde', active: true },
    ],
    minas: [
      { id: 'm1', nombre: 'Cliente uno' },
      { id: 'm2', nombre: 'Cliente dos' },
    ],
    contratos: [
      { id: 'c1', minaId: 'm1', numero: 'CTR-1' },
      { id: 'c2', minaId: 'm2', numero: 'CTR-2' },
    ],
    mantenciones: [
      { id: 'os1', minaId: 'm1', contratoId: 'c1', nombre: 'OS uno' },
      { id: 'os2', minaId: 'm2', contratoId: 'c2', nombre: 'OS dos' },
    ],
    trabajadores: [{
      id: 'w1', nombre: 'Persona existente', rut: '14.567.890-0',
      mineras: ['m1'], epp: helmet(), workerItems: [],
    }],
    asignaciones: [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }],
  };
}

const newWorker = (id, epp = helmet(), extra = {}) => ({
  id, nombre: 'Persona nueva', rut: id === 'w2' ? '12.345.678-5' : '15.432.765-8',
  mineras: [], epp, workerItems: [], ...extra,
});

test('helmet context contract rejects conflicting and forged selector sources', () => {
  const previous = baseState();
  const cases = [
    {
      name: 'empty epp selector cannot hide forged top-level order',
      mutate: state => {
        state.trabajadores[0].epp.helmetContext = {};
        state.trabajadores[0].mantId = 'os2';
        state.trabajadores[0].minaId = 'm2';
      },
      code: 'HELMET_CONTEXT_OUT_OF_SCOPE',
    },
    {
      name: 'worker aliases cannot disagree',
      mutate: state => {
        state.trabajadores[0].mantId = 'os1';
        state.trabajadores[0].orderId = 'os2';
      },
      code: 'INVALID_HELMET_CONTEXT',
    },
    {
      name: 'explicit selector outside persisted scope is rejected',
      mutate: state => {
        state.trabajadores[0].epp.helmetContext = { mantId: 'os2', minaId: 'm2' };
      },
      code: 'HELMET_CONTEXT_OUT_OF_SCOPE',
    },
  ];
  for (const scenario of cases) {
    const next = clone(previous);
    scenario.mutate(next);
    assert.throws(
      () => validateTenantState(next, { previousState: previous }),
      error => error.code === scenario.code,
      scenario.name,
    );
  }
});

test('new workers resolve only validated atomic client and OS associations', () => {
  const clientPrevious = baseState();
  clientPrevious.helmetPolicies = [{
    id: 'client-m1', scope: 'cliente', minaId: 'm1', allowedColorCodes: ['azul'],
  }];
  const clientCandidate = clone(clientPrevious);
  clientCandidate.trabajadores.push(newWorker('w2', helmet({ colorCode: 'verde', colorLabel: 'Verde' }), { mineras: ['m1'] }));
  assert.throws(
    () => validateTenantState(clientCandidate, { previousState: clientPrevious }),
    error => error.code === 'HELMET_COLOR_NOT_ALLOWED',
  );

  const osPrevious = baseState();
  osPrevious.helmetPolicies = [{
    id: 'os-green', scope: 'os', mantId: 'os1', allowedColorCodes: ['verde'],
  }];
  const osCandidate = clone(osPrevious);
  osCandidate.trabajadores.push(newWorker('w2', helmet({ colorCode: 'verde', colorLabel: 'Verde' }), { mineras: ['m1'] }));
  osCandidate.asignaciones.push({ id: 'a2', trabId: 'w2', mantId: 'os1', estado: 'confirmado' });
  const clean = validateTenantState(osCandidate, { previousState: osPrevious });
  const stored = clean.trabajadores.find(worker => worker.id === 'w2');
  assert.deepEqual(stored.epp.helmet.resolvedContext, { mantId: 'os1', minaId: 'm1' });

  const outOfScope = clone(osPrevious);
  outOfScope.trabajadores.push(newWorker('w2', helmet({
    colorCode: 'verde', colorLabel: 'Verde',
    resolvedContext: { mantId: 'os2', minaId: 'm2' },
  })));
  assert.throws(
    () => validateTenantState(outOfScope, { previousState: osPrevious }),
    error => error.code === 'HELMET_CONTEXT_OUT_OF_SCOPE',
  );

  const previousBaseline = baseState();
  const baseline = clone(previousBaseline);
  baseline.trabajadores.push(newWorker('w2'));
  const baselineClean = validateTenantState(baseline, { previousState: previousBaseline });
  const baselineWorker = baselineClean.trabajadores.find(worker => worker.id === 'w2');
  assert.equal(baselineWorker.epp.helmet.resolvedContext, undefined);
});

test('helmet delivery validates aliases, re-materializes snapshots, and protects legacy rows', () => {
  const state = baseState();
  state.eppDeliveries = [{
    id: 'legacy-delivery', workerId: 'w1', mantId: 'os1',
    itemId: 'helmet-legacy', itemName: 'Casco de seguridad', qty: 1,
    deliveredAt: '2026-11-17',
  }];
  const moved = clone(state);
  moved.eppDeliveries[0].mantId = 'os2';
  assert.throws(
    () => validateTenantState(moved, { previousState: state }),
    error => error.code === 'HELMET_DELIVERY_COLOR_REQUIRED',
  );

  const aliases = clone(baseState());
  aliases.eppDeliveries = [{
    id: 'alias-delivery', workerId: 'w1', mantId: 'os1', orderId: 'os2',
    itemId: 'helmet', itemName: 'Casco de seguridad', qty: 1,
    deliveredAt: '2026-11-17', helmetColorCode: 'azul', helmetColorLabel: 'Azul',
  }];
  assert.throws(() => validateTenantState(aliases), error => error.code === 'INVALID_HELMET_CONTEXT');

  const forged = clone(baseState());
  forged.eppDeliveries = [{
    id: 'snapshot-delivery', workerId: 'w1', mantId: 'os1',
    itemId: 'helmet', itemName: 'Casco de seguridad', qty: 1,
    deliveredAt: '2026-11-17', helmetColorCode: 'azul', helmetColorLabel: 'Azul',
    helmetSnapshot: { mantId: 'os2', minaId: 'm2', policyId: 'forged' },
  }];
  const clean = validateTenantState(forged);
  assert.equal(clean.eppDeliveries[0].helmetSnapshot.mantId, 'os1');
  assert.equal(clean.eppDeliveries[0].helmetSnapshot.minaId, 'm1');
  assert.notEqual(clean.eppDeliveries[0].helmetSnapshot.policyId, 'forged');
});

test('legacy helmet inventory allows harmless stock maintenance but not identity rewrites', () => {
  const previous = baseState();
  previous.inventoryItems = [{
    id: 'legacy-helmet', name: 'Casco de seguridad', category: 'epp',
    stock: 1, warehouseId: 'b1',
  }];

  const harmless = clone(previous);
  harmless.inventoryItems[0].stock = 2;
  harmless.inventoryItems[0].warehouseId = 'b2';
  assert.doesNotThrow(() => validateTenantState(harmless, { previousState: previous }));

  const renamed = clone(previous);
  renamed.inventoryItems[0].name = 'Equipo genérico';
  assert.throws(
    () => validateTenantState(renamed, { previousState: previous }),
    error => error.code === 'HELMET_INVENTORY_COLOR_REQUIRED',
  );
});
