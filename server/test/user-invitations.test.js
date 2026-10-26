import test,{before,after,beforeEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import nodemailer from 'nodemailer';
import {PGlite} from '@electric-sql/pglite';
import {pool} from '../db.js';
import {config} from '../config.js';
import {usersRouter} from '../routes/users.js';
import {invitationsRouter} from '../routes/invitations.js';
import {authRouter} from '../routes/auth.js';
import {randomToken,sha256,verifyPassword} from '../security.js';
import {INVITATION_TTL_MS,acceptUserInvitation,createUserInvitation,deliverUserInvitation,invitationInput,logInvitationEvent,sendAndRecordUserInvitation,verifyUserInvitation} from '../user-invitations.js';

const TENANT='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222',ADMIN='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PASSWORD='QaPassword2026!';
const SMTP={host:'smtp.qa.invalid',port:587,secure:false,user:'qa-user',pass:'qa-secret',from:'qa@example.test'};
let db,messages,delivery,queue=Promise.resolve();
before(async()=>{
  db=new PGlite();
  await db.exec(`CREATE TABLE tenants(id uuid PRIMARY KEY,company_name text,rut text,status text);
    CREATE TABLE app_users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid REFERENCES tenants(id),email text,full_name text,role text,
      password_hash text,password_salt text,must_change_password boolean DEFAULT false,permissions jsonb,active boolean DEFAULT true,
      mfa_enabled boolean DEFAULT false,mfa_enrolled_at timestamptz,last_login_at timestamptz,failed_login_count int DEFAULT 0,locked_until timestamptz,
      created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(tenant_id,email));
    CREATE TABLE audit_log(tenant_id uuid,user_id uuid,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);
    CREATE TABLE password_reset_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid,user_id uuid,token_hash text,expires_at timestamptz,used_at timestamptz);
    CREATE TABLE user_sessions(id uuid DEFAULT gen_random_uuid(),tenant_id uuid,user_id uuid,revoked_at timestamptz);`);
  await db.exec(await fs.readFile(new URL('../../database/postgres/024_user_invitations.sql',import.meta.url),'utf8'));
  // PGlite has one connection; retain whole transaction boundaries when testing
  // concurrent consumers rather than interleaving unrelated BEGIN statements.
  mock.method(pool,'connect',async()=>{
    const previous=queue;let release;queue=new Promise(resolve=>{release=resolve;});await previous;
    return {query:(sql,params)=>db.query(sql,params),release};
  });
  mock.method(pool,'query',(sql,params)=>db.query(sql,params));
  Object.assign(config.smtp,SMTP);
  mock.method(nodemailer,'createTransport',()=>({sendMail:async message=>{messages.push(message);return delivery(message);}}));
});
after(async()=>{mock.restoreAll();await db?.close();});
beforeEach(async()=>{
  messages=[];delivery=async message=>({accepted:[message.to]});
  Object.assign(config.smtp,SMTP);
  await db.exec('TRUNCATE user_invitations,app_users,tenants,audit_log,password_reset_tokens,user_sessions CASCADE');
  await db.query("INSERT INTO tenants VALUES($1,'Empresa ficticia QA','13.848.379-7','active'),($2,'Otra empresa QA','13.848.379-7','active')",[TENANT,OTHER]);
  await db.query("INSERT INTO app_users(id,tenant_id,email,full_name,role,permissions) VALUES($1,$2,'admin@example.test','Administrador ficticio','client_admin','{}')",[ADMIN,TENANT]);
});
function response(){return{statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},end(){return this;}};}
async function route(router,path,method,{body={},params={},auth={}}={}){
  const found=router.stack.find(layer=>layer.route?.path===path&&layer.route.methods[method]).route;
  const req={body,params,auth:{tenantId:TENANT,userId:ADMIN,role:'client_admin',companyName:'Empresa ficticia QA',rut:'13.848.379-7',...auth}};
  const res=response();
  if(router===usersRouter){let allowed=false;found.stack[0].handle(req,res,()=>{allowed=true;});if(!allowed)return res;}
  await found.stack.at(-1).handle(req,res);return res;
}
async function create(extra={}){return route(usersRouter,'/','post',{body:{fullName:'Persona ficticia QA',email:'invite@example.test',role:'consulta',permissions:{modules:{trabajadores:false}},...extra}});}
const readInvitation=async userId=>(await db.query('SELECT * FROM user_invitations WHERE user_id=$1',[userId])).rows[0];
const readUser=async userId=>(await db.query('SELECT * FROM app_users WHERE id=$1',[userId])).rows[0];
function link(index=messages.length-1){const url=messages[index].text.match(/https?:\/\/\S*aceptar-invitacion\?\S+/)[0];const parsed=new URL(url);return{tenant:parsed.searchParams.get('tenant'),token:parsed.searchParams.get('token')};}

