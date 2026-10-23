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

test('worker CSV validates configured specialties per tenant without restricting empty catalogs',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const [{validateImportRows},{definitions}]=await Promise.all([
    import('../import-validation.js'),
    import('../routes/data-transfer.js'),
  ]);
  const fields=definitions.trabajadores.headers;
  const rows=[{nombre:'Persona QA',rut:'14.567.890-1',especialidad:'Mantenimiento'}];
  assert.deepEqual(validateImportRows('trabajadores',rows,definitions.trabajadores,{},{
    fields,allowedSpecialties:['Mantenimiento','Electricidad'],
  }),[]);
  const invalid=validateImportRows('trabajadores',[{...rows[0],especialidad:'Especialidad ajena'}],definitions.trabajadores,{},{
    fields,allowedSpecialties:['Mantenimiento','Electricidad'],
  });
  assert.ok(invalid.some(issue=>issue.code==='INVALID_SPECIALTY'));
  assert.deepEqual(validateImportRows('trabajadores',[{...rows[0],especialidad:'Valor histórico'}],definitions.trabajadores,{},{
    fields,allowedSpecialties:[],
  }),[]);
});

test('state import validation preserves an existing operational assignment after a later restriction',async()=>{
  const {validateTenantState}=await import('../validation.js');
  const previousState={
    trabajadores:[{id:'w1',nombre:'Persona QA',rut:'14.567.890-1',workerItems:[],mineras:[]}],
    mantenciones:[{id:'m1',nombre:'Orden QA'}],
    asignaciones:[{id:'a1',trabId:'w1',mantId:'m1',estado:'confirmada'}],
    restricted:[{workerId:'w1',activa:true,hasta:'2099-01-01'}],
  };
  assert.throws(()=>validateTenantState(previousState),error=>error.code==='WORKER_NOT_AVAILABLE');
  assert.doesNotThrow(()=>validateTenantState(previousState,{previousState}));
});
