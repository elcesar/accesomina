import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';

test('mass import parser supports Excel CSV quoting and maps workers',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {definitions}=await import('../routes/data-transfer.js');
  const parsed=Papa.parse('nombre,rut,cargo\n"Pérez, Ana",14.567.890-1,"Supervisora, turno A"',{header:true});
  assert.equal(parsed.errors.length,0);assert.equal(parsed.data[0].nombre,'Pérez, Ana');
  const worker=definitions.trabajadores.map(parsed.data[0]);assert.equal(worker.rut,'14.567.890-1');assert.equal(worker.cargo,'Supervisora, turno A');assert.match(worker.id,/^t_/);
});

test('worker CSV imports keep category separate from availability without an assignment',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {definitions}=await import('../routes/data-transfer.js');
  const legacy=definitions.trabajadores.map({nombre:'Persona histórica',rut:'14.567.890-1',tipo:'esporadico'});
  const fixed=definitions.trabajadores.map({nombre:'Persona fija',rut:'12.345.678-5',tipo:'permanente'});
  const temporary=definitions.trabajadores.map({nombre:'Persona temporal',rut:'11.111.111-1',tipo:'temporal'});
  assert.equal(legacy.tipo,'esporadico');
  assert.equal(legacy.disponibilidad,'disponible');
  assert.equal(fixed.tipo,'permanente');
  assert.equal(fixed.disponibilidad,'disponible');
  assert.equal(temporary.tipo,'esporadico');
  assert.equal(temporary.disponibilidad,'disponible');
});

test('CSV templates declare required business columns',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {definitions}=await import('../routes/data-transfer.js');
  assert.deepEqual(definitions.trabajadores.required,['nombre','rut']);
  assert.ok(definitions.contratos.required.includes('minera'));
  for(const type of ['vehiculos','hoteles','turnos','credenciales','subcontratos','epp','documentos','oportunidades']){
    assert.ok(definitions[type],`missing ${type} import`);
    assert.ok(definitions[type].headers.length>=8,`${type} template is incomplete`);
    assert.ok(definitions[type].required.length>=2,`${type} has no required fields`);
  }
});


test('mass import diagnostics accumulate every invalid CSV cell with a usable location',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {definitions}=await import('../routes/data-transfer.js');
  const {boundedImportIssues,csvFileIssues,csvParseIssues,csvTenantIssues}=await import('../import-diagnostics.js');
  const rows=[
    {nombre:'',rut:'11.111.111-2',email:'correo-invalido',telefono:'123'},
    {nombre:'Persona QA',rut:'11.111.111-1',email:'',telefono:''},
    {nombre:'Otra persona QA',rut:'11.111.111-1',email:'',telefono:''},
  ];
  const fileIssues=csvFileIssues('trabajadores',definitions.trabajadores,definitions.trabajadores.headers,rows);
  assert.deepEqual(fileIssues.filter(issue=>issue.row===2).map(issue=>issue.column),['nombre','rut','email','telefono']);
  assert.ok(fileIssues.every(issue=>issue.message&&issue.suggestion&&Object.hasOwn(issue,'value')));
  const tenantIssues=csvTenantIssues('trabajadores',definitions.trabajadores,rows,{trabajadores:[]},'append');
  assert.equal(tenantIssues.length,1);
  assert.deepEqual(tenantIssues[0],{
    row:4,column:'rut',value:'11.111.111-1',code:'DUPLICATE_WORKER_RUT',
    message:'El RUT ya está registrado o se repite dentro de este archivo.',
    suggestion:'Conserva una sola fila por RUT y revisa los registros existentes antes de reintentar.',
  });
  const referenceIssues=csvTenantIssues('contratos',definitions.contratos,[{nombre:'Contrato QA',numero:'QA-01',minera:'Cliente inexistente'}],{minas:[]},'append');
  assert.equal(referenceIssues.length,1);
  assert.equal(referenceIssues[0].row,2);
  assert.equal(referenceIssues[0].column,'minera');
  assert.equal(referenceIssues[0].code,'INVALID_REFERENCE');
  assert.equal(csvParseIssues([{row:1,code:'TooFewFields'}])[0].row,3);
  const bounded=boundedImportIssues([...fileIssues,...tenantIssues],2);
  assert.deepEqual(bounded,{issues:[...fileIssues,...tenantIssues].slice(0,2),totalIssues:5,truncated:true});
});