test('creation sends company-scoped welcome and only persists a hash with 24-hour expiry',async()=>{
  const started=Date.now(),res=await create(),user=await readUser(res.body.user.id),invite=await readInvitation(user.id),input=link();
  assert.equal(res.statusCode,201);assert.equal(res.body.invitation.status,'sent');assert.equal(res.body.temporaryPassword,undefined);
  assert.equal(user.password_hash,null);assert.equal(user.must_change_password,true);assert.equal(user.role,'consulta');
  assert.deepEqual(user.permissions,{modules:{trabajadores:false}});
  assert.equal(invite.token_hash,sha256(input.token));assert.notEqual(invite.token_hash,input.token);
  assert.equal(input.tenant,TENANT);assert.ok(new Date(invite.expires_at).getTime()>=started+INVITATION_TTL_MS);
  assert.match(messages[0].text,/Empresa ficticia QA/);assert.match(messages[0].text,/13\.848\.379-7/);assert.match(messages[0].text,/24 horas/);
  const serialized=JSON.stringify(res.body)+JSON.stringify((await db.query('SELECT * FROM audit_log')).rows)+JSON.stringify(invite);
  assert.ok(!serialized.includes(input.token));assert.ok(!serialized.includes('aceptar-invitacion?'));
});

test('an optional API password remains usable and never suppresses welcome delivery',async()=>{
  const res=await create({password:PASSWORD}),user=await readUser(res.body.user.id);
  assert.equal(await verifyPassword(PASSWORD,user.password_salt,user.password_hash),true);
  assert.equal(user.must_change_password,false);assert.equal(res.body.invitation.status,'sent');assert.equal(messages.length,1);
  assert.ok(!JSON.stringify(res.body).includes(PASSWORD));assert.ok(!messages[0].text.includes(PASSWORD));
});

test('SMTP errors leave one persisted user and a safe failed state that can be resent',async()=>{
  delivery=async()=>{throw Object.assign(new Error('secret smtp detail'),{code:'EAUTH'});};
  const res=await create(),id=res.body.user.id;
  assert.equal(res.statusCode,201);assert.equal(res.body.invitation.status,'failed');assert.equal(res.body.invitation.failureCode,'SMTP_AUTH_FAILED');
  assert.equal((await readInvitation(id)).status,'failed');assert.equal((await db.query('SELECT count(*)::int count FROM app_users')).rows[0].count,2);
  delivery=async message=>({accepted:[message.to]});
  const resent=await route(usersRouter,'/:id/resend-invitation','post',{params:{id}});
  assert.equal(resent.body.invitation.status,'sent');assert.equal((await readInvitation(id)).failure_code,null);
  assert.equal((await db.query('SELECT count(*)::int count FROM app_users')).rows[0].count,2);
  assert.ok(!JSON.stringify((await db.query('SELECT * FROM audit_log')).rows).includes('secret smtp detail'));
});

test('missing SMTP and an unaccepted recipient are persisted as failed, not sent',async()=>{
  config.smtp.host='';const missing=await create();assert.equal(missing.body.invitation.failureCode,'SMTP_NOT_CONFIGURED');assert.equal(messages.length,0);
  config.smtp.host=SMTP.host;delivery=async()=>({accepted:['another@example.test']});
  const rejected=await route(usersRouter,'/:id/resend-invitation','post',{params:{id:missing.body.user.id}});
  assert.equal(rejected.body.invitation.status,'failed');assert.equal(rejected.body.invitation.failureCode,'DELIVERY_FAILED');
});

