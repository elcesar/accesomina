import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import express from 'express';
import cookieParser from 'cookie-parser';
import {PGlite} from '@electric-sql/pglite';
import {mock} from 'node:test';
import {pool,withTenant} from '../db.js';
import {publicPlansRouter,subscriptionRouter} from '../routes/subscriptions.js';
import {subscriptionGovernanceRouter} from '../routes/subscription-governance.js';
import {activateFreeSubscription,createSubscriptionRequest,withSubscriptionAdmin} from '../subscriptions.js';
import {dataTransferRouter} from '../routes/data-transfer.js';
import {tenantsRouter} from '../routes/tenants.js';
import { acceptUserInvitation, verifyUserInvitation } from '../user-invitations.js';

export const QA_IDS={tenant:'11111111-1111-4111-8111-111111111111',legacy:'22222222-2222-4222-8222-222222222222',global:'33333333-3333-4333-8333-333333333333',admin:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',reader:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',super:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',approver:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',legacyAdmin:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};

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
 await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role,permissions) VALUES($1,$2,'qa@example.test','Admin QA','client_admin','{}'),($3,$2,'reader@example.test','Consulta QA','consulta','{}'),($4,$5,'global@example.test','Global QA','domian_admin','{}'),($8,$5,'approver@example.test','Aprobadora QA','domian_admin','{}'),($6,$7,'legacy@example.test','Legacy QA','client_admin','{}')",[QA_IDS.admin,QA_IDS.tenant,QA_IDS.reader,QA_IDS.super,QA_IDS.global,QA_IDS.legacyAdmin,QA_IDS.legacy,QA_IDS.approver]);
 const state={empresa:{nombre:'Copeval QA',rut:'13.848.379-7'},trabajadores:[],minas:[],contratos:[],mantenciones:[],hoteles:[],asignaciones:[],hotelAsig:[],eppDeliveries:[],prospectos:[],libroObra:[],tenantUsers:[]};
 for(const tenant of [QA_IDS.tenant,QA_IDS.legacy,QA_IDS.global]){
  await db.query('INSERT INTO tenant_state(tenant_id,state) VALUES($1,$2::jsonb)',[tenant,JSON.stringify(state)]);
  await db.query("INSERT INTO tenant_module_state(tenant_id,module_key,data) VALUES($1,'trabajadores','[]')",[tenant]);
 }
 await withTenant(QA_IDS.tenant,client=>activateFreeSubscription(client,{tenantId:QA_IDS.tenant,userId:QA_IDS.admin}));
 const accounts={admin:{tenantId:QA_IDS.tenant,userId:QA_IDS.admin,role:'client_admin',name:'Admin QA',email:'qa@example.test',companyName:'Copeval QA',rut:'13.848.379-7',subscriptionManaged:true},
  reader:{tenantId:QA_IDS.tenant,userId:QA_IDS.reader,role:'consulta',name:'Consulta QA',email:'reader@example.test',companyName:'Copeval QA',rut:'13.848.379-7',subscriptionManaged:true},
  global:{tenantId:QA_IDS.global,userId:QA_IDS.super,role:'domian_admin',name:'Global QA',email:'global@example.test',companyName:'Administración Nexo QA',rut:'11.111.111-1',subscriptionManaged:false},
  approver:{tenantId:QA_IDS.global,userId:QA_IDS.approver,role:'domian_admin',name:'Aprobadora QA',email:'approver@example.test',companyName:'Administración Nexo QA',rut:'11.111.111-1',subscriptionManaged:false},
  legacy:{tenantId:QA_IDS.legacy,userId:QA_IDS.legacyAdmin,role:'client_admin',name:'Legacy QA',email:'legacy@example.test',companyName:'Empresa Legacy QA',rut:'76.666.330-5',subscriptionManaged:false}};
 const invitationDeliveries=[];
 const app=express();app.set('trust proxy','loopback');app.locals.deliverUserInvitation=async payload=>{invitationDeliveries.push(payload);return{delivered:true,provider:'QA_MOCK'};};app.use(express.json());app.use(cookieParser());
 app.get('/__qa/account/:account',(req,res)=>{if(!accounts[req.params.account])return res.status(404).end();res.cookie('qa_account',req.params.account,{sameSite:'lax'});res.json({account:req.params.account});});
 app.use((req,res,next)=>{req.auth={...(accounts[req.get('x-qa-account')||req.cookies.qa_account||'admin']||accounts.admin),csrfToken:'qa-csrf-token',mfaVerified:true,permissions:{modules:{}}};next();});
 const session=auth=>({csrfToken:'qa-csrf-token',user:{id:auth.userId,email:auth.email,fullName:auth.name,full_name:auth.name,name:auth.name,role:auth.role,permissions:auth.permissions,mustChangePassword:false,mfaEnabled:true,mfaVerified:true},tenant:{id:auth.tenantId,companyName:auth.companyName,name:auth.companyName,rut:auth.rut,subscriptionManaged:auth.subscriptionManaged,operationalTimeZone:'America/Santiago'},mfaVerified:true,mfaRequired:false,mustChangePassword:false});
 app.get('/api/auth/me',(req,res)=>res.json(session(req.auth)));
 app.post('/api/auth/login',(req,res)=>res.json(session(req.auth)));app.post('/api/auth/logout',(req,res)=>res.clearCookie('qa_account').status(204).end());
 app.get('/api/settings',(req,res)=>res.json({settings:{branding:{displayName:req.auth.companyName},catalogs:{operationalTimeZone:'America/Santiago'},modules:{}}}));
 app.get('/api/state',(req,res)=>res.json({state:{...state,empresa:{nombre:req.auth.companyName,rut:req.auth.rut}},version:1,versions:{trabajadores:1}}));
 app.get('/api/workers',(req,res)=>res.json([]));
 app.use('/api/data-transfer',dataTransferRouter);app.use('/api/tenants',tenantsRouter);app.use('/api',publicPlansRouter);app.use('/api',subscriptionGovernanceRouter);app.use('/api',subscriptionRouter);
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status||(error.name==='ZodError'?400:500)).json({error:error.code||(error.name==='ZodError'?'VALIDATION_ERROR':'SERVER_ERROR'),message:error.message,details:error.details});});
 const server=await new Promise((resolve,reject)=>{const s=app.listen(port,'127.0.0.1',error=>error?reject(error):resolve(s));s.once('error',reject);});
 const base=`http://127.0.0.1:${server.address().port}`;
 return{app,server,db,base,accounts,invitationDeliveries,async close(){await new Promise(resolve=>server.close(resolve));connectMock.mock.restore();queryMock.mock.restore();await db.close();}};
}

