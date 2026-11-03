import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { S3Client } from '@aws-sdk/client-s3';
import { pool } from '../db.js';
import { filesRouter } from '../routes/files.js';

const TENANT = '11111111-1111-4111-8111-111111111111';
const ACTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let db, events, stored;
before(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY,status text);
    CREATE TABLE file_objects(id uuid PRIMARY KEY,tenant_id uuid,uploaded_by uuid,entity_type text,entity_id text,
      original_name text,content_type text,byte_size bigint,storage_provider text,storage_key text UNIQUE,
      sha256 text,malware_status text,deleted_at timestamptz,created_at timestamptz DEFAULT now());
    CREATE TABLE audit_log(tenant_id uuid,user_id uuid,entity_type text,entity_id uuid,action text,old_value jsonb,new_value jsonb);`);
  mock.method(pool, 'connect', async () => ({
    query: async (sql, params) => { events.push(sql); return db.query(sql, params); },
    release: () => events.push('RELEASE'),
  }));
  mock.method(fs, 'mkdir', async () => {});
  mock.method(fs, 'writeFile', async () => { stored++; events.push('PHYSICAL_WRITE'); });
  mock.method(S3Client.prototype, 'send', async () => { stored++; events.push('PHYSICAL_WRITE'); return {}; });
});
after(async () => { mock.restoreAll(); await db?.close(); });
beforeEach(async () => {
  events = []; stored = 0;
  await db.exec('TRUNCATE tenants,file_objects,audit_log');
  await db.query("INSERT INTO tenants VALUES($1,'active')", [TENANT]);
});

async function upload() {
  const handler = filesRouter.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack.at(-1).handle;
  const req = { auth: { tenantId: TENANT, userId: ACTOR, role: 'client_admin' }, body: {},
    file: { buffer: Buffer.from('QA fixture'), originalname: 'QA.pdf', mimetype: 'application/pdf', size: 10 } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res);
  return res;
}

for (const status of ['suspended', 'deleted', 'missing']) {
  test(`an earlier authenticated upload cannot write after the company becomes ${status}`, async () => {
    if (status === 'missing') await db.query('DELETE FROM tenants WHERE id=$1', [TENANT]);
    else await db.query('UPDATE tenants SET status=$2 WHERE id=$1', [TENANT, status]);
    await assert.rejects(upload, { status: 403, code: 'ACCOUNT_DISABLED' });
    assert.equal(stored, 0);
    assert.equal((await db.query('SELECT count(*)::int n FROM file_objects')).rows[0].n, 0);
    assert.ok(events.includes('ROLLBACK'));
    assert.equal(events.at(-1), 'RELEASE');
  });
}

test('active upload holds its company row lock across physical storage and database commit', async () => {
  const res = await upload();
  assert.equal(res.statusCode, 201); assert.equal(stored, 1);
  const begin = events.indexOf('BEGIN');
  const lock = events.findIndex(sql => /FROM tenants.*FOR SHARE/.test(sql));
  const physical = events.indexOf('PHYSICAL_WRITE');
  const insert = events.findIndex(sql => /INSERT INTO file_objects/.test(sql));
  const commit = events.indexOf('COMMIT');
  assert.ok(begin >= 0 && lock > begin && physical > lock && insert > physical && commit > insert);
  assert.equal((await db.query('SELECT count(*)::int n FROM file_objects')).rows[0].n, 1);
});

test('deduplicated uploads also check active company state and avoid physical writes', async () => {
  const sha = crypto.createHash('sha256').update(Buffer.from('QA fixture')).digest('hex');
  await db.query(`INSERT INTO file_objects(id,tenant_id,storage_key,original_name,content_type,byte_size,malware_status)
    VALUES(gen_random_uuid(),$1,$2,'QA.pdf','application/pdf',10,'clean')`, [TENANT, `tenants/${TENANT}/objects/${sha}`]);
  const res = await upload();
  assert.equal(res.statusCode, 200); assert.equal(res.body.deduplicated, true); assert.equal(stored, 0);
  assert.ok(events.some(sql => /FROM tenants.*FOR SHARE/.test(sql)));
});
