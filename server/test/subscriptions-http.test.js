import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import express from 'express';
import cookieParser from 'cookie-parser';
import {PGlite} from '@electric-sql/pglite';
import {mock} from 'node:test';
import {pool,withTenant} from '../db.js';
import {publicPlansRouter,subscriptionRouter} from '../routes/subscriptions.js';
import {activateFreeSubscription,withSubscriptionAdmin} from '../subscriptions.js';

export const QA_IDS={tenant:'11111111-1111-4111-8111-111111111111',legacy:'22222222-2222-4222-8222-222222222222',global:'33333333-3333-4333-8333-333333333333',admin:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',reader:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',super:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',legacyAdmin:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};

// Test-only application: real subscription routers and migrations, an isolated
// in-memory PostgreSQL database and explicitly named fictitious identities.
// It is never imported by the production entrypoint or deployed as a route.
export async function createSubscriptionQaApp({port=0}={}) {
 const db=new PGlite();
 for(const file of (await fs.readdir('database/postgres')).filter(f=>/^\d+.*\.sql$/.test(f)).sort())await db.exec((await fs.readFile(`database/postgres/${file}`,'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g,''));
 let queue=Promise.resolve();
 const connectMock=mock.method(pool,'connect',async()=>{const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;return{query:(sql,params)=>db.query(sql,params),release};});
 const queryMock=mock.method(pool,'query',(sql,params)=>db.query(sql,params));
 await db.query("INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,is_domian_admin) VALUES($1,'http-managed-qa','Copeval QA','13.848.379-7','qa@example.test','active',false),($2,'http-legacy-qa','Empresa Legacy QA','76.666.330-5','legacy@example.test','active',false),($3,'http-global-qa','Administración Nexo QA','11.111.111-1','global@example.test','active',true)",[QA_IDS.tenant,QA_IDS.legacy,QA_IDS.global]);
 await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role,permissions) VALUES($1,$2,'qa@example.test','Admin QA','client_admin','{}'),($3,$2,'reader@example.test','Consulta QA','consulta','{}'),($4,$5,'global@example.test','Global QA','domian_admin','{}'),($6,$7,'legacy@example.test','Legacy QA','client_admin','{}')",[QA_IDS.admin,QA_IDS.tenant,QA_IDS.reader,QA_IDS.super,QA_IDS.global,QA_IDS.legacyAdmin,QA_IDS.legacy]);
 const state={empresa:{nombre:'Copeval QA',rut:'13.848.379-7'},trabajadores:[],minas:[],contratos:[],mantenciones:[],hoteles:[],asignaciones:[],hotelAsig:[],eppDeliveries:[],prospectos:[],libroObra:[],tenantUsers:[]};
 for(const tenant of [QA_IDS.tenant,QA_IDS.legacy,QA_IDS.global]){
  await db.query('INSERT INTO tenant_state(tenant_id,state) VALUES($1,$2::jsonb)',[tenant,JSON.stringify(state)]);
  await db.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[]')",[tenant]);
 }
 await withTenant(QA_IDS.tenant,client=>activateFreeSubscription(client,{tenantId:QA_IDS.tenant,userId:QA_IDS.admin}));
 const accounts={admin:{tenantId:QA_IDS.tenant,userId:QA_IDS.admin,role:'client_admin',name:'Admin QA',email:'qa@example.test',companyName:'Copeval QA',rut:'13.848.379-7',subscriptionManaged:true},
  reader:{tenantId:QA_IDS.tenant,userId:QA_IDS.reader,role:'consulta',name:'Consulta QA',email:'reader@example.test',companyName:'Copeval QA',rut:'13.848.379-7',subscriptionManaged:true},
  global:{tenantId:QA_IDS.global,userId:QA_IDS.super,role:'domian_admin',name:'Global QA',email:'global@example.test',companyName:'Administración Nexo QA',rut:'11.111.111-1',subscriptionManaged:false},
  legacy:{tenantId:QA_IDS.legacy,userId:QA_IDS.legacyAdmin,role:'client_admin',name:'Legacy QA',email:'legacy@example.test',companyName:'Empresa Legacy QA',rut:'76.666.330-5',subscriptionManaged:false}};
 const app=express();app.set('trust proxy','loopback');app.use(express.json());app.use(cookieParser());
 app.get('/__qa/account/:account',(req,res)=>{if(!accounts[req.params.account])return res.status(404).end();res.cookie('qa_account',req.params.account,{sameSite:'lax'});res.json({account:req.params.account});});
 app.use((req,res,next)=>{req.auth={...(accounts[req.get('x-qa-account')||req.cookies.qa_account||'admin']||accounts.admin),csrfToken:'qa-csrf-token',mfaVerified:true,permissions:{modules:{}}};next();});
 const session=auth=>({csrfToken:'qa-csrf-token',user:{id:auth.userId,email:auth.email,fullName:auth.name,full_name:auth.name,name:auth.name,role:auth.role,permissions:auth.permissions,mustChangePassword:false,mfaEnabled:true,mfaVerified:true},tenant:{id:auth.tenantId,companyName:auth.companyName,name:auth.companyName,rut:auth.rut,subscriptionManaged:auth.subscriptionManaged,operationalTimeZone:'America/Santiago'},mfaVerified:true,mfaRequired:false,mustChangePassword:false});
 app.get('/api/auth/me',(req,res)=>res.json(session(req.auth)));
 app.post('/api/auth/login',(req,res)=>res.json(session(req.auth)));app.post('/api/auth/logout',(req,res)=>res.clearCookie('qa_account').status(204).end());
 app.get('/api/settings',(req,res)=>res.json({settings:{branding:{displayName:req.auth.companyName},catalogs:{operationalTimeZone:'America/Santiago'},modules:{}}}));
 app.get('/api/state',(req,res)=>res.json({state:{...state,empresa:{nombre:req.auth.companyName,rut:req.auth.rut}},version:1,versions:{trabajadores:1}}));
 app.get('/api/workers',(req,res)=>res.json([]));
 app.use('/api',publicPlansRouter);app.use('/api',subscriptionRouter);
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status||(error.name==='ZodError'?400:500)).json({error:error.code||(error.name==='ZodError'?'VALIDATION_ERROR':'SERVER_ERROR'),message:error.message,details:error.details});});
 const server=await new Promise((resolve,reject)=>{const s=app.listen(port,'127.0.0.1',()=>resolve(s));s.once('error',reject);});
 const base=`http://127.0.0.1:${server.address().port}`;
 return{app,server,db,base,accounts,async close(){await new Promise(resolve=>server.close(resolve));connectMock.mock.restore();queryMock.mock.restore();await db.close();}};
}

