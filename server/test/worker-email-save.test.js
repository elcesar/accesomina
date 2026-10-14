import assert from 'node:assert/strict';
import test, { before, after, beforeEach, mock } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { stateRouter } from '../routes/state.js';
import { isValidEmail, normalizeEmail } from '../../nexo-v2/src/services/email-validation.js';
import { emailCases } from './fixtures/email-cases.js';

const legacy = { id: 'qa-legacy', nombre: 'Persona antigua QA', rut: '14.567.890-0', email: 'correo-invalido' };
const valid = { id: 'qa-valid', nombre: 'Persona válida QA', rut: '14.507.215-8', email: 'qa@ejemplo.test' };
const route = stateRouter.stack.find(layer => layer.route?.path === '/modules' && layer.route.methods.put).route;
let db;

before(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE tenant_module_state (
      tenant_id text, module_key text, data jsonb, version bigint DEFAULT 1,
      updated_by text, updated_at timestamptz DEFAULT now(), PRIMARY KEY (tenant_id,module_key)
    );
    CREATE TABLE audit_log (
      tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb
    );
  `);
  mock.method(pool, 'connect', async () => ({ query: (sql, params) => db.query(sql, params), release() {} }));
});
after(async () => { mock.restoreAll(); await db?.close(); });
beforeEach(async () => {
  await db.exec('TRUNCATE tenant_module_state, audit_log');
  await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,$4)', ['qa-tenant', 'trabajadores', JSON.stringify([legacy, valid]), 3]);
});

async function save(data, { version = 3, role = 'client_admin', body = {}, module = 'trabajadores' } = {}) {
  const req = { auth: { tenantId: 'qa-tenant', userId: 'qa-admin', role }, body: { ...body, changes: { [module]: { version, data } }, reason: 'Actualización QA' } };
  const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  let allowed = false;
  route.stack[0].handle(req, res, () => { allowed = true; });
  if (allowed) await route.stack.at(-1).handle(req, res, error => { throw error; });
  return res;
}
async function persisted() {
  return (await db.query("SELECT data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' AND module_key='trabajadores'")).rows[0];
}
async function audits() { return (await db.query('SELECT * FROM audit_log')).rows; }

test('actual module save preserves the historical worker, increments the version and audits only the edit', async () => {
  const response = await save([legacy, { ...valid, especialidad: 'Especialidad QA' }]);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.moduleVersions.trabajadores, 4);
  const saved = await persisted();
  assert.deepEqual(saved.data[0], legacy);
  assert.equal(saved.data[1].especialidad, 'Especialidad QA');
  const audit = await audits();
  assert.equal(audit.length, 1);
  assert.deepEqual(audit[0].new_value.changes, [{ path: '/trabajadores/qa-valid/especialidad', after: 'Especialidad QA' }]);
});

test('an invalid changed email rolls back the module, version and audit', async () => {
  await assert.rejects(() => save([legacy, { ...valid, email: 'correo-nuevo-invalido' }]), error => error.code === 'INVALID_WORKER_EMAIL');
  const saved = await persisted();
  assert.deepEqual(saved.data, [legacy, valid]);
  assert.equal(Number(saved.version), 3);
  assert.deepEqual(await audits(), []);
});

test('request-supplied previous state cannot bypass server email validation', async () => {
  const forged = [legacy, { ...valid, email: 'correo-nuevo-invalido' }];
  await assert.rejects(() => save(forged, { body: { previousState: { trabajadores: forged } } }), error => error.code === 'INVALID_WORKER_EMAIL');
  assert.deepEqual((await persisted()).data, [legacy, valid]);
});

test('a version conflict never persists worker changes or creates audit entries', async () => {
  const response = await save([legacy, { ...valid, nombre: 'Cambio QA' }], { version: 2 });
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'MODULE_VERSION_CONFLICT');
  assert.deepEqual((await persisted()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});

test('the read-only role still cannot save the worker module', async () => {
  const response = await save([legacy, { ...valid, nombre: 'Cambio QA' }], { role: 'consulta' });
  assert.equal(response.statusCode, 403);
  assert.deepEqual((await persisted()).data, [legacy, valid]);
  assert.deepEqual(await audits(), []);
});

test('saving another module does not change historical worker emails', async () => {
  const response = await save([{ id: 'qa-client', nombre: 'Cliente QA' }], { module: 'minas', version: 0 });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.moduleVersions.minas, 1);
  assert.deepEqual((await persisted()).data, [legacy, valid]);
});

test('a historical email can be corrected through the actual save route', async () => {
  const response = await save([{ ...legacy, email: ' corregido@ejemplo.test ' }, valid]);
  assert.equal(response.statusCode, 200);
  assert.equal((await persisted()).data[0].email, 'corregido@ejemplo.test');
  assert.equal((await audits()).length, 1);
});

test('unchanged historical email punctuation is preserved through actual persistence', async () => {
  const historical = { ...legacy, email: " 'correo-antiguo-invalido' " };
  await db.query("UPDATE tenant_module_state SET data=$1::jsonb WHERE module_key='trabajadores'", [JSON.stringify([historical, valid])]);
  await save([historical, { ...valid, cargo: 'Cargo QA' }]);
  assert.deepEqual((await persisted()).data[0], historical);
});

for (const { name, value, valid: accepted } of emailCases) {
  test(`actual module persistence matches shared UI policy: ${name}`, async () => {
    assert.equal(isValidEmail(value), accepted);
    const proposed = [legacy, { ...valid, email: value }];
    if (accepted) {
      const response = await save(proposed);
      assert.equal(response.statusCode, 200);
      const stored = await persisted();
      assert.deepEqual(stored.data[0], legacy);
      assert.equal(stored.data[1].email, value == null ? value : normalizeEmail(value));
      assert.equal(Number(stored.version), 4);
      assert.equal((await audits()).length, 1);
    } else {
      await assert.rejects(() => save(proposed), error => error.code === 'INVALID_WORKER_EMAIL');
      const stored = await persisted();
      assert.deepEqual(stored.data, [legacy, valid]);
      assert.equal(Number(stored.version), 3);
      assert.deepEqual(await audits(), []);
    }
  });
}
