import test,{before,after,mock} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import nodemailer from 'nodemailer';
import {PGlite} from '@electric-sql/pglite';

// Set isolated storage before importing the frozen application configuration.
const uploadDir=await fs.mkdtemp(path.join(os.tmpdir(),'nexo-governance-'));
process.env.LOCAL_UPLOAD_DIR=uploadDir;process.env.FILE_STORAGE='local';process.env.VIRUS_SCAN_API_URL='';
const {pool,withTenant}=await import('../db.js');
const {subscriptionGovernanceRouter}=await import('../routes/subscription-governance.js');
const {subscriptionRouter}=await import('../routes/subscriptions.js');
const {filesRouter}=await import('../routes/files.js');
const {setSubscriptionOperator,saveSubscriptionPolicy}=await import('../subscription-governance.js');

const ids=Object.fromEntries(['global','otherGlobal','company','foreign','super','commercial','operations','unassigned','inactive','client','forgedSuper','otherUser'].map(key=>[key,randomUUID()]));
const accounts={
 super:{tenantId:ids.global,userId:ids.super,role:'domian_admin'},
 commercial:{tenantId:ids.global,userId:ids.commercial,role:'consulta'},
 operations:{tenantId:ids.global,userId:ids.operations,role:'rrhh'},
 unassigned:{tenantId:ids.global,userId:ids.unassigned,role:'client_admin',permissions:{subscriptionProfile:'SUPER_ADMIN',modules:{subscriptions:{write:true}}}},
 inactive:{tenantId:ids.global,userId:ids.inactive,role:'domian_admin'},
 client:{tenantId:ids.company,userId:ids.client,role:'domian_admin'},
 forgedSuper:{tenantId:ids.global,userId:ids.forgedSuper,role:'domian_admin'},
};
let db,server,base,queue=Promise.resolve();
before(async()=>{
 db=new PGlite();
 for(const name of (await fs.readdir('database/postgres')).filter(name=>/^\d+.*\.sql$/.test(name)).sort())await db.exec((await fs.readFile(`database/postgres/${name}`,'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g,''));
 mock.method(pool,'connect',async()=>{const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;return{query:(sql,args)=>db.query(sql,args),release};});
 mock.method(pool,'query',(sql,args)=>db.query(sql,args));
 mock.method(nodemailer,'createTransport',()=>assert.fail('Governance tests must not contact SMTP'));
 for(const [key,global,rut] of [['global',true,'91.111.111-1'],['otherGlobal',true,'92.222.222-2'],['company',false,'93.333.333-3'],['foreign',false,'94.444.444-4']])await db.query(`INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status,is_domian_admin,subscription_managed) VALUES($1,$2,$3,$4,'qa@example.test','active',$5,$6)`,[ids[key],`qa-${key}`,`QA ${key}`,rut,global,!global]);
 for(const [key,tenant,role,active] of [['super','global','domian_admin',true],['commercial','global','consulta',true],['operations','global','rrhh',true],['unassigned','global','client_admin',true],['inactive','global','consulta',false],['client','company','client_admin',true],['forgedSuper','global','consulta',true],['otherUser','otherGlobal','consulta',true]])await db.query(`INSERT INTO app_users(id,tenant_id,email,full_name,role,active,permissions) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,[ids[key],ids[tenant],`${key}@example.test`,`QA ${key}`,role,active,JSON.stringify({subscriptionProfile:'SUPER_ADMIN'})]);
 for(const [user,profile] of [['commercial','COMMERCIAL'],['operations','OPERATIONS'],['inactive','COMMERCIAL']])await db.query(`INSERT INTO subscription_operator_profiles(tenant_id,user_id,profile,granted_by,reason) VALUES($1,$2,$3,$4,'Perfil QA autorizado')`,[ids.global,ids[user],profile,ids.super]);
 const app=express();app.use(express.json());
 app.use((req,res,next)=>{req.auth={...(accounts[req.get('x-qa-account')||'super']||accounts.unassigned),subscriptionManaged:false,subscriptionServices:{},permissions:{modules:{}}};next();});
 app.use('/api',subscriptionGovernanceRouter);app.use('/api',subscriptionRouter);app.use('/api/files',filesRouter);
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status||(error.name==='ZodError'?400:500)).json({error:error.code||(error.name==='ZodError'?'VALIDATION_ERROR':'SERVER_ERROR')});});
 server=await new Promise((resolve,reject)=>{const value=http.createServer(app);value.once('error',reject);value.once('listening',()=>resolve(value));value.listen(0,'127.0.0.1');});
 base=`http://127.0.0.1:${server.address().port}/api`;
});
after(async()=>{if(server?.listening)await new Promise(resolve=>server.close(resolve));mock.restoreAll();await db?.close();await fs.rm(uploadDir,{recursive:true,force:true});});
async function api(route,{account='super',method='GET',body}={}) {
 const response=await fetch(`${base}${route}`,{method,headers:{'x-qa-account':account,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 const text=await response.text();return{status:response.status,body:text?JSON.parse(text):null};
}
const operatorsPath='/subscriptions/admin/operators';
const policiesPath='/subscriptions/admin/policies';
const reason='Cambio QA autorizado';
const actor=accounts.super;
async function grant(key,profile) { return api(`${operatorsPath}/${ids[key]}`,{method:'PATCH',body:{profile,reason}}); }

test('access is based on active global database identity and keeps delegated profiles read-only',async()=>{
 const superAccess=await api('/subscriptions/admin/access');assert.equal(superAccess.body.profile,'SUPER_ADMIN');assert.ok(superAccess.body.capabilities.includes('catalog.manage'));assert.ok(superAccess.body.capabilities.includes('suspensions.suspend'));
 for(const account of ['commercial','operations']){
  const delegated=await api('/subscriptions/admin/access',{account});assert.equal(delegated.status,200,account);assert.deepEqual(delegated.body.capabilities,['read'],account);
 }
 for(const account of ['unassigned','inactive','client','forgedSuper'])assert.equal((await api('/subscriptions/admin/access',{account})).status,403,account);
 accounts.super.role='consulta';try{assert.equal((await api('/subscriptions/admin/access')).body.profile,'SUPER_ADMIN');}finally{accounts.super.role='domian_admin';}
 // A real role revoked after authentication is authoritative on the next call.
 await db.query("UPDATE app_users SET role='consulta' WHERE id=$1",[ids.super]);
 try{assert.equal((await api('/subscriptions/admin/access')).status,403);}finally{await db.query("UPDATE app_users SET role='domian_admin' WHERE id=$1",[ids.super]);}
});
test('delegated commercial and operations profiles can read but cannot mutate subscriptions or nonpayment holds',async()=>{
 const companyPath=`/subscriptions/admin/companies/${ids.company}`;
 const requestPath=`${companyPath}/requests/${randomUUID()}`;
 const holdPath=`${companyPath}/nonpayment-suspensions`;
 for(const account of ['commercial','operations']){
  assert.equal((await api('/subscriptions/admin/companies',{account})).status,200,account);
  assert.equal((await api('/subscriptions/admin/catalog',{account})).status,200,account);
  assert.equal((await api('/subscriptions/admin/requests',{account})).status,200,account);
  assert.equal((await api('/subscriptions/admin/catalog',{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(`${companyPath}/requests`,{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(requestPath,{account,method:'PATCH',body:{action:'review',reason}})).status,403,account);
  assert.equal((await api(`${companyPath}/services`,{account,method:'PATCH',body:{services:{},reason}})).status,403,account);
  assert.equal((await api(`${companyPath}/documents`,{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(holdPath,{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(`${holdPath}/${randomUUID()}/reactivate`,{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(policiesPath,{account,method:'POST',body:{}})).status,403,account);
  assert.equal((await api(`${operatorsPath}/${ids.unassigned}`,{account,method:'PATCH',body:{profile:'COMMERCIAL',reason}})).status,403,account);
 }
});
test('only real superadmin delegates existing active global users; self, foreign tenant and forged input are rejected',async()=>{
 assert.equal((await grant('unassigned','COMMERCIAL')).status,200);
 assert.equal((await api('/subscriptions/admin/access',{account:'unassigned'})).body.profile,'COMMERCIAL');
 assert.equal((await api(`${operatorsPath}/${ids.operations}`,{account:'unassigned',method:'PATCH',body:{profile:'COMMERCIAL',reason}})).status,403);
 assert.equal((await grant('super','COMMERCIAL')).status,403);
 assert.equal((await grant('otherUser','COMMERCIAL')).status,404);
 assert.equal((await grant('client','COMMERCIAL')).status,404);
 assert.equal((await grant('inactive','COMMERCIAL')).status,409);
 assert.equal((await api(`${operatorsPath}/${ids.unassigned}`,{method:'PATCH',body:{profile:'SUPER_ADMIN',reason}})).status,400);
 assert.equal((await api(`${operatorsPath}/${ids.unassigned}`,{method:'PATCH',body:{profile:'COMMERCIAL',reason,tenantId:ids.company}})).status,400);
 assert.equal((await grant('unassigned',null)).status,200);
});

test('revocation, user inactivity and platform suspension take effect immediately; inactive profiles can be revoked',async()=>{
 assert.equal((await grant('unassigned','OPERATIONS')).status,200);
 assert.equal((await grant('unassigned',null)).status,200);
 assert.equal((await api('/subscriptions/admin/access',{account:'unassigned'})).status,403);
 await db.query('UPDATE app_users SET active=false WHERE id=$1',[ids.commercial]);
 try{assert.equal((await api('/subscriptions/admin/access',{account:'commercial'})).status,403);assert.equal((await grant('commercial',null)).status,200);}finally{await db.query('UPDATE app_users SET active=true WHERE id=$1',[ids.commercial]);}
 assert.equal((await api('/subscriptions/admin/access',{account:'commercial'})).status,403);
 await grant('commercial','COMMERCIAL');
 await db.query("UPDATE tenants SET status='suspended' WHERE id=$1",[ids.global]);
 try{assert.equal((await api('/subscriptions/admin/access')).status,403);}finally{await db.query("UPDATE tenants SET status='active' WHERE id=$1",[ids.global]);}
});

test('policies keep undefined periods null, require explicit approved definitions and audit immutable versions without deleting data',async()=>{
 const before=await db.query('SELECT count(*)::int count FROM tenants');
 let listed=(await api(policiesPath)).body;assert.deepEqual(listed.latestVersions,{CANCELLATION:0,RETENTION:0});
 const draft={kind:'CANCELLATION',status:'DRAFT',reason,expectedVersion:0};
 const saved=await api(policiesPath,{method:'POST',body:draft});assert.equal(saved.status,201);assert.equal(saved.body.policy.noticeDays,null);assert.equal(saved.body.policy.retentionDays,null);assert.equal(saved.body.policy.automaticDeletion,false);
 assert.equal((await api(policiesPath,{method:'POST',body:draft})).status,409);
 for(const body of [{...draft,expectedVersion:1,automaticDeletion:true},{...draft,expectedVersion:1,status:'APPROVED'},{...draft,expectedVersion:1,status:'APPROVED',noticeDays:30}])assert.equal((await api(policiesPath,{method:'POST',body})).status,400);
 const approved=await api(policiesPath,{method:'POST',body:{...draft,expectedVersion:1,status:'APPROVED',noticeDays:30,reference:'Acuerdo QA aprobado'}});assert.equal(approved.status,201);
 listed=(await api(policiesPath)).body;assert.equal(listed.current.cancellation.version,2);assert.equal(listed.latestVersions.CANCELLATION,2);assert.equal(listed.policies.find(item=>item.version===1).noticeDays,null);
 assert.equal((await db.query('SELECT count(*)::int count FROM tenants')).rows[0].count,before.rows[0].count);
 assert.equal((await db.query("SELECT count(*)::int count FROM audit_log WHERE action='subscription.policy.version.created'")).rows[0].count,2);
});

test('latestVersions and current policies remain correct when the 200-row history excludes retention entirely',async()=>{
 await db.query(`INSERT INTO subscription_governance_policies(tenant_id,kind,version,status,reference,reason,created_by)
   SELECT $1,'CANCELLATION',n,'DRAFT','','QA versión histórica',$2 FROM generate_series(3,203) n`,[ids.global,ids.super]);
 await db.query(`INSERT INTO subscription_governance_policies(tenant_id,kind,version,status,retention_days,reference,reason,created_by)
   VALUES($1,'RETENTION',1,'APPROVED',45,'Referencia QA','QA política explícita',$2)`,[ids.global,ids.super]);
 const listed=(await api(policiesPath)).body;
 assert.equal(listed.policies.length,200);assert.ok(listed.policies.every(row=>row.kind==='CANCELLATION'));
 assert.deepEqual(listed.latestVersions,{CANCELLATION:203,RETENTION:1});assert.equal(listed.current.retention.retentionDays,45);
 const next=await api(policiesPath,{method:'POST',body:{kind:'RETENTION',status:'DRAFT',reason,expectedVersion:listed.latestVersions.RETENTION}});
 assert.equal(next.status,201);assert.equal(next.body.policy.version,2);
});

test('audit failures roll back grants and policy versions in the same transaction',async()=>{
 await db.exec(`CREATE FUNCTION fail_governance_audit() RETURNS trigger AS $$ BEGIN IF NEW.action IN('subscription.operator.granted','subscription.policy.version.created') THEN RAISE EXCEPTION 'QA audit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql;
  CREATE TRIGGER qa_fail_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION fail_governance_audit();`);
 try {
  await assert.rejects(()=>withTenant(ids.global,client=>setSubscriptionOperator(client,actor,ids.unassigned,{profile:'COMMERCIAL',reason})),/QA audit failure/);
  await assert.rejects(()=>withTenant(ids.global,client=>saveSubscriptionPolicy(client,actor,{kind:'RETENTION',status:'DRAFT',reason,expectedVersion:2})),/QA audit failure/);
  assert.equal((await api('/subscriptions/admin/access',{account:'unassigned'})).status,403);
  assert.equal((await api(policiesPath)).body.latestVersions.RETENTION,2);
 } finally {await db.exec('DROP TRIGGER qa_fail_audit ON audit_log; DROP FUNCTION fail_governance_audit();');}
});

test('forced RLS and database constraints reject cross-tenant governance and automatic deletion',async()=>{
 await db.exec('CREATE ROLE qa_governance NOLOGIN; GRANT USAGE ON SCHEMA public TO qa_governance; GRANT SELECT,INSERT ON subscription_operator_profiles,subscription_governance_policies TO qa_governance;');
 await db.exec('SET ROLE qa_governance');
 try {
  await db.query("SELECT set_config('app.current_tenant_id',$1,false)",[ids.otherGlobal]);
  assert.equal((await db.query('SELECT * FROM subscription_operator_profiles')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM subscription_governance_policies')).rows.length,0);
  await assert.rejects(()=>db.query(`INSERT INTO subscription_operator_profiles(tenant_id,user_id,profile,granted_by,reason) VALUES($1,$2,'COMMERCIAL',$3,'QA forbidden')`,[ids.global,ids.unassigned,ids.super]),/row-level security/);
 } finally {await db.exec('RESET ROLE');}
 await assert.rejects(()=>db.query(`INSERT INTO subscription_governance_policies(tenant_id,kind,version,status,reason,created_by,automatic_deletion) VALUES($1,'RETENTION',3,'DRAFT','QA forbidden',$2,true)`,[ids.global,ids.super]),/check constraint/);
});

async function upload(account,tenantId,{type='subscription_document',bytes='QA commercial',general=false,forged=false}={}) {
 const body=new FormData();body.append('file',new Blob([`%PDF-1.4\n${bytes}`],{type:'application/pdf'}),'qa.pdf');body.append('entityType',type);body.append('entityId','qa-commercial');
 if(forged)body.append('subscriptionDocumentsContext',JSON.stringify({tenantId,capabilities:['read','requests.documents']}));
 const response=await fetch(`${base}${general?'/files':`/subscriptions/admin/companies/${tenantId}/documents`}`,{method:'POST',headers:{'x-qa-account':account},body,signal:AbortSignal.timeout(15000)});
 return{status:response.status,body:await response.json()};
}
async function download(account,tenantId,fileId) {
 const response=await fetch(`${base}/subscriptions/admin/companies/${tenantId}/documents/${fileId}`,{headers:{'x-qa-account':account},signal:AbortSignal.timeout(15000)});
 return{status:response.status,body:await response.text()};
}
test('delegated commercial and operations profiles remain read-only for subscription documents',async()=>{
 const uploaded=await upload('super',ids.company,{bytes:'QA solo lectura'});
 assert.equal(uploaded.status,201);
 for(const account of ['commercial','operations']){
  assert.equal((await upload(account,ids.company)).status,403,account);
  assert.equal((await download(account,ids.company,uploaded.body.id)).status,200,account);
 }
 assert.equal((await download('commercial',ids.foreign,uploaded.body.id)).status,404);
 assert.equal((await upload('commercial',ids.company,{general:true,forged:true})).status,403);
});
