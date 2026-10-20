import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { stateRouter } from '../routes/state.js';
import { dataTransferRouter, csvRows } from '../routes/data-transfer.js';

const valid = { id: 'qa-current', company: 'Empresa actual QA', type: 'nuevo_cliente', stage: 'prospecto', rut: '13.848.379-7' };
const legacy = { id: 'qa-legacy', company: 'Empresa histórica QA', type: 'nuevo_cliente', stage: 'perdida', rut: " 'RUT histórico inválido' " };
const saveRoute = stateRouter.stack.find(layer => layer.route?.path === '/modules' && layer.route.methods.put).route;
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE tenant_module_state (tenant_id text, module_key text, data jsonb, version bigint DEFAULT 1, updated_by text, updated_at timestamptz DEFAULT now(), PRIMARY KEY (tenant_id,module_key));
    CREATE TABLE audit_log (tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);`);
  mock.method(pool, 'connect', async () => ({ query: (sql, params) => db.query(sql, params), release() {} }));
});
after(async () => { mock.restoreAll(); await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE tenant_module_state,audit_log');
  await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,3)', ['qa-tenant', 'prospectos', JSON.stringify([legacy, valid])]);
});

function response() { return { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
async function save(data, { version = 3, role = 'client_admin', body = {} } = {}) {
  const req = { auth: { tenantId: 'qa-tenant', userId: 'qa-admin', role }, body: { ...body, changes: { prospectos: { version, data } }, reason: 'Corrección ficticia QA' } };
  const res = response();
  let allowed = false;
  saveRoute.stack[0].handle(req, res, () => { allowed = true; });
  if (allowed) await saveRoute.stack.at(-1).handle(req, res, error => { throw error; });
  return res;
}
async function stored() { return (await db.query("SELECT data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' AND module_key='prospectos'")).rows[0]; }
async function audits() { return (await db.query('SELECT * FROM audit_log')).rows; }
async function importFile(file, type = 'oportunidades') {
  const route = dataTransferRouter.stack.find(layer => layer.route?.path === '/import/:type' && layer.route.methods.post).route;
  const req = { auth: { tenantId: 'qa-tenant', userId: 'qa-admin', role: 'client_admin' }, params: { type }, body: { mode: 'append' }, file: { buffer: Buffer.from(file), originalname: 'QA-ficticio.csv' } };
  const res = response();
  await route.stack.at(-1).handle(req, res);
  return res;
}

test('real save normalizes a changed RUT, preserves history and exports the persisted value', async () => {
  const res = await save([legacy, { ...valid, rut: ' 145072158 ', phone: 'Dato QA' }]);
  assert.equal(res.statusCode, 200);
  const result = await stored();
  assert.equal(result.data[0].rut, legacy.rut);
  assert.equal(result.data[1].rut, '14.507.215-8');
  assert.equal(Number(result.version), 4);
  assert.equal(csvRows('oportunidades', { prospectos: result.data })[1].rut, '14.507.215-8');
  assert.equal((await audits()).length, 3);
});

for (const scenario of ['modified', 'new', 'forged previous state']) {
  test(`invalid ${scenario} RUT rolls back data, versions and audit`, async () => {
    const bad = { ...valid, rut: '11.111.111-2', ...(scenario === 'new' ? { id: 'qa-new', company: 'Nueva QA' } : {}) };
    const proposed = scenario === 'new' ? [legacy, valid, bad] : [legacy, bad];
    const body = scenario === 'forged previous state' ? { previousState: { prospectos: proposed } } : {};
    await assert.rejects(() => save(proposed, { body }), error => error.code === 'INVALID_OPPORTUNITY_RUT');
    assert.deepEqual((await stored()).data, [legacy, valid]);
    assert.equal(Number((await stored()).version), 3);
    assert.deepEqual(await audits(), []);
  });
}

test('unrelated edits retain the exact historical RUT after focus-independent persistence', async () => {
  const res = await save([{ ...legacy, phone: 'QA' }, valid]);
  assert.equal(res.statusCode, 200);
  assert.equal((await stored()).data[0].rut, legacy.rut);
});

test('legacy alias migration identifies history by ID rather than position', async () => {
  await db.query("UPDATE tenant_module_state SET module_key='opportunities',data=$1::jsonb WHERE tenant_id='qa-tenant'", [JSON.stringify([legacy, valid])]);
  const res = await save([{ ...valid, phone: 'QA' }, legacy], { version: 0 });
  assert.equal(res.statusCode, 200);
  assert.equal((await stored()).data.find(row => row.id === legacy.id).rut, legacy.rut);
  assert.deepEqual((await db.query("SELECT data FROM tenant_module_state WHERE module_key='opportunities'")).rows[0].data, []);
});

test('another tenant cannot provide a historical exception for a new invalid RUT', async () => {
  await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,3)', ['qa-other-tenant', 'prospectos', JSON.stringify([{ ...valid, id: 'qa-other', rut: '11.111.111-2' }])]);
  await assert.rejects(() => save([legacy, valid, { ...valid, id: 'qa-other', rut: '11.111.111-2' }]), error => error.code === 'INVALID_OPPORTUNITY_RUT');
  assert.deepEqual((await stored()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});

test('optional empty RUT remains allowed through the real save route', async () => {
  await save([legacy, { ...valid, rut: '   ' }]);
  assert.equal((await stored()).data[1].rut, '');
});

test('version conflicts and read-only roles do not alter the opportunity', async () => {
  assert.equal((await save([legacy, { ...valid, rut: '' }], { version: 2 })).statusCode, 409);
  assert.equal((await save([legacy, { ...valid, rut: '' }], { role: 'consulta' })).statusCode, 403);
  assert.deepEqual((await stored()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});

test('CSV import rejects an invalid RUT with its row before any persistence', async () => {
  const res = await importFile('tipo,empresa,etapa,rut\nnuevo_cliente,Nueva QA,prospecto,11.111.111-2\n');
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'INVALID_OPPORTUNITY_RUT', invalidRow: 2 });
  assert.deepEqual((await stored()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});

test('CSV import persists the normalized RUT and keeps it in export', async () => {
  await db.exec('TRUNCATE tenant_module_state');
  const res = await importFile('tipo,empresa,etapa,rut\nnuevo_cliente,Nueva QA,prospecto,145072158\n');
  assert.equal(res.statusCode, 200);
  const records = (await stored()).data;
  assert.equal(records.length, 1);
  assert.equal(records[0].rut, '14.507.215-8');
  assert.equal(csvRows('oportunidades', { prospectos: records })[0].rut, '14.507.215-8');
});

test('CSV import allows an omitted optional RUT', async () => {
  await db.exec('TRUNCATE tenant_module_state');
  const res = await importFile('tipo,empresa,etapa\nnuevo_cliente,Nueva QA,prospecto\n');
  assert.equal(res.statusCode, 200);
  assert.equal((await stored()).data[0].rut, '');
});

test('backup restoration cannot introduce an invalid RUT through a legacy collection', async () => {
  const backup = { format: 'nexo-klar-backup', modules: { opportunities: [{ ...valid, id: 'qa-new', rut: '11.111.111-2' }] } };
  await assert.rejects(() => importFile(JSON.stringify(backup), 'backup'), error => error.code === 'INVALID_OPPORTUNITY_RUT');
  assert.deepEqual((await stored()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});
