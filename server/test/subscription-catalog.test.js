import test,{beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withTenant} from '../db.js';
import {activateInitialSubscription,calendarMonthsAfter,getSubscriptionSummary,recommendSubscription} from '../subscriptions.js';

// Real HTTP routers, all migrations and an isolated PostgreSQL engine. This
// reuses the test fixture without registering its own cases a second time.
const previousMode=process.env.SUBSCRIPTIONS_FIXTURE_SERVER;
process.env.SUBSCRIPTIONS_FIXTURE_SERVER='1';
const {createSubscriptionQaApp,QA_IDS}=await import('./subscriptions-http.test.js');
if(previousMode===undefined)delete process.env.SUBSCRIPTIONS_FIXTURE_SERVER;else process.env.SUBSCRIPTIONS_FIXTURE_SERVER=previousMode;
let fixture,reviewerId,sequence=0;
beforeEach(async()=>{
 fixture=await createSubscriptionQaApp();reviewerId=randomUUID();
 await fixture.db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role) VALUES($1,$2,'reviewer@example.test','Revisor QA','domian_admin')",[reviewerId,QA_IDS.global]);
 fixture.accounts.reviewer={...fixture.accounts.global,userId:reviewerId};
});
afterEach(async()=>{await fixture?.close();});
async function api(path,{account='global',method='GET',body}={}){
 const response=await fetch(`${fixture.base}/api${path}`,{method,headers:{'x-qa-account':account,'x-forwarded-for':`198.51.100.${++sequence%250+1}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 return {status:response.status,body:await response.json()};
}
async function catalog(){const result=await api('/plans');assert.equal(result.status,200);return result.body;}
async function publish(kind,code,fields={}){
 const result=await api('/subscriptions/admin/catalog',{method:'POST',body:{kind,code,action:'publish',...fields}});
 assert.equal(result.status,201,JSON.stringify(result.body));return result.body;
}
async function commercial(overrides={}){
 const plan=(await catalog()).plans.find(p=>p.code==='LA_UNION');
 return {companyName:'Empresa QA',rut:'13.848.379-7',contactName:'Persona',contactLastName:'Ficticia',email:'catalog@example.test',phone:'+56912345678',workers:20,planCode:'LA_UNION',versionId:plan?.versionId,packages:[],displayedMonthlyNetPrice:plan?.monthlyPrice,acceptedTerms:true,termsVersion:'2026-11-05',idempotencyKey:randomUUID(),...overrides};
}
const requestPath=id=>`/subscriptions/admin/companies/${QA_IDS.legacy}/requests${id?`/${id}`:''}`;
async function request(code='LA_UNION',packages=[]){
 const plan=(await catalog()).plans.find(p=>p.code===code);
 const result=await api(requestPath(),{method:'POST',body:{type:'INITIAL',planCode:code,versionId:plan.versionId,packages,reason:'Contratación ficticia QA',idempotencyKey:randomUUID()}});
 assert.equal(result.status,201,JSON.stringify(result.body));return result.body;
}
async function transition(id,action,extra={}){return api(requestPath(id),{account:'reviewer',method:'PATCH',body:{action,reason:'Decisión comercial QA',...extra}});}
async function documents(){
 const result={};
 for(const name of ['quote','purchaseOrder','invoice']){
  const file=(await fixture.db.query("INSERT INTO file_objects(tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status) VALUES($1,$2,'subscription_document','qa','qa.pdf','application/pdf',5,'local',$3,'qa','clean') RETURNING id",[QA_IDS.legacy,QA_IDS.legacyAdmin,`qa/${randomUUID()}`])).rows[0];
  result[name]={number:`QA-${name}`,fileId:file.id,netAmount:1000,issuedAt:new Date(Date.now()-86400000).toISOString().slice(0,10),status:name==='quote'?'ACCEPTED':'ISSUED',responsible:'Persona QA',observations:'Sólo prueba',...(name==='quote'?{acceptedAt:new Date(Date.now()-60000).toISOString()}:{})};
 }return result;
}
async function approve(row){for(const action of ['review','approve'])assert.equal((await transition(row.id,action)).status,200);}
async function execute(row){
 await approve(row);
 const scheduled=await transition(row.id,'schedule',{effectiveAt:new Date().toISOString(),documents:await documents()});
 assert.equal(scheduled.status,200,JSON.stringify(scheduled.body));
 const result=await transition(row.id,'execute');assert.equal(result.status,200,JSON.stringify(result.body));return result.body;
}

test('HTTP catalogue versions every public parameter, keeps entitlements and audits locked before/after values',async()=>{
 const old=(await catalog()).plans.find(p=>p.code==='PURRANQUE');
 const input={versionId:old.versionId,name:'Purranque actualizado',description:'Descripción comercial editable.',publicFeatures:['Primera característica','Segunda característica'],displayOrder:0,ctaText:'Solicitar asesoría',monthlyPrice:2500,workerLimit:190,taxRate:.19,active:true,publicVisible:true,recommended:true,graceDays:17,warningPercent:72,criticalPercent:88,allowedUpgradeTargets:['FRUTILLAR','PUERTO_OCTAY'],trialMonths:0};
 const changed=await publish('plan','PURRANQUE',input),current=await catalog(),shown=current.plans.find(p=>p.code==='PURRANQUE');
 for(const field of Object.keys(input).filter(k=>k!=='versionId'))assert.deepEqual(shown[field],input[field]);
 assert.equal(current.plans[0].code,'PURRANQUE');assert.notEqual(changed.versionId,old.versionId);assert.deepEqual(shown.features,old.features);
 const audit=(await fixture.db.query('SELECT old_value,new_value FROM audit_log WHERE entity_id=$1',[changed.versionId])).rows[0];
 assert.deepEqual(audit.old_value,old);assert.deepEqual(audit.new_value,changed);
 const withdrawn=await publish('plan','PURRANQUE',{versionId:changed.versionId,active:false,monthlyPrice:2800,workerLimit:200,description:'Descripción revisada'});
 const next=(await fixture.db.query('SELECT old_value,new_value FROM audit_log WHERE entity_id=$1',[withdrawn.versionId])).rows[0];
 assert.deepEqual(next.old_value,changed);assert.equal(next.new_value.active,false);assert.equal(next.new_value.workerLimit,200);assert.equal(next.new_value.monthlyPrice,2800);assert.equal(next.new_value.description,'Descripción revisada');
 await assert.rejects(()=>fixture.db.query('UPDATE subscription_plan_versions SET monthly_price=999 WHERE id=$1',[changed.versionId]),/immutable/);
});

test('HTTP catalogue rejects invalid or unrelated parameters and prevents company administrators from changing offers',async()=>{
 const cases=[{kind:'plan',code:'FREE',trialMonths:0},{kind:'plan',code:'LA_UNION',trialMonths:1},{kind:'plan',code:'FREE',monthlyPrice:1},{kind:'plan',code:'FREE',ctaText:''},{kind:'plan',code:'LA_UNION',publicFeatures:['']},{kind:'plan',code:'LA_UNION',publicFeatures:Array(31).fill('texto')},{kind:'plan',code:'LA_UNION',publicFeatures:[123]},{kind:'plan',code:'LA_UNION',displayOrder:-1},{kind:'plan',code:'LA_UNION',ctaText:'a'.repeat(81)},{kind:'plan',code:'LA_UNION',description:'a'.repeat(2001)},{kind:'plan',code:'LA_UNION',features:{allCore:false}},{kind:'package',code:'EXTRA_100',workersQuantity:0},{kind:'package',code:'EXTRA_100',workersQuantity:1000001},{kind:'package',code:'EXTRA_100',publicFeatures:['No corresponde']}];
 for(const input of cases)assert.equal((await api('/subscriptions/admin/catalog',{method:'POST',body:{action:'publish',...input}})).status,400,JSON.stringify(input));
 assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_plan_versions')).rows[0].n,5);
 assert.equal((await api('/subscriptions/admin/catalog',{account:'admin',method:'POST',body:{kind:'plan',code:'FREE',action:'publish',workerLimit:999}})).status,403);
});

test('withdrawing Free prevents new trials without suspending existing contracts or blocking paid account approval',async()=>{
 const old=(await api('/subscription',{account:'admin'})).body;
 const inactive=await publish('plan','FREE',{active:false});assert.equal(inactive.active,false);
 assert.equal((await catalog()).plans.some(p=>p.code==='FREE'),false);
 assert.equal((await api('/plans/recommend',{method:'POST',body:{workers:10}})).body.planCode,'LA_UNION');
 const existing=(await api('/subscription',{account:'admin'})).body;assert.deepEqual(existing.contract,old.contract);assert.equal(existing.canOperate,true);
 const initial=await withTenant(QA_IDS.legacy,c=>activateInitialSubscription(c,{tenantId:QA_IDS.legacy,userId:QA_IDS.legacyAdmin}));
 assert.equal(initial.managed,true);assert.equal(initial.contract,null);assert.equal(initial.canOperate,false);
 assert.equal((await fixture.db.query("SELECT count(*)::int n FROM audit_log WHERE tenant_id=$1 AND action='subscription.free.unavailable'",[QA_IDS.legacy])).rows[0].n,1);
 await publish('plan','FREE',{versionId:inactive.versionId,active:true});assert.ok((await catalog()).plans.some(p=>p.code==='FREE'));
});

test('inactive paid offers reject new selections and stale catalog edits cannot overwrite newer versions',async()=>{
 const input=await commercial(),inactive=await publish('plan','LA_UNION',{active:false});
 const lead=await api('/commercial-requests',{method:'POST',body:input});assert.equal(lead.status,409);assert.equal(lead.body.error,'SUBSCRIPTION_OFFER_CHANGED');
 const privateRequest=await api('/subscription/requests',{account:'legacy',method:'POST',body:{type:'UPGRADE',planCode:'LA_UNION',versionId:input.versionId,reason:'Solicitud QA',idempotencyKey:randomUUID()}});assert.equal(privateRequest.status,409);
 const stale=await api('/subscriptions/admin/catalog',{method:'POST',body:{kind:'plan',code:'LA_UNION',action:'publish',versionId:input.versionId,name:'Edición obsoleta'}});assert.equal(stale.status,409);assert.equal(stale.body.error,'SUBSCRIPTION_CATALOG_STALE');
 await publish('plan','LA_UNION',{versionId:inactive.versionId,active:true});assert.ok((await catalog()).plans.some(p=>p.code==='LA_UNION'));
});

test('new Free durations use calendar months while old contracts and single-use benefits retain their dates',async()=>{
 const old=(await api('/subscription',{account:'admin'})).body;
 await publish('plan','FREE',{trialMonths:2});assert.equal((await catalog()).meta.trialMonths,2);
 const now=new Date('2027-01-31T13:00:00Z'),fresh=await withTenant(QA_IDS.legacy,c=>activateInitialSubscription(c,{tenantId:QA_IDS.legacy,userId:QA_IDS.legacyAdmin,now}));
 assert.equal(fresh.contract.endsAt,'2027-03-31T13:00:00.000Z');assert.equal(fresh.contract.snapshot.plan.trialMonths,2);assert.equal(fresh.contract.graceEndsAt,fresh.contract.endsAt);
 const benefit=(await fixture.db.query('SELECT expires_at FROM subscription_free_benefits WHERE tenant_id=$1',[QA_IDS.legacy])).rows[0];assert.equal(new Date(benefit.expires_at).toISOString(),fresh.contract.endsAt);
 assert.deepEqual((await api('/subscription',{account:'admin'})).body.contract,old.contract);
 assert.equal(new Date(await calendarMonthsAfter(fixture.db,new Date('2027-08-31T14:00:00Z'),6)).toISOString(),'2028-02-29T13:00:00.000Z');
});

test('edited package capacity and rules drive new offers without changing historical compositions',async()=>{
 const pack=(await catalog()).packages.find(p=>p.code==='EXTRA_100');
 const row=await request('PUERTO_OCTAY',[{code:pack.code,versionId:pack.versionId,quantity:1}]);await execute(row);
 const before=(await api(`/subscriptions/admin/companies/${QA_IDS.legacy}`)).body;
 await publish('package','EXTRA_100',{workersQuantity:150,monthlyPrice:55000,displayOrder:0,repeatable:true,stackable:true,maxQuantity:4,active:true,name:'150 cupos adicionales'});
 const after=(await api(`/subscriptions/admin/companies/${QA_IDS.legacy}`)).body;assert.deepEqual(after.contract,before.contract);assert.deepEqual(after.packages,before.packages);assert.equal(after.capacity.total,820);
 const current=await catalog();assert.equal(current.packages[0].code,'EXTRA_100');assert.equal(current.packages[0].workersQuantity,150);
 const rec=recommendSubscription(current,{workers:850,existingPackages:before.packages});assert.equal(rec.totalCapacity,870);assert.equal(rec.available,20);assert.deepEqual(rec.additionalPackages,[]);
 await publish('package','EXTRA_100',{active:false});assert.equal((await catalog()).packages.some(p=>p.code==='EXTRA_100'),false);
 const stale=await api('/subscription/requests',{account:'admin',method:'POST',body:{type:'UPGRADE',planCode:'PUERTO_OCTAY',reason:'Solicitud QA',idempotencyKey:randomUUID(),packages:[{code:'EXTRA_100',versionId:pack.versionId,quantity:1}]}});assert.equal(stale.status,409);assert.equal(stale.body.error,'SUBSCRIPTION_OFFER_CHANGED');
 await publish('package','EXTRA_100',{active:true});assert.equal((await catalog()).packages.find(p=>p.code==='EXTRA_100').workersQuantity,150);
});

test('accepted quotes execute their approved snapshot after repricing or withdrawal and retain actors, usage and reason',async()=>{
 const row=await request();assert.deepEqual(row.proposal.company,{id:QA_IDS.legacy,name:'Empresa Legacy QA',rut:'76.666.330-5'});
 await approve(row);const scheduled=await transition(row.id,'schedule',{documents:await documents(),effectiveAt:new Date().toISOString()});assert.equal(scheduled.status,200,JSON.stringify(scheduled.body));
 await publish('plan','LA_UNION',{monthlyPrice:2000,workerLimit:65,active:false});
 assert.equal((await transition(row.id,'execute',{reason:'Activación de cotización ya aceptada'})).status,200);
 const summary=(await api(`/subscriptions/admin/companies/${QA_IDS.legacy}`)).body;assert.equal(summary.contract.monthlyNetPrice,1000);assert.equal(summary.capacity.total,60);assert.equal(summary.contract.snapshot.plan.versionId,row.proposal.plan.versionId);
 const saved=summary.requests.find(r=>r.id===row.id);assert.equal(saved.workersAtRequest,0);assert.equal(saved.reviewedBy,reviewerId);assert.ok(saved.approvedAt);
 assert.equal(summary.audit.find(a=>a.action==='subscription.changed').reason,'Activación de cotización ya aceptada');
 const execution=summary.audit.find(a=>a.action==='subscription.changed');assert.equal(execution.actorId,reviewerId);assert.equal(execution.requestedBy,QA_IDS.super);assert.equal(execution.requesterName,'Global QA');
 assert.deepEqual((await api('/subscription',{account:'reader'})).body.audit,[]);
});

test('new commercial documents require complete metadata and accepted current evidence before activation',async()=>{
 const row=await request(),docs=await documents();await approve(row);
 const missing=await transition(row.id,'documents',{documents:{...docs,invoice:{number:docs.invoice.number,fileId:docs.invoice.fileId}}});assert.equal(missing.status,400);assert.equal(missing.body.error,'SUBSCRIPTION_DOCUMENT_METADATA');
 for(const status of ['DRAFT','CANCELLED']){const result=await transition(row.id,'schedule',{effectiveAt:new Date().toISOString(),documents:{...docs,invoice:{...docs.invoice,status}}});assert.equal(result.status,409);assert.equal(result.body.error,'SUBSCRIPTION_DOCUMENT_NOT_CURRENT');}
 const unaccepted=await transition(row.id,'schedule',{effectiveAt:new Date().toISOString(),documents:{...docs,quote:{...docs.quote,status:'ISSUED'}}});assert.equal(unaccepted.status,409);assert.equal(unaccepted.body.error,'SUBSCRIPTION_ACCEPTANCE_REQUIRED');
 assert.equal((await transition(row.id,'documents',{documents:{invoice:{...docs.invoice,issuedAt:'2026-02-30'}}})).status,400);
 assert.equal((await transition(row.id,'documents',{documents:{invoice:{...docs.invoice,rut:'11.111.111-1'}}})).status,400);
 await fixture.db.query("UPDATE file_objects SET entity_type='worker_document' WHERE id=$1",[docs.invoice.fileId]);
 const wrongType=await transition(row.id,'schedule',{effectiveAt:new Date().toISOString(),documents:docs});assert.equal(wrongType.status,409);assert.equal(wrongType.body.error,'SUBSCRIPTION_DOCUMENT_UNAVAILABLE');
 await fixture.db.query("UPDATE file_objects SET entity_type='subscription_document' WHERE id=$1",[docs.invoice.fileId]);
 const valid=await transition(row.id,'schedule',{effectiveAt:new Date().toISOString(),documents:docs});assert.equal(valid.status,200,JSON.stringify(valid.body));assert.equal(valid.body.documents.invoice.netAmount,1000);assert.equal((await transition(row.id,'execute')).status,200);
});

test('stored legacy documents remain executable and paid grace days have exact calendar boundaries',async()=>{
 const row=await request(),docs=await documents(),legacy=Object.fromEntries(Object.entries(docs).map(([name,d])=>[name,{number:d.number,fileId:d.fileId,...(name==='quote'?{acceptedAt:d.acceptedAt}:{})}]));
 await fixture.db.query('UPDATE subscription_requests SET documents=$2::jsonb WHERE id=$1',[row.id,JSON.stringify(legacy)]);
 await approve(row);assert.equal((await transition(row.id,'documents',{documents:legacy})).status,200);
 assert.equal((await transition(row.id,'schedule',{effectiveAt:new Date().toISOString()})).status,200);assert.equal((await transition(row.id,'execute')).status,200);
 const active=(await api(`/subscriptions/admin/companies/${QA_IDS.legacy}`)).body,end=new Date(active.contract.endsAt);
 const grace=await withTenant(QA_IDS.legacy,c=>getSubscriptionSummary(c,QA_IDS.legacy,{now:end}));assert.equal(grace.contract.status,'GRACE_PERIOD');assert.equal(grace.daysInGraceRemaining,30);assert.equal(grace.graceDaysUsed,0);
 const suspended=await withTenant(QA_IDS.legacy,c=>getSubscriptionSummary(c,QA_IDS.legacy,{now:new Date(active.contract.graceEndsAt)}));assert.equal(suspended.daysInGraceRemaining,0);assert.equal(suspended.graceDaysUsed,30);
});

test('global administrators cannot approve their own commercial requests',async()=>{
 const row=await request();assert.equal((await transition(row.id,'review')).status,200);
 const denied=await api(requestPath(row.id),{method:'PATCH',body:{action:'approve',reason:'Intento de autoaprobación QA'}});assert.equal(denied.status,403);assert.equal(denied.body.error,'SUBSCRIPTION_SELF_APPROVAL_DENIED');
 const saved=(await fixture.db.query('SELECT status,approved_by FROM subscription_requests WHERE id=$1',[row.id])).rows[0];assert.equal(saved.status,'UNDER_REVIEW');assert.equal(saved.approved_by,null);assert.equal((await transition(row.id,'approve')).status,200);
});

test('audit pagination reaches all events beyond 200 across timestamp ties without exposing private data or another company',async()=>{
 await fixture.db.query(`INSERT INTO audit_log(tenant_id,user_id,entity_type,action,new_value,created_at)
  SELECT $1,$2,'subscription','subscription.qa.history',jsonb_build_object('reason','Prueba QA','publicFeatures',jsonb_build_array('Característica pública'),'ctaText','Solicitar plan','fileId','private-file','email','hidden@example.test','documents',jsonb_build_object('quote','private')),'2026-11-12T10:00:00.123456Z'::timestamptz FROM generate_series(1,225)`,[QA_IDS.legacy,QA_IDS.super]);
 await fixture.db.query("INSERT INTO audit_log(tenant_id,entity_type,action,created_at) VALUES($1,'subscription','subscription.qa.microsecond','2026-11-12T10:00:00.123455Z'),($2,'subscription','subscription.qa.foreign','2026-11-12T10:00:00.123456Z')",[QA_IDS.legacy,QA_IDS.tenant]);
 const expected=(await fixture.db.query("SELECT id FROM audit_log WHERE tenant_id=$1 AND entity_type='subscription' ORDER BY created_at DESC,id DESC",[QA_IDS.legacy])).rows.map(r=>r.id);
 const summary=(await api(`/subscriptions/admin/companies/${QA_IDS.legacy}`)).body;assert.equal(summary.audit.length,200);assert.ok(summary.auditNextCursor);
 let cursor,events=[];do{const page=await api(`/subscription/audit?limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:''}`,{account:'legacy'});assert.equal(page.status,200,JSON.stringify(page.body));events.push(...page.body.events);cursor=page.body.nextCursor;}while(cursor);
 assert.equal(events.length,226);assert.deepEqual(events.map(e=>e.id),expected);assert.equal(new Set(events.map(e=>e.id)).size,226);
 assert.ok(events.every(e=>!JSON.stringify(e).includes('private-file')&&!JSON.stringify(e).includes('hidden@example.test')&&!JSON.stringify(e).includes('documents')));
 assert.ok(events.filter(e=>e.action==='subscription.qa.history').every(e=>e.newValue.ctaText==='Solicitar plan'&&e.newValue.publicFeatures[0]==='Característica pública'));
 const remaining=await api(`/subscriptions/admin/companies/${QA_IDS.legacy}/audit?cursor=${encodeURIComponent(summary.auditNextCursor)}`);assert.equal(remaining.body.events.length,26);assert.equal(remaining.body.nextCursor,null);
 assert.equal((await api('/subscription/audit',{account:'reader'})).status,403);assert.equal((await api(`/subscriptions/admin/companies/${QA_IDS.legacy}/audit`,{account:'admin'})).status,403);
 for(const query of ['cursor=invalid','limit=201','limit=0'])assert.equal((await api(`/subscription/audit?${query}`,{account:'legacy'})).status,400);
});