if(process.env.SUBSCRIPTIONS_FIXTURE_SERVER!=='1'){
 let fixture;
 before(async()=>{fixture=await createSubscriptionQaApp();});after(async()=>{await fixture?.close();});
 let apiSequence=0;
 async function api(path,{account='admin',method='GET',body,ip}={}){const response=await fetch(`${fixture.base}/api${path}`,{method,headers:{'x-qa-account':account,'x-forwarded-for':ip||`192.0.2.${++apiSequence%250+1}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
 async function catalog(){return(await api('/plans')).body;}
 async function publicInput(extra={}){const c=await catalog(),plan=c.plans.find(p=>p.code==='LA_UNION');return {companyName:'Empresa QA Publica',rut:'13.848.379-7',contactName:'Persona',contactLastName:'Ficticia',email:'public@example.test',phone:'+56912345678',workers:20,planCode:'LA_UNION',packages:[],versionId:plan.versionId,displayedMonthlyNetPrice:plan.monthlyPrice,acceptedTerms:true,termsVersion:'2026-11-05',comments:'Sólo QA',idempotencyKey:`http-${crypto.randomUUID()}`,...extra};}

 test('HTTP public catalogue and recommendation use the real seeded backend and reject caller-provided capacity',async()=>{
  const c=await catalog();assert.equal(c.plans.length,5);assert.equal(c.plans[0].trialMonths,6);
  const r=await api('/plans/recommend',{method:'POST',body:{workers:850}});assert.equal(r.status,200);assert.equal(r.body.packages[0].code,'EXTRA_200');
  const forged=await api('/plans/recommend',{method:'POST',body:{workers:850,currentCapacity:1000000}});assert.equal(forged.status,400);
 });
 test('HTTP requests require administrator and strict body prevents directly assigning limits, dates or approval',async()=>{
  const denied=await api('/subscription/requests',{account:'reader',method:'POST',body:{type:'UPGRADE',planCode:'LA_UNION',reason:'QA acceso',idempotencyKey:'reader-qa-request'}});assert.equal(denied.status,403);
  const forged=await api('/subscription/requests',{method:'POST',body:{type:'UPGRADE',planCode:'LA_UNION',reason:'QA acceso',idempotencyKey:'forged-qa-request',workerLimit:99999,status:'APPROVED'}});assert.equal(forged.status,400);
  const allowed=await api('/subscription/requests',{method:'POST',body:{type:'UPGRADE',planCode:'LA_UNION',reason:'QA acceso',idempotencyKey:'allowed-qa-request'}});assert.equal(allowed.status,201);assert.equal(allowed.body.status,'REQUESTED');
 });
 test('HTTP global endpoints enforce actual platform tenant in addition to the role string',async()=>{
  assert.equal((await api('/subscriptions/admin/companies')).status,403);
  assert.equal((await api('/subscriptions/admin/companies',{account:'global'})).status,200);
  fixture.accounts.admin.role='domian_admin';try{assert.equal((await api('/subscriptions/admin/companies')).status,403);}finally{fixture.accounts.admin.role='client_admin';}
 });
 test('HTTP public forms validate RUT, email, phone, terms and published version before persisting a lead',async()=>{
  const invalidRut=await api('/commercial-requests',{method:'POST',body:await publicInput({rut:'1-0'})});assert.equal(invalidRut.status,400);
  for(const extra of [{email:'invalid'},{phone:'123'},{acceptedTerms:false},{termsVersion:'caller-invented'},{versionId:crypto.randomUUID()}])assert.ok((await api('/commercial-requests',{method:'POST',body:await publicInput(extra)})).status>=400);
  const input=await publicInput(),one=await api('/commercial-requests',{method:'POST',body:input}),two=await api('/commercial-requests',{method:'POST',body:input});assert.equal(one.status,201);assert.equal(two.body.requestId,one.body.requestId);
  assert.equal((await api('/commercial-requests',{method:'POST',body:{...input,workers:25}})).status,409);
 });
 test('HTTP price publication reconfirms stale offers and never trusts a displayed price',async()=>{
  const input=await publicInput();
  const update=await api('/subscriptions/admin/catalog',{account:'global',method:'POST',body:{kind:'plan',code:'LA_UNION',monthlyPrice:1500,action:'publish',graceDays:10,warningPercent:75,criticalPercent:90}});assert.equal(update.status,201);
  const stale=await api('/commercial-requests',{method:'POST',body:input});assert.equal(stale.status,409);assert.equal(stale.body.error,'SUBSCRIPTION_OFFER_CHANGED');
  const altered=await api('/commercial-requests',{method:'POST',body:await publicInput({displayedMonthlyNetPrice:1})});assert.equal(altered.status,409);
 });
 test('HTTP commercial leads can be reviewed and linked to a matching company exactly once',async()=>{
  // Reset test limiter because prior cases intentionally exercised its anti-abuse ceiling.
  const c=await catalog(),plan=c.plans.find(p=>p.code==='PURRANQUE');
  const input=await publicInput({planCode:'PURRANQUE',workers:100,versionId:plan.versionId,displayedMonthlyNetPrice:plan.monthlyPrice});
  // Store a lead through the same persisted shape if the public limiter has already
  // rejected this test IP; a separate limiter test verifies HTTP rejection below.
  const stored=await withSubscriptionAdmin(async client=>(await client.query(`INSERT INTO subscription_commercial_requests(company_name,rut,contact_name,contact_last_name,contact_email,phone,workers_quantity,requested_plan_code,proposal,terms_version,idempotency_key,payload_hash)
   VALUES('Empresa Legacy QA',$1,'Persona','QA','qa@example.test','+56912345678',100,'PURRANQUE',$2::jsonb,'2026-11-05',$3,'qa') RETURNING id`,['766663305',JSON.stringify({plan,packages:[],totalCapacity:180,monthlyNetPrice:2000}),input.idempotencyKey])).rows[0]);
  const mismatch=await api(`/subscriptions/admin/commercial-requests/${stored.id}`,{account:'global',method:'PATCH',body:{tenantId:QA_IDS.tenant,status:'LINKED',reason:'Prueba QA'}});assert.equal(mismatch.status,409);
  const linked=await api(`/subscriptions/admin/commercial-requests/${stored.id}`,{account:'global',method:'PATCH',body:{tenantId:QA_IDS.legacy,status:'LINKED',reason:'Prueba QA'}});assert.equal(linked.status,200);assert.equal(linked.body.request.type,'INITIAL');assert.equal(linked.body.request.status,'REQUESTED');
  const again=await api(`/subscriptions/admin/commercial-requests/${stored.id}`,{account:'global',method:'PATCH',body:{tenantId:QA_IDS.legacy,status:'LINKED',reason:'Prueba QA'}});assert.equal(again.body.request.id,linked.body.request.id);
 });
 test('HTTP independent services require contracting reference, are audited and can be disabled without an invented reference',async()=>{
  const path=`/subscriptions/admin/companies/${QA_IDS.tenant}/services`;
  assert.equal((await api(path,{method:'PATCH',body:{services:{libroObra:{enabled:true,reference:'Contrato QA'}},reason:'Licencia QA'}})).status,403);
  assert.equal((await api(path,{account:'global',method:'PATCH',body:{services:{libroObra:{enabled:true}},reason:'Licencia QA'}})).status,400);
  const enabled=await api(path,{account:'global',method:'PATCH',body:{services:{libroObra:{enabled:true,reference:'Contrato QA'}},reason:'Licencia QA'}});assert.equal(enabled.status,200);
  const summary=await api('/subscription');assert.equal(summary.body.separateServices.libroObra.enabled,true);
  assert.equal((await api(path,{account:'global',method:'PATCH',body:{services:{libroObra:{enabled:false}},reason:'Fin de licencia QA'}})).status,200);
  assert.equal((await fixture.db.query("SELECT count(*)::int n FROM audit_log WHERE action='subscription.services.changed'")).rows[0].n,2);
 });
 test('HTTP operating users receive gating summary without commercial documents or requests',async()=>{
  const s=await api('/subscription',{account:'reader'});assert.equal(s.status,200);assert.equal(s.body.canOperate,true);assert.deepEqual(s.body.requests,[]);assert.equal(s.body.permissions.canManage,false);
  assert.equal((await api('/subscription/notifications',{account:'reader'})).status,403);
 });
 test('HTTP public lead limiter rejects repeated abusive submissions',async()=>{
  for(let i=0;i<10;i++)assert.equal((await api('/commercial-requests',{method:'POST',body:{},ip:'198.51.100.100'})).status,400);
  assert.equal((await api('/commercial-requests',{method:'POST',body:{},ip:'198.51.100.100'})).status,429);
 });
 test('HTTP catalogue changes preserve real Free contract and expose admin-only version history',async()=>{
  const before=(await api('/subscription')).body;
  const changed=await api('/subscriptions/admin/catalog',{account:'global',method:'POST',body:{kind:'plan',code:'FREE',action:'draft',workerLimit:18}});assert.equal(changed.status,201);
  const current=(await api('/subscription')).body;assert.equal(current.capacity.total,before.capacity.total);assert.equal(current.contract.id,before.contract.id);
  const published=await catalog();assert.equal(published.plans.find(p=>p.code==='FREE').workerLimit,15);
  assert.equal((await api('/subscriptions/admin/catalog')).status,403);
  assert.ok((await api('/subscriptions/admin/catalog',{account:'global'})).body.plans.some(p=>p.state==='DRAFT'));
 });
}
