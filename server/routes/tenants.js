import { Router } from 'express';
import { z } from 'zod';
import { pool, query, withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { hashPassword, isValidRut, normalizeEmail, normalizeRut, randomToken, sha256 } from '../security.js';
import { tenantErasureService } from '../tenant-erasure-service.js';
import { deliverAccountApproval } from '../account-approval-email.js';
import { activateInitialSubscription, createSubscriptionRequest, lockSubscriptionTenant } from '../subscriptions.js';

export const tenantsRouter=Router();
tenantsRouter.use(allowRoles('domian_admin'));

const plans={esencial:{users:3,workers:30,storage:1024},gestion:{users:8,workers:100,storage:5120},operaciones:{users:15,workers:250,storage:10240},integral:{users:30,workers:1000,storage:51200}};
const text=value=>String(value??'').trim();
const date=value=>value?String(value).slice(0,10):null;
const safeStatus=['al_dia','por_vencer','vencido','cortesia'];
const safeLifecycle=['activo','cortesia','suspension_programada','solo_lectura','baja_programada','cerrado'];
const initialPackageSchema=z.object({code:z.enum(['EXTRA_100','EXTRA_200','EXTRA_500']),quantity:z.number().int().min(1).max(1000),versionId:z.string().uuid()}).strict();
const initialPlanSchema=z.object({planCode:z.enum(['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY']).default('FREE'),versionId:z.string().uuid().optional(),packages:z.array(initialPackageSchema).max(3).default([])}).strict();
const tenantInputError=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
const tenantCreationIdempotencyKey=value=>text(value);
const validTenantCreationIdempotencyKey=value=>/^[A-Za-z0-9][A-Za-z0-9._:-]{7,191}$/.test(value);
const canonicalInitialPlan=plan=>({
 planCode:plan.planCode,
 versionId:plan.versionId||null,
 packages:[...(plan.packages||[])].map(item=>({code:item.code,quantity:item.quantity,versionId:item.versionId})).sort((left,right)=>
  `${left.code}:${left.versionId}:${left.quantity}`.localeCompare(`${right.code}:${right.versionId}:${right.quantity}`))
});
const tenantCreationPayloadHash=({companyName,rut,adminName,email,phone,initialPlan})=>sha256(JSON.stringify({
 companyName,rut:normalizeRut(rut),adminName,email,phone,initialPlan:canonicalInitialPlan(initialPlan)
}));
function initialPlanSelection(value){
 let plan;
 try{plan=initialPlanSchema.parse(value===undefined?{planCode:'FREE'}:value);}catch{throw tenantInputError('INITIAL_PLAN_INVALID','Revisa el plan inicial seleccionado.');}
 if(plan.planCode==='FREE'){
  if(plan.versionId||plan.packages.length)throw tenantInputError('INITIAL_PLAN_INVALID','Free no admite versión ni paquetes durante el alta.');
  return {planCode:'FREE',packages:[]};
 }
 if(!plan.versionId)throw tenantInputError('INITIAL_PLAN_VERSION_REQUIRED','Selecciona una versión vigente del plan pagado.');
 return plan;
}

async function tenantOr404(id,res){const row=(await query('SELECT id,company_name,rut,admin_email,phone,status,is_domian_admin,subscription_managed,created_at,updated_at FROM tenants WHERE id=$1',[id])).rows[0];if(!row){res.status(404).json({error:'TENANT_NOT_FOUND'});return null;}return row;}
function controlPayload(body={}){const planCode=text(body.planCode||'esencial'),defaults=plans[planCode];if(!defaults)return null;return {planCode,monthlyPriceClp:Math.max(0,Number(body.monthlyPriceClp)||0),setupPriceClp:Math.max(0,Number(body.setupPriceClp)||0),includedUsers:Math.max(1,Number(body.includedUsers)||defaults.users),includedWorkers:Math.max(0,Number(body.includedWorkers)||defaults.workers),storageLimitMb:Math.max(0,Number(body.storageLimitMb)||defaults.storage),enabledModules:Array.isArray(body.enabledModules)?body.enabledModules.slice(0,100):[],paymentStatus:text(body.paymentStatus||'cortesia'),renewalDate:date(body.renewalDate),discountPercent:Math.max(0,Math.min(100,Number(body.discountPercent)||0)),billingContact:text(body.billingContact).slice(0,200),accountOwner:text(body.accountOwner).slice(0,200),lifecycleStatus:text(body.lifecycleStatus||'activo'),suspensionReason:text(body.suspensionReason).slice(0,1000),graceUntil:date(body.graceUntil),readOnlyUntil:date(body.readOnlyUntil),offboardingAt:date(body.offboardingAt),onboardingStep:Math.max(1,Math.min(7,Number(body.onboardingStep)||1)),onboardingCompleted:body.onboardingCompleted===true,notes:text(body.notes).slice(0,5000)};}

tenantsRouter.get('/',async(req,res)=>{const tenants=(await query('SELECT id,company_name,rut,admin_email,phone,status,is_domian_admin,subscription_managed,created_at,updated_at FROM tenants ORDER BY is_domian_admin DESC,created_at DESC')).rows;const rows=await Promise.all(tenants.map(async tenant=>{const data=await withTenant(tenant.id,async client=>{const [profile,users,sessions,tickets,initial]=await Promise.all([client.query('SELECT plan_code,payment_status,renewal_date,lifecycle_status,onboarding_step,onboarding_completed FROM tenant_commercial_profiles WHERE tenant_id=$1',[tenant.id]),client.query('SELECT count(*)::int AS active_users FROM app_users WHERE tenant_id=$1 AND active',[tenant.id]),client.query("SELECT count(*)::int AS active_sessions,max(last_seen_at) AS last_access_at FROM user_sessions WHERE tenant_id=$1 AND revoked_at IS NULL AND expires_at>now()",[tenant.id]),client.query("SELECT count(*)::int AS open_tickets FROM tenant_support_tickets WHERE tenant_id=$1 AND status NOT IN ('resuelto','cerrado')",[tenant.id]),client.query("SELECT status FROM subscription_requests WHERE tenant_id=$1 AND type='INITIAL' ORDER BY created_at DESC LIMIT 1",[tenant.id])]);return {...(profile.rows[0]||{}),...users.rows[0],...sessions.rows[0],...tickets.rows[0],initialSubscriptionStatus:initial.rows[0]?.status||null};});return {...tenant,...data};}));res.json(rows);});

tenantsRouter.post('/',async(req,res)=>{
 const companyName=text(req.body?.companyName),rut=text(req.body?.rut),adminName=text(req.body?.adminName),email=normalizeEmail(req.body?.email),phone=text(req.body?.phone);
 let initialPlan;
 try{initialPlan=initialPlanSelection(req.body?.initialPlan);}catch(error){return res.status(error.status||400).json({error:error.code||'INITIAL_PLAN_INVALID',message:error.message});}
 if(companyName.length<3||adminName.length<3||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'INVALID_TENANT_DATA'});
 if(!isValidRut(rut))return res.status(400).json({error:'INVALID_COMPANY_RUT'});
 const rawIdempotencyKey=req.get('Idempotency-Key')??req.body?.idempotencyKey;
 const idempotencyKey=tenantCreationIdempotencyKey(rawIdempotencyKey);
 if(rawIdempotencyKey!==undefined&&rawIdempotencyKey!==null&&!validTenantCreationIdempotencyKey(idempotencyKey))return res.status(400).json({error:'TENANT_CREATION_IDEMPOTENCY_KEY_INVALID',message:'La clave de reintento debe tener entre 8 y 192 caracteres seguros.'});
 const payloadHash=idempotencyKey?tenantCreationPayloadHash({companyName,rut,adminName,email,phone,initialPlan}):null;
 const free=initialPlan.planCode==='FREE',client=await pool.connect();
 let transactionOpen=false;
 try{
  await client.query('BEGIN');transactionOpen=true;
  // The record is scoped to the authenticated platform administrator. This both
  // prevents duplicate companies on a lost response and avoids exposing a prior
  // response to another administrator.
  if(idempotencyKey){
   await client.query("SELECT set_config('app.current_tenant_id',$1,true)",[req.auth.tenantId]);
   const claimed=await client.query(`INSERT INTO tenant_creation_idempotency(actor_tenant_id,actor_user_id,idempotency_key,payload_hash)
     VALUES($1,$2,$3,$4) ON CONFLICT(actor_user_id,idempotency_key) DO NOTHING RETURNING actor_user_id`,[req.auth.tenantId,req.auth.userId,idempotencyKey,payloadHash]);
   if(!claimed.rows.length){
    const existing=(await client.query('SELECT payload_hash,response FROM tenant_creation_idempotency WHERE actor_user_id=$1 AND idempotency_key=$2 FOR UPDATE',[req.auth.userId,idempotencyKey])).rows[0];
    if(!existing)throw tenantInputError('TENANT_CREATION_IDEMPOTENCY_UNAVAILABLE','No se pudo recuperar el resultado del alta. Reintenta.',409);
    if(existing.payload_hash!==payloadHash){
     await client.query('ROLLBACK');transactionOpen=false;
     return res.status(409).json({error:'TENANT_CREATION_IDEMPOTENCY_CONFLICT',message:'La clave de reintento ya corresponde a otra alta. Genera una nueva solicitud antes de cambiar los datos.'});
    }
    if(!existing.response){
     await client.query('ROLLBACK');transactionOpen=false;
     return res.status(409).json({error:'TENANT_CREATION_IDEMPOTENCY_IN_PROGRESS',message:'El alta con esta clave aún se está completando. Espera unos segundos y reintenta.'});
    }
    await client.query('COMMIT');transactionOpen=false;
    const response=typeof existing.response==='string'?JSON.parse(existing.response):existing.response;
    return res.status(200).json({...response,idempotentReplay:true,accessRecoveryRequired:response.initialPlan?.planCode==='FREE'});
   }
  }
  const temporary=free?`${randomToken(12)}Aa1`:null,credentials=free?await hashPassword(temporary):null;
  const tenant=(await client.query(`INSERT INTO tenants(tenant_code,company_name,rut,admin_email,phone,status,subscription_managed)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,company_name,rut,status,subscription_managed`,[normalizeRut(rut),companyName,rut,email,phone,free?'active':'pending',!free])).rows[0];
  await client.query("SELECT set_config('app.current_tenant_id',$1,true)",[tenant.id]);
  const user=(await client.query(`INSERT INTO app_users(tenant_id,email,full_name,role,password_hash,password_salt,must_change_password)
    VALUES($1,$2,$3,'client_admin',$4,$5,$6) RETURNING id,email,full_name,role`,[tenant.id,email,adminName,credentials?.hash||null,credentials?.salt||null,free])).rows[0];
  const state={empresa:{nombre:companyName,rut,representante:adminName,email,tel:phone},minas:[],contratos:[],mantenciones:[],hoteles:[],firmas:[],callouts:[],trabajadores:[],asignaciones:[],hotelAsig:[],waGroups:[],contractTemplates:[],tenantUsers:[]};
  await client.query('INSERT INTO tenant_state(tenant_id,state,updated_by) VALUES($1,$2::jsonb,$3)',[tenant.id,JSON.stringify(state),user.id]);
  await client.query("INSERT INTO tenant_module_state(tenant_id,module_key,data,updated_by) SELECT $1,e.key,e.value,$3 FROM jsonb_each($2::jsonb) AS e",[tenant.id,JSON.stringify(state),user.id]);
  await client.query('INSERT INTO tenant_settings(tenant_id,branding,updated_by) VALUES($1,$2::jsonb,$3)',[tenant.id,JSON.stringify({displayName:companyName,theme:'light',accent:'#e4006e'}),user.id]);
  let subscriptionRequest=null;
  if(free)await activateInitialSubscription(client,{tenantId:tenant.id,userId:req.auth.userId});
  else subscriptionRequest=await createSubscriptionRequest(client,{tenantId:tenant.id,userId:req.auth.userId,asAdmin:true,input:{
   type:'INITIAL',planCode:initialPlan.planCode,versionId:initialPlan.versionId,packages:initialPlan.packages,
   reason:'Alta inicial seleccionada por Administración Nexo Klar.',idempotencyKey:`tenant-initial:${tenant.id}`
  }});
  await client.query("INSERT INTO tenant_commercial_profiles(tenant_id,plan_code,onboarding_step,onboarding_completed) VALUES($1,$2,1,false)",[tenant.id,free?'esencial':initialPlan.planCode]);
  await appendAudit(client,{tenantId:tenant.id,userId:req.auth.userId,entityType:'tenant',entityId:tenant.id,action:'tenant.created_by_domian_admin',newValue:{
   companyName,rut,adminEmail:email,mfaRequired:true,initialPlanCode:initialPlan.planCode,
   initialPlanVersionId:initialPlan.versionId||null,subscriptionRequestId:subscriptionRequest?.id||null,
   accountStatus:tenant.status
  }});
  const replayResponse={tenant,user,mustChangePassword:free,mfaEnrollmentRequired:true,
   initialPlan:{planCode:initialPlan.planCode,status:free?'ACTIVE':'REQUESTED',request:subscriptionRequest}};
  if(idempotencyKey){
   // The response intentionally excludes the Free temporary password. A retry can
   // prove the tenant exists without persisting or replaying a credential.
   await client.query("SELECT set_config('app.subscription_admin','true',true)");
   await client.query(`UPDATE tenant_creation_idempotency
     SET response=$3::jsonb,completed_at=now()
     WHERE actor_user_id=$1 AND idempotency_key=$2`,[req.auth.userId,idempotencyKey,JSON.stringify(replayResponse)]);
  }
  await client.query('COMMIT');transactionOpen=false;
  return res.status(201).json({...replayResponse,...(free?{temporaryPassword:temporary}:{}),idempotentReplay:false});
 }catch(error){
  if(transactionOpen){await client.query('ROLLBACK');transactionOpen=false;}
  if(error?.code==='23505')return res.status(409).json({error:'TENANT_ALREADY_EXISTS',message:'Ya existe una empresa con ese RUT.'});
  throw error;
 }finally{client.release();}
});

