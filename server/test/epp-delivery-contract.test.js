import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEppDelivery } from '../../nexo-v2/src/services/epp-delivery.js';
import { normalizeTenantState } from '../routes/state.js';
import { validateTenantState } from '../validation.js';

const baseState=()=>({
  trabajadores:[{id:'w1',rut:'14.567.890-0',nombre:'Persona'}],
  minas:[{id:'m1',nombre:'Cliente'}],
  contratos:[{id:'c1',minaId:'m1'}],
  mantenciones:[{id:'p1',minaId:'m1',contratoId:'c1',inicio:'2026-01-01',termino:'2026-12-31'}],
});

test('new EPP delivery uses the canonical server contract',()=>{
  const delivery=buildEppDelivery({workerId:'w1',orderId:'p1',itemName:'Casco de seguridad',quantity:1,condition:'nuevo',deliveredAt:'2026-09-24'},{id:'e1',createdAt:'2026-09-24T12:00:00.000Z'});
  assert.equal(delivery.itemId,'manual:casco-de-seguridad');
  assert.equal(delivery.qty,1);
  assert.equal(delivery.mantId,'p1');
  assert.doesNotThrow(()=>validateTenantState({...baseState(),eppDeliveries:[delivery]}));
});

test('legacy EPP delivery fields are normalized before validating the full tenant state',()=>{
  const state=normalizeTenantState({...baseState(),contratos:[{id:'c1',minaId:'m1'},{id:'c2',minaId:'m1',numero:'CTR-002'}],eppDeliveries:[{id:'legacy-1',trabId:'w1',orderId:'p1',inventoryId:'helmet',nombre:'Casco',quantity:1,fechaEntrega:'2026-09-24',condition:'Buen estado'}]});
  assert.equal(state.eppDeliveries[0].workerId,'w1');
  assert.equal(state.eppDeliveries[0].condition,'reutilizado-inspeccionado');
  assert.doesNotThrow(()=>validateTenantState(state));
});
