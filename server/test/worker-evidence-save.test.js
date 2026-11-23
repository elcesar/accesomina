import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { stateRouter } from '../routes/state.js';
import { dataTransferRouter } from '../routes/data-transfer.js';

const FILE = '11111111-1111-4111-8111-111111111111';
const BACK = '22222222-2222-4222-8222-222222222222';
const FOREIGN = '33333333-3333-4333-8333-333333333333';
const oldItem = { id: 'qa-old', name: 'Documento antiguo sin archivo', type: 'documento' };
const worker = { id: 'qa-worker', nombre: 'Persona ficticia QA', rut: '13.848.379-7', workerItems: [oldItem] };
const item = { id: 'qa-contract', name: 'Contrato de trabajo', type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', fileId: FILE };
let db;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE tenant_module_state (tenant_id text,module_key text,data jsonb,version bigint DEFAULT 1,updated_by text,updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,module_key));
    CREATE TABLE audit_log (tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);
    CREATE TABLE file_objects (id uuid PRIMARY KEY,tenant_id text,entity_type text,storage_key text,malware_status text,deleted_at timestamptz);
    CREATE TABLE tenant_settings (tenant_id text PRIMARY KEY,branding jsonb,modules jsonb,alerts jsonb,catalogs jsonb,updated_by text,updated_at timestamptz DEFAULT now());`);
  mock.method(pool, 'connect', async () => ({ query: (sql, params) => db.query(sql, params), release() {} }));
});
after(async () => { mock.restoreAll(); await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE tenant_module_state,audit_log,file_objects,tenant_settings');
  await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,3)', ['qa-tenant', 'trabajadores', JSON.stringify([worker])]);
  for (const [id, tenant] of [[FILE, 'qa-tenant'], [BACK, 'qa-tenant'], [FOREIGN, 'qa-other']]) {
    await db.query('INSERT INTO file_objects(id,tenant_id,entity_type,storage_key,malware_status) VALUES($1,$2,$3,$4,$5)', [id, tenant, 'worker_document', `tenants/${tenant}/objects/${id}`, 'clean']);
  }
});
async function stored() { return (await db.query("SELECT data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' AND module_key='trabajadores'")).rows[0]; }
async function audits() { return (await db.query('SELECT * FROM audit_log')).rows; }
async function write(mode, document, { role = 'client_admin', authPatch = {}, snapshot = {} } = {}) {
  const auth = { tenantId: 'qa-tenant', userId: 'qa-admin', role, ...authPatch };
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  if (mode === 'append') {
    const route = stateRouter.stack.find(layer => layer.route?.path === '/workers/:workerId/documents' && layer.route.methods.post).route;
    const req = { auth, params: { workerId: worker.id }, body: { item: document, ...snapshot } };
    let allowed = false; route.stack[0].handle(req, res, () => { allowed = true; });
    if (allowed) await route.stack.at(-1).handle(req, res);
  } else if (mode === 'module') {
    const route = stateRouter.stack.find(layer => layer.route?.path === '/modules' && layer.route.methods.put).route;
    const req = { auth, body: { ...snapshot, changes: { trabajadores: { version: 3, data: [{ ...worker, workerItems: [oldItem, document] }] } } } };
    let allowed = false; route.stack[0].handle(req, res, () => { allowed = true; });
    if (allowed) await route.stack.at(-1).handle(req, res, error => { throw error; });
  } else {
    const route = dataTransferRouter.stack.find(layer => layer.route?.path === '/import/:type' && layer.route.methods.post).route;
    const req = { auth, params: { type: 'backup' }, body: {}, file: { buffer: Buffer.from(JSON.stringify({ format: 'nexo-klar-backup', modules: { trabajadores: [{ ...worker, workerItems: [oldItem, document] }] } })), originalname: 'QA-ficticio.json' } };
    let allowed = false; dataTransferRouter.stack[0].handle(req, res, () => { allowed = true; });
    if (allowed) await route.stack.at(-1).handle(req, res);
  }
  return res;
}

for (const mode of ['append', 'module', 'backup']) {
  test(`${mode}: missing evidence rolls back data, version and audit`, async () => {
    const missing = { ...item }; delete missing.fileId;
    await assert.rejects(() => write(mode, missing), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
    assert.deepEqual((await stored()).data, [worker]);
    assert.equal(Number((await stored()).version), 3);
    assert.deepEqual(await audits(), []);
  });

  test(`${mode}: available same-tenant evidence persists without rewriting legacy records`, async () => {
    const res = await write(mode, item);
    assert.equal(res.statusCode, mode === 'append' ? 201 : 200);
    const result = await stored();
    assert.deepEqual(result.data[0].workerItems, [oldItem, item]);
    assert.equal(Number(result.version), 4);
    assert.equal((await audits()).length, 1);
  });

  test(`${mode}: a foreign or fabricated file reference cannot be used`, async () => {
    for (const fileId of [FOREIGN, '44444444-4444-4444-8444-444444444444', 'not-a-file']) {
      await assert.rejects(() => write(mode, { ...item, fileId }), error => error.code === 'WORKER_DOCUMENT_FILE_UNAVAILABLE');
      assert.deepEqual((await stored()).data, [worker]);
      assert.deepEqual(await audits(), []);
    }
  });
}

test('deleted, uncleared, inaccessible or wrongly scoped files do not become attached evidence', async () => {
  for (const update of ["deleted_at=now()", "malware_status='pending'", "storage_key='tenants/qa-other/objects/file'", "entity_type='contract'"]) {
    await db.query('UPDATE file_objects SET deleted_at=NULL,malware_status=$1,storage_key=$2,entity_type=$3 WHERE id=$4', ['clean', `tenants/qa-tenant/objects/${FILE}`, 'worker_document', FILE]);
    await db.exec(`UPDATE file_objects SET ${update} WHERE id='${FILE}'`);
    await assert.rejects(() => write('append', item, { role: 'rrhh', authPatch: { permissions: { modules: { contratos: false } } } }), error => error.code === 'WORKER_DOCUMENT_FILE_UNAVAILABLE');
    assert.deepEqual((await stored()).data, [worker]);
    assert.deepEqual(await audits(), []);
  }
});

test('identity requires two authorized sides and expiry through the actual endpoint', async () => {
  const identity = { id: 'qa-identity', name: 'Cédula de identidad', documentType: 'IDENTITY_CARD', files: [{ side: 'front', fileId: FILE }, { side: 'back', fileId: BACK }], vence: '2030-01-01' };
  const missingBack = { ...identity, files: identity.files.slice(0, 1) };
  await assert.rejects(() => write('append', missingBack), error => error.code === 'WORKER_DOCUMENT_SIDES_REQUIRED');
  await assert.rejects(() => write('append', { ...identity, vence: '' }), error => error.code === 'WORKER_DOCUMENT_EXPIRY_REQUIRED');
  assert.equal((await write('append', identity)).statusCode, 201);
});

test('caller-supplied history cannot authorize a new fileless document', async () => {
  const missing = { ...item }; delete missing.fileId;
  await assert.rejects(() => write('module', missing, { snapshot: { previousState: { trabajadores: [{ ...worker, workerItems: [oldItem, missing] }] } } }), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
  assert.deepEqual((await stored()).data, [worker]);
});

test('read-only users and disabled worker modules cannot create evidence', async () => {
  assert.equal((await write('append', item, { role: 'consulta' })).statusCode, 403);
  await assert.rejects(() => write('append', item, { role: 'rrhh', authPatch: { permissions: { modules: { trabajadores: false } } } }), error => error.code === 'MODULE_PERMISSION_DENIED');
  assert.deepEqual((await stored()).data, [worker]);
});

test('audit failure rolls back the newly attached document and version', async () => {
  await db.exec("ALTER TABLE audit_log ADD CONSTRAINT qa_reject_audit CHECK (action <> 'worker.document_added')");
  await assert.rejects(() => write('append', item));
  assert.deepEqual((await stored()).data, [worker]);
  assert.equal(Number((await stored()).version), 3);
  await db.exec('ALTER TABLE audit_log DROP CONSTRAINT qa_reject_audit');
});