test('resend immediately revokes the old link and retains account identity, role and permissions',async()=>{
  const res=await create(),id=res.body.user.id,old=link(),before=await readUser(id);
  await db.query("UPDATE user_invitations SET expires_at=now()-interval '1 day' WHERE user_id=$1",[id]);
  await route(usersRouter,'/:id/resend-invitation','post',{params:{id}});const current=link();
  assert.notEqual(current.token,old.token);await assert.rejects(()=>verifyUserInvitation(old),{code:'INVITATION_INVALID_OR_EXPIRED'});
  assert.equal((await verifyUserInvitation(current)).companyRut,'13.848.379-7');
  const after=await readUser(id);assert.equal(after.id,before.id);assert.equal(after.role,before.role);assert.deepEqual(after.permissions,before.permissions);assert.equal(after.password_hash,before.password_hash);
});

test('verification and acceptance reject expired, foreign, disabled and suspended account links',async()=>{
  const res=await create(),id=res.body.user.id,input=link();
  await assert.rejects(()=>verifyUserInvitation({...input,tenant:OTHER}),{code:'INVITATION_INVALID_OR_EXPIRED'});
  await db.query('UPDATE app_users SET active=false WHERE id=$1',[id]);await assert.rejects(()=>acceptUserInvitation({...input,newPassword:PASSWORD}),{code:'INVITATION_INVALID_OR_EXPIRED'});
  await db.query('UPDATE app_users SET active=true WHERE id=$1',[id]);await db.query("UPDATE tenants SET status='suspended' WHERE id=$1",[TENANT]);
  await assert.rejects(()=>verifyUserInvitation(input),{code:'INVITATION_INVALID_OR_EXPIRED'});
  await db.query("UPDATE tenants SET status='active' WHERE id=$1",[TENANT]);await db.query("UPDATE user_invitations SET expires_at=now()-interval '1 second' WHERE user_id=$1",[id]);
  await assert.rejects(()=>acceptUserInvitation({...input,newPassword:PASSWORD}),{code:'INVITATION_INVALID_OR_EXPIRED'});
  assert.equal((await readUser(id)).password_hash,null);
});

test('acceptance establishes a personal password once without changing role, permissions or MFA',async()=>{
  const res=await create(),id=res.body.user.id,input=link(),reset=randomToken();
  await db.query('INSERT INTO password_reset_tokens(tenant_id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'1 hour\')',[TENANT,id,sha256(reset)]);
  await db.query('INSERT INTO user_sessions(tenant_id,user_id) VALUES($1,$2)',[TENANT,id]);
  const accepted=await route(invitationsRouter,'/accept','post',{body:{...input,newPassword:PASSWORD,confirmPassword:PASSWORD}});assert.equal(accepted.statusCode,204);
  const user=await readUser(id);assert.equal(await verifyPassword(PASSWORD,user.password_salt,user.password_hash),true);
  assert.equal(user.must_change_password,false);assert.equal(user.mfa_enabled,false);assert.equal(user.role,'consulta');assert.deepEqual(user.permissions,{modules:{trabajadores:false}});
  assert.equal((await readInvitation(id)).status,'accepted');assert.ok((await db.query('SELECT used_at FROM password_reset_tokens')).rows[0].used_at);assert.ok((await db.query('SELECT revoked_at FROM user_sessions')).rows[0].revoked_at);
  await assert.rejects(()=>acceptUserInvitation({...input,newPassword:'AnotherPassword2026!'}),{code:'INVITATION_INVALID_OR_EXPIRED'});
  await assert.rejects(()=>route(usersRouter,'/:id/resend-invitation','post',{params:{id}}),{code:'INVITATION_ALREADY_ACCEPTED'});
});

test('two concurrent consumers cannot both accept the same invitation',async()=>{
  await create();const input=link();
  const results=await Promise.allSettled([acceptUserInvitation({...input,newPassword:PASSWORD}),acceptUserInvitation({...input,newPassword:'OtherPassword2026!'})]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.code==='INVITATION_INVALID_OR_EXPIRED').length,1);
});

