import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

test('all PostgreSQL migrations apply in order', async () => {
  const db=new PGlite();const dir=path.resolve('database/postgres');
  const files=(await fs.readdir(dir)).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
  for(const file of files) {const sql=(await fs.readFile(path.join(dir,file),'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g,'');await db.exec(sql);}
  const tables=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const names=new Set(tables.rows.map(r=>r.tablename));
  for(const required of ['tenants','app_users','tenant_state','tenant_module_state','tenant_settings','tenant_integrations','user_sessions','file_objects','integration_events','audit_log'])assert.equal(names.has(required),true,`missing ${required}`);
  const trigger=await db.query("SELECT tgname FROM pg_trigger WHERE tgname='trg_audit_immutable'");assert.equal(trigger.rows.length,1);
  const tenant=await db.query('SELECT id FROM tenants LIMIT 1');
  await db.exec('BEGIN');await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[tenant.rows[0].id]);
  await db.query("INSERT INTO audit_log(tenant_id,entity_type,action) VALUES($1,'test','created')",[tenant.rows[0].id]);
  await assert.rejects(()=>db.query("UPDATE audit_log SET action='changed'"),/append-only/);await db.exec('ROLLBACK');
  const policies=await db.query("SELECT tablename FROM pg_policies WHERE policyname LIKE 'tenant_%'");assert.ok(policies.rows.length>=18);
  const domian=await db.query("SELECT id,status,is_domian_admin,admin_email FROM tenants WHERE regexp_replace(lower(rut),'[^0-9k]','','g')='784252132'");assert.equal(domian.rows[0].status,'active');assert.equal(domian.rows[0].is_domian_admin,true);assert.equal(domian.rows[0].admin_email,'contacto@domian.cl');
  await db.exec('BEGIN');await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[domian.rows[0].id]);const domianUser=await db.query("SELECT role,active FROM app_users WHERE tenant_id=$1 AND lower(email)='contacto@domian.cl'",[domian.rows[0].id]);assert.equal(domianUser.rows[0].role,'domian_admin');assert.equal(domianUser.rows[0].active,true);await db.exec('ROLLBACK');
  const forced=await db.query("SELECT relname FROM pg_class WHERE relforcerowsecurity=true");assert.ok(forced.rows.some(r=>r.relname==='tenant_module_state'));assert.ok(forced.rows.some(r=>r.relname==='workers'));
  const companies=await db.query("INSERT INTO tenants(tenant_code,company_name,rut,admin_email) VALUES('isolation-a','Empresa A','11.111.111-1','a@test.cl'),('isolation-b','Empresa B','22.222.222-2','b@test.cl') RETURNING id,tenant_code");
  const pending=await db.query("SELECT status FROM tenants WHERE tenant_code='isolation-a'");assert.equal(pending.rows[0].status,'pending');
  const companyA=companies.rows.find(x=>x.tenant_code==='isolation-a').id,companyB=companies.rows.find(x=>x.tenant_code==='isolation-b').id;
  await db.exec('BEGIN');await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[companyA]);await db.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[{\"id\":\"a1\"}]')",[companyA]);await db.exec('COMMIT');
  await db.exec('BEGIN');await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[companyB]);await db.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[{\"id\":\"b1\"}]')",[companyB]);await db.exec('COMMIT');
  await db.exec('CREATE ROLE tenant_isolation_test NOLOGIN');await db.exec('GRANT USAGE ON SCHEMA public TO tenant_isolation_test');await db.exec('GRANT SELECT ON tenant_module_state TO tenant_isolation_test');
  await db.exec('BEGIN');await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[companyB]);await db.exec('SET LOCAL ROLE tenant_isolation_test');const isolated=await db.query("SELECT tenant_id,data FROM tenant_module_state WHERE module_key='trabajadores'");assert.equal(isolated.rows.length,1);assert.equal(isolated.rows[0].tenant_id,companyB);assert.equal(isolated.rows[0].data[0].id,'b1');await db.exec('ROLLBACK');
  await db.close();
});
