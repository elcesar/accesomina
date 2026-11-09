import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { tenantsRouter } from '../routes/tenants.js';
import { createTenantErasureService, tenantErasureService } from '../tenant-erasure-service.js';

const TARGET = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PLATFORM = '33333333-3333-4333-8333-333333333333';
const ACTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TARGET_RUT = '13.848.379-7';
const FILE_TABLES = ['file_objects', 'worker_documents', 'occupational_exams', 'courses', 'worker_items', 'digital_signatures'];
const fixtureKey = (tenant, table) => `tenants/${tenant}/QA-private-${table}.pdf`;
const eraseInput = patch => ({ tenantId: TARGET, actorId: ACTOR, reasonCode: 'cuenta_prueba', confirmation: `ELIMINAR ${TARGET_RUT}`, ...patch });
let db, tables, columns, foreignKeys;

async function migrate(database, { after = 0, through = Infinity } = {}) {
  for (const file of (await fs.readdir('database/postgres')).filter(file => /^\d+.*\.sql$/.test(file) && Number.parseInt(file, 10) > after && Number.parseInt(file, 10) <= through).sort()) {
    await database.exec((await fs.readFile(path.join('database/postgres', file), 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, ''));
  }
}

async function schema(database) {
  const cols = (await database.query(`SELECT table_name,column_name,data_type,is_nullable,column_default,ordinal_position
    FROM information_schema.columns WHERE table_schema='public' AND table_name IN
      (SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='tenant_id')
    ORDER BY table_name,ordinal_position`)).rows;
  const fks = (await database.query(`SELECT t.relname AS table_name,a.attname AS column_name,r.relname AS referenced_table,b.attname AS referenced_column
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_class r ON r.oid=c.confrelid
    JOIN LATERAL unnest(c.conkey,c.confkey) AS k(local_key,foreign_key) ON true
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.local_key
    JOIN pg_attribute b ON b.attrelid=r.oid AND b.attnum=k.foreign_key WHERE c.contype='f'`)).rows;
  return { tables: [...new Set(cols.map(column => column.table_name))], columns: cols, foreignKeys: fks };
}

const values = {
  audit_results: { result: 'revisar' },
  file_objects: { entity_type: 'worker_document', original_name: 'QA-evidence.pdf', content_type: 'application/pdf', byte_size: 8, storage_provider: 'local', sha256: 'a'.repeat(64) },
  inventory_items: { item_type: 'epp' },
  inventory_movements: { movement_type: 'entrega', quantity: 1 },
  mandante_approvals: { status: 'pendiente' },
  notification_events: { channel: 'sistema' },
  notification_jobs: { channel: 'email' },
  operational_events: { severity: 'info' },
  privacy_consents: { status: 'otorgado' },
  privacy_incidents: { severity: 'baja' },
  privacy_rights_requests: { request_type: 'acceso' },
  retention_policies: { action: 'review', retention_days: 1 },
  tenant_integrations: { provider: 'smtp' },
  tenant_module_state: { module_key: 'qaModule' },
  work_books: { book_type: 'maestro' },
  work_book_entries: { entry_type: 'observacion', entry_number: 1 },
  work_book_signature_requests: { channel: 'email' },
  worker_items: { item_type: 'documento' },
  worker_operational_status: { status: 'disponible' },
};

// Populate every tenant-owned table, including required foreign-key chains.
// Schema-driven selection makes newly added tenant tables visible to this test.
async function seedTenant(database, tenantId, metadata) {
  const created = new Map(), pending = new Set(metadata.tables);
  while (pending.size) {
    let inserted = false;
    for (const table of pending) {
      const required = metadata.columns.filter(column => column.table_name === table && column.is_nullable === 'NO' && column.column_default === null);
      const fields = { tenant_id: tenantId };
      let ready = true;
      for (const column of required) {
        const name = column.column_name;
        if (name === 'tenant_id') continue;
        const reference = metadata.foreignKeys.find(key => key.table_name === table && key.column_name === name);
        if (reference) {
          if (!created.has(reference.referenced_table)) { ready = false; break; }
          fields[name] = created.get(reference.referenced_table)[reference.referenced_column];
        } else if (Object.hasOwn(values[table] || {}, name)) fields[name] = values[table][name];
        else if (name === 'token_hash') fields[name] = crypto.createHash('sha256').update(`${tenantId}:${table}`).digest('hex');
        else if (name === 'storage_key') fields[name] = fixtureKey(tenantId, table);
        else if (name.includes('email') || name === 'recipient') fields[name] = `qa-${tenantId}@example.test`;
        else if (name === 'rut') fields[name] = TARGET_RUT;
        else if (['integer', 'bigint', 'numeric'].includes(column.data_type)) fields[name] = 1;
        else if (column.data_type === 'date') fields[name] = '2026-01-01';
        else if (column.data_type.includes('timestamp')) fields[name] = '2030-01-01T00:00:00Z';
        else fields[name] = `QA ${name}`;
      }
      if (!ready) continue;
      Object.assign(fields, values[table] || {});
      if (FILE_TABLES.includes(table) && table !== 'file_objects') fields.s3_key = fixtureKey(tenantId, table);
      const names = Object.keys(fields);
      const row = (await database.query(`INSERT INTO ${table}(${names.join(',')}) VALUES(${names.map((_, index) => `$${index + 1}`).join(',')}) RETURNING *`, Object.values(fields))).rows[0];
      created.set(table, row); pending.delete(table); inserted = true;
    }
    assert.ok(inserted, `Fixture dependencies could not be seeded: ${[...pending].join(', ')}`);
  }
  return created;
}

async function seed(database, metadata) {
  await database.exec('TRUNCATE tenants CASCADE; TRUNCATE tenant_erasure_log,tenant_erasure_objects;');
  await database.query(`INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,is_domian_admin) VALUES
    ($1,'qa-target','Empresa ficticia objetivo',$4,'qa-target@example.test','suspended',false),
    ($2,'qa-other','Empresa ficticia intacta','76.100.001-2','qa-other@example.test','active',false),
    ($3,'qa-platform','Plataforma ficticia QA','76.123.456-7','qa-platform@example.test','active',true)`, [TARGET, OTHER, PLATFORM, TARGET_RUT]);
  await database.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'qa-global@example.test','Administrador ficticio QA','domian_admin')", [ACTOR, PLATFORM]);
  await seedTenant(database, TARGET, metadata);
  await seedTenant(database, OTHER, metadata);
}

