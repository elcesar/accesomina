import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFullQaState, moduleCoverage, validateFullQaState } from '../../tools/qa-full-load.mjs';
import { validateTenantState } from '../validation.js';

test('QA completa por menu: carga datos reales simulados en todas las vistas principales', () => {
  const { state, coverage } = validateFullQaState();

  assert.equal(state.minas.length, 5);
  assert.equal(state.contratos.length, 8);
  assert.equal(state.mantenciones.length, 12);
  assert.equal(state.trabajadores.length, 45);
  assert.equal(state.eppDeliveries.length, 90);
  assert.equal(state.vehiculos.length, 8);
  assert.equal(state.hoteles.length, 5);
  assert.equal(state.tenantUsers.length, 5);
  assert.equal(coverage.length, 33);
  assert.deepEqual(coverage.filter(row => !row.ok), []);
});

test('QA completa por menu: valida relaciones entre cliente, contrato, servicio y recursos', () => {
  const state = validateTenantState(buildFullQaState());

  for (const contract of state.contratos) {
    assert.ok(state.minas.some(client => client.id === contract.minaId), `Contrato sin cliente: ${contract.numero}`);
  }
  for (const service of state.mantenciones) {
    const contract = state.contratos.find(row => row.id === service.contratoId);
    assert.ok(contract, `Servicio sin contrato: ${service.nombre}`);
    assert.equal(service.minaId, contract.minaId, `Servicio ${service.nombre} no coincide con cliente del contrato`);
  }
  for (const assignment of state.asignaciones) {
    assert.ok(state.trabajadores.some(worker => worker.id === assignment.trabId), `Asignacion sin trabajador: ${assignment.id}`);
    assert.ok(state.mantenciones.some(service => service.id === assignment.mantId), `Asignacion sin servicio: ${assignment.id}`);
  }
  for (const lodging of state.hotelAsig) {
    const service = state.mantenciones.find(row => row.id === lodging.mantId);
    const hotel = state.hoteles.find(row => row.id === lodging.hotelId);
    assert.ok(hotel.minaIds.includes(service.minaId), `Hotel ${hotel.nombre} no corresponde al cliente del servicio ${service.nombre}`);
  }
});

test('QA completa por menu: rechaza duplicados criticos dentro de la misma empresa', () => {
  const duplicateRut = buildFullQaState();
  duplicateRut.trabajadores.push({ ...duplicateRut.trabajadores[0], id: 'qa-tra-rut-duplicado', nombre: 'Duplicado RUT QA' });
  assert.throws(() => validateTenantState(duplicateRut), error => error.code === 'DUPLICATE_WORKER_RUT');

  const duplicateContract = buildFullQaState();
  duplicateContract.contratos[7].numero = duplicateContract.contratos[0].numero.toLowerCase();
  assert.throws(() => validateTenantState(duplicateContract), error => error.code === 'DUPLICATE_CONTRACT_NUMBER');

  const duplicateVehicle = buildFullQaState();
  duplicateVehicle.vehiculos[7].patente = duplicateVehicle.vehiculos[0].patente.replaceAll('-', '');
  assert.throws(() => validateTenantState(duplicateVehicle), error => error.code === 'DUPLICATE_VEHICLE');

  const duplicateEpp = buildFullQaState();
  duplicateEpp.eppDeliveries.push({ ...duplicateEpp.eppDeliveries[0], id: 'qa-epp-duplicado' });
  assert.throws(() => validateTenantState(duplicateEpp), error => error.code === 'DUPLICATE_EPP_DELIVERY');
});

test('QA completa por menu: genera alertas utiles para operacion', () => {
  const state = validateTenantState(buildFullQaState());
  const coverage = moduleCoverage(state);
  const alertRow = coverage.find(row => row.module === 'Alertas');

  assert.ok(alertRow.ok);
  assert.ok(state.vehiculos.some(vehicle => vehicle.revisionTecnica && vehicle.revisionTecnica <= '2026-08-20'));
  assert.ok(state.credenciales.some(credential => credential.vence && credential.vence <= '2026-08-20'));
  assert.ok(state.protocolosSalud.some(protocol => protocol.vence && protocol.vence <= '2026-08-20'));
  assert.ok(state.trabajadores.some(worker => worker.bloqueado));
});
