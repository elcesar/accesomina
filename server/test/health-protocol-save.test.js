import assert from 'node:assert/strict';
import test, { before, after, beforeEach, mock } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { stateRouter } from '../routes/state.js';

const route = stateRouter.stack.find(layer => layer.route?.path === '/modules' && layer.route.methods.put).route;
const protocol = { id: 'qa-protocol', workerId: 'qa-person', protocolo: 'Seguimiento QA', estado: 'seguimiento', fileId: 'qa-evidence' };
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE tenant_module_state (tenant_id text,module_key text,data jsonb,version bigint DEFAULT 1,updated_by text,updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,module_key));
    CREATE TABLE audit_log (tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);`);
  mock.method(pool, 'connect', async () => ({ query: (sql, params) => db.query(sql, params), release() {} }));
});
after(async () => { mock.restoreAll(); await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE tenant_module_state, audit_log');
  for (const [key, data] of Object.entries({ trabajadores: [{ id: 'qa-person', nombre: 'Persona QA', rut: '11.111.111-1' }], protocolosSalud: [] })) {
    await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,2)', ['qa-tenant', key, JSON.stringify(data)]);
  }
});
async function save(data, { role = 'client_admin', version = 2, permissions } = {}) {
  const req = { auth: { tenantId: 'qa-tenant', userId: 'qa-user', role, permissions }, body: { changes: { protocolosSalud: { version, data } }, reason: 'Protocolo QA' } };
  const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  let allowed = false;
  route.stack[0].handle(req, res, () => { allowed = true; });
  if (allowed) await route.stack.at(-1).handle(req, res, error => { throw error; });
  return res;
}
async function saved() { return (await db.query("SELECT data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' AND module_key='protocolosSalud'")).rows[0]; }
async function audits() { return (await db.query('SELECT * FROM audit_log')).rows; }
test('the real save route persists the current form payload, evidence, version and audit', async () => {
  assert.equal((await save([protocol])).statusCode, 200);
  assert.deepEqual((await saved()).data, [protocol]);
  assert.equal(Number((await saved()).version), 3);
  const log = await audits(); assert.equal(log.length, 1); assert.equal(log[0].entity_type, 'protocolosSalud');
});
test('Prevención can save a worker-only health protocol through the actual route', async () => {
  assert.equal((await save([protocol], { role: 'prevencion' })).statusCode, 200);
  assert.equal((await saved()).data[0].workerId, 'qa-person');
});
test('unknown persons roll back the protocol, version and audit', async () => {
  await assert.rejects(() => save([{ ...protocol, workerId: 'missing' }]), e => e.code === 'INVALID_REFERENCE');
  assert.deepEqual((await saved()).data, []); assert.equal(Number((await saved()).version), 2); assert.deepEqual(await audits(), []);
});
test('the real route persists a renewal even when protocol and dates match the previous evaluation', async () => {
  const first = { ...protocol, evaluatedOn: '2026-10-14', vence: '2027-10-14' };
  const renewal = { ...protocol, id: 'second', evaluatedOn: '2026-10-14', vence: '2027-10-14' };
  assert.equal((await save([first, renewal])).statusCode, 200);
  assert.equal((await saved()).data.length, 2);
});
test('stale versions and read-only roles leave state untouched', async () => {
  assert.equal((await save([protocol], { version: 1 })).statusCode, 409);
  assert.equal((await save([protocol], { role: 'consulta' })).statusCode, 403);
  assert.deepEqual((await saved()).data, []); assert.deepEqual(await audits(), []);
});
test('disabled health module permission remains enforced', async () => {
  await assert.rejects(() => save([protocol], { role: 'prevencion', permissions: { modules: { protocolosSalud: false } } }), e => e.code === 'MODULE_PERMISSION_DENIED');
  assert.deepEqual((await saved()).data, []); assert.deepEqual(await audits(), []);
});


test('a legacy contradictory protocol does not block an unrelated health update, while a changed reference is rejected', async () => {
  const legacy = { id: 'legacy', workerId: 'qa-person', trabId: 'missing-person', protocolo: 'Histórico', estado: 'seguimiento' };
  await db.query("UPDATE tenant_module_state SET data=$1::jsonb WHERE tenant_id='qa-tenant' AND module_key='protocolosSalud'", [JSON.stringify([legacy])]);
  assert.equal((await save([{ ...legacy, notes: 'Conservado para regularización' }])).statusCode, 200);
  await assert.rejects(() => save([{ ...legacy, trabId: 'other-person' }], { version: 3 }), error => error.code === 'INVALID_REFERENCE');
});
