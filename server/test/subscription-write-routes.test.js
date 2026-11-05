import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { PGlite } from '@electric-sql/pglite';
const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexoklar-subscription-routes-'));
process.env.LOCAL_UPLOAD_DIR = uploadDir;
process.env.FILE_STORAGE = 'local';
process.env.VIRUS_SCAN_API_URL = '';
const { pool, withTenant } = await import('../db.js');
const { activateFreeSubscription } = await import('../subscriptions.js');
const { stateRouter } = await import('../routes/state.js');
const { BACKUP_FORMAT, dataTransferRouter } = await import('../routes/data-transfer.js');
const { filesRouter } = await import('../routes/files.js');
const { subscriptionRouter } = await import('../routes/subscriptions.js');
let db, globalTenant, globalUser, sequence = 1000, queue = Promise.resolve();
function rut(number) {
  let total = 0, factor = 2;
  for (const digit of String(number).split('').reverse()) { total += Number(digit) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const dv = 11 - total % 11;
  return `${number}-${dv === 11 ? '0' : dv === 10 ? 'K' : dv}`;
}
const workers = count => Array.from({ length: count }, (_, index) => ({ id: `qa-worker-${index}`, nombre: `Persona QA ${index}`, rut: rut(10_000_000 + index) }));

before(async () => {
  db = new PGlite();
  for (const file of (await fs.readdir('database/postgres')).filter(file => /^\d+.*\.sql$/.test(file)).sort()) {
    await db.exec((await fs.readFile(`database/postgres/${file}`, 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, ''));
  }
  mock.method(pool, 'connect', async () => {
    const previous = queue; let release; queue = new Promise(resolve => { release = resolve; }); await previous;
    return { query: (sql, params) => db.query(sql, params), release };
  });
  mock.method(pool, 'query', (sql, params) => db.query(sql, params));
  mock.method(nodemailer, 'createTransport', () => { assert.fail('route tests must not contact SMTP'); });
  globalTenant = randomUUID(); globalUser = randomUUID();
  await db.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,is_domian_admin) VALUES($1,$2,'Nexo QA',$3,'global@example.test','active',true)", [globalTenant, `global-${globalTenant}`, rut(90_000_000)]);
  await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'global@example.test','Global QA','domian_admin')", [globalUser, globalTenant]);
});
after(async () => {
  mock.restoreAll();
  await db?.close(); if (uploadDir) await fs.rm(uploadDir, { recursive: true, force: true });
});

async function company({ count = 14, expired = false } = {}) {
  const tenantId = randomUUID(), userId = randomUUID(), number = 50_000_000 + sequence++;
  await db.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status) VALUES($1,$2,'Empresa QA',$3,'admin@example.test','active')", [tenantId, `qa-${tenantId}`, rut(number)]);
  await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'admin@example.test','Admin QA','client_admin')", [userId, tenantId]);
  for (const [module, data] of Object.entries({ trabajadores: workers(count), minas: [], contratos: [], mantenciones: [] })) {
    await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,1)', [tenantId, module, JSON.stringify(data)]);
  }
  await db.query("INSERT INTO tenant_settings(tenant_id,branding) VALUES($1,'{\"displayName\":\"QA original\"}')", [tenantId]);
  const activatedAt = new Date(); if (expired) activatedAt.setMonth(activatedAt.getMonth() - 7);
  await withTenant(tenantId, client => activateFreeSubscription(client, { tenantId, userId, now: activatedAt }));
  return { tenantId, userId, role: 'client_admin', subscriptionManaged: true, subscriptionCanOperate: !expired, subscriptionServices: {}, permissions: { modules: {} } };
}

