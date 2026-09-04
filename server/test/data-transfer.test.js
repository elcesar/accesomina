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

test('backup format uses Nexo Klar and preserves legacy compatibility',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {BACKUP_FORMAT,LEGACY_BACKUP_FORMAT}=await import('../routes/data-transfer.js');
  assert.equal(BACKUP_FORMAT,'nexo-klar-backup');assert.equal(LEGACY_BACKUP_FORMAT,'accesomina-backup');
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
