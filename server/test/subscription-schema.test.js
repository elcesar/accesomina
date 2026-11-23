import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

test('subscription migration preserves legacy companies, seeds confirmed prices and enforces tenant isolation',async()=>{
  const db=new PGlite();
  try{
    const dir=path.resolve('database/postgres');
    const files=(await fs.readdir(dir)).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
    for(const file of files)await db.exec((await fs.readFile(path.join(dir,file),'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g,''));
    const legacy=await db.query('SELECT subscription_managed,subscription_services FROM tenants');
    assert.ok(legacy.rows.length>0);
    assert.ok(legacy.rows.every(row=>row.subscription_managed===false));
    assert.equal((await db.query('SELECT count(*)::int count FROM subscription_contracts')).rows[0].count,0);
    const plans=(await db.query("SELECT code,monthly_price,worker_limit,trial_months,currency,tax_rate FROM subscription_plan_versions WHERE state='PUBLISHED' ORDER BY display_order")).rows;
    assert.deepEqual(plans.map(row=>[row.code,Number(row.monthly_price),row.worker_limit,row.trial_months]),[
      ['FREE',0,15,6],['LA_UNION',1000,60,0],['PURRANQUE',2000,180,0],['FRUTILLAR',3000,360,0],['PUERTO_OCTAY',4000,720,0],
    ]);
    assert.ok(plans.every(row=>row.currency==='CLP'&&Number(row.tax_rate)===.19));
    const packages=(await db.query("SELECT workers_quantity,monthly_price,stackable,repeatable FROM subscription_package_versions WHERE state='PUBLISHED' ORDER BY workers_quantity")).rows;
    assert.deepEqual(packages.map(row=>[row.workers_quantity,Number(row.monthly_price),row.stackable,row.repeatable]),[
      [100,50000,true,false],[200,100000,true,false],[500,300000,true,false],
    ]);
    const tenants=(await db.query("INSERT INTO tenants(tenant_code,company_name,rut,admin_email) VALUES('subscription-qa-a','Empresa QA A','76.123.456-0','a@ejemplo.test'),('subscription-qa-b','Empresa QA B','76.123.457-9','b@ejemplo.test') RETURNING id,tenant_code")).rows;
    const a=tenants.find(row=>row.tenant_code.endsWith('-a')).id,b=tenants.find(row=>row.tenant_code.endsWith('-b')).id;
    const plan=(await db.query("SELECT id FROM subscription_plan_versions WHERE code='LA_UNION'")).rows[0].id;
    for(const tenant of [a,b]){
      await db.query(`INSERT INTO subscription_contracts(tenant_id,plan_version_id,plan_code,snapshot,starts_at,ends_at,grace_ends_at,anchor_day)
        VALUES($1,$2,'LA_UNION','{}','2026-11-05','2026-12-05','2027-01-04',5)`,[tenant,plan]);
    }
    await db.exec('CREATE ROLE subscription_schema_reader NOLOGIN;GRANT USAGE ON SCHEMA public TO subscription_schema_reader;GRANT SELECT ON subscription_contracts TO subscription_schema_reader');
    await db.exec('BEGIN');
    await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[a]);
    await db.exec('SET LOCAL ROLE subscription_schema_reader');
    const own=(await db.query('SELECT tenant_id FROM subscription_contracts')).rows;
    assert.deepEqual(own,[{tenant_id:a}]);
    await db.exec('ROLLBACK');
    const forced=(await db.query("SELECT relname FROM pg_class WHERE relforcerowsecurity AND relname LIKE 'subscription_%'")).rows.map(row=>row.relname);
    for(const name of ['subscription_contracts','subscription_periods','subscription_requests','subscription_contract_packages','subscription_free_benefits','subscription_notifications','subscription_commercial_requests'])assert.ok(forced.includes(name),name);
    await db.query("INSERT INTO subscription_free_benefits(company_fingerprint,tenant_id,started_at,expires_at) VALUES('qa-company-fingerprint',$1,'2026-11-05','2027-05-05')",[a]);
    await db.query('DELETE FROM tenants WHERE id=$1',[a]);
    const benefit=(await db.query("SELECT tenant_id,started_at,expires_at FROM subscription_free_benefits WHERE company_fingerprint='qa-company-fingerprint'")).rows[0];
    assert.ok(benefit);assert.equal(benefit.tenant_id,null);
  }finally{await db.close();}
});