test('a slow SMTP result cannot overwrite a newer resend or an accepted invitation',async()=>{
  const res=await create(),id=res.body.user.id,user=await readUser(id);
  let old;
  const client={query:(sql,params)=>db.query(sql,params)};
  old=await createUserInvitation(client,{tenantId:TENANT,userId:id,requestedBy:ADMIN});
  let finish;const delivered=new Promise(resolve=>{finish=resolve;});
  const pending=sendAndRecordUserInvitation({tenantId:TENANT,user,invitation:old,requestedBy:ADMIN,deliver:()=>delivered});
  const newer=await createUserInvitation(client,{tenantId:TENANT,userId:id,requestedBy:ADMIN});
  finish({delivered:false,reason:'SMTP_AUTH_FAILED'});assert.equal((await pending).status,'pending');assert.equal((await readInvitation(id)).token_hash,sha256(newer.token));
  let complete;const late=new Promise(resolve=>{complete=resolve;});
  const sending=sendAndRecordUserInvitation({tenantId:TENANT,user,invitation:newer,requestedBy:ADMIN,deliver:()=>late});
  await acceptUserInvitation({tenant:TENANT,token:newer.token,newPassword:PASSWORD});complete({delivered:true});
  assert.equal((await sending).status,'accepted');assert.equal((await readInvitation(id)).status,'accepted');
});

test('roles and tenant isolation are enforced for creation and resends',async()=>{
  const denied=await route(usersRouter,'/','post',{auth:{role:'rrhh'}});assert.equal(denied.statusCode,403);assert.equal(messages.length,0);
  const res=await create(),id=res.body.user.id;
  const other=await route(usersRouter,'/:id/resend-invitation','post',{params:{id},auth:{tenantId:OTHER}});assert.equal(other.statusCode,404);assert.equal(messages.length,1);
  await db.query('UPDATE app_users SET active=false WHERE id=$1',[id]);await assert.rejects(()=>route(usersRouter,'/:id/resend-invitation','post',{params:{id}}),{code:'ACCOUNT_DISABLED'});
});

test('duplicate creation returns a conflict without duplicating or replacing an invitation',async()=>{
  const res=await create(),old=await readInvitation(res.body.user.id),duplicate=await create({email:'INVITE@example.test'});
  assert.equal(duplicate.statusCode,409);assert.equal(duplicate.body.error,'USER_ALREADY_EXISTS');assert.equal(messages.length,1);assert.equal((await readInvitation(res.body.user.id)).token_hash,old.token_hash);
});

test('list exposes safe invitation state for new accounts and null for legacy accounts',async()=>{
  const created=await create(),res=await route(usersRouter,'/','get');
  assert.equal(res.body.find(row=>row.id===ADMIN).invitation,null);assert.equal(res.body.find(row=>row.id===created.body.user.id).invitation.status,'sent');
  const serialized=JSON.stringify(res.body);assert.ok(!serialized.includes('token_hash'));assert.ok(!serialized.includes(link().token));assert.ok(!serialized.includes('password_hash'));
  await assert.rejects(()=>route(usersRouter,'/:id/resend-invitation','post',{params:{id:ADMIN}}),{code:'INVITATION_ALREADY_ACCEPTED'});
});

test('the public routes reject malformed input, weak passwords and mismatched confirmation',async()=>{
  assert.equal(invitationInput({tenant:TENANT,token:'x'}),null);assert.equal(invitationInput({tenant:TENANT,token:randomToken(),extra:'ignored'}).tenant,TENANT);
  assert.equal((await route(invitationsRouter,'/verify','post',{body:{tenant:TENANT,token:'bad'}})).body.error,'INVALID_INVITATION_REQUEST');
  await create();const input=link();
  assert.equal((await route(invitationsRouter,'/accept','post',{body:{...input,newPassword:'weak',confirmPassword:'weak'}})).body.error,'WEAK_PASSWORD');
  assert.equal((await route(invitationsRouter,'/accept','post',{body:{...input,newPassword:PASSWORD,confirmPassword:'different'}})).body.error,'INVITATION_PASSWORD_MISMATCH');
  assert.equal((await verifyUserInvitation(input)).email,'invite@example.test');
});