tenantsRouter.patch('/:id',async(req,res)=>{
  const status=req.body.status;
  if(!['active','suspended'].includes(status))return res.status(400).json({error:'INVALID_STATUS'});
  const before=await tenantOr404(req.params.id,res);
  if(!before)return;
  if(before.is_domian_admin&&status!=='active')return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});
  const {tenant:result,approved}=await withTenant(req.params.id,async client=>{
    const locked=await lockSubscriptionTenant(client,req.params.id);
    if(locked.is_domian_admin&&status!=='active')throw Object.assign(new Error('La cuenta global está protegida.'),{status:409,code:'DOMIAN_ACCOUNT_PROTECTED'});
    const approved=status==='active'&&locked.status==='pending';
    // A paid initial request must complete its independently reviewed commercial
    // workflow. Generic account activation must never consume Free or bypass it.
    if(approved&&locked.subscription_managed){
      const initialRequest=(await client.query("SELECT id,status FROM subscription_requests WHERE tenant_id=$1 AND type='INITIAL' ORDER BY created_at DESC LIMIT 1",[req.params.id])).rows[0];
      if(initialRequest&&initialRequest.status!=='EXECUTED')throw tenantInputError('SUBSCRIPTION_INITIAL_PENDING','La empresa tiene una contratación inicial sin ejecutar. No se puede activar ni consumir Free hasta resolverla explícitamente desde Planes y suscripciones.',409);
    }
    const result=(await client.query('UPDATE tenants SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,company_name,rut,admin_email,status,is_domian_admin,subscription_managed,updated_at',[req.params.id,status])).rows[0];
    // The benefit begins at first valid approval, not while registration waits.
    if(approved&&locked.subscription_managed)await activateInitialSubscription(client,{tenantId:req.params.id,userId:req.auth.userId});
    await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant',entityId:req.params.id,action:`tenant.${status}`,oldValue:locked,newValue:result});
    return {tenant:result,approved};
  });
  if(status==='suspended')await query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);
  let approvalEmail=null;
  if(approved){
    const admin=await withTenant(req.params.id,async client=>(await client.query("SELECT email,full_name FROM app_users WHERE tenant_id=$1 AND role='client_admin' AND active ORDER BY created_at LIMIT 1",[req.params.id])).rows[0]);
    if(admin){
      approvalEmail=await deliverAccountApproval({email:admin.email,fullName:admin.full_name,companyName:result.company_name}).catch(()=>({delivered:false,reason:'DELIVERY_FAILED'}));
      await withTenant(req.params.id,client=>appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant',entityId:req.params.id,action:approvalEmail.delivered?'tenant.approval_email_sent':'tenant.approval_email_failed',newValue:{recipient:admin.email,reason:approvalEmail.reason||null}}));
    }
  }
  res.json({...result,approvalEmail});
});

