import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { erasureConfirmation, eraseTenantFiles, tenantFingerprint, validErasureConfirmation } from '../tenant-erasure.js';

const tenant = { id: 'a6f3a1f9-7a40-4a0d-85e4-0b950a8cfc92', tenant_code: 'empresa-demo', rut: '76.123.456-7' };

test('tenant erasure requires the exact tenant-specific confirmation', () => {
  assert.equal(erasureConfirmation(tenant), 'ELIMINAR 761234567');
  assert.equal(validErasureConfirmation('ELIMINAR 761234567', tenant), true);
  assert.equal(validErasureConfirmation('ELIMINAR 761234568', tenant), false);
  assert.notEqual(tenantFingerprint(tenant), tenantFingerprint({ ...tenant, tenant_code: 'otra-empresa' }));
});

test('tenant erasure removes each unique physical object once', async () => {
  const deleted = [];
  const count = await eraseTenantFiles([{ storage_provider: 'local', storage_key: 'tenants/a/a.pdf' }, { storage_provider: 'local', storage_key: 'tenants/a/a.pdf' }, { storage_provider: 'local', storage_key: 'tenants/a/b.pdf' }], { removeFile: async file => { deleted.push(file); } });
  assert.equal(count, 2);
  assert.equal(deleted.length, 2);
});

test('hard delete cascades tenant records and leaves only an anonymized receipt', async () => {
  const db = new PGlite();
  const dir = path.resolve('database/postgres');
  for (const file of (await fs.readdir(dir)).filter(file => /^\d+.*\.sql$/.test(file)).sort()) {
    await db.exec((await fs.readFile(path.join(dir, file), 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, ''));
  }
  const platform = (await db.query("INSERT INTO tenants(tenant_code,company_name,rut,admin_email,status,is_domian_admin) VALUES('nexo','Nexo Klar','76.123.456-7','admin@nexo.cl','active',true) RETURNING id")).rows[0];
  const actor = (await db.query("INSERT INTO app_users(tenant_id,email,full_name,role) VALUES($1,'admin@nexo.cl','Admin Nexo','domian_admin') RETURNING id", [platform.id])).rows[0];
  const target = (await db.query("INSERT INTO tenants(tenant_code,company_name,rut,admin_email,status) VALUES('erase-me','Empresa eliminable','77.777.777-7','admin@erase.cl','suspended') RETURNING id", [])).rows[0];
  await db.query("INSERT INTO app_users(tenant_id,email,full_name,role) VALUES($1,'admin@erase.cl','Admin cliente','client_admin')", [target.id]);
  await db.query("INSERT INTO workers(tenant_id,full_name,rut) VALUES($1,'Persona eliminable','12.345.678-5')", [target.id]);
  await db.query("INSERT INTO audit_log(tenant_id,entity_type,action) VALUES($1,'worker','created')", [target.id]);
  await db.query('SELECT hard_delete_tenant($1,$2,$3,$4)', [target.id, actor.id, 'cuenta_prueba', 'non-identifying-fingerprint']);
  assert.equal((await db.query('SELECT * FROM tenants WHERE id=$1', [target.id])).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM workers WHERE tenant_id=$1', [target.id])).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM audit_log WHERE tenant_id=$1', [target.id])).rows.length, 0);
  const receipt = (await db.query("SELECT tenant_fingerprint,reason_code FROM tenant_erasure_log WHERE tenant_fingerprint='non-identifying-fingerprint'")).rows[0];
  assert.deepEqual(receipt, { tenant_fingerprint: 'non-identifying-fingerprint', reason_code: 'cuenta_prueba' });
  await db.close();
});
