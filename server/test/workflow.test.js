import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { validateTenantState } from '../validation.js';

function completeWorkflow(){return{
  empresa:{nombre:'Contratista Norte',rut:'76.000.000-0'},
  minas:[{id:'m1',nombre:'Mina Norte',mandante:'Mandante Uno'}],
  contratos:[{id:'c1',numero:'CTR-001',nombre:'Contrato Marco',minaId:'m1',inicio:'2026-01-01',termino:'2027-01-01'}],
  mantenciones:[{id:'p1',nombre:'Operación Planta',tipo:'operacion',minaId:'m1',contratoId:'c1',inicio:'2026-07-01',termino:'2026-12-31'}],
  trabajadores:[{id:'w1',nombre:'Personal Planta',rut:'14.567.890-1',tipo:'permanente',mineras:['m1']},{id:'w2',nombre:'Personal Spot',rut:'12.345.678-5',tipo:'esporadico',mineras:['m1']}],
  asignaciones:[{id:'a1',trabId:'w1',mantId:'p1'},{id:'a2',trabId:'w2',mantId:'p1'}],
  hoteles:[{id:'h1',nombre:'Hotel Norte',ciudad:'Calama',minaIds:['m1']}],
  hotelAsig:[{id:'ha1',trabId:'w2',mantId:'p1',hotelId:'h1',pieza:'204',checkin:'2026-07-01',checkout:'2026-07-10'}],
  eppMeasurements:{w1:{helmet:'M',shirt:'L',pants:'44',shoe:'42'},w2:{helmet:'M',shirt:'M',pants:'42',shoe:'41'}},
  eppDeliveries:[{id:'e1',workerId:'w2',mantId:'p1',itemId:'helmet',itemName:'Casco',qty:1,deliveredAt:'2026-07-01',lotSerial:'L-1'}],
  turnos:[{id:'t1',trabId:'w2',mantId:'p1',fecha:'2026-07-01',turno:'dia'}],
  credenciales:[{id:'cr1',trabId:'w2',minaId:'m1',numero:'PASS-1'}],
  protocolosSalud:[{id:'ps1',trabId:'w2',minaId:'m1'}],
  incidentes:[{id:'i1',mantId:'p1'}],
  vehiculos:[{id:'v1',patente:'AB-CD-12',operadorId:'w1',minaIds:['m1']}],
  subcontratos:[{id:'s1',rut:'76.111.111-1',contratoId:'c1'}],
  firmas:[{id:'f1',trabId:'w2',mantId:'p1'}],callouts:[{id:'co1',mantId:'p1'}],waGroups:[{id:'g1',mantId:'p1',minaId:'m1',trabIds:['w1','w2']}],permisosTrabajo:[{id:'pt1',mantId:'p1'}]
};}

test('end-to-end operational workflow remains fully connected',()=>{const clean=validateTenantState(completeWorkflow());assert.equal(clean.mantenciones[0].tipo,'operacion');assert.equal(clean.hotelAsig[0].pieza,'204');assert.equal(clean.eppMeasurements.w2.shoe,'41');});
test('JSON export and import preserve the complete connected state',()=>{const exported=JSON.stringify({format:'accesomina-backup',version:1,modules:completeWorkflow()}),imported=JSON.parse(exported);const clean=validateTenantState(imported.modules);assert.equal(clean.trabajadores.length,2);assert.equal(clean.contratos[0].minaId,'m1');assert.equal(clean.firmas[0].mantId,'p1');});
test('CSV worker import integrates without duplicating existing RUT',async()=>{process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';const {definitions}=await import('../routes/data-transfer.js'),state=completeWorkflow(),parsed=Papa.parse('nombre,rut,tipo,cargo\nNueva Persona,11.111.111-1,esporadico,Operador',{header:true});state.trabajadores.push(definitions.trabajadores.map(parsed.data[0]));assert.doesNotThrow(()=>validateTenantState(state));state.trabajadores.push({...definitions.trabajadores.map(parsed.data[0]),id:'duplicate'});assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_WORKER_RUT');});
test('project cannot use a contract from another mine',()=>{const state=completeWorkflow();state.minas.push({id:'m2',nombre:'Mina Sur',mandante:'Mandante Dos'});state.contratos.push({id:'c2',numero:'CTR-002',minaId:'m2'});state.mantenciones[0].contratoId='c2';assert.throws(()=>validateTenantState(state),/different mines/);});
test('orphan lodging, EPP measurements and duplicate deliveries are rejected',()=>{const hotel=completeWorkflow();hotel.hotelAsig[0].hotelId='missing';assert.throws(()=>validateTenantState(hotel),/unknown worker, project or hotel/);const measurements=completeWorkflow();measurements.eppMeasurements.missing={shoe:'42'};assert.throws(()=>validateTenantState(measurements),/unknown worker/);const epp=completeWorkflow();epp.eppDeliveries.push({...epp.eppDeliveries[0],id:'e2'});assert.throws(()=>validateTenantState(epp),error=>error.code==='DUPLICATE_EPP_DELIVERY');});