test('recovery still establishes a password and retires a previous welcome link',async()=>{
  const res=await create(),id=res.body.user.id,input=link(),token=randomToken();
  await db.query('INSERT INTO password_reset_tokens(tenant_id,user_id,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'1 hour\')',[TENANT,id,sha256(token)]);
  const recovered=await route(authRouter,'/reset-password','post',{body:{tenant:TENANT,token,newPassword:PASSWORD,confirmation:PASSWORD}});
  assert.equal(recovered.statusCode,204);assert.equal((await readInvitation(id)).status,'accepted');
  await assert.rejects(()=>verifyUserInvitation(input),{code:'INVITATION_INVALID_OR_EXPIRED'});
  assert.equal(await verifyPassword(PASSWORD,(await readUser(id)).password_salt,(await readUser(id)).password_hash),true);
});

test('personal password changes retire the invitation, and concurrent changes recheck the current password',async()=>{
  const res=await create({password:PASSWORD}),id=res.body.user.id,input=link(),session='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const changes=await Promise.all([
    route(authRouter,'/change-password','post',{auth:{userId:id,sessionId:session},body:{currentPassword:PASSWORD,newPassword:'ChangedPassword2026!'}}),
    route(authRouter,'/change-password','post',{auth:{userId:id,sessionId:session},body:{currentPassword:PASSWORD,newPassword:'SecondPassword2026!'}})
  ]);
  assert.deepEqual(changes.map(value=>value.statusCode).sort(),[204,401]);assert.equal((await readInvitation(id)).status,'accepted');
  await assert.rejects(()=>verifyUserInvitation(input),{code:'INVITATION_INVALID_OR_EXPIRED'});
});

test('accepting an API account invitation replaces its optional password while preserving enrolled MFA',async()=>{
  const res=await create({password:PASSWORD}),id=res.body.user.id,input=link();
  await db.query('UPDATE app_users SET mfa_enabled=true WHERE id=$1',[id]);
  await acceptUserInvitation({...input,newPassword:'PersonalPassword2026!'});const user=await readUser(id);
  assert.equal(user.mfa_enabled,true);assert.equal(await verifyPassword('PersonalPassword2026!',user.password_salt,user.password_hash),true);
  assert.equal(await verifyPassword(PASSWORD,user.password_salt,user.password_hash),false);assert.equal(user.must_change_password,false);
});

test('an audit failure rolls back acceptance without burning the token or changing password',async()=>{
  const res=await create(),id=res.body.user.id,input=link();
  await db.exec("ALTER TABLE audit_log ADD CONSTRAINT qa_reject_accept CHECK(action <> 'user.invitation.accepted')");
  try{await assert.rejects(()=>acceptUserInvitation({...input,newPassword:PASSWORD}));}finally{await db.exec('ALTER TABLE audit_log DROP CONSTRAINT qa_reject_accept');}
  assert.equal((await readUser(id)).password_hash,null);assert.equal((await readInvitation(id)).status,'sent');assert.equal((await verifyUserInvitation(input)).email,'invite@example.test');
});

test('creation audit failure rolls back both user and invitation before any message is sent',async()=>{
  await db.exec("ALTER TABLE audit_log ADD CONSTRAINT qa_reject_create CHECK(action <> 'user.invitation.created')");
  try{await assert.rejects(()=>create());}finally{await db.exec('ALTER TABLE audit_log DROP CONSTRAINT qa_reject_create');}
  assert.equal((await db.query('SELECT count(*)::int count FROM app_users')).rows[0].count,1);
  assert.equal((await db.query('SELECT count(*)::int count FROM user_invitations')).rows[0].count,0);assert.equal(messages.length,0);
});