function response() {
  let finish, fail;
  const completed = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  return { statusCode: 200, completed, fail,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; finish(this); return this; },
    send(body) { this.body = body; finish(this); return this; },
    sendFile(file) { this.file = file; finish(this); return this; },
    set(headers) { this.headers = { ...this.headers, ...headers }; return this; },
    end() { finish(this); return this; } };
}
function route(router, routePath, method) { return router.stack.find(layer => layer.route?.path === routePath && layer.route.methods[method]).route; }
async function invoke(router, routePath, method, { auth, body = {}, file, params = {} } = {}) {
  const req = { auth, body, file, params, query: {}, method: method.toUpperCase(), headers: {}, url: routePath, originalUrl: routePath };
  const res = response(), handlers = route(router, routePath, method).stack;
  // Real business handlers receive already parsed multipart data. Role guards
  // still run; no transport or entitlement helper is copied into the test.
  if (handlers.length > 1) {
    let permitted = false;
    await handlers[0].handle(req, res, error => { if (error) throw error; permitted = true; });
    if (!permitted) return res;
  }
  await handlers.at(-1).handle(req, res, error => { if (error) throw error; });
  return res;
}
async function snapshot(auth) {
  const [module, audits, settings] = await Promise.all([
    db.query("SELECT data,version FROM tenant_module_state WHERE tenant_id=$1 AND module_key='trabajadores'", [auth.tenantId]),
    db.query('SELECT count(*)::integer count FROM audit_log WHERE tenant_id=$1', [auth.tenantId]),
    db.query('SELECT branding FROM tenant_settings WHERE tenant_id=$1', [auth.tenantId])
  ]);
  return { data: module.rows[0].data, version: Number(module.rows[0].version), audits: audits.rows[0].count, branding: settings.rows[0].branding };
}
async function saveWorkers(auth, records) {
  const current = await snapshot(auth);
  return invoke(stateRouter, '/modules', 'put', { auth, body: { changes: { trabajadores: { version: current.version, data: records } }, reason: 'Prueba QA de capacidad' } });
}
function pdfFile(value = 'QA evidence') { const buffer = Buffer.from(`%PDF-1.4\n${value}`); return { buffer, size: buffer.length, originalname: 'qa.pdf', mimetype: 'application/pdf' }; }
async function delegatedDocument(auth, { file = pdfFile(), type = 'subscription_document', downloadId } = {}) {
  const res = response();
  const globalAuth = { tenantId: globalTenant, userId: globalUser, role: 'domian_admin', subscriptionManaged: false, subscriptionServices: {}, permissions: { modules: {} } };
  const req = { auth: globalAuth, params: { id: auth.tenantId, ...(downloadId ? { fileId: downloadId } : {}) },
    body: { entityType: type, entityId: 'qa-commercial-document' }, file: downloadId ? undefined : file,
    method: downloadId ? 'GET' : 'POST', headers: {}, url: '/', originalUrl: '/', baseUrl: '' };
  const globalGuard = subscriptionRouter.stack.find(layer => layer.handle.name === 'requireGlobal').handle;
  let allowed = false;
  await globalGuard(req, res, error => { if (error) res.fail(error); else allowed = true; });
  if (!allowed) return res.completed;
  const routePath = downloadId ? '/subscriptions/admin/companies/:id/documents/:fileId' : '/subscriptions/admin/companies/:id/documents';
  route(subscriptionRouter, routePath, downloadId ? 'get' : 'post').stack.at(-1).handle(req, res, error => res.fail(error || new Error('Document delegation did not finish')));
  return res.completed;
}

test('actual state writes accept the fifteenth person and reject the sixteenth atomically', async () => {
  const auth = await company();
  assert.equal((await saveWorkers(auth, workers(15))).statusCode, 200);
  const accepted = await snapshot(auth);
  assert.equal(accepted.data.length, 15);
  await assert.rejects(() => saveWorkers(auth, workers(16)), error => error.code === 'SUBSCRIPTION_WORKER_LIMIT');
  assert.deepEqual(await snapshot(auth), accepted);
});