test('tenant diagnostics retain location for existing per-type import rules',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {definitions}=await import('../routes/data-transfer.js');
  const {csvTenantIssues}=await import('../import-diagnostics.js');
  const state={
    minas:[{id:'mi-qa',nombre:'Cliente QA',mandante:'Mandante QA'}],
    contratos:[{id:'co-qa',numero:'C-01',minaId:'mi-qa'}],
    mantenciones:[{id:'ma-qa',nombre:'Orden QA',minaId:'mi-qa',inicio:'2026-01-01'}],
    trabajadores:[{id:'tr-qa',nombre:'Persona QA',rut:'11.111.111-1'}],
    hoteles:[{id:'ho-qa',nombre:'Hotel QA',ciudad:'Calama'}],
    turnos:[{trabId:'tr-qa',mantId:'ma-qa',fecha:'2026-01-10',turno:'día'}],
    credenciales:[{minaId:'mi-qa',numero:'CR-01'}],
    vehiculos:[{patente:'AB-CD-12'}],
    eppDeliveries:[{workerId:'tr-qa',itemId:'casco',deliveredAt:'2026-01-10',lotSerial:'L-1'}],
    prospectos:[{id:'op-qa',type:'nuevo_cliente',stage:'prospecto',company:'Empresa QA',clientId:'mi-qa'}],
  };
  const checks=[
    ['minas',{nombre:'Cliente QA',mandante:'Mandante QA'},'DUPLICATE_CLIENT','nombre'],
    ['contratos',{nombre:'Contrato QA',numero:'C-01',minera:'Cliente QA',inicio:'2026-02-01',termino:'2026-01-01'},'DUPLICATE_CONTRACT_NUMBER','numero'],
    ['mantenciones',{nombre:'Orden QA',minera:'Cliente QA',contrato:'C-01',inicio:'2026-01-01'},'DUPLICATE_PROJECT','nombre'],
    ['vehiculos',{tipo:'Camioneta',nombre:'Vehículo QA',patente:'AB CD 12',propiedad:'arrendada'},'DUPLICATE_VEHICLE','patente'],
    ['hoteles',{nombre:'Hotel QA',ciudad:'Calama'},'DUPLICATE_HOTEL','nombre'],
    ['turnos',{trabajador:'Persona QA',proyecto:'Orden QA',fecha:'2026-01-10',turno:'día'},'DUPLICATE_SHIFT','fecha'],
    ['credenciales',{trabajador:'Persona QA',minera:'Cliente QA',numero:'CR-01'},'DUPLICATE_CREDENTIAL','numero'],
    ['epp',{trabajador:'Persona QA',epp_id:'casco',epp:'Casco QA',fecha_entrega:'2026-01-10',lote_serie:'L-1',condicion:' ',estado_entrega:' '},'DUPLICATE_EPP_DELIVERY','epp_id'],
    ['oportunidades',{tipo:'nuevo_cliente',empresa:'Empresa QA',etapa:'prospecto',cliente:'Cliente QA'},'DUPLICATE_OPPORTUNITY','empresa'],
  ];
  for(const [type,row,code,column] of checks){
    const issues=csvTenantIssues(type,definitions[type],[row],state,'append');
    assert.ok(issues.some(issue=>issue.code===code&&issue.row===2&&issue.column===column),`${type} should retain ${code} at its source cell`);
  }
  const epp=csvTenantIssues('epp',definitions.epp,[{trabajador:'Persona QA',epp_id:'nuevo',epp:'Nuevo EPP',fecha_entrega:'2026-01-11',condicion:' ',estado_entrega:' '}],state,'append');
  assert.ok(epp.some(issue=>issue.code==='INVALID_EPP_DELIVERY_STATUS'&&issue.column==='condicion'));
  assert.ok(epp.some(issue=>issue.code==='INVALID_EPP_DELIVERY_STATUS'&&issue.column==='estado_entrega'));
});


test('CSV diagnostics preserve physical lines, accepted extra columns and bounded reference work', async () => {
  process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
  const { definitions } = await import('../routes/data-transfer.js');
  const { createImportDiagnostics, csvDataRowLines, csvFileIssues, csvTenantIssues } = await import('../import-diagnostics.js');

  const csv = 'nombre,rut,nota_legacy\n\n"Persona\nmultilínea QA",11.111.111-1,conservada\nPersona inválida QA,11.111.111-2,conservada\n';
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: 'greedy' });
  const physical = csvDataRowLines(csv);
  assert.deepEqual(physical, [3, 5]);

  const lineCollector = createImportDiagnostics(undefined, physical);
  csvFileIssues('trabajadores', definitions.trabajadores, parsed.meta.fields, parsed.data, lineCollector);
  assert.equal(lineCollector.issues.length, 1);
  assert.equal(lineCollector.issues[0].row, 5);
  assert.equal(lineCollector.issues[0].column, 'rut');

  const bounded = createImportDiagnostics(2);
  csvTenantIssues('hoteles', definitions.hoteles, [{
    nombre: 'Hotel QA', ciudad: 'Calama', mineras: 'Referencia 1;Referencia 2;Referencia 3',
  }], { minas: [] }, 'append', bounded);
  assert.equal(bounded.issues.length, 2);
  assert.equal(bounded.totalIssues, 3);
  assert.equal(bounded.truncated, true);
  assert.equal(bounded.totalIssuesExact, false);
  assert.ok(bounded.issues.every(issue => issue.row === 2 && issue.column === 'mineras'));

  const strictReference = csvTenantIssues('contratos', definitions.contratos, [{
    nombre: 'Contrato QA', numero: 'QA-02', minera: 'Cliente con espacios',
  }], { minas: [{ id: 'mine-qa', nombre: 'Cliente  con  espacios' }] }, 'append');
  assert.equal(strictReference[0].code, 'INVALID_REFERENCE');

  const exactIdentifier = csvTenantIssues('contratos', definitions.contratos, [{
    nombre: 'Contrato QA', numero: 'QA-03', minera: ' mine-qa ',
  }], { minas: [{ id: 'mine-qa', nombre: 'Cliente QA' }] }, 'append');
  assert.equal(exactIdentifier[0].code, 'INVALID_REFERENCE');
});