if(process.env.SUBSCRIPTIONS_FIXTURE_SERVER!=='1'){
 let fixture;
 before(async()=>{fixture=await createSubscriptionQaApp();});after(async()=>{await fixture?.close();});
 let apiSequence=0;
 async function api(path,{account='admin',method='GET',body,ip}={}){const response=await fetch(`${fixture.base}/api${path}`,{method,headers:{'x-qa-account':account,'x-forwarded-for':ip||`192.0.2.${++apiSequence%250+1}`,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
 async function catalog(){return(await api('/subscription/catalog')).body;}
 async function publicInput(extra={}){const c=await catalog(),plan=c.plans.find(p=>p.code==='LA_UNION');return {companyName:'Empresa QA Publica',rut:'13.848.379-7',contactName:'Persona',contactLastName:'Ficticia',email:'public@example.test',phone:'+56912345678',workers:20,planCode:'LA_UNION',packages:[],versionId:plan.versionId,...(Number.isInteger(plan.monthlyPrice)?{displayedMonthlyNetPrice:plan.monthlyPrice}:{}),acceptedTerms:true,termsVersion:'2026-11-05',comments:'Sólo QA',idempotencyKey:`http-${crypto.randomUUID()}`,...extra};}
 async function seedPaidContractForNonpayment(){
  const plan=(await fixture.db.query("SELECT * FROM subscription_plan_versions WHERE code='LA_UNION' AND state='PUBLISHED' LIMIT 1")).rows[0];
  const snapshot={plan:{code:plan.code,name:plan.name,workerLimit:plan.worker_limit},packages:[],totalCapacity:plan.worker_limit,monthlyNetPrice:Number(plan.monthly_price),currency:plan.currency,taxRate:Number(plan.tax_rate),timezone:'America/Santiago',graceDays:30,warningPercent:80,criticalPercent:90};
  await fixture.db.query('UPDATE subscription_contracts SET is_current=false WHERE tenant_id=$1 AND is_current',[QA_IDS.tenant]);
  const contract=(await fixture.db.query(`INSERT INTO subscription_contracts(tenant_id,plan_version_id,plan_code,snapshot,starts_at,ends_at,grace_ends_at,timezone,anchor_day,created_by)
   VALUES($1,$2,'LA_UNION',$3::jsonb,now()-interval '1 day',now()+interval '29 days',now()+interval '59 days','America/Santiago',1,$4) RETURNING *`,[QA_IDS.tenant,plan.id,JSON.stringify(snapshot),QA_IDS.super])).rows[0];
  const period=(await fixture.db.query(`INSERT INTO subscription_periods(tenant_id,subscription_id,snapshot,starts_at,ends_at,grace_ends_at)
   VALUES($1,$2,$3::jsonb,$4,$5,$6) RETURNING id`,[QA_IDS.tenant,contract.id,JSON.stringify(snapshot),contract.starts_at,contract.ends_at,contract.grace_ends_at])).rows[0];
  await fixture.db.query('UPDATE subscription_contracts SET current_period_id=$2 WHERE id=$1',[contract.id,period.id]);
  return contract;
 }

 test('HTTP hides unapproved public plans while keeping private catalogue available',async()=>{
  const publicPlans=await api('/plans');assert.equal(publicPlans.status,404);assert.equal(publicPlans.body.error,'PUBLIC_PLANS_NOT_AVAILABLE');
  const publicRecommendation=await api('/plans/recommend',{method:'POST',body:{workers:850}});assert.equal(publicRecommendation.status,404);
  const lead=await api('/commercial-requests',{method:'POST',body:{}});assert.equal(lead.status,503);assert.equal(lead.body.error,'COMMERCIAL_OFFER_NOT_APPROVED');
  const c=await catalog();assert.equal(c.plans.length,5);
  assert.equal(c.plans.find(plan=>plan.code==='FREE').monthlyPrice,0);
  assert.equal(c.plans.find(plan=>plan.code==='LA_UNION').monthlyPrice,null);
  assert.equal(c.plans.find(plan=>plan.code==='LA_UNION').priceVisibility,'QUOTE');
  assert.equal(c.packages[0].monthlyPrice,null);
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
 test('HTTP keeps billing references out of client administration and exposes them only to global commercial administration',async()=>{
  await seedPaidContractForNonpayment();
  try{
   const path=`/subscriptions/admin/companies/${QA_IDS.tenant}/nonpayment-suspensions`;
   const input={reason:'Factura vencida de prueba',billingReference:'FAC-PRIVADA-QA-001',effectiveAt:new Date().toISOString(),confirmation:'SUSPENDER',idempotencyKey:'http-nonpayment-private-001'};
   assert.equal((await api(path,{method:'POST',body:input})).status,403);
   const suspended=await api(path,{account:'global',method:'POST',body:input});assert.equal(suspended.status,201);assert.equal(suspended.body.hold.billingReference,'FAC-PRIVADA-QA-001');
   const company=await api('/subscription');assert.equal(company.status,200);assert.equal(company.body.contract.status,'SUSPENDED_NONPAYMENT');assert.equal(company.body.nonpaymentHold.billingReference,undefined);assert.equal(JSON.stringify(company.body).includes('FAC-PRIVADA-QA-001'),false);
   const commercial=await api(`/subscriptions/admin/companies/${QA_IDS.tenant}`,{account:'global'});assert.equal(commercial.status,200);assert.equal(commercial.body.nonpaymentHold.billingReference,'FAC-PRIVADA-QA-001');assert.equal(commercial.body.nonpaymentHolds[0].billingReference,'FAC-PRIVADA-QA-001');
  }finally{
   // Keep the long-lived HTTP fixture identical for the independent following cases.
   await fixture.db.query('DELETE FROM subscription_nonpayment_holds WHERE tenant_id=$1',[QA_IDS.tenant]);
   await fixture.db.query('UPDATE subscription_contracts SET is_current=false WHERE tenant_id=$1',[QA_IDS.tenant]);
   await fixture.db.query("UPDATE subscription_contracts SET is_current=true WHERE tenant_id=$1 AND plan_code='FREE'",[QA_IDS.tenant]);
  }
 });
 test.skip('HTTP public forms validate RUT, email, phone, terms and published version before persisting a lead (public offers suspended by #341)',async()=>{
  const invalidRut=await api('/commercial-requests',{method:'POST',body:await publicInput({rut:'1-0'})});assert.equal(invalidRut.status,400);
  for(const extra of [{email:'invalid'},{phone:'123'},{acceptedTerms:false},{termsVersion:'caller-invented'},{versionId:crypto.randomUUID()}])assert.ok((await api('/commercial-requests',{method:'POST',body:await publicInput(extra)})).status>=400);
  const input=await publicInput(),one=await api('/commercial-requests',{method:'POST',body:input}),two=await api('/commercial-requests',{method:'POST',body:input});assert.equal(one.status,201);assert.equal(two.body.requestId,one.body.requestId);
  assert.equal((await api('/commercial-requests',{method:'POST',body:{...input,workers:25}})).status,409);
 });
 test.skip('HTTP price publication reconfirms stale offers and never trusts a displayed price (public offers suspended by #341)',async()=>{
  const input=await publicInput();
  const update=await api('/subscriptions/admin/catalog',{account:'global',method:'POST',body:{kind:'plan',code:'LA_UNION',monthlyPrice:1500,action:'publish',graceDays:10,warningPercent:75,criticalPercent:90}});assert.equal(update.status,201);
  const stale=await api('/commercial-requests',{method:'POST',body:input});assert.equal(stale.status,409);assert.equal(stale.body.error,'SUBSCRIPTION_OFFER_CHANGED');
  const altered=await api('/commercial-requests',{method:'POST',body:await publicInput({displayedMonthlyNetPrice:1})});assert.equal(altered.status,409);
 });
 test('HTTP commercial leads can be reviewed and linked to a matching company exactly once',async()=>{
  // Reset test limiter because prior cases intentionally exercised its anti-abuse ceiling.
  const c=await catalog(),plan=c.plans.find(p=>p.code==='PURRANQUE');
  const input=await publicInput({planCode:'PURRANQUE',workers:100,versionId:plan.versionId});
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
 test.skip('HTTP public lead limiter rejects repeated abusive submissions (public offers suspended by #341)',async()=>{
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
 test('HTTP tenant onboarding retries are idempotent and never duplicate Free or paid provisioning',async()=>{
  const freeInput={companyName:'Empresa Reintento Free QA',rut:'77.777.784-K',adminName:'Administradora Free QA',email:'reintento.free@example.test',phone:'+56912345678',initialPlan:{planCode:'FREE'},idempotencyKey:'tenant-free-retry-qa-2026'};
  const freeCreated=await api('/tenants',{account:'global',method:'POST',body:freeInput});
  assert.equal(freeCreated.status,201);assert.equal(freeCreated.body.initialPlan.status,'ACTIVE');assert.equal(freeCreated.body.idempotentReplay,false);
  const freeReplay=await api('/tenants',{account:'global',method:'POST',body:freeInput});
  assert.equal(freeReplay.status,200);assert.equal(freeReplay.body.idempotentReplay,true);assert.equal(freeReplay.body.tenant.id,freeCreated.body.tenant.id);
  assert.equal(freeReplay.body.accessRecoveryRequired,true);assert.equal('temporaryPassword' in freeReplay.body,false);
  const freeTenantId=freeCreated.body.tenant.id;
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM tenants WHERE id=$1',[freeTenantId])).rows[0].n,1);
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_free_benefits WHERE tenant_id=$1',[freeTenantId])).rows[0].n,1);
  const freeConflict=await api('/tenants',{account:'global',method:'POST',body:{...freeInput,companyName:'Empresa Reintento Alterada QA'}});
  assert.equal(freeConflict.status,409);assert.equal(freeConflict.body.error,'TENANT_CREATION_IDEMPOTENCY_CONFLICT');
  assert.equal((await fixture.db.query("SELECT count(*)::int n FROM tenants WHERE admin_email='reintento.free@example.test'")).rows[0].n,1);

  const adminCatalog=(await api('/subscriptions/admin/catalog',{account:'global'})).body;
  const paidPlan=adminCatalog.plans.find(plan=>plan.code==='LA_UNION'&&plan.state==='PUBLISHED'&&plan.active);assert.ok(paidPlan);
  const paidInput={companyName:'Empresa Reintento Pagada QA',rut:'77.777.785-8',adminName:'Administradora Pagada QA',email:'reintento.pagada@example.test',phone:'+56912345678',initialPlan:{planCode:'LA_UNION',versionId:paidPlan.versionId,packages:[]},idempotencyKey:'tenant-paid-retry-qa-2026'};
  const paidCreated=await api('/tenants',{account:'global',method:'POST',body:paidInput});
  assert.equal(paidCreated.status,201);assert.equal(paidCreated.body.tenant.status,'pending');assert.equal(paidCreated.body.initialPlan.status,'REQUESTED');
  const paidReplay=await api('/tenants',{account:'global',method:'POST',body:paidInput});
  assert.equal(paidReplay.status,200);assert.equal(paidReplay.body.idempotentReplay,true);assert.equal(paidReplay.body.accessRecoveryRequired,false);
  assert.equal(paidReplay.body.tenant.id,paidCreated.body.tenant.id);assert.equal(paidReplay.body.initialPlan.request.id,paidCreated.body.initialPlan.request.id);
  const paidTenantId=paidCreated.body.tenant.id;
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM tenants WHERE id=$1',[paidTenantId])).rows[0].n,1);
  assert.equal((await fixture.db.query("SELECT count(*)::int n FROM subscription_requests WHERE tenant_id=$1 AND type='INITIAL'",[paidTenantId])).rows[0].n,1);
 });
 test('HTTP global onboarding keeps paid initial plans pending, server-priced and atomic',async()=>{
  const adminCatalog=(await api('/subscriptions/admin/catalog',{account:'global'})).body,laUnion=adminCatalog.plans.find(plan=>plan.code==='LA_UNION'&&plan.state==='PUBLISHED'&&plan.active);assert.ok(laUnion);
  const input={companyName:'Empresa Inicial Pagada QA',rut:'77.777.778-5',adminName:'Administradora QA',email:'inicial.pagada@example.test',phone:'+56912345678',initialPlan:{planCode:'LA_UNION',versionId:laUnion.versionId,packages:[]}};
  const created=await api('/tenants',{account:'global',method:'POST',body:input});assert.equal(created.status,201);assert.equal(created.body.tenant.status,'pending');assert.equal(created.body.tenant.subscription_managed,true);assert.equal(created.body.initialPlan.status,'REQUESTED');assert.equal(created.body.initialPlan.request.type,'INITIAL');assert.equal(created.body.initialPlan.request.proposal.plan.versionId,laUnion.versionId);
  const tenantId=created.body.tenant.id;assert.equal('temporaryPassword' in created.body,false);assert.equal((await fixture.db.query('SELECT password_hash FROM app_users WHERE id=$1',[created.body.user.id])).rows[0].password_hash,null);
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_contracts WHERE tenant_id=$1',[tenantId])).rows[0].n,0);
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_free_benefits WHERE tenant_id=$1',[tenantId])).rows[0].n,0);
  assert.equal((await fixture.db.query('SELECT count(*)::int n FROM user_invitations WHERE tenant_id=$1',[tenantId])).rows[0].n,0);assert.equal(fixture.invitationDeliveries.length,0);
  const listing=await api('/tenants',{account:'global'});assert.equal(listing.status,200);assert.equal(listing.body.find(tenant=>tenant.id===tenantId).initialSubscriptionStatus,'REQUESTED');
  const genericActivation=await api(`/tenants/${tenantId}`,{account:'global',method:'PATCH',body:{status:'active'}});assert.equal(genericActivation.status,409);assert.equal(genericActivation.body.error,'SUBSCRIPTION_INITIAL_PENDING');
  assert.equal((await fixture.db.query('SELECT status FROM tenants WHERE id=$1',[tenantId])).rows[0].status,'pending');assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_free_benefits WHERE tenant_id=$1',[tenantId])).rows[0].n,0);
  const duplicate=await withSubscriptionAdmin(client=>createSubscriptionRequest(client,{tenantId,userId:QA_IDS.super,asAdmin:true,input:{type:'INITIAL',planCode:'LA_UNION',versionId:laUnion.versionId,packages:[],reason:'No debe duplicarse.',idempotencyKey:'duplicate-initial-qa'}}),tenantId).then(()=>null,error=>error);assert.equal(duplicate.code,'SUBSCRIPTION_INITIAL_EXISTS');
  // Fijar las fechas en una relación válida para America/Santiago, incluso
  // cuando el runner se ejecuta alrededor de medianoche UTC.
  const issuedAt=new Date(Date.now()-24*60*60*1000).toISOString().slice(0,10),acceptedAt=new Date(Date.now()-60*60*1000).toISOString();
  const docs={};
  for(const name of ['quote','purchaseOrder','invoice']){
   const file=(await fixture.db.query("INSERT INTO file_objects(tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status) VALUES($1,$2,'subscription_document','http-initial','qa.pdf','application/pdf',5,'local',$3,'qa','clean') RETURNING id",[tenantId,created.body.user.id,`qa/http-initial/${tenantId}/${name}`])).rows[0];
   docs[name]={number:`HTTP-${name}`,fileId:file.id,netAmount:1000,issuedAt,status:name==='quote'?'ACCEPTED':'ISSUED',responsible:'Aprobadora QA',observations:'Documento ficticio',...(name==='quote'?{acceptedAt}: {})};
  }
  const requestPath=`/subscriptions/admin/companies/${tenantId}/requests/${created.body.initialPlan.request.id}`;
  assert.equal((await api(requestPath,{account:'approver',method:'PATCH',body:{action:'review',reason:'Revisión comercial QA'}})).body.status,'UNDER_REVIEW');
  assert.equal((await api(requestPath,{account:'approver',method:'PATCH',body:{action:'approve',reason:'Aprobación separada QA'}})).body.status,'APPROVED');
  const scheduled=await api(requestPath,{account:'approver',method:'PATCH',body:{action:'schedule',reason:'Programación QA',effectiveAt:new Date(Date.now()-1000).toISOString(),documents:docs}});assert.equal(scheduled.status,200);assert.equal(scheduled.body.status,'SCHEDULED');
  const executed=await api(requestPath,{account:'approver',method:'PATCH',body:{action:'execute',reason:'Ejecución QA'}});assert.equal(executed.status,200);assert.equal(executed.body.tenantActivated,true);assert.equal(executed.body.invitation.status,'sent');
  assert.equal(fixture.invitationDeliveries.length,1);assert.equal(fixture.invitationDeliveries[0].email,'inicial.pagada@example.test');
  const inviteUrl=new URL(fixture.invitationDeliveries[0].url);const invitationInput={tenant:inviteUrl.searchParams.get('tenant'),token:inviteUrl.searchParams.get('token')};assert.equal(invitationInput.tenant,tenantId);assert.equal((await verifyUserInvitation(invitationInput)).email,'inicial.pagada@example.test');await acceptUserInvitation({...invitationInput,newPassword:'Contraseña QA 2026!'});assert.equal((await fixture.db.query("SELECT status FROM user_invitations WHERE tenant_id=$1 AND user_id=$2",[tenantId,created.body.user.id])).rows[0].status,'accepted');
  assert.equal((await fixture.db.query('SELECT status FROM tenants WHERE id=$1',[tenantId])).rows[0].status,'active');assert.equal((await fixture.db.query('SELECT count(*)::int n FROM subscription_contracts WHERE tenant_id=$1 AND is_current',[tenantId])).rows[0].n,1);
  const rejected=await api('/tenants',{account:'global',method:'POST',body:{...input,companyName:'Empresa Inicial Rechazada QA',rut:'77.777.782-3',email:'inicial.rechazada@example.test'}});assert.equal(rejected.status,201);
  const rejectedPath=`/subscriptions/admin/companies/${rejected.body.tenant.id}/requests/${rejected.body.initialPlan.request.id}`;assert.equal((await api(rejectedPath,{account:'approver',method:'PATCH',body:{action:'reject',reason:'Condiciones comerciales rechazadas'}})).body.status,'REJECTED');
  const rejectedActivation=await api(`/tenants/${rejected.body.tenant.id}`,{account:'global',method:'PATCH',body:{status:'active'}});assert.equal(rejectedActivation.status,409);assert.equal(rejectedActivation.body.error,'SUBSCRIPTION_INITIAL_PENDING');
  const cancelled=await api('/tenants',{account:'global',method:'POST',body:{...input,companyName:'Empresa Inicial Cancelada QA',rut:'77.777.783-1',email:'inicial.cancelada@example.test'}});assert.equal(cancelled.status,201);
  const cancelledPath=`/subscriptions/admin/companies/${cancelled.body.tenant.id}/requests/${cancelled.body.initialPlan.request.id}`;assert.equal((await api(cancelledPath,{account:'approver',method:'PATCH',body:{action:'cancel',reason:'Cliente canceló la contratación'}})).body.status,'CANCELLED');
  const cancelledActivation=await api(`/tenants/${cancelled.body.tenant.id}`,{account:'global',method:'PATCH',body:{status:'active'}});assert.equal(cancelledActivation.status,409);assert.equal(cancelledActivation.body.error,'SUBSCRIPTION_INITIAL_PENDING');
  const badVersion=await api('/tenants',{account:'global',method:'POST',body:{...input,companyName:'Empresa Oferta Antigua QA',rut:'77.777.779-3',email:'oferta.antigua@example.test',initialPlan:{planCode:'LA_UNION',versionId:'99999999-9999-4999-8999-999999999999',packages:[]}}});assert.equal(badVersion.status,409);assert.equal(badVersion.body.error,'SUBSCRIPTION_OFFER_CHANGED');
  const forgedPrice=await api('/tenants',{account:'global',method:'POST',body:{...input,companyName:'Empresa Precio Forjado QA',rut:'77.777.780-7',email:'precio.forjado@example.test',initialPlan:{planCode:'LA_UNION',versionId:laUnion.versionId,packages:[],monthlyPrice:1}}});assert.equal(forgedPrice.status,400);assert.equal(forgedPrice.body.error,'INITIAL_PLAN_INVALID');
  const inactiveVersion=await api('/subscriptions/admin/catalog',{account:'global',method:'POST',body:{kind:'plan',code:'FRUTILLAR',action:'draft',active:false}});assert.equal(inactiveVersion.status,201);assert.equal(inactiveVersion.body.active,false);
  const inactive=await api('/tenants',{account:'global',method:'POST',body:{...input,companyName:'Empresa Plan Inactivo QA',rut:'77.777.781-5',email:'plan.inactivo@example.test',initialPlan:{planCode:'FRUTILLAR',versionId:inactiveVersion.body.versionId,packages:[]}}});assert.equal(inactive.status,409);assert.equal(inactive.body.error,'SUBSCRIPTION_OFFER_CHANGED');
  const failedTenants=(await fixture.db.query("SELECT count(*)::int n FROM tenants WHERE admin_email IN ('oferta.antigua@example.test','precio.forjado@example.test','plan.inactivo@example.test')")).rows[0].n;assert.equal(failedTenants,0);
 });

}