test('CSV append and backup restore cannot exceed capacity or change version, settings and audit on rejection', async () => {
  const auth = await company(), csv = `nombre,rut\nPersona nueva QA,${rut(40_000_000)}\n`;
  assert.equal((await invoke(dataTransferRouter, '/import/:type', 'post', { auth, params: { type: 'trabajadores' }, file: { buffer: Buffer.from(csv), originalname: 'qa.csv' } })).statusCode, 200);
  const accepted = await snapshot(auth);
  assert.equal(accepted.data.length, 15);
  const overflow = `nombre,rut\nPersona excedida QA,${rut(40_000_001)}\n`;
  await assert.rejects(() => invoke(dataTransferRouter, '/import/:type', 'post', { auth, params: { type: 'trabajadores' }, file: { buffer: Buffer.from(overflow) } }), error => error.code === 'SUBSCRIPTION_WORKER_LIMIT');
  assert.deepEqual(await snapshot(auth), accepted);
  const backup = { format: BACKUP_FORMAT, version: 2, modules: { trabajadores: workers(16) }, settings: { branding: { displayName: 'No debe persistir' } } };
  await assert.rejects(() => invoke(dataTransferRouter, '/import/:type', 'post', { auth, params: { type: 'backup' }, file: { buffer: Buffer.from(JSON.stringify(backup)) } }), error => error.code === 'SUBSCRIPTION_WORKER_LIMIT');
  assert.deepEqual(await snapshot(auth), accepted);
});

test('an expired contract rejects a zero-growth edit using the fresh database state', async () => {
  const auth = await company({ expired: true }), before = await snapshot(auth);
  // The request may have been authenticated before expiry; the database is
  // authoritative inside the write transaction, even when the count is stable.
  auth.subscriptionCanOperate = true;
  const changed = before.data.map((worker, index) => index ? worker : { ...worker, nombre: 'Cambio bloqueado QA' });
  await assert.rejects(() => saveWorkers(auth, changed), error => error.code === 'SUBSCRIPTION_SUSPENDED');
  assert.deepEqual(await snapshot(auth), before);
});

test('verified global commercial uploads and downloads work after expiry without opening the general file API', async () => {
  const auth = await company({ expired: true }), file = pdfFile('Commercial renewal QA');
  const uploaded = await delegatedDocument(auth, { file });
  assert.equal(uploaded.statusCode, 201);
  const row = (await db.query('SELECT * FROM file_objects WHERE id=$1', [uploaded.body.id])).rows[0];
  assert.equal(row.tenant_id, auth.tenantId);
  assert.equal(row.entity_type, 'subscription_document');
  assert.match(row.storage_key, /\/objects\/commercial\//);
  const downloaded = await delegatedDocument(auth, { downloadId: row.id });
  assert.deepEqual(await fs.readFile(downloaded.file), file.buffer);
  assert.equal((await delegatedDocument(auth, { type: 'worker_document' })).statusCode, 400);
  await assert.rejects(() => invoke(filesRouter, '/', 'post', { auth,
    body: { entityType: 'subscription_document', subscriptionDocumentsContext: { tenantId: auth.tenantId } }, file }), error => error.code === 'SUBSCRIPTION_SUSPENDED');
  await assert.rejects(() => invoke(filesRouter, '/', 'post', { auth, body: { entityType: 'worker_document' }, file }), error => error.code === 'SUBSCRIPTION_SUSPENDED');
  const foreign = await company({ expired: true });
  assert.equal((await delegatedDocument(foreign, { downloadId: row.id })).statusCode, 404);
});

test('commercial storage does not reuse an operational file with the same bytes', async () => {
  const auth = await company({ expired: true }), file = pdfFile('Shared bytes QA');
  const sha = createHash('sha256').update(file.buffer).digest('hex'), operationalId = randomUUID();
  const storageKey = `tenants/${auth.tenantId}/objects/${sha}`;
  await db.query(`INSERT INTO file_objects(id,tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status)
    VALUES($1,$2,$3,'worker_document','qa-worker','qa.pdf','application/pdf',$4,'local',$5,$6,'clean')`, [operationalId, auth.tenantId, auth.userId, file.size, storageKey, sha]);
  const uploaded = await delegatedDocument(auth, { file });
  assert.equal(uploaded.statusCode, 201);
  assert.notEqual(uploaded.body.id, operationalId);
  assert.equal((await db.query('SELECT count(*)::integer count FROM file_objects WHERE tenant_id=$1 AND sha256=$2', [auth.tenantId, sha])).rows[0].count, 2);
  assert.equal((await delegatedDocument(auth, { downloadId: operationalId })).statusCode, 404);
});
