import test from 'node:test';
import assert from 'node:assert/strict';
import { removeWorkerDocument, sanitizeJson, summarizeChanges, validateAppendChanges, validateTenantState, validateWorkerDocumentAppend } from '../validation.js';

const validState=()=>({trabajadores:[{id:'w1',rut:'14.567.890-0',nombre:'Persona'}],minas:[{id:'m1',nombre:'Mina'}],contratos:[{id:'c1',minaId:'m1'}],mantenciones:[{id:'p1',minaId:'m1',contratoId:'c1',inicio:'2026-01-01',termino:'2026-01-02'}],asignaciones:[{trabId:'w1',mantId:'p1'}]});
test('state accepts valid relationships',()=>assert.equal(validateTenantState(validState()).trabajadores.length,1));
test('state normalizes and validates worker Chilean phones before persistence',()=>{const state=validState();state.trabajadores[0].tel='9 1234 5678';assert.equal(validateTenantState(state).trabajadores[0].tel,'+56912345678');state.trabajadores[0].tel='123';assert.throws(()=>validateTenantState(state),error=>error.code==='INVALID_WORKER_PHONE');});
test('state rejects duplicate worker RUT',()=>{const state=validState();state.trabajadores.push({id:'w2',nombre:'Otra persona',rut:'14.567.890-0'});assert.throws(()=>validateTenantState(state),/Duplicate worker RUT/);});
test('state rejects an invalid client RUT before persistence',()=>{const state=validState();state.minas[0].rut='13.848.379-6';assert.throws(()=>validateTenantState(state),error=>error.code==='INVALID_CLIENT_RUT');});
test('state requires client id and name before persistence',()=>{const state=validState();state.minas[0].nombre='';assert.throws(()=>validateTenantState(state),error=>error.code==='INCOMPLETE_CLIENT');});
test('state rejects duplicate client RUT inside the tenant',()=>{const state=validState();state.minas[0].rut='14.567.890-0';state.minas.push({id:'m2',nombre:'Otro cliente',mandante:'Otra organización',rut:'145678900'});assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_CLIENT_RUT');});
test('state allows different clients without RUT',()=>{const state=validState();state.minas.push({id:'m2',nombre:'Otro cliente'});assert.doesNotThrow(()=>validateTenantState(state));});
test('state rejects duplicate client identity by name and related organization',()=>{const state=validState();state.minas[0].mandante='Mandante';state.minas.push({id:'m2',nombre:' mina ',mandante:' mandante '});assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_CLIENT');});
test('state rejects the same worker RUT with different formatting',()=>{const state=validState();state.trabajadores.push({id:'w2',nombre:'Otra persona',rut:'145678900'});assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_WORKER_RUT');});
test('state rejects cross-reference errors',()=>{const state=validState();state.asignaciones[0].trabId='missing';assert.throws(()=>validateTenantState(state),/unknown worker/);});
test('state rejects duplicate worker assignments',()=>{const state=validState();state.asignaciones.push({trabId:'w1',mantId:'p1'});assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_ASSIGNMENT');});
test('state validates connected operational modules',()=>{const state=validState();state.hoteles=[{id:'h1',nombre:'Hotel Norte',ciudad:'Calama'}];state.hotelAsig=[{id:'ha1',trabId:'w1',mantId:'p1',hotelId:'h1'}];state.turnos=[{id:'t1',trabId:'w1',mantId:'p1',fecha:'2026-07-01',turno:'dia'}];state.credenciales=[{id:'cr1',trabId:'w1',minaId:'m1',numero:'P-1'}];state.protocolosSalud=[{id:'ps1',trabId:'w1',minaId:'m1'}];state.incidentes=[{id:'i1',mantId:'p1'}];assert.doesNotThrow(()=>validateTenantState(state));state.hotelAsig[0].hotelId='missing';assert.throws(()=>validateTenantState(state),/unknown worker, project or hotel/);});
test('state validates EPP delivery relationships',()=>{const state=validState();state.eppDeliveries=[{id:'e1',workerId:'w1',mantId:'p1',itemId:'helmet',itemName:'Casco',qty:1,deliveredAt:'2026-07-01'}];assert.doesNotThrow(()=>validateTenantState(state));state.eppDeliveries[0].workerId='missing';assert.throws(()=>validateTenantState(state),/unknown worker/);});
test('state accepts a multi-item EPP batch and validates each status',()=>{const state=validState();state.eppDeliveries=[{id:'e1',batchId:'batch1',workerId:'w1',mantId:'p1',itemId:'helmet',itemName:'Casco',qty:1,size:'M',condition:'nuevo',deliveryStatus:'entregado',deliveredAt:'2026-07-01'},{id:'e2',batchId:'batch1',workerId:'w1',mantId:'p1',itemId:'boots',itemName:'Calzado',qty:1,size:'42',condition:'nuevo',deliveryStatus:'entregado',deliveredAt:'2026-07-01'}];const clean=validateTenantState(state);assert.equal(clean.eppDeliveries.length,2);state.eppDeliveries[1].deliveryStatus='desconocido';assert.throws(()=>validateTenantState(state),error=>error.code==='INVALID_EPP_DELIVERY_STATUS');});
test('state rejects duplicate operational records',()=>{const cases=[['protocolosSalud',{id:'x1',trabId:'w1',minaId:'m1',tipo:'ruido'},'DUPLICATE_HEALTH_PROTOCOL'],['incidentes',{id:'x1',mantId:'p1',fecha:'2026-07-01',tipo:'hallazgo',descripcion:'Falta barrera'},'DUPLICATE_INCIDENT'],['permisosTrabajo',{id:'x1',mantId:'p1',nombre:'Trabajo en altura'},'DUPLICATE_WORK_PERMIT'],['waGroups',{id:'x1',minaId:'m1',mantId:'p1',nombre:'Turno A'},'DUPLICATE_WHATSAPP_GROUP'],['firmas',{id:'x1',trabId:'w1',mantId:'p1',tipo:'contrato',estado:'enviado'},'DUPLICATE_SIGNATURE_REQUEST']];for(const[module,row,code]of cases){const state=validState();state[module]=[row,{...row,id:'x2'}];assert.throws(()=>validateTenantState(state),error=>error.code===code,module);}});
test('state rejects duplicate worker documents and overlapping lodging',()=>{const docs=validState();docs.trabajadores[0].workerItems=[{id:'d1',type:'examen',name:'Altura física',vence:'2027-01-01'},{id:'d2',type:'examen',name:'Altura física',vence:'2027-01-01'}];assert.throws(()=>validateTenantState(docs),error=>error.code==='DUPLICATE_WORKER_DOCUMENT');const lodging=validState();lodging.hoteles=[{id:'h1',nombre:'Hotel A'},{id:'h2',nombre:'Hotel B'}];lodging.hotelAsig=[{id:'ha1',trabId:'w1',mantId:'p1',hotelId:'h1',checkin:'2026-07-01',checkout:'2026-07-10'},{id:'ha2',trabId:'w1',mantId:'p1',hotelId:'h2',checkin:'2026-07-05',checkout:'2026-07-12'}];assert.throws(()=>validateTenantState(lodging),error=>error.code==='OVERLAPPING_HOTEL_ASSIGNMENT');});
test('sanitizer removes executable markup and embedded files',()=>{const clean=sanitizeJson({name:'<img src=x onerror="bad">',fileData:'data:secret',cloudUrl:'javascript:alert(1)'});assert.equal(clean.name.includes('<'),false);assert.equal(clean.fileData,null);assert.equal(clean.cloudUrl,'');});
test('audit change summary records changed paths',()=>{const changes=summarizeChanges({a:1,b:2},{a:2,b:2});assert.deepEqual(changes,[{path:'/a',before:1,after:2}]);});
test('audit change summary identifies changed entities inside modules',()=>{const changes=summarizeChanges([{id:'w1',name:'A'},{id:'w2',name:'B'}],[{id:'w1',name:'Updated'},{id:'w3',name:'C'}],'/trabajadores');assert.ok(changes.some(x=>x.path==='/trabajadores/w1/name'));assert.ok(changes.some(x=>x.path==='/trabajadores/w2'&&x.action==='deleted'));assert.ok(changes.some(x=>x.path==='/trabajadores/w3'&&x.action==='created'));});
test('state rejects future and underage worker birth dates',()=>{const today=new Date().toISOString().slice(0,10);const [year,month,day]=today.split('-').map(Number);const date=y=>`${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;const future=validState();future.trabajadores[0].nacimiento=date(year+1);assert.throws(()=>validateTenantState(future),error=>error.code==='INVALID_WORKER_BIRTH_DATE');const underage=validState();underage.trabajadores[0].nacimiento=date(year-17);assert.throws(()=>validateTenantState(underage),error=>error.code==='WORKER_UNDERAGE');const adult=validState();adult.trabajadores[0].nacimiento=date(year-18);assert.doesNotThrow(()=>validateTenantState(adult));});
test('a valid new worker is not blocked by an unrelated legacy reference',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  const proposed=structuredClone(current);
  proposed.trabajadores.push({id:'w2',nombre:'Pamela Navarro',rut:'14.507.215-8',tel:'+56976490489'});
  assert.throws(()=>validateTenantState(proposed),error=>error.code==='INVALID_REFERENCE');
  assert.equal(validateAppendChanges(current,proposed,['trabajadores']),true);
});
test('append fallback still rejects a new worker with an invalid direct reference',()=>{
  const current=validState(),proposed=structuredClone(current);
  proposed.trabajadores.push({id:'w2',nombre:'Nueva persona',rut:'14.507.215-8',mineras:['missing-mine']});
  assert.throws(()=>validateAppendChanges(current,proposed,['trabajadores']),error=>error.code==='INVALID_REFERENCE');
});
test('append fallback fails closed for modules without equivalent validation',()=>{
  const current=validState(),proposed=structuredClone(current);
  proposed.turnos=[{id:'t1',trabId:'w1',mantId:'p1',fecha:'2026-07-01',turno:'dia'}];
  assert.equal(validateAppendChanges(current,proposed,['turnos']),false);
});
test('append fallback preserves strict duplicate rules for its supported modules',()=>{
  const current=validState(),proposed=structuredClone(current);
  proposed.trabajadores.push({id:'w2',nombre:'Duplicada',rut:'14.567.890-0'});
  assert.throws(()=>validateAppendChanges(current,proposed,['trabajadores']),error=>error.code==='DUPLICATE_WORKER_RUT');
});
test('append fallback applies every client rule despite unrelated legacy data',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  current.minas[0].rut='14.567.890-0';
  const invalidClients = [
    { mine:{id:'m2',nombre:''}, code:'INCOMPLETE_CLIENT' },
    { mine:{id:'m2',nombre:'Cliente nuevo',rut:'145678900'}, code:'DUPLICATE_CLIENT_RUT' },
    { mine:{id:'m2',nombre:'  MINA ',mandante:''}, code:'DUPLICATE_CLIENT' },
  ];
  for (const { mine, code } of invalidClients) {
    const proposed=structuredClone(current);
    proposed.minas.push(mine);
    assert.throws(()=>validateAppendChanges(current,proposed,['minas']),error=>error.code===code,code);
  }
});
test('append fallback rejects a duplicate service order despite unrelated legacy data',()=>{
  const current=validState();
  current.mantenciones[0].nombre='Mantención chancado';
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  const proposed=structuredClone(current);
  proposed.mantenciones.push({
    id:'p2',
    minaId:'m1',
    contratoId:'c1',
    nombre:'  MANTENCIÓN   CHANCADO ',
    inicio:'2026-01-01',
    termino:'2026-01-03',
  });
  assert.throws(()=>validateAppendChanges(current,proposed,['mantenciones']),error=>error.code==='DUPLICATE_PROJECT');
});
test('append fallback keeps unsupported operational modules closed',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  for (const module of ['eppDeliveries', 'vehiculos', 'hoteles', 'bodegas', 'turnos', 'asignaciones']) {
    const proposed=structuredClone(current);
    proposed[module]=[{id:`${module}-1`}];
    assert.equal(validateAppendChanges(current,proposed,[module]),false,module);
  }
});
test('append fallback applies every worker document rule despite unrelated legacy data',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  const invalidDocuments = [
    { items:[{id:'same',type:'documento',name:'Cédula',vence:'2027-01-01'},{id:'same',type:'curso',name:'ODI',vence:'2027-01-01'}], code:'DUPLICATE_WORKER_DOCUMENT_ID' },
    { items:[{id:'a',type:'documento',name:'Cédula',vence:'2027-01-01'},{id:'b',type:'documento',name:'  CÉDULA ',vence:'2027-01-01'}], code:'DUPLICATE_WORKER_DOCUMENT' },
    { items:[{id:'a',type:'examen',name:'Preocupacional',emision:'2027-01-02',vence:'2027-01-01'}], code:'INVALID_DATES' },
  ];
  for (const { items, code } of invalidDocuments) {
    const proposed=structuredClone(current);
    proposed.trabajadores.push({id:`w-${code}`,nombre:'Persona nueva',rut:'14.507.215-8',workerItems:items});
    assert.throws(()=>validateAppendChanges(current,proposed,['trabajadores']),error=>error.code===code,code);
  }
});
test('worker document append is not blocked by unrelated legacy data',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  const proposed=structuredClone(current);
  proposed.trabajadores[0].workerItems=[{id:'doc-1',type:'documento',name:'Contrato de trabajo',vence:'2027-01-01'}];
  assert.throws(()=>validateTenantState(proposed),error=>error.code==='INVALID_REFERENCE');
  assert.equal(validateAppendChanges(current,proposed,['trabajadores']),true);
});
test('append fallback keeps worker document updates as append-only and validates every new item',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  current.trabajadores[0].workerItems=[{id:'doc-existing',type:'documento',name:'Contrato de trabajo',vence:'2027-01-01'}];
  const cases=[
    { item:{id:'doc-existing',type:'documento',name:'CV'}, code:'DUPLICATE_WORKER_DOCUMENT_ID' },
    { item:{id:'doc-new',type:'documento',name:' contrato  de trabajo ',vence:'2027-01-01'}, code:'DUPLICATE_WORKER_DOCUMENT' },
    { item:{id:'doc-new',type:'examen',name:'Preocupacional',emision:'2027-01-02',vence:'2027-01-01'}, code:'INVALID_DATES' },
  ];
  for(const {item,code} of cases){
    const proposed=structuredClone(current);
    proposed.trabajadores[0].workerItems.push(item);
    assert.throws(()=>validateAppendChanges(current,proposed,['trabajadores']),error=>error.code===code,code);
  }
  const changedProfile=structuredClone(current);
  changedProfile.trabajadores[0].nombre='Nombre alterado';
  assert.equal(validateAppendChanges(current,changedProfile,['trabajadores']),false);
  const replacedDocument=structuredClone(current);
  replacedDocument.trabajadores[0].workerItems[0].name='Contrato reemplazado';
  assert.equal(validateAppendChanges(current,replacedDocument,['trabajadores']),false);
});
test('a legacy document inconsistency does not block a later valid document append',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  current.trabajadores[0].workerItems=[
    {id:'doc-legacy-1',type:'documento',name:'Contrato de trabajo',vence:'2027-01-01'},
    {id:'doc-legacy-2',type:'documento',name:' contrato  de trabajo ',vence:'2027-01-01'},
  ];
  const proposed=structuredClone(current);
  proposed.trabajadores[0].workerItems.push({id:'doc-cv',type:'documento',name:'Currículum vitae'});
  assert.throws(()=>validateTenantState(proposed),error=>error.code==='INVALID_REFERENCE');
  assert.equal(validateAppendChanges(current,proposed,['trabajadores']),true);
});
test('contract and service annex remain distinct evidence even when their reference is initially the same',()=>{
  const current=validState();
  current.asignaciones=[{id:'legacy-assignment',trabId:'missing-worker',mantId:'p1'}];
  current.trabajadores[0].workerItems=[{
    id:'doc-contract',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo',vence:'',
  }];
  const proposed=structuredClone(current);
  proposed.trabajadores[0].workerItems.push({
    id:'doc-annex',type:'contrato',documentType:'SERVICE_ANNEX',name:'Contrato de trabajo',vence:'',
  });
  assert.throws(()=>validateTenantState(proposed),error=>error.code==='INVALID_REFERENCE');
  assert.equal(validateAppendChanges(current,proposed,['trabajadores']),true);
});
test('worker documents with the same semantic classification, reference and expiry remain duplicates',()=>{
  const state=validState();
  state.trabajadores[0].workerItems=[
    {id:'d1',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo',vence:'2027-01-01'},
    {id:'d2',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:' contrato  de trabajo ',vence:'2027-01-01'},
  ];
  assert.throws(()=>validateTenantState(state),error=>error.code==='DUPLICATE_WORKER_DOCUMENT');
});
test('worker document fallback never accepts a duplicate worker row',()=>{
  const current=validState(), proposed=structuredClone(current);
  proposed.trabajadores.push({...proposed.trabajadores[0]});
  assert.equal(validateAppendChanges(current,proposed,['trabajadores']),false);
});
test('direct document append accepts a second evidence despite an underage legacy worker',()=>{
  const worker={id:'w1',nombre:'Sophia',nacimiento:'2016-01-01',workerItems:[{id:'contract',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo'}]};
  assert.doesNotThrow(()=>validateWorkerDocumentAppend(worker,{id:'annex',type:'contrato',documentType:'SERVICE_ANNEX',name:'Anexo asociado al servicio'}));
  assert.throws(()=>validateWorkerDocumentAppend(worker,{id:'duplicate',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo'}),error=>error.code==='DUPLICATE_WORKER_DOCUMENT');
});
test('atomic worker document removal permits a later replacement despite legacy worker data',()=>{
  const worker={id:'w1',nombre:'Sophia',nacimiento:'2016-01-01',workerItems:[
    {id:'contract',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo',fileId:'file-contract'},
    {id:'annex',type:'contrato',documentType:'SERVICE_ANNEX',name:'Anexo asociado al servicio',fileId:'file-annex'},
  ]};
  const removed=removeWorkerDocument(worker,'contract');
  assert.equal(removed.item.id,'contract');
  assert.deepEqual(removed.worker.workerItems.map(item=>item.id),['annex']);
  assert.doesNotThrow(()=>validateWorkerDocumentAppend(removed.worker,{id:'contract-replacement',type:'contrato',documentType:'EMPLOYMENT_CONTRACT',name:'Contrato de trabajo',fileId:'file-replacement'}));
  assert.throws(()=>removeWorkerDocument(worker,'missing'),error=>error.code==='WORKER_DOCUMENT_NOT_FOUND');
});