test('delivery-status persistence failure remains pending and logs only a safe operational code',async()=>{
  await db.exec("ALTER TABLE audit_log ADD CONSTRAINT qa_reject_delivery CHECK(action <> 'user.invitation.delivery.sent')");
  const logs=[],logger=mock.method(console,'error',value=>logs.push(JSON.parse(value)));
  let res;
  try{res=await create();}finally{logger.mock.restore();await db.exec('ALTER TABLE audit_log DROP CONSTRAINT qa_reject_delivery');}
  assert.equal(res.statusCode,201);assert.equal(res.body.invitation.status,'pending');assert.equal((await readInvitation(res.body.user.id)).status,'pending');
  assert.deepEqual(logs,[{event:'user.invitation.delivery_status',outcome:'failed',code:'DELIVERY_STATUS_WRITE_FAILED',requestId:null}]);
  assert.ok(!JSON.stringify(logs).includes(link().token));assert.equal(messages.length,1);
});

test('migration enforces row-level tenant isolation and does not expose invitation hashes to another tenant',async()=>{
  await create();
  await db.exec('CREATE ROLE qa_invitation_reader; GRANT USAGE ON SCHEMA public TO qa_invitation_reader; GRANT SELECT ON user_invitations TO qa_invitation_reader;');
  const security=(await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='user_invitations'::regclass")).rows[0];
  assert.equal(security.relrowsecurity,true);assert.equal(security.relforcerowsecurity,true);
  await db.exec('BEGIN; SET LOCAL ROLE qa_invitation_reader;');
  try{
    await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[OTHER]);assert.equal((await db.query('SELECT * FROM user_invitations')).rows.length,0);
    await db.query("SELECT set_config('app.current_tenant_id',$1,true)",[TENANT]);assert.equal((await db.query('SELECT * FROM user_invitations')).rows.length,1);
  }finally{await db.exec('ROLLBACK');}
});

test('SMTP transport verifies accepted recipient, escapes HTML, and classifies failures without exposing secrets',async()=>{
  let message;
  const base={email:'qa@example.test',fullName:'<QA>',companyName:'Empresa & QA',companyRut:'13.848.379-7',url:'https://qa.invalid/aceptar-invitacion?token=secret&tenant=qa',smtpConfig:SMTP};
  const ok=await deliverUserInvitation({...base,createTransport:()=>({sendMail:async value=>{message=value;return{accepted:['QA@EXAMPLE.TEST']};}})});
  assert.equal(ok.delivered,true);assert.match(message.html,/&lt;QA&gt;/);assert.match(message.html,/Empresa &amp; QA/);assert.match(message.html,/token=secret&amp;tenant=qa/);
  for(const result of [{},{accepted:[]},{accepted:['other@example.test']}])assert.equal((await deliverUserInvitation({...base,createTransport:()=>({sendMail:async()=>result})})).reason,'DELIVERY_FAILED');
  for(const [code,reason]of [['EAUTH','SMTP_AUTH_FAILED'],['ETIMEDOUT','SMTP_CONNECTION_FAILED'],['UNKNOWN','DELIVERY_FAILED']])assert.deepEqual(await deliverUserInvitation({...base,createTransport:()=>({sendMail:async()=>{throw Object.assign(new Error('smtp-password-secret'),{code});}})}),{delivered:false,reason});
});

test('SMTP has a total delivery deadline and closes a stalled transport',async()=>{
  let closed=false;
  const result=await deliverUserInvitation({email:'qa@example.test',url:'https://qa.invalid',smtpConfig:SMTP,timeoutMs:5,
    createTransport:()=>({sendMail:()=>new Promise(()=>{}),close(){closed=true;}})});
  assert.deepEqual(result,{delivered:false,reason:'SMTP_CONNECTION_FAILED'});assert.equal(closed,true);
});

test('operational logging excludes caller-supplied tokens, URLs, SMTP payloads and untrusted codes',()=>{
  const lines=[];logInvitationEvent({code:'smtp-password-secret',event:'https://qa.invalid/token',outcome:PASSWORD,requestId:'https://qa.invalid/token'},line=>lines.push(JSON.parse(line)));
  assert.deepEqual(lines,[{event:'user.invitation.delivery_status',outcome:'failed',code:'DELIVERY_STATUS_WRITE_FAILED',requestId:null}]);
});
