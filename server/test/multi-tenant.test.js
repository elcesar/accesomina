import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

async function applyMigrations(db) {
  const dir = path.resolve('database/postgres');
  const files = (await fs.readdir(dir)).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  for (const file of files) {
    const sql = (await fs.readFile(path.join(dir, file), 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, '');
    await db.exec(sql);
  }
}

test('N companies keep users, operational data and branding fully isolated', async () => {
  const db = new PGlite();
  await applyMigrations(db);
  const companies = [];

  for (let index = 1; index <= 3; index += 1) {
    const tenant = (await db.query(
      `INSERT INTO tenants(tenant_code,company_name,rut,admin_email,status)
       VALUES($1,$2,$3,$4,'active') RETURNING id`,
      [`company-${index}`, `Empresa ${index}`, `70.000.00${index}-${index}`, `admin${index}@example.cl`]
    )).rows[0];
    companies.push(tenant.id);

    await db.exec('BEGIN');
    await db.query("SELECT set_config('app.current_tenant_id',$1,true)", [tenant.id]);
    const user = (await db.query(
      `INSERT INTO app_users(tenant_id,email,full_name,role)
       VALUES($1,$2,$3,'client_admin') RETURNING id`,
      [tenant.id, `admin${index}@example.cl`, `Administrador ${index}`]
    )).rows[0];
    await db.query(
      `INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,updated_by)
       VALUES($1,$2::jsonb,$3::jsonb,$4::jsonb,$5)`,
      [tenant.id, JSON.stringify({ displayName:`Marca ${index}`, accent:`#0${index}0${index}0${index}`, logoUrl:`https://cdn.example.com/logo-${index}.png` }), JSON.stringify({ hoteleria:index !== 2 }), JSON.stringify({ warningDays:20 + index, criticalDays:5 }), user.id]
    );
    await db.query(
      `INSERT INTO tenant_module_state(tenant_id,module_key,data,updated_by)
       VALUES($1,'trabajadores',$2::jsonb,$3)`,
      [tenant.id, JSON.stringify([{ id:`worker-${index}`, rut:'12.345.678-5', nombre:`Trabajador ${index}` }]), user.id]
    );
    await db.query(
      `INSERT INTO tenant_integrations(tenant_id,provider,enabled,public_config,updated_by)
       VALUES($1,'whatsapp',true,$2::jsonb,$3)`,
      [tenant.id, JSON.stringify({ phoneNumberId:`phone-${index}` }), user.id]
    );
    await db.query(
      `INSERT INTO workers(tenant_id,full_name,rut) VALUES($1,$2,'12.345.678-5')`,
      [tenant.id, `Trabajador ${index}`]
    );
    await db.exec('COMMIT');
  }

  await db.exec('CREATE ROLE tenant_runtime_test NOLOGIN');
  await db.exec('GRANT USAGE ON SCHEMA public TO tenant_runtime_test');
  await db.exec('GRANT SELECT ON app_users,tenant_module_state,tenant_settings,tenant_integrations,workers TO tenant_runtime_test');

  for (let index = 0; index < companies.length; index += 1) {
    await db.exec('BEGIN');
    await db.query("SELECT set_config('app.current_tenant_id',$1,true)", [companies[index]]);
    await db.exec('SET LOCAL ROLE tenant_runtime_test');
    const users = await db.query('SELECT tenant_id,email FROM app_users');
    const state = await db.query("SELECT tenant_id,data FROM tenant_module_state WHERE module_key='trabajadores'");
    const settings = await db.query('SELECT tenant_id,branding,modules,alerts FROM tenant_settings');
    const integrations = await db.query("SELECT tenant_id,public_config FROM tenant_integrations WHERE provider='whatsapp'");
    const workers = await db.query('SELECT tenant_id,rut FROM workers');

    for (const rows of [users.rows, state.rows, settings.rows, integrations.rows, workers.rows]) {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].tenant_id, companies[index]);
    }
    assert.equal(settings.rows[0].branding.displayName, `Marca ${index + 1}`);
    assert.equal(settings.rows[0].branding.logoUrl, `https://cdn.example.com/logo-${index + 1}.png`);
    assert.equal(integrations.rows[0].public_config.phoneNumberId, `phone-${index + 1}`);
    assert.equal(state.rows[0].data[0].id, `worker-${index + 1}`);
    await db.exec('ROLLBACK');
  }

  await db.close();
});