tenantsRouter.get('/:id/control',async(req,res)=>{const tenant=await tenantOr404(req.params.id,res);if(!tenant)return;const data=await withTenant(req.params.id,async client=>{const [profile,users,sessions,tickets,files,state,audit]=await Promise.all([client.query('SELECT * FROM tenant_commercial_profiles WHERE tenant_id=$1',[req.params.id]),client.query("SELECT count(*)::int AS active_users,count(*) FILTER (WHERE mfa_enabled)::int AS mfa_users,count(*) FILTER (WHERE failed_login_count>0 OR locked_until>now())::int AS access_alerts FROM app_users WHERE tenant_id=$1 AND active",[req.params.id]),client.query("SELECT count(*)::int AS active_sessions,max(last_seen_at) AS last_access_at FROM user_sessions WHERE tenant_id=$1 AND revoked_at IS NULL AND expires_at>now()",[req.params.id]),client.query("SELECT * FROM tenant_support_tickets WHERE tenant_id=$1 ORDER BY CASE severity WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,created_at DESC LIMIT 20",[req.params.id]),client.query("SELECT coalesce(sum(byte_size),0)::bigint AS bytes,count(*)::int AS files FROM file_objects WHERE tenant_id=$1 AND deleted_at IS NULL",[req.params.id]),client.query('SELECT updated_at FROM tenant_state WHERE tenant_id=$1',[req.params.id]),client.query('SELECT created_at,action FROM audit_log WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 8',[req.params.id])]);return {profile:profile.rows[0]||{},usage:{...users.rows[0],...sessions.rows[0],...files.rows[0]},tickets:tickets.rows,stateUpdatedAt:state.rows[0]?.updated_at||null,recentActivity:audit.rows};});const renewal=data.profile.renewal_date?new Date(data.profile.renewal_date):null,health=tenant.status!=='active'||data.profile.lifecycle_status==='cerrado'?'rojo':data.usage.access_alerts>0||data.profile.payment_status==='vencido'||(renewal&&renewal<new Date())?'amarillo':'verde';res.json({tenant,planDefaults:plans,health,...data});});