before(async () => {
  db = new PGlite(); await migrate(db);
  ({ tables, columns, foreignKeys } = await schema(db));
});
after(async () => { await db?.close(); });
beforeEach(async () => { await seed(db, { tables, columns, foreignKeys }); });

function fixtureService({ database = db, beforeSql = async () => {}, afterSql = async () => {}, onRelease = () => {}, runQuery, eraseFiles = async () => {} } = {}) {
  return createTenantErasureService({
    connect: async () => ({
      query: async (sql, params) => { await beforeSql(sql, params); const result = await database.query(sql, params); await afterSql(sql, params, result); return result; },
      release: onRelease,
    }),
    runQuery: runQuery || ((sql, params) => database.query(sql, params)),
    eraseFiles,
  });
}
async function targetExists(database = db) { return (await database.query('SELECT 1 FROM tenants WHERE id=$1', [TARGET])).rows.length === 1; }
async function manifest(database = db) { return (await database.query('SELECT * FROM tenant_erasure_objects ORDER BY storage_key')).rows; }
async function tenantSnapshot(tenantId, database = db, ownedTables = tables) {
  return Object.fromEntries(await Promise.all(ownedTables.map(async table => [table, (await database.query(`SELECT * FROM ${table} WHERE tenant_id=$1`, [tenantId])).rows])));
}
function response() { return { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
async function callRoute(method, routePath, options = {}) {
  const { params = {}, body = {} } = options;
  const role = Object.hasOwn(options, 'role') ? options.role : 'domian_admin';
  const res = response(), req = { auth: role === undefined ? undefined : { role, userId: ACTOR, tenantId: PLATFORM }, params, body };
  let allowed = false;
  tenantsRouter.stack[0].handle(req, res, () => { allowed = true; });
  if (allowed) {
    const route = tenantsRouter.stack.find(layer => layer.route?.path === routePath && layer.route.methods[method]).route;
    await route.stack.at(-1).handle(req, res);
  }
  return res;
}

test('the three administrative erasure endpoints reject every company role and unauthenticated identity', async () => {
  for (const role of ['client_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta', undefined]) {
    for (const [method, endpoint] of [['delete', '/:id/data'], ['get', '/erasure-cleanups'], ['post', '/erasure-cleanup/:fingerprint']]) {
      const res = await callRoute(method, endpoint, { role, params: { id: TARGET, fingerprint: 'a'.repeat(64) }, body: eraseInput() });
      assert.equal(res.statusCode, 403); assert.equal(res.body.error, 'PERMISSION_DENIED');
    }
  }
  assert.equal(await targetExists(), true); assert.equal((await manifest()).length, 0);
});

test('active or platform companies and invalid reason or literal confirmation cannot erase data', async () => {
  const calls = [], service = fixtureService({ eraseFiles: async files => calls.push(...files) });
  const invalid = [
    [eraseInput({ tenantId: OTHER }), 'TENANT_MUST_BE_SUSPENDED'],
    [eraseInput({ tenantId: PLATFORM }), 'DOMIAN_ACCOUNT_PROTECTED'],
    [eraseInput({ reasonCode: 'unapproved-reason' }), 'TENANT_ERASURE_CONFIRMATION_REQUIRED'],
    [eraseInput({ reasonCode: '' }), 'TENANT_ERASURE_CONFIRMATION_REQUIRED'],
    [eraseInput({ confirmation: 'ELIMINAR OTRA EMPRESA' }), 'TENANT_ERASURE_CONFIRMATION_REQUIRED'],
    [eraseInput({ confirmation: '' }), 'TENANT_ERASURE_CONFIRMATION_REQUIRED'],
    [eraseInput({ tenantId: '44444444-4444-4444-8444-444444444444' }), 'TENANT_NOT_FOUND'],
  ];
  for (const [input, code] of invalid) await assert.rejects(() => service.erase(input), { code });
  assert.equal(await targetExists(), true); assert.equal((await manifest()).length, 0); assert.deepEqual(calls, []);
});

test('formatted RUT confirmation erases all seeded tenant tables, includes signatures and preserves the other company', async t => {
  const beforeOther = await tenantSnapshot(OTHER), calls = [];
  const result = await fixtureService({ eraseFiles: async files => calls.push(...files) }).erase(eraseInput());
  assert.equal(result.erased, true); assert.equal(result.cleanupPending, false); assert.equal(result.filesPending, 0);
  assert.equal(result.filesErased, FILE_TABLES.length); assert.equal(await targetExists(), false);
  assert.deepEqual(new Set(calls.map(file => file.storage_key)), new Set(FILE_TABLES.map(table => fixtureKey(TARGET, table))));
  for (const table of tables) assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE tenant_id=$1`, [TARGET])).rows[0].count, 0, table);
  t.diagnostic(`Cascade checked against ${tables.length} populated tenant-owned tables and ${FILE_TABLES.length} storage sources.`);
  assert.deepEqual(await tenantSnapshot(OTHER), beforeOther); assert.equal((await manifest()).length, 0);
  const receipt = (await db.query('SELECT * FROM tenant_erasure_log')).rows[0];
  assert.equal(receipt.reason_code, 'cuenta_prueba'); assert.equal(receipt.requested_by, ACTOR);
  assert.ok(!JSON.stringify(receipt).includes(TARGET_RUT)); assert.ok(!JSON.stringify(receipt).includes('Empresa ficticia objetivo'));
});

test('no physical erasure occurs before COMMIT and transaction-scoped audit exceptions are retired', async () => {
  let committed = false;
  const service = fixtureService({ beforeSql: async sql => {
    if (sql.startsWith('INSERT INTO tenant_erasure_objects')) assert.equal((await db.query("SELECT current_setting('app.current_tenant_id',true) AS tenant")).rows[0].tenant, TARGET);
  }, afterSql: async sql => { if (sql === 'COMMIT') committed = true; }, eraseFiles: async () => {
    assert.equal(committed, true); assert.equal(await targetExists(), false);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM tenant_erasure_log')).rows[0].count, 1);
  } });
  await service.erase(eraseInput());
  const settings = (await db.query("SELECT current_setting('app.current_tenant_id',true) AS tenant,current_setting('nexo.tenant_erasure',true) AS erasure,current_setting('nexo.tenant_erasure_target',true) AS target")).rows[0];
  assert.notEqual(settings.tenant, TARGET); assert.notEqual(settings.erasure, 'approved'); assert.notEqual(settings.target, TARGET);
  await assert.rejects(() => db.query('DELETE FROM audit_log WHERE tenant_id=$1', [OTHER]), /append-only/);
  await assert.rejects(() => db.query("UPDATE audit_log SET action='changed' WHERE tenant_id=$1", [OTHER]), /append-only/);
  await assert.rejects(() => db.query('DELETE FROM work_book_entry_history WHERE tenant_id=$1', [OTHER]), /append-only/);
  await assert.rejects(() => db.query("UPDATE work_book_entry_history SET action='changed' WHERE tenant_id=$1", [OTHER]), /append-only/);
});

test('transaction-local erasure approval permits only target deletes and never history updates or another tenant', async () => {
  for (const table of ['audit_log', 'work_book_entry_history']) {
    for (const operation of ['other-delete', 'target-update', 'target-delete']) {
      await db.exec('BEGIN');
      try {
        await db.query("SELECT set_config('nexo.tenant_erasure','approved',true),set_config('nexo.tenant_erasure_target',$1,true)", [TARGET]);
        if (operation === 'other-delete') await assert.rejects(() => db.query(`DELETE FROM ${table} WHERE tenant_id=$1`, [OTHER]), /append-only/);
        else if (operation === 'target-update') await assert.rejects(() => db.query(`UPDATE ${table} SET action='changed' WHERE tenant_id=$1`, [TARGET]), /append-only/);
        else assert.equal((await db.query(`DELETE FROM ${table} WHERE tenant_id=$1 RETURNING tenant_id`, [TARGET])).rows.length, 1);
      } finally { await db.exec('ROLLBACK'); }
    }
  }
});

test('upgrading a populated migration025 database to migration026 preserves data and enables only the authorized cascade', async () => {
  const upgraded = new PGlite();
  try {
    await migrate(upgraded, { through: 25 });
    const metadata = await schema(upgraded);
    await seed(upgraded, metadata);
    const beforeTarget = await tenantSnapshot(TARGET, upgraded, metadata.tables);
    const beforeOther = await tenantSnapshot(OTHER, upgraded, metadata.tables);
    const beforeCompanies = (await upgraded.query('SELECT * FROM tenants ORDER BY id')).rows;
    assert.equal(beforeTarget.work_book_entry_history.length, 1);
    assert.equal(beforeTarget.audit_log.length, 1);

    await migrate(upgraded, { after: 25, through: 26 });
    assert.deepEqual(await tenantSnapshot(TARGET, upgraded, metadata.tables), beforeTarget);
    assert.deepEqual(await tenantSnapshot(OTHER, upgraded, metadata.tables), beforeOther);
    assert.deepEqual((await upgraded.query('SELECT * FROM tenants ORDER BY id')).rows, beforeCompanies);
    for (const table of ['audit_log', 'work_book_entry_history']) {
      await assert.rejects(() => upgraded.query(`UPDATE ${table} SET action='changed' WHERE tenant_id=$1`, [TARGET]), /append-only/);
    }

    const calls = [];
    const result = await fixtureService({ database: upgraded, eraseFiles: async files => calls.push(...files) }).erase(eraseInput());
    assert.equal(result.erased, true); assert.equal(result.cleanupPending, false);
    assert.equal(await targetExists(upgraded), false);
    assert.deepEqual(new Set(calls.map(file => file.storage_key)), new Set(FILE_TABLES.map(table => fixtureKey(TARGET, table))));
    for (const table of metadata.tables) assert.equal((await upgraded.query(`SELECT count(*)::int AS count FROM ${table} WHERE tenant_id=$1`, [TARGET])).rows[0].count, 0, table);
    assert.deepEqual(await tenantSnapshot(OTHER, upgraded, metadata.tables), beforeOther);
    assert.equal((await manifest(upgraded)).length, 0);
  } finally { await upgraded.close(); }
});

for (const stage of ['manifest', 'commit']) {
  test(`a ${stage} failure rolls back company data and manifest without calling physical deletion`, async () => {
    const before = await tenantSnapshot(TARGET), calls = [];
    const service = fixtureService({ beforeSql: async sql => {
      if ((stage === 'manifest' && sql.startsWith('INSERT INTO tenant_erasure_objects')) || (stage === 'commit' && sql === 'COMMIT')) throw Object.assign(new Error('Injected QA transaction failure'), { code: 'QA_DB_FAILURE' });
    }, eraseFiles: async files => calls.push(...files) });
    await assert.rejects(() => service.erase(eraseInput()), { code: 'QA_DB_FAILURE' });
    assert.equal(await targetExists(), true); assert.deepEqual(await tenantSnapshot(TARGET), before);
    assert.equal((await manifest()).length, 0); assert.equal((await db.query('SELECT count(*)::int AS count FROM tenant_erasure_log')).rows[0].count, 0); assert.deepEqual(calls, []);
  });
}

test('partial physical failure returns HTTP202, lists only safe recovery metadata and retries idempotently', async t => {
  let fail = true; const calls = [];
  const service = fixtureService({ eraseFiles: async files => {
    calls.push(...files);
    if (fail && files[0].storage_key === fixtureKey(TARGET, 'digital_signatures')) throw Object.assign(new Error('QA private storage path and qa@example.test'), { code: 'AccessDenied' });
  } });
  t.mock.method(tenantErasureService, 'erase', service.erase); t.mock.method(tenantErasureService, 'cleanup', service.cleanup); t.mock.method(tenantErasureService, 'listPending', service.listPending);
  const deleted = await callRoute('delete', '/:id/data', { params: { id: TARGET }, body: { reasonCode: 'cuenta_prueba', confirmation: `ELIMINAR ${TARGET_RUT}` } });
  assert.equal(deleted.statusCode, 202); assert.equal(deleted.body.erased, true); assert.equal(deleted.body.filesPending, 1); assert.match(deleted.body.erasureId, /^[a-f0-9]{64}$/);
  const list = await callRoute('get', '/erasure-cleanups'); assert.equal(list.body.length, 1); assert.equal(list.body[0].filesPending, 1);
  assert.deepEqual(Object.keys(list.body[0]).sort(), ['deletedAt', 'erasureId', 'filesPending', 'lastError', 'reasonCode'].sort());
  const serialized = JSON.stringify(list.body); for (const secret of [TARGET, TARGET_RUT, 'QA-private', 'qa@example.test', 'Empresa ficticia']) assert.ok(!serialized.includes(secret), secret);
  assert.equal((await manifest()).length, 1); fail = false;
  const retry = await callRoute('post', '/erasure-cleanup/:fingerprint', { params: { fingerprint: deleted.body.erasureId } });
  assert.equal(retry.statusCode, 200); assert.equal(retry.body.filesErased, 1); assert.equal((await manifest()).length, 0);
  const callsAfterSuccess = calls.length;
  const again = await service.cleanup(deleted.body.erasureId); assert.equal(again.filesErased, 0); assert.equal(again.cleanupPending, false); assert.equal(calls.length, callsAfterSuccess);
  assert.deepEqual(await service.listPending(), []);
});

test('a database failure immediately after COMMIT retains a discoverable receipt and pending cleanup', async () => {
  let unavailable = true;
  const service = fixtureService({ runQuery: async (sql, params) => {
    if (unavailable) throw Object.assign(new Error('Injected QA database interruption'), { code: '57P01' });
    return db.query(sql, params);
  } });
  const result = await service.erase(eraseInput());
  assert.equal(result.erased, true); assert.equal(result.cleanupPending, true); assert.equal(result.filesPending, null); assert.equal(await targetExists(), false);
  unavailable = false;
  const pending = await service.listPending(); assert.equal(pending[0].erasureId, result.erasureId); assert.equal(pending[0].filesPending, FILE_TABLES.length);
  const recovered = await service.cleanup(pending[0].erasureId); assert.equal(recovered.cleanupPending, false); assert.equal((await manifest()).length, 0);
});

test('a lost COMMIT acknowledgement returns a recoverable erasure when the durable receipt proves it committed', async () => {
  const calls = []; let released = false;
  const service = fixtureService({ afterSql: async sql => {
    if (sql === 'COMMIT') throw Object.assign(new Error('Injected QA lost COMMIT acknowledgement'), { code: '08006' });
  }, onRelease: () => { released = true; }, runQuery: async (sql, params) => {
    assert.equal(released, true, 'Receipt verification must release its old connection first'); return db.query(sql, params);
  }, eraseFiles: async files => calls.push(...files) });
  const result = await service.erase(eraseInput());
  assert.equal(result.erased, true); assert.equal(result.cleanupPending, true); assert.match(result.erasureId, /^[a-f0-9]{64}$/);
  assert.equal(await targetExists(), false); assert.equal(calls.length, 0);
  assert.equal((await fixtureService().listPending())[0].erasureId, result.erasureId);
});

test('an unverifiable lost COMMIT acknowledgement never deletes files or claims success and is discoverable after recovery', async () => {
  const calls = [];
  const service = fixtureService({ afterSql: async sql => {
    if (sql === 'COMMIT') throw Object.assign(new Error('Injected QA lost COMMIT acknowledgement'), { code: '08006' });
  }, runQuery: async () => { throw Object.assign(new Error('Injected QA verification outage'), { code: '08001' }); }, eraseFiles: async files => calls.push(...files) });
  await assert.rejects(() => service.erase(eraseInput()), { code: '08006' });
  assert.equal(await targetExists(), false); assert.deepEqual(calls, []); assert.equal((await manifest()).length, FILE_TABLES.length);
  const recovered = fixtureService(), pending = await recovered.listPending();
  assert.equal(pending.length, 1); assert.equal(pending[0].filesPending, FILE_TABLES.length);
  assert.equal((await recovered.cleanup(pending[0].erasureId)).cleanupPending, false); assert.equal((await manifest()).length, 0);
});

for (const alsoFailErrorWrite of [false, true]) {
  test(`manifest acknowledgement failure keeps objects retryable${alsoFailErrorWrite ? ' even when recording its error also fails' : ''}`, async () => {
    let failing = true; const calls = [];
    const service = fixtureService({ runQuery: async (sql, params) => {
      if (failing && (sql.startsWith('DELETE FROM tenant_erasure_objects') || (alsoFailErrorWrite && sql.startsWith('UPDATE tenant_erasure_objects SET last_error')))) throw Object.assign(new Error('Injected QA manifest write failure'), { code: '57P01' });
      return db.query(sql, params);
    }, eraseFiles: async files => { calls.push(...files); } });
    const result = await service.erase(eraseInput());
    assert.equal(result.cleanupPending, true); assert.equal(result.filesPending, FILE_TABLES.length); assert.equal((await manifest()).length, FILE_TABLES.length);
    failing = false; const retry = await service.cleanup(result.erasureId);
    assert.equal(retry.cleanupPending, false); assert.equal((await manifest()).length, 0); assert.equal(calls.length, FILE_TABLES.length * 2);
  });
}

test('legacy manifest rows marked deleted remain discoverable and are idempotently purged', async () => {
  const result = await fixtureService({ eraseFiles: async () => { throw new Error('QA unavailable'); } }).erase(eraseInput());
  await db.query('UPDATE tenant_erasure_objects SET deleted_at=now() WHERE tenant_fingerprint=$1', [result.erasureId]);
  const recovered = fixtureService(); assert.equal((await recovered.listPending())[0].filesPending, FILE_TABLES.length);
  assert.equal((await recovered.cleanup(result.erasureId)).filesErased, FILE_TABLES.length); assert.equal((await manifest()).length, 0);
});

test('cleanup validates its identifier and cannot invent a receipt or touch another company', async () => {
  const otherBefore = await tenantSnapshot(OTHER), calls = [], service = fixtureService({ eraseFiles: async files => calls.push(...files) });
  await assert.rejects(() => service.cleanup('not-an-erasure'), { code: 'INVALID_ERASURE_ID' });
  await assert.rejects(() => service.cleanup('f'.repeat(64)), { code: 'ERASURE_NOT_FOUND' });
  assert.deepEqual(await tenantSnapshot(OTHER), otherBefore); assert.deepEqual(calls, []);
});

test('pending cleanup survives a PGlite close/reopen and a new service without its predecessor memory', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nexoklar-erasure-db-'));
  let persisted;
  try {
    persisted = new PGlite(directory); await migrate(persisted); const metadata = await schema(persisted); await seed(persisted, metadata);
    await fixtureService({ database: persisted, eraseFiles: async () => { throw new Error('QA offline storage'); } }).erase(eraseInput());
    await persisted.close(); persisted = new PGlite(directory);
    const freshCalls = [], restarted = fixtureService({ database: persisted, eraseFiles: async files => freshCalls.push(...files) });
    const pending = await restarted.listPending(); assert.equal(pending.length, 1); assert.equal(pending[0].filesPending, FILE_TABLES.length);
    assert.equal((await restarted.cleanup(pending[0].erasureId)).cleanupPending, false); assert.equal(freshCalls.length, FILE_TABLES.length); assert.equal((await manifest(persisted)).length, 0);
    assert.equal(await targetExists(persisted), false); assert.equal((await persisted.query('SELECT 1 FROM tenants WHERE id=$1', [OTHER])).rows.length, 1);
  } finally {
    await persisted?.close();
    // Only this test's own temporary PostgreSQL data directory is removed.
    await fs.rm(directory, { recursive: true, force: true });
  }
});
