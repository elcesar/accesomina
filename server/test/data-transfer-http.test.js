import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUBSCRIPTIONS_FIXTURE_SERVER='1';
const { createSubscriptionQaApp, QA_IDS } = await import('./subscriptions-http.test.js');

async function importWorkers(fixture, csv, account = 'admin') {
  const form = new FormData();
  form.set('file', new Blob([csv], { type: 'text/csv' }), 'personas-qa.csv');
  form.set('mode', 'append');
  const response = await fetch(`${fixture.base}/api/data-transfer/import/trabajadores`, {
    method: 'POST',
    headers: { 'x-qa-account': account },
    body: form,
  });
  return { status: response.status, body: await response.json() };
}

test('HTTP CSV diagnostics are bounded, atomic and tenant-scoped', async () => {
  const fixture = await createSubscriptionQaApp();
  try {
    const auditBefore = Number((await fixture.db.query('SELECT count(*)::int total FROM audit_log')).rows[0].total);
    const workerBefore = (await fixture.db.query('SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key=$2',[QA_IDS.tenant,'trabajadores'])).rows[0].data;

    const invalid = await importWorkers(fixture, [
      'nombre,rut,email,telefono',
      ',11.111.111-2,correo-invalido,123',
      'Persona QA,11.111.111-1,,',
      'Otra persona QA,11.111.111-1,,',
    ].join('\n'));
    assert.equal(invalid.status,400);
    assert.equal(invalid.body.error,'IMPORT_VALIDATION_FAILED');
    assert.equal(invalid.body.persisted,false);
    assert.equal(invalid.body.truncated,false);
    assert.ok(invalid.body.totalIssues >= 5);
    assert.deepEqual(invalid.body.issues.filter(issue=>issue.row===2).map(issue=>issue.column),['nombre','rut','email','telefono']);
    assert.ok(invalid.body.issues.some(issue=>issue.row===4&&issue.code==='DUPLICATE_WORKER_RUT'));

    const auditAfterInvalid = Number((await fixture.db.query('SELECT count(*)::int total FROM audit_log')).rows[0].total);
    const workerAfterInvalid = (await fixture.db.query('SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key=$2',[QA_IDS.tenant,'trabajadores'])).rows[0].data;
    assert.equal(auditAfterInvalid,auditBefore);
    assert.deepEqual(workerAfterInvalid,workerBefore);

    const capped = await importWorkers(fixture, 'nombre,rut\n' + Array.from({length:2001},()=>',11.111.111-2').join('\n'));
    assert.equal(capped.status,400);
    assert.equal(capped.body.persisted,false);
    assert.equal(capped.body.truncated,true);
    assert.equal(capped.body.issues.length,2000);
    assert.ok(capped.body.totalIssues>capped.body.issues.length);

    const success = await importWorkers(fixture,'nombre,rut,email,telefono\nPersona válida QA,14.567.890-0,,');
    if (success.status !== 200) throw new Error(`Expected valid CSV import, received ${success.status}: ${JSON.stringify(success.body)}`);
    assert.equal(success.body.imported,1);
    assert.equal(success.body.rows,1);

    const denied = await importWorkers(fixture,'nombre,rut\nPersona no autorizada QA,14.567.890-1','reader');
    assert.equal(denied.status,403);

    const legacy = await importWorkers(fixture,'nombre,rut\nPersona legacy QA,12.345.678-5','legacy');
    assert.equal(legacy.status,200);
    const tenantWorkers = (await fixture.db.query('SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key=$2',[QA_IDS.tenant,'trabajadores'])).rows[0].data;
    const legacyWorkers = (await fixture.db.query('SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key=$2',[QA_IDS.legacy,'trabajadores'])).rows[0].data;
    assert.equal(tenantWorkers.length,1);
    assert.equal(legacyWorkers.length,1);
  } finally {
    await fixture.close();
  }
});