tenantsRouter.put('/:id/control',async(req,res)=>{const tenant=await tenantOr404(req.params.id,res);if(!tenant)return;if(tenant.subscription_managed)return res.status(409).json({error:'SUBSCRIPTION_MANAGED',message:'Gestiona el precio, la capacidad y el período desde Suscripciones; el perfil anterior no modifica el contrato.'});const p=controlPayload(req.body);if(!p||!safeStatus.includes(p.paymentStatus)||!safeLifecycle.includes(p.lifecycleStatus))return res.status(400).json({error:'INVALID_CONTROL_DATA'});const result=await withTenant(req.params.id,async client=>{const currentTenant=await lockSubscriptionTenant(client,req.params.id);if(currentTenant.subscription_managed)throw Object.assign(new Error('Gestiona las condiciones desde Suscripciones.'),{status:409,code:'SUBSCRIPTION_MANAGED'});const before=(await client.query('SELECT * FROM tenant_commercial_profiles WHERE tenant_id=$1',[req.params.id])).rows[0]||{};const row=(await client.query(`INSERT INTO tenant_commercial_profiles(tenant_id,plan_code,monthly_price_clp,setup_price_clp,included_users,included_workers,storage_limit_mb,enabled_modules,payment_status,renewal_date,discount_percent,billing_contact,account_owner,lifecycle_status,suspension_reason,grace_until,read_only_until,offboarding_at,onboarding_step,onboarding_completed,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) ON CONFLICT(tenant_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,monthly_price_clp=EXCLUDED.monthly_price_clp,setup_price_clp=EXCLUDED.setup_price_clp,included_users=EXCLUDED.included_users,included_workers=EXCLUDED.included_workers,storage_limit_mb=EXCLUDED.storage_limit_mb,enabled_modules=EXCLUDED.enabled_modules,payment_status=EXCLUDED.payment_status,renewal_date=EXCLUDED.renewal_date,discount_percent=EXCLUDED.discount_percent,billing_contact=EXCLUDED.billing_contact,account_owner=EXCLUDED.account_owner,lifecycle_status=EXCLUDED.lifecycle_status,suspension_reason=EXCLUDED.suspension_reason,grace_until=EXCLUDED.grace_until,read_only_until=EXCLUDED.read_only_until,offboarding_at=EXCLUDED.offboarding_at,onboarding_step=EXCLUDED.onboarding_step,onboarding_completed=EXCLUDED.onboarding_completed,notes=EXCLUDED.notes,updated_at=now() RETURNING *`,[req.params.id,p.planCode,p.monthlyPriceClp,p.setupPriceClp,p.includedUsers,p.includedWorkers,p.storageLimitMb,JSON.stringify(p.enabledModules),p.paymentStatus,p.renewalDate,p.discountPercent,p.billingContact,p.accountOwner,p.lifecycleStatus,p.suspensionReason,p.graceUntil,p.readOnlyUntil,p.offboardingAt,p.onboardingStep,p.onboardingCompleted,p.notes])).rows[0];await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant_control',entityId:req.params.id,action:'tenant.control_updated',oldValue:before,newValue:row});return row;});if(['solo_lectura','cerrado'].includes(p.lifecycleStatus))await query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);res.json(result);});

tenantsRouter.post('/:id/tickets',async(req,res)=>{const tenant=await tenantOr404(req.params.id,res);if(!tenant)return;const subject=text(req.body?.subject),severity=text(req.body?.severity||'media');if(subject.length<3||!['baja','media','alta','critica'].includes(severity))return res.status(400).json({error:'INVALID_TICKET'});const row=await withTenant(req.params.id,async client=>{const created=(await client.query('INSERT INTO tenant_support_tickets(tenant_id,subject,description,severity,owner,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[req.params.id,subject.slice(0,300),text(req.body?.description).slice(0,5000),severity,text(req.body?.owner).slice(0,200),date(req.body?.dueAt),req.auth.userId])).rows[0];await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'support_ticket',entityId:created.id,action:'tenant.support_ticket_created',newValue:created});return created;});res.status(201).json(row);});

tenantsRouter.patch('/:id/tickets/:ticketId',async(req,res)=>{const status=text(req.body?.status);if(!['abierto','en_progreso','esperando_cliente','resuelto','cerrado'].includes(status))return res.status(400).json({error:'INVALID_TICKET_STATUS'});const row=await withTenant(req.params.id,async client=>{const before=(await client.query('SELECT * FROM tenant_support_tickets WHERE id=$1 AND tenant_id=$2',[req.params.ticketId,req.params.id])).rows[0];if(!before)return null;const updated=(await client.query("UPDATE tenant_support_tickets SET status=$1,owner=$2,description=CASE WHEN $3='' THEN description ELSE description||E'\n\nSeguimiento: '||$3 END,resolved_at=CASE WHEN $1 IN ('resuelto','cerrado') THEN now() ELSE NULL END,updated_at=now() WHERE id=$4 AND tenant_id=$5 RETURNING *",[status,text(req.body?.owner).slice(0,200),text(req.body?.notes).slice(0,2000),req.params.ticketId,req.params.id])).rows[0];await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'support_ticket',entityId:updated.id,action:'tenant.support_ticket_updated',oldValue:before,newValue:updated});return updated;});if(!row)return res.status(404).json({error:'TICKET_NOT_FOUND'});res.json(row);});

tenantsRouter.post('/:id/export-backup',async(req,res)=>{const tenant=await tenantOr404(req.params.id,res);if(!tenant)return;const backup=await withTenant(req.params.id,async client=>{const [state,settings,modules,profile]=await Promise.all([client.query('SELECT state,updated_at FROM tenant_state WHERE tenant_id=$1',[req.params.id]),client.query('SELECT branding,modules,alerts,catalogs,updated_at FROM tenant_settings WHERE tenant_id=$1',[req.params.id]),client.query('SELECT module_key,data,version,updated_at FROM tenant_module_state WHERE tenant_id=$1 ORDER BY module_key',[req.params.id]),client.query('SELECT * FROM tenant_commercial_profiles WHERE tenant_id=$1',[req.params.id])]);await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant_backup',entityId:req.params.id,action:'tenant.backup_exported',newValue:{at:new Date().toISOString()}});return {format:'nexo-klar-tenant-backup-v1',exportedAt:new Date().toISOString(),tenant:{id:tenant.id,companyName:tenant.company_name,rut:tenant.rut},state:state.rows[0]?.state||{},settings:settings.rows[0]||{},modules:modules.rows,commercialProfile:profile.rows[0]||{}};});res.json(backup);});

// Global administration can recover pending cleanup after a lost response or restart.
tenantsRouter.get('/erasure-cleanups',async(req,res)=>{
  res.json(await tenantErasureService.listPending());
});
tenantsRouter.delete('/:id/data',async(req,res)=>{
  const result=await tenantErasureService.erase({tenantId:req.params.id,actorId:req.auth.userId,reasonCode:req.body?.reasonCode,confirmation:req.body?.confirmation});
  res.status(result.cleanupPending?202:200).json(result);
});
tenantsRouter.post('/erasure-cleanup/:fingerprint',async(req,res)=>{
  const result=await tenantErasureService.cleanup(text(req.params.fingerprint));
  res.status(result.cleanupPending?202:200).json(result);
});

tenantsRouter.delete('/:id',async(req,res)=>{const before=await tenantOr404(req.params.id,res);if(!before)return;if(before.is_domian_admin)return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});const row=(await query("UPDATE tenants SET status='deleted',updated_at=now() WHERE id=$1 RETURNING id,company_name,status,updated_at",[req.params.id])).rows[0];await query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);await withTenant(req.params.id,client=>appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant',entityId:req.params.id,action:'tenant.deleted',oldValue:before,newValue:row}));res.json(row);});

tenantsRouter.post('/:id/reset-admin-password',async(req,res)=>{const tenant=await tenantOr404(req.params.id,res);if(!tenant)return;if(tenant.is_domian_admin)return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});if(tenant.status==='deleted')return res.status(409).json({error:'TENANT_DELETED'});const temporary=`${randomToken(12)}Aa1`,credentials=await hashPassword(temporary);const user=await withTenant(req.params.id,async client=>{const before=(await client.query("SELECT id,email,full_name,role,active FROM app_users WHERE tenant_id=$1 AND role='client_admin' ORDER BY active DESC,created_at LIMIT 1",[req.params.id])).rows[0];if(!before)return null;const updated=(await client.query('UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=true,active=true,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$3 RETURNING id,email,full_name,role,active',[credentials.hash,credentials.salt,before.id])).rows[0];await client.query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'user',entityId:updated.id,action:'user.password_reset_by_domian',oldValue:{email:before.email,active:before.active},newValue:{mustChangePassword:true,active:true,sessionsRevoked:true}});return updated;});if(!user)return res.status(404).json({error:'TENANT_ADMIN_NOT_FOUND'});res.json({tenant:{id:tenant.id,name:tenant.company_name},user,temporaryPassword:temporary,mustChangePassword:true});});