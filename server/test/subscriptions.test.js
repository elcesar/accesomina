import test,{before,after,beforeEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {pool,withTenant} from '../db.js';
import {activateFreeSubscription,activateInitialSubscription,assertSubscriptionOperational,assertSubscriptionWorkerCapacity,calendarMonthsAfter,countSubscriptionWorkers,
 createSubscriptionRequest,executeSubscriptionRequest,getSubscriptionCatalog,getSubscriptionSummary,lockSubscriptionTenant,
 processDueSubscriptionRequests,recommendSubscription,refreshSubscriptionLifecycle,resolvePackageComposition,saveSubscriptionCatalogVersion,
 transitionSubscriptionRequest,withSubscriptionAdmin} from '../subscriptions.js';

const TENANT='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',GLOBAL='33333333-3333-4333-8333-333333333333';
const ADMIN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',OPERATOR='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',SUPER='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW=new Date('2026-08-31T14:00:00Z');
let db,queue=Promise.resolve(),sequence=0,initialPlans,initialPackages;
before(async()=>{
 db=new PGlite();const files=(await fs.readdir('database/postgres')).filter(f=>/^\d+.*\.sql$/.test(f)).sort();
 for(const file of files)await db.exec((await fs.readFile(`database/postgres/${file}`,'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g,''));
 initialPlans=(await db.query('SELECT * FROM subscription_plan_versions')).rows;initialPackages=(await db.query('SELECT * FROM subscription_package_versions')).rows;
 mock.method(pool,'connect',async()=>{const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;return{query:(sql,params)=>db.query(sql,params),release};});
 mock.method(pool,'query',(sql,params)=>db.query(sql,params));
});
after(async()=>{mock.restoreAll();await db?.close();});
beforeEach(async()=>{
 await db.exec('TRUNCATE tenants CASCADE');
 await db.query('INSERT INTO subscription_plan_versions SELECT * FROM jsonb_populate_recordset(NULL::subscription_plan_versions,$1::jsonb)',[JSON.stringify(initialPlans)]);
 await db.query('INSERT INTO subscription_package_versions SELECT * FROM jsonb_populate_recordset(NULL::subscription_package_versions,$1::jsonb)',[JSON.stringify(initialPackages)]);
 await db.exec('TRUNCATE subscription_free_benefits,subscription_commercial_requests');
 await db.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,is_domian_admin) VALUES($1,'sub-qa','Empresa QA','13.848.379-7','admin@example.test','active',false),($2,'other-qa','Otra QA','76.666.330-5','other@example.test','active',false),($3,'platform-qa','Nexo QA','78.425.213-2','global@example.test','active',true)",[TENANT,OTHER,GLOBAL]);
 await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'admin@example.test','Admin QA','client_admin'),($3,$2,'operator@example.test','Operador QA','consulta'),($4,$5,'global@example.test','Global QA','domian_admin')",[ADMIN,TENANT,OPERATOR,SUPER,GLOBAL]);
 await db.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[]'),($2,'trabajadores','[]')",[TENANT,OTHER]);
 // Restore baseline catalog without mutating any accepted contract from another test.
 await db.query("DELETE FROM subscription_plan_versions WHERE version>1");await db.query("UPDATE subscription_plan_versions SET state='PUBLISHED' WHERE version=1");
 await db.query("DELETE FROM subscription_package_versions WHERE version>1");await db.query("UPDATE subscription_package_versions SET state='PUBLISHED' WHERE version=1");
});
const tx=fn=>withTenant(TENANT,fn),workers=n=>Array.from({length:n},(_,i)=>({id:`worker-${i}`,rut:`invalid-${i}`,nombre:`Persona ${i}`}));
async function setWorkers(n){await db.query("UPDATE tenant_module_state SET data=$2::jsonb WHERE tenant_id=$1 AND module_key='trabajadores'",[TENANT,JSON.stringify(workers(n))]);}
async function free(now=NOW){return tx(client=>activateFreeSubscription(client,{tenantId:TENANT,userId:ADMIN,now}));}
async function documents(tenantId=TENANT){
 const result={};
 for(const name of ['quote','purchaseOrder','invoice']){const file=(await db.query("INSERT INTO file_objects(tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status) VALUES($1,$2,'subscription_document','qa','qa.pdf','application/pdf',5,'local',$3,'qa','clean') RETURNING id",[tenantId,tenantId===TENANT?ADMIN:null,`qa/subscription/${++sequence}`])).rows[0];result[name]={number:`QA-${name}-${sequence}`,fileId:file.id,netAmount:1000,issuedAt:'2026-08-31',status:name==='quote'?'ACCEPTED':'ISSUED',responsible:'Responsable QA',observations:'Documento ficticio',...(name==='quote'?{acceptedAt:NOW.toISOString()}:{})};}
 return result;
}
async function request(input={}){return tx(client=>createSubscriptionRequest(client,{tenantId:TENANT,userId:ADMIN,input:{type:'INITIAL',planCode:'LA_UNION',reason:'Solicitud QA',idempotencyKey:`request-qa-${++sequence}`,...input},now:NOW}));}
async function transition(requestId,input,now=NOW){return tx(client=>transitionSubscriptionRequest(client,{tenantId:TENANT,requestId,userId:SUPER,input:{reason:'Decisión QA',...input},now}));}
async function schedule(row,{effectiveAt=NOW,docs,immediateChangeTerms}={}){
 await transition(row.id,{action:'review'});await transition(row.id,{action:'approve'});
 return transition(row.id,{action:'schedule',effectiveAt:effectiveAt.toISOString(),documents:docs||await documents(),...(immediateChangeTerms?{immediateChangeTerms}:{})});
}
async function paid(code='LA_UNION',packages=[]){const row=await request({planCode:code,packages});await schedule(row);await transition(row.id,{action:'execute'});return tx(c=>getSubscriptionSummary(c,TENANT,{now:NOW}));}

test('seeds exactly five confirmed plans and three independently priced capacity packages',async()=>{
 const c=await getSubscriptionCatalog(db);assert.deepEqual(c.plans.map(p=>p.code),['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY']);
 assert.deepEqual(c.plans.map(p=>p.workerLimit),[15,60,180,360,720]);assert.deepEqual(c.plans.map(p=>p.monthlyPrice),[0,1000,2000,3000,4000]);
 assert.deepEqual(c.packages.map(p=>p.monthlyPrice),[50000,100000,300000]);assert.ok(c.packages.every(p=>p.stackable&&!p.repeatable));
 assert.ok(c.plans.every(p=>p.features.allCore&&p.features.separateServices.includes('libroObra')));
});
test('migration preserves legacy opt-out; reading a legacy summary never enrolls or creates a contract',async()=>{
 const s=await tx(c=>getSubscriptionSummary(c,TENANT));assert.equal(s.legacy,true);assert.equal(s.canOperate,true);
 assert.equal((await db.query('SELECT count(*)::int n FROM subscription_contracts')).rows[0].n,0);
 assert.equal((await db.query('SELECT subscription_managed FROM tenants WHERE id=$1',[TENANT])).rows[0].subscription_managed,false);
});
test('worker count is unique for valid RUT but malformed historical RUT does not collapse distinct IDs',()=>{
 assert.equal(countSubscriptionWorkers([{id:1,rut:'13.848.379-7'},{id:2,rut:'138483797'},{id:3,rut:'bad',blocked:true},{id:4,rut:'bad',archived:true}]),3);
 assert.equal(countSubscriptionWorkers([{id:1},{id:1,blocked:true},{id:2,archived:true}]),2);
});
test('Free lasts six calendar months with local wall-clock and month-end adjustment',async()=>{
 const s=await free();assert.equal(s.contract.endsAt,'2027-02-28T13:00:00.000Z');assert.equal(s.totalTrialDays,181);
 assert.equal(s.contract.monthlyNetPrice,0);assert.equal(s.capacity.total,15);assert.equal(s.managed,true);
 assert.equal(new Date(await calendarMonthsAfter(db,new Date('2027-08-31T14:00:00Z'),6)).toISOString(),'2028-02-29T13:00:00.000Z');
});
test('Free cannot be reset, duplicated or used by the global administration',async()=>{
 const first=await free();const again=await free(new Date('2026-09-15T14:00:00Z'));assert.equal(again.contract.id,first.contract.id);assert.equal(again.contract.endsAt,first.contract.endsAt);
 await assert.rejects(()=>withTenant(GLOBAL,c=>activateFreeSubscription(c,{tenantId:GLOBAL,userId:SUPER,now:NOW})),{code:'SUBSCRIPTION_PLATFORM_PROTECTED'});
 assert.equal((await db.query('SELECT count(*)::int n FROM subscription_free_benefits')).rows[0].n,1);
});
test('Free expiry is exact, has no paid grace, retains data and blocks even non-growing operational writes',async()=>{
 const s=await free();await setWorkers(3);const end=new Date(s.contract.endsAt);
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT,{now:new Date(end.getTime()-1)}))).canOperate,true);
 const expired=await tx(c=>getSubscriptionSummary(c,TENANT,{now:end}));assert.equal(expired.contract.status,'SUSPENDED');assert.equal(expired.capacity.used,3);
 await assert.rejects(()=>tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(3),workers(3),{now:end})),{code:'SUBSCRIPTION_SUSPENDED'});
});
test('all five plans enforce exact hard worker capacity; inhabilitated/archive records continue to count',async()=>{
 await free();await tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(14),workers(15),{now:NOW}));
 await assert.rejects(()=>tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(15),workers(16),{now:NOW})),{code:'SUBSCRIPTION_WORKER_LIMIT'});
 await tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(20),workers(20),{now:NOW}));
 for(const [code,limit]of [['LA_UNION',60],['PURRANQUE',180],['FRUTILLAR',360],['PUERTO_OCTAY',720]]){
  if((await db.query('SELECT count(*)::int n FROM subscription_contracts')).rows[0].n)await db.exec('TRUNCATE subscription_contracts CASCADE');
  await paid(code);await tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(limit-1),workers(limit),{now:NOW}));
  await assert.rejects(()=>tx(c=>assertSubscriptionWorkerCapacity(c,TENANT,workers(limit),workers(limit+1),{now:NOW})),{code:'SUBSCRIPTION_WORKER_LIMIT'});
 }
});
test('transaction-serialized concurrent writers leave 15/15 and roll back the rejected high-water increment',async()=>{
 await free();await setWorkers(14);
 const add=()=>tx(async c=>{await lockSubscriptionTenant(c,TENANT);const before=(await c.query("SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key='trabajadores'",[TENANT])).rows[0].data,next=[...before,{id:`new-${++sequence}`}];await assertSubscriptionWorkerCapacity(c,TENANT,before,next,{now:NOW});await c.query("UPDATE tenant_module_state SET data=$2::jsonb WHERE tenant_id=$1 AND module_key='trabajadores'",[TENANT,JSON.stringify(next)]);});
 const result=await Promise.allSettled([add(),add()]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(result.find(r=>r.status==='rejected').reason.code,'SUBSCRIPTION_WORKER_LIMIT');
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT,{now:NOW}))).capacity.used,15);
});
test('publishing prices, grace and thresholds changes only new offers, not accepted contracts',async()=>{
 const current=await paid('PURRANQUE');
 const updated=await withSubscriptionAdmin(c=>saveSubscriptionCatalogVersion(c,{userId:SUPER,input:{kind:'plan',code:'PURRANQUE',action:'publish',monthlyPrice:2500,graceDays:15,warningPercent:70,criticalPercent:85}}));
 assert.equal(updated.monthlyPrice,2500);assert.equal(updated.graceDays,15);assert.equal(updated.warningPercent,70);
 const summary=await tx(c=>getSubscriptionSummary(c,TENANT,{now:NOW}));assert.equal(summary.contract.monthlyNetPrice,2000);assert.equal(summary.contract.id,current.contract.id);assert.equal(summary.capacity.warningPercent,80);
 assert.equal((await getSubscriptionCatalog(db)).plans.find(p=>p.code==='PURRANQUE').monthlyPrice,2500);
 await assert.rejects(()=>saveSubscriptionCatalogVersion(db,{userId:SUPER,input:{kind:'plan',code:'PURRANQUE',action:'draft',warningPercent:95,criticalPercent:90}}),{code:'SUBSCRIPTION_POLICY_INVALID'});
});
test('idempotent requests return the same ID, reject key reuse for a different payload and never apply by requesting',async()=>{
 const input={type:'INITIAL',planCode:'LA_UNION',reason:'Solicitud QA',idempotencyKey:'same-request-qa'};
 const one=await request(input),two=await request(input);assert.equal(one.id,two.id);assert.equal(one.status,'REQUESTED');
 await assert.rejects(()=>request({...input,planCode:'PURRANQUE'}),{code:'SUBSCRIPTION_IDEMPOTENCY_CONFLICT'});
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT))).legacy,true);
});
test('workflow requires review, approval, private documents, acceptance and an effective date before execution',async()=>{
 const r=await request();await assert.rejects(()=>transition(r.id,{action:'execute'}),{code:'SUBSCRIPTION_REQUEST_STATE'});
 await transition(r.id,{action:'review'});await transition(r.id,{action:'approve'});
 await assert.rejects(()=>transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString()}),{code:'SUBSCRIPTION_DOCUMENT_REQUIRED'});
 const docs=await documents();delete docs.quote.acceptedAt;
 await assert.rejects(()=>transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString(),documents:docs}),{code:'SUBSCRIPTION_ACCEPTANCE_REQUIRED'});
 docs.quote.acceptedAt=new Date(NOW.getTime()+86400000).toISOString();
 await assert.rejects(()=>transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString(),documents:docs}),{code:'SUBSCRIPTION_ACCEPTANCE_REQUIRED'});
 docs.quote.acceptedAt=NOW.toISOString();await transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString(),documents:docs});
 const done=await transition(r.id,{action:'execute'}),again=await transition(r.id,{action:'execute'});assert.equal(done.resultContractId,again.resultContractId);
 assert.equal((await db.query('SELECT count(*)::int n FROM subscription_contracts')).rows[0].n,1);
});
test('foreign, deleted and uncleared commercial attachments cannot satisfy activation evidence',async()=>{
 const r=await request(),docs=await documents(OTHER);await transition(r.id,{action:'review'});await transition(r.id,{action:'approve'});
 await assert.rejects(()=>transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString(),documents:docs}),{code:'SUBSCRIPTION_DOCUMENT_UNAVAILABLE'});
 const own=await documents();await db.query("UPDATE file_objects SET malware_status='pending' WHERE id=$1",[own.invoice.fileId]);
 await assert.rejects(()=>transition(r.id,{action:'schedule',effectiveAt:NOW.toISOString(),documents:own}),{code:'SUBSCRIPTION_DOCUMENT_UNAVAILABLE'});
});
test('downgrade rechecks workers after approval without deleting data or releasing capacity by inhabilitation',async()=>{
 const original=await paid('PURRANQUE');await setWorkers(45);const r=await request({type:'DOWNGRADE',planCode:'LA_UNION'}),effective=new Date(original.contract.endsAt);
 await schedule(r,{effectiveAt:effective});await setWorkers(65);
 await assert.rejects(()=>transition(r.id,{action:'execute'},effective),{code:'SUBSCRIPTION_DOWNGRADE_CAPACITY'});
 const before=await tx(c=>getSubscriptionSummary(c,TENANT,{now:effective}));assert.equal(before.contract.id,original.contract.id);assert.equal(before.capacity.used,65);
 await setWorkers(45);await transition(r.id,{action:'execute'},effective);
 const after=await tx(c=>getSubscriptionSummary(c,TENANT,{now:effective}));assert.equal(after.capacity.total,60);assert.equal(after.capacity.available,15);
});
test('paid grace is calendar-based, exact at end and never extended by a late lifecycle job',async()=>{
 const s=await paid(),end=new Date(s.contract.endsAt),grace=new Date(s.contract.graceEndsAt);
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT,{now:end}))).contract.status,'GRACE_PERIOD');
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT,{now:new Date(grace.getTime()-1)}))).canOperate,true);
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT,{now:grace}))).canOperate,false);
 await tx(c=>refreshSubscriptionLifecycle(c,TENANT,{now:new Date(grace.getTime()+86400000)}));await tx(c=>refreshSubscriptionLifecycle(c,TENANT,{now:new Date(grace.getTime()+2*86400000)}));
 assert.equal((await tx(c=>getSubscriptionSummary(c,TENANT))).contract.graceEndsAt,s.contract.graceEndsAt);
});
test('monthly renewal anchors the original day across February and cancels obsolete reminders atomically',async()=>{
 const start=new Date('2027-01-31T13:00:00Z');const r=await request();await transition(r.id,{action:'review'},start);await transition(r.id,{action:'approve'},start);await transition(r.id,{action:'schedule',effectiveAt:start.toISOString(),documents:await documents()},start);await transition(r.id,{action:'execute'},start);
 const original=await tx(c=>getSubscriptionSummary(c,TENANT,{now:start}));assert.equal(original.contract.endsAt,'2027-02-28T13:00:00.000Z');
 const renewal=await request({type:'RENEWAL'}),effective=new Date(original.contract.endsAt);await schedule(renewal,{effectiveAt:effective});await transition(renewal.id,{action:'execute'},effective);
 const renewed=await tx(c=>getSubscriptionSummary(c,TENANT,{now:effective}));assert.equal(renewed.contract.endsAt,'2027-03-31T13:00:00.000Z');assert.notEqual(renewed.contract.id,original.contract.id);
 assert.equal((await db.query("SELECT count(*)::int n FROM subscription_notifications WHERE subscription_id=$1 AND status IN('pending','failed','processing')",[original.contract.id])).rows[0].n,0);
});
test('capacity packages retain their composition, price snapshots and do not renew by expiry',async()=>{
 const s=await paid('PUERTO_OCTAY',[{code:'EXTRA_100',quantity:1},{code:'EXTRA_200',quantity:1},{code:'EXTRA_500',quantity:1}]);
 assert.equal(s.capacity.total,1520);assert.equal(s.packages.length,3);assert.equal(s.contract.monthlyNetPrice,454000);
 const after=await tx(c=>getSubscriptionSummary(c,TENANT,{now:new Date(s.contract.graceEndsAt)}));assert.equal(after.capacity.additional,0);assert.equal(after.canOperate,false);
 const current=(await db.query('SELECT count(*)::int n FROM subscription_contracts WHERE is_current')).rows[0].n;assert.equal(current,1);
});
test('package rules reject repeated non-repeatable packages and incompatible plans',async()=>{
 const c=await getSubscriptionCatalog(db),puerto=c.plans.find(p=>p.code==='PUERTO_OCTAY');
 assert.throws(()=>resolvePackageComposition(puerto,[{code:'EXTRA_100',quantity:2}],c.packages),{code:'SUBSCRIPTION_PACKAGE_INVALID'});
 assert.throws(()=>resolvePackageComposition(c.plans.find(p=>p.code==='FREE'),[{code:'EXTRA_100',quantity:1}],c.packages),{code:'SUBSCRIPTION_PACKAGES_PLAN'});
});
test('recommender minimizes surplus then package count, never price, and cannot reuse existing non-repeatable packages',async()=>{
 const c=await getSubscriptionCatalog(db);assert.equal(recommendSubscription(c,{workers:137}).planCode,'PURRANQUE');
 assert.equal(recommendSubscription(c,{workers:10,freeEligible:false}).planCode,'LA_UNION');
 const base=recommendSubscription(c,{workers:850});assert.deepEqual(base.packages.map(p=>[p.code,p.quantity]),[['EXTRA_200',1]]);assert.equal(base.totalCapacity,920);
 const extra100={...c.packages.find(p=>p.code==='EXTRA_100'),quantity:1};
 const current=recommendSubscription(c,{workers:1100,existingPackages:[extra100]});assert.deepEqual(current.additionalPackages.map(p=>p.code),['EXTRA_500']);assert.equal(current.totalCapacity,1320);
 assert.equal(recommendSubscription(c,{workers:5000}).requiresQuote,true);
 assert.throws(()=>recommendSubscription(c,{workers:1.5}),{code:'SUBSCRIPTION_WORKERS_INVALID'});
 const unavailable={...c,packages:[]};assert.equal(recommendSubscription(unavailable,{workers:721}).requiresQuote,true);
});
test('scheduled execution recovers a failure without partial contract, capacity or audit changes',async()=>{
 const r=await request();await schedule(r);await db.exec("ALTER TABLE audit_log ADD CONSTRAINT qa_subscription_failure CHECK(action<>'subscription.changed')");
 try{await assert.rejects(()=>transition(r.id,{action:'execute'}));}finally{await db.exec('ALTER TABLE audit_log DROP CONSTRAINT qa_subscription_failure');}
 assert.equal((await db.query('SELECT count(*)::int n FROM subscription_contracts')).rows[0].n,0);assert.equal((await db.query('SELECT status FROM subscription_requests WHERE id=$1',[r.id])).rows[0].status,'SCHEDULED');
 const result=await processDueSubscriptionRequests(TENANT,{now:NOW});assert.equal(result.executed,1);assert.equal(result.failed,0);
});
test('security suspension stays independent and prevents activation or scheduled renewal',async()=>{
 const r=await request();await schedule(r);await db.query("UPDATE tenants SET status='suspended' WHERE id=$1",[TENANT]);
 await assert.rejects(()=>transition(r.id,{action:'execute'}),{code:'SUBSCRIPTION_COMPANY_DISABLED'});
 assert.equal((await db.query('SELECT status FROM tenants WHERE id=$1',[TENANT])).rows[0].status,'suspended');
});
test('forced RLS hides every tenant subscription and denies cross-tenant writes for a non-owner database role',async()=>{
 await paid();await db.exec('CREATE ROLE qa_subscription_reader; GRANT USAGE ON SCHEMA public TO qa_subscription_reader; GRANT SELECT,INSERT,UPDATE ON subscription_contracts,subscription_periods,subscription_requests,subscription_contract_packages,subscription_free_benefits,subscription_notifications,subscription_commercial_requests TO qa_subscription_reader;');
 await db.exec('BEGIN; SET LOCAL ROLE qa_subscription_reader');
 try{await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[OTHER]);assert.equal((await db.query('SELECT * FROM subscription_contracts')).rows.length,0);assert.equal((await db.query("UPDATE subscription_contracts SET snapshot='{}' WHERE tenant_id=$1 RETURNING id",[TENANT])).rows.length,0);
  await assert.rejects(()=>db.query('INSERT INTO subscription_free_benefits(company_fingerprint,tenant_id,started_at,expires_at) VALUES($1,$2,now(),now()+interval \'6 months\')',['foreign-qa-attempt',TENANT]),/row-level security/);}
 finally{await db.exec('ROLLBACK');}
 const secured=(await db.query("SELECT relname FROM pg_class WHERE relforcerowsecurity AND relname LIKE 'subscription_%'")).rows;assert.ok(secured.length>=7);
});

test('a recreated company with a consumed trial can be approved for a paid contract without another Free period',async()=>{
 const fingerprint=(await import('../security.js')).sha256('138483797');
 await db.query("INSERT INTO subscription_free_benefits(company_fingerprint,started_at,expires_at) VALUES($1,'2025-01-01','2025-07-01')",[fingerprint]);
 const summary=await tx(c=>activateInitialSubscription(c,{tenantId:TENANT,userId:ADMIN,now:NOW}));
 assert.equal(summary.managed,true);assert.equal(summary.canOperate,false);assert.equal(summary.freeEligible,false);assert.equal(summary.contract,null);
 const r=await request({type:'INITIAL',planCode:'LA_UNION'});assert.equal(r.status,'REQUESTED');
 assert.equal((await db.query('SELECT count(*)::integer n FROM subscription_free_benefits')).rows[0].n,1);
});

test('managed tenant erasure preserves the single-use benefit while cascading contracts, periods and notifications',async()=>{
 await free();
 await tx(async c=>{
  await c.query("UPDATE tenants SET status='suspended' WHERE id=$1",[TENANT]);
  await c.query("SELECT hard_delete_tenant($1,$2,'cuenta_prueba',$3)",[TENANT,SUPER,'f'.repeat(64)]);
 });
 assert.equal((await db.query('SELECT count(*)::integer n FROM tenants WHERE id=$1',[TENANT])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::integer n FROM subscription_contracts WHERE tenant_id=$1',[TENANT])).rows[0].n,0);
 const benefits=(await db.query('SELECT tenant_id FROM subscription_free_benefits')).rows;
 assert.equal(benefits.length,1);assert.equal(benefits[0].tenant_id,null);
});
