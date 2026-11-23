import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// This suite intentionally requires a disposable PostgreSQL database. PGlite
// cannot establish that independent connections respect production row locks.
test('PostgreSQL: concurrent quota writes and Free activation serialize across independent connections', {
  skip: process.env.SUBSCRIPTION_POSTGRES_TESTS !== '1', timeout: 30000,
}, async t => {
  const { pool, withTenant } = await import('../db.js');
  const { activateFreeSubscription, assertSubscriptionWorkerCapacity, lockSubscriptionTenant } = await import('../subscriptions.js');
  const { sha256, normalizeRut } = await import('../security.js');
  const tenantId=randomUUID(), userId=randomUUID();
  const now=new Date();
  const database=(await pool.query('SELECT current_database() AS name')).rows[0].name;
  if(!/^subscription_qa(?:_|$)/.test(database)) {
    await pool.end();
    throw new Error('This integration suite requires a disposable database named subscription_qa.');
  }
  try {
    await pool.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status) VALUES($1,$2,'QA PostgreSQL Planes','13.848.379-7','qa@example.test','active')",[tenantId,`qa-pg-${tenantId}`]);
    await pool.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'qa@example.test','QA PostgreSQL','client_admin')",[userId,tenantId]);
    await pool.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[]')",[tenantId]);
    const free=()=>withTenant(tenantId,client=>activateFreeSubscription(client,{tenantId,userId,now}));
    await t.test('two simultaneous activations preserve one benefit and one contract',async()=>{
      const [one,two]=await Promise.all([free(),free()]);
      assert.equal(one.contract.id,two.contract.id);
      const result=await withTenant(tenantId,client=>client.query('SELECT count(*)::integer AS n FROM subscription_contracts WHERE tenant_id=$1',[tenantId]));
      assert.equal(result.rows[0].n,1);
    });
    await t.test('14/15 with two independent writers admits only one additional worker',async()=>{
      const records=Array.from({length:14},(_,i)=>({id:`qa-${i}`,nombre:`QA ${i}`,rut:`legacy-${i}`}));
      await pool.query("UPDATE tenant_module_state SET data=$2::jsonb WHERE tenant_id=$1 AND module_key='trabajadores'",[tenantId,JSON.stringify(records)]);
      const first=await pool.connect(), second=await pool.connect();
      try {
        for(const client of [first,second]) {
          await client.query('BEGIN');
          await client.query("SELECT set_config('app.current_tenant_id',$1,true)",[tenantId]);
          await client.query("SET LOCAL lock_timeout='5s'");
        }
        await lockSubscriptionTenant(first,tenantId);
        const secondLock=lockSubscriptionTenant(second,tenantId);
        // Register the rejection handler while this query waits on the first
        // connection, so a lock timeout cannot become an unhandled rejection.
        const waiting=secondLock.then(value=>({value}),error=>({error}));
        const read=async client=>(await client.query("SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key='trabajadores'",[tenantId])).rows[0].data;
        const previous=await read(first),next=[...previous,{id:'qa-first'}];
        await assertSubscriptionWorkerCapacity(first,tenantId,previous,next,{now});
        await first.query("UPDATE tenant_module_state SET data=$2::jsonb WHERE tenant_id=$1 AND module_key='trabajadores'",[tenantId,JSON.stringify(next)]);
        await first.query('COMMIT');
        const acquired=await waiting;if(acquired.error)throw acquired.error;
        const after=await read(second);
        assert.equal(after.length,15);
        await assert.rejects(()=>assertSubscriptionWorkerCapacity(second,tenantId,after,[...after,{id:'qa-second'}],{now}),{code:'SUBSCRIPTION_WORKER_LIMIT'});
        await second.query('ROLLBACK');
        assert.equal((await pool.query("SELECT jsonb_array_length(data) AS n FROM tenant_module_state WHERE tenant_id=$1 AND module_key='trabajadores'",[tenantId])).rows[0].n,15);
      } finally {
        await first.query('ROLLBACK').catch(()=>{}); await second.query('ROLLBACK').catch(()=>{});
        first.release();second.release();
      }
    });
  } finally {
    const fingerprint=sha256(normalizeRut('13.848.379-7'));
    await withTenant(tenantId,async client=>{
      await client.query("SELECT set_config('app.subscription_admin','true',true)");
      await client.query("UPDATE tenants SET status='suspended' WHERE id=$1",[tenantId]);
      await client.query("SELECT hard_delete_tenant($1,NULL,'cuenta_prueba',$2)",[tenantId,sha256(tenantId)]);
      // Remove only this fixture's retained ledger from the disposable database.
      await client.query('DELETE FROM subscription_free_benefits WHERE company_fingerprint=$1',[fingerprint]);
    });
    await pool.end();
  }
});
