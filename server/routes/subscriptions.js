import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { isValidRut, isValidChilePhone, normalizeEmail, normalizeRut, sha256 } from '../security.js';
import { filesRouter, subscriptionDocumentsContext } from './files.js';
import { listSubscriptionNotifications } from '../subscription-notifications.js';
import { requireSubscriptionAdmin,requireSubscriptionCapability } from '../subscription-permissions.js';
import { createSubscriptionRequest,getSubscriptionAuditPage,getSubscriptionCatalog,getSubscriptionSummary,lockSubscriptionTenant,
 recommendSubscription,requestView,resolvePackageComposition,saveSubscriptionCatalogVersion,subscriptionError,
 transitionSubscriptionRequest,withSubscriptionAdmin } from '../subscriptions.js';

export const publicPlansRouter=Router();
export const subscriptionRouter=Router();
const id=z.string().uuid();
const packages=z.array(z.object({code:z.enum(['EXTRA_100','EXTRA_200','EXTRA_500']),quantity:z.number().int().min(1).max(1000),versionId:id.optional()}).strict()).max(3);
const requestSchema=z.object({type:z.enum(['INITIAL','UPGRADE','DOWNGRADE','RENEWAL','PACKAGES']),planCode:z.enum(['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY']).optional(),
 packages:packages.optional(),versionId:id.optional(),reason:z.string().trim().min(3).max(2000),idempotencyKey:z.string().min(8).max(160)}).strict();
const fail=(code,message,status=400,details)=>{throw subscriptionError(code,message,status,details);};
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const ownAdmin=(req,res,next)=>['client_admin','domian_admin'].includes(req.auth?.role)?next():res.status(403).json({error:'SUBSCRIPTION_PERMISSION_DENIED',message:'Sólo el administrador puede gestionar solicitudes comerciales.'});
const publicLimiter=rateLimit({windowMs:15*60000,limit:10,standardHeaders:true,legacyHeaders:false,message:{error:'SUBSCRIPTION_RATE_LIMITED',message:'Espera unos minutos antes de volver a enviar una solicitud.'}});
const recommendLimiter=rateLimit({windowMs:60000,limit:60,standardHeaders:true,legacyHeaders:false});

publicPlansRouter.get('/plans',wrap(async(req,res)=>{
 res.set('Cache-Control','no-store');res.json(await getSubscriptionCatalog());
}));
publicPlansRouter.post('/plans/recommend',recommendLimiter,wrap(async(req,res)=>{
 const input=z.object({workers:z.number().int().min(1).max(1000000),freeEligible:z.boolean().optional()}).strict().parse(req.body);
 res.json(recommendSubscription(await getSubscriptionCatalog(),input));
}));

const commercialSchema=z.object({companyName:z.string().trim().min(3).max(160),rut:z.string().trim().max(20),tradeName:z.string().trim().max(160).optional(),region:z.string().trim().max(100).optional(),commune:z.string().trim().max(100).optional(),
 contactName:z.string().trim().min(2).max(120),contactLastName:z.string().trim().min(2).max(120),position:z.string().trim().max(120).optional(),email:z.string().trim().email().max(254),phone:z.string().trim().min(1).max(32),
 workers:z.number().int().min(1).max(1000000),planCode:z.enum(['LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY']),packages:packages.default([]),versionId:id,
 displayedMonthlyNetPrice:z.number().int().min(0).max(1000000000000).optional(),acceptedTerms:z.literal(true),termsVersion:z.literal('2026-11-05'),comments:z.string().trim().max(2000).default(''),idempotencyKey:z.string().min(8).max(160)}).strict();
function commercialView(row){return {id:row.id,tenantId:row.tenant_id,companyName:row.company_name,rut:row.rut,contactName:row.contact_name,contactLastName:row.contact_last_name,email:row.contact_email,phone:row.phone,
 workers:row.workers_quantity,planCode:row.requested_plan_code,proposal:row.proposal,packages:row.proposal?.packages||[],comments:row.comments,status:row.status,linkedRequestId:row.linked_request_id,createdAt:row.created_at};}

publicPlansRouter.post('/commercial-requests',publicLimiter,wrap(async(req,res)=>{
 const input=commercialSchema.parse(req.body);
 if(!isValidRut(input.rut))fail('SUBSCRIPTION_COMPANY_RUT','Revisa el RUT de la empresa.');
 if(!isValidChilePhone(input.phone))fail('SUBSCRIPTION_CONTACT_PHONE','Revisa el teléfono de contacto.');
 const hash=sha256(JSON.stringify({...input,email:normalizeEmail(input.email),rut:normalizeRut(input.rut)}));
 const result=await withSubscriptionAdmin(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`subscription-lead:${input.idempotencyKey}`]);
  const previous=(await client.query('SELECT id,payload_hash FROM subscription_commercial_requests WHERE idempotency_key=$1',[input.idempotencyKey])).rows[0];
  if(previous){if(previous.payload_hash!==hash)fail('SUBSCRIPTION_IDEMPOTENCY_CONFLICT','La clave corresponde a otra solicitud.',409);return previous;}
  const catalog=await getSubscriptionCatalog(client),plan=catalog.plans.find(p=>p.code===input.planCode&&p.versionId===input.versionId);
  if(!plan)fail('SUBSCRIPTION_OFFER_CHANGED','La oferta cambió. Revisa y confirma las condiciones actuales.',409);
  for(const selected of input.packages){if(!selected.versionId||!catalog.packages.some(p=>p.code===selected.code&&p.versionId===selected.versionId))fail('SUBSCRIPTION_OFFER_CHANGED','El precio o la disponibilidad de un paquete cambió. Revisa y confirma la propuesta.',409);}
  const selected=resolvePackageComposition(plan,input.packages,catalog.packages),totalCapacity=plan.workerLimit+selected.reduce((s,p)=>s+p.workersQuantity*p.quantity,0),monthlyNetPrice=plan.monthlyPrice+selected.reduce((s,p)=>s+p.monthlyPrice*p.quantity,0);
  if(totalCapacity>1000000||!Number.isSafeInteger(monthlyNetPrice))fail('SUBSCRIPTION_CAPACITY_INVALID','La composición excede los límites de la oferta.',400);
  if(selected.some(p=>p.currency!==plan.currency||p.taxRate!==plan.taxRate))fail('SUBSCRIPTION_PACKAGE_CURRENCY','Los paquetes deben compartir moneda e impuestos del plan.',400);
  if(input.workers>totalCapacity)fail('SUBSCRIPTION_WORKER_LIMIT','La capacidad solicitada no cubre la dotación indicada.',409,{used:input.workers,limit:totalCapacity});
  if(input.displayedMonthlyNetPrice!==undefined&&input.displayedMonthlyNetPrice!==monthlyNetPrice)fail('SUBSCRIPTION_OFFER_CHANGED','El importe cambió. Revisa y confirma la propuesta.',409);
  const proposal={plan,packages:selected,totalCapacity,monthlyNetPrice,currency:plan.currency,taxRate:plan.taxRate,taxPolicy:'NET_PLUS_TAX',timezone:'America/Santiago',graceDays:plan.graceDays,warningPercent:plan.warningPercent,criticalPercent:plan.criticalPercent,contactDetails:{tradeName:input.tradeName,region:input.region,commune:input.commune,position:input.position}};
  return (await client.query(`INSERT INTO subscription_commercial_requests(company_name,rut,contact_name,contact_last_name,contact_email,phone,workers_quantity,requested_plan_code,proposal,comments,terms_version,idempotency_key,payload_hash)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13) RETURNING id`,[input.companyName,normalizeRut(input.rut),input.contactName,input.contactLastName,normalizeEmail(input.email),input.phone,input.workers,input.planCode,JSON.stringify(proposal),input.comments,input.termsVersion,input.idempotencyKey,hash])).rows[0];
 });
 res.status(201).json({requestId:result.id,message:'Hemos recibido tu solicitud. Nuestro equipo revisará la información y se pondrá en contacto contigo.'});
}));

subscriptionRouter.get('/subscription',wrap(async(req,res)=>{
 const canManage=['client_admin','domian_admin'].includes(req.auth.role);
 const summary=await withTenant(req.auth.tenantId,client=>getSubscriptionSummary(client,req.auth.tenantId,{includeAudit:canManage}));
 if(!canManage)summary.requests=[];
 res.set('Cache-Control','private, no-store');res.json({...summary,permissions:{canManage}});
}));
const auditPageQuery=z.object({cursor:z.string().max(512).optional(),limit:z.coerce.number().int().min(1).max(200).default(200)}).strict();
subscriptionRouter.get('/subscription/audit',ownAdmin,wrap(async(req,res)=>{
 const input=auditPageQuery.parse(req.query);res.set('Cache-Control','private, no-store');res.json(await withTenant(req.auth.tenantId,client=>getSubscriptionAuditPage(client,req.auth.tenantId,input)));
}));
subscriptionRouter.post('/subscription/requests',ownAdmin,wrap(async(req,res)=>{
 const input=requestSchema.parse(req.body);if(input.type==='INITIAL')fail('SUBSCRIPTION_PERMISSION_DENIED','Solicita un plan mediante la opción de mejora.',403);
 const request=await withTenant(req.auth.tenantId,client=>createSubscriptionRequest(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,input}));
 res.status(201).json(request);
}));
subscriptionRouter.post('/subscription/recommend',ownAdmin,wrap(async(req,res)=>{
 const input=z.object({workers:z.number().int().min(1).max(1000000)}).strict().parse(req.body);
 const result=await withTenant(req.auth.tenantId,async client=>{const summary=await getSubscriptionSummary(client,req.auth.tenantId),catalog=await getSubscriptionCatalog(client);
  return recommendSubscription(catalog,{...input,freeEligible:summary.freeEligible,existingPackages:summary.contract?.planCode==='PUERTO_OCTAY'&&summary.canOperate?summary.packages:[]});});res.json(result);
}));
subscriptionRouter.get('/subscription/notifications',ownAdmin,wrap(async(req,res)=>{
 const notifications=await withTenant(req.auth.tenantId,client=>listSubscriptionNotifications(client,{tenantId:req.auth.tenantId,userId:req.auth.userId}));res.json({notifications});
}));

subscriptionRouter.use('/subscriptions/admin',requireSubscriptionAdmin,requireSubscriptionCapability('read'));
subscriptionRouter.get('/subscriptions/admin/catalog',wrap(async(req,res)=>res.json(await getSubscriptionCatalog(undefined,{admin:true}))));
subscriptionRouter.post('/subscriptions/admin/catalog',requireSubscriptionCapability('catalog.manage'),wrap(async(req,res)=>{
 const common={code:z.string().max(40),versionId:id.optional(),action:z.enum(['draft','publish']),name:z.string().trim().min(1).max(100).optional(),monthlyPrice:z.number().int().min(0).max(1000000000).optional(),taxRate:z.number().min(0).max(1).optional(),active:z.boolean().optional(),displayOrder:z.number().int().min(0).max(10000).optional()};
 const input=z.discriminatedUnion('kind',[
  z.object({...common,kind:z.literal('plan'),workerLimit:z.number().int().min(1).max(1000000).optional(),publicVisible:z.boolean().optional(),recommended:z.boolean().optional(),description:z.string().trim().max(2000).optional(),publicFeatures:z.array(z.string().trim().min(1).max(240)).max(30).optional(),ctaText:z.string().trim().min(1).max(80).optional(),trialMonths:z.number().int().min(0).max(120).optional(),graceDays:z.number().int().min(0).max(365).optional(),warningPercent:z.number().int().min(0).max(99).optional(),criticalPercent:z.number().int().min(1).max(99).optional(),allowedUpgradeTargets:z.array(z.enum(['LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY'])).max(4).optional()}).strict(),
  z.object({...common,kind:z.literal('package'),workersQuantity:z.number().int().min(1).max(1000000).optional(),repeatable:z.boolean().optional(),stackable:z.boolean().optional(),maxQuantity:z.number().int().min(1).max(1000).optional()}).strict()
 ]).parse(req.body);
 const result=await withSubscriptionAdmin(client=>saveSubscriptionCatalogVersion(client,{input,userId:req.auth.userId,auditTenantId:req.auth.tenantId}));
 res.status(201).json(result);
}));
subscriptionRouter.get('/subscriptions/admin/companies',wrap(async(req,res)=>{
 const rows=(await query('SELECT id,company_name,rut,status,subscription_managed,subscription_services FROM tenants WHERE NOT is_domian_admin ORDER BY company_name')).rows;
 res.json({companies:rows.map(row=>({id:row.id,name:row.company_name,companyName:row.company_name,rut:row.rut,status:row.status,managed:row.subscription_managed,separateServices:row.subscription_services}))});
}));
subscriptionRouter.get('/subscriptions/admin/companies/:id',wrap(async(req,res)=>{
 const tenantId=id.parse(req.params.id);res.json(await withSubscriptionAdmin(client=>getSubscriptionSummary(client,tenantId,{includeAudit:true}),tenantId));
}));
subscriptionRouter.get('/subscriptions/admin/companies/:id/audit',wrap(async(req,res)=>{
 const tenantId=id.parse(req.params.id),input=auditPageQuery.parse(req.query);res.set('Cache-Control','private, no-store');res.json(await withSubscriptionAdmin(client=>getSubscriptionAuditPage(client,tenantId,input),tenantId));
}));
subscriptionRouter.post('/subscriptions/admin/companies/:id/requests',requireSubscriptionCapability('requests.create'),wrap(async(req,res)=>{
 const tenantId=id.parse(req.params.id),input=requestSchema.parse(req.body);
 res.status(201).json(await withSubscriptionAdmin(client=>createSubscriptionRequest(client,{tenantId,userId:req.auth.userId,input,asAdmin:true}),tenantId));
}));
subscriptionRouter.patch('/subscriptions/admin/companies/:id/requests/:requestId',(req,res,next)=>requireSubscriptionCapability(`requests.${String(req.body?.action||'invalid')}`)(req,res,next),wrap(async(req,res)=>{
 const tenantId=id.parse(req.params.id),requestId=id.parse(req.params.requestId);
 const document=z.object({number:z.string().trim().max(100),fileId:id.optional(),url:z.string().max(200).optional(),acceptedAt:z.string().max(80).optional(),validUntil:z.string().max(80).optional(),netAmount:z.number().int().min(0).max(1000000000000).optional(),issuedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),status:z.enum(['DRAFT','ISSUED','ACCEPTED','PAID','CANCELLED']).optional(),responsible:z.string().trim().min(2).max(160).optional(),observations:z.string().trim().max(2000).optional()}).strict();
 const input=z.object({action:z.enum(['review','approve','reject','schedule','execute','cancel','documents']),reason:z.string().trim().min(3).max(2000),effectiveAt:z.string().max(80).optional(),
  documents:z.object({quote:document.optional(),purchaseOrder:document.optional(),invoice:document.optional()}).strict().optional(),immediateChangeTerms:z.string().max(2000).optional(),idempotencyKey:z.string().max(160).optional()}).strict().parse(req.body);
 res.json(await withSubscriptionAdmin(client=>transitionSubscriptionRequest(client,{tenantId,requestId,userId:req.auth.userId,input}),tenantId));
}));
subscriptionRouter.patch('/subscriptions/admin/companies/:id/services',requireSubscriptionCapability('services.manage'),wrap(async(req,res)=>{
 const tenantId=id.parse(req.params.id),service=z.object({enabled:z.boolean(),endsAt:z.string().datetime().nullable().optional(),reference:z.string().trim().max(500).default('')}).strict().refine(value=>!value.enabled||value.reference.length>=3,{message:'Una licencia habilitada necesita la referencia de contratación.'});
 const input=z.object({services:z.object({libroObra:service.optional(),oportunidades:service.optional()}).strict(),reason:z.string().trim().min(3).max(2000)}).strict().parse(req.body);
 const result=await withSubscriptionAdmin(async client=>{const before=await lockSubscriptionTenant(client,tenantId);if(before.is_domian_admin)fail('SUBSCRIPTION_PLATFORM_PROTECTED','La administración global no recibe licencias empresariales.',409);
  const services={...(before.subscription_services||{}),...input.services};
  await client.query('UPDATE tenants SET subscription_services=$2::jsonb WHERE id=$1',[tenantId,JSON.stringify(services)]);
  await appendAudit(client,{tenantId,userId:req.auth.userId,entityType:'subscription_services',entityId:tenantId,action:'subscription.services.changed',oldValue:before.subscription_services,newValue:{services,reason:input.reason}});
  return services;},tenantId);
 res.json({separateServices:result});
}));
subscriptionRouter.get('/subscriptions/admin/requests',wrap(async(req,res)=>{
 const result=await withSubscriptionAdmin(async client=>{const [requests,commercial]=(await Promise.all([client.query('SELECT r.*,t.company_name,t.rut FROM subscription_requests r JOIN tenants t ON t.id=r.tenant_id ORDER BY r.created_at DESC LIMIT 500'),client.query('SELECT * FROM subscription_commercial_requests ORDER BY created_at DESC LIMIT 500')]));
  return {requests:requests.rows.map(row=>({...requestView(row),companyName:row.company_name,rut:row.rut})),commercialRequests:commercial.rows.map(commercialView)};});res.json(result);
}));
subscriptionRouter.patch('/subscriptions/admin/commercial-requests/:requestId',(req,res,next)=>requireSubscriptionCapability(...(req.body?.status==='REJECTED'?['requests.reject']:req.body?.status==='LINKED'?['requests.create','requests.review']:['requests.review']))(req,res,next),wrap(async(req,res)=>{
 const requestId=id.parse(req.params.requestId),input=z.object({tenantId:id.optional(),status:z.enum(['UNDER_REVIEW','LINKED','REJECTED']),reason:z.string().trim().min(3).max(2000)}).strict().parse(req.body);
 const result=await withSubscriptionAdmin(async client=>{
  const lead=(await client.query('SELECT * FROM subscription_commercial_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];if(!lead)fail('SUBSCRIPTION_REQUEST_NOT_FOUND','No encontramos la solicitud comercial.',404);
  if(lead.status==='LINKED'){if(input.status==='LINKED'&&lead.tenant_id===input.tenantId)return {commercialRequest:commercialView(lead),request:requestView((await client.query('SELECT * FROM subscription_requests WHERE id=$1',[lead.linked_request_id])).rows[0])};fail('SUBSCRIPTION_REQUEST_STATE','Esta solicitud ya tiene una tramitación asociada.',409);}
  let request=null;
  if(input.status==='LINKED'){
   if(!input.tenantId)fail('SUBSCRIPTION_COMPANY_REQUIRED','Selecciona la empresa verificada.');
   const tenant=await lockSubscriptionTenant(client,input.tenantId);if(normalizeRut(tenant.rut)!==normalizeRut(lead.rut))fail('SUBSCRIPTION_COMPANY_MISMATCH','El RUT de la solicitud no corresponde a la empresa seleccionada.',409);
   const current=await getSubscriptionSummary(client,tenant.id),currentRank=['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY'].indexOf(current.contract?.planCode),rank=['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY'].indexOf(lead.requested_plan_code);
   if(!lead.proposal.plan?.versionId||lead.proposal.packages.some(p=>!p.versionId))fail('SUBSCRIPTION_OFFER_CHANGED','La solicitud comercial requiere una oferta vigente y confirmada.',409);
   request=await createSubscriptionRequest(client,{tenantId:tenant.id,userId:req.auth.userId,asAdmin:true,input:{type:current.contract?(rank===currentRank?'RENEWAL':rank>currentRank?'UPGRADE':'DOWNGRADE'):'INITIAL',planCode:lead.requested_plan_code,versionId:lead.proposal.plan.versionId,packages:lead.proposal.packages.map(p=>({code:p.code,quantity:p.quantity,versionId:p.versionId})),reason:input.reason,idempotencyKey:`commercial:${lead.id}`}});
  }
  const updated=(await client.query('UPDATE subscription_commercial_requests SET status=$2,tenant_id=$3,linked_request_id=$4,updated_at=now() WHERE id=$1 RETURNING *',[requestId,input.status,input.tenantId||lead.tenant_id,request?.id||null])).rows[0];
  await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'subscription_lead',entityId:lead.id,action:'subscription.lead.updated',oldValue:{status:lead.status},newValue:{status:input.status,tenantId:input.tenantId,reason:input.reason,requestId:request?.id}});
  return {commercialRequest:commercialView(updated),request};});res.json(result);
}));

// Reuse existing scanner, storage, deduplication and private download implementation.
// Only verified platform administration may change the tenant context for this delegation.
async function delegateFiles(req,res,next,download=false){
 try{const tenantId=id.parse(req.params.id),fileId=download?id.parse(req.params.fileId):null;
  const tenant=(await query('SELECT id,is_domian_admin FROM tenants WHERE id=$1',[tenantId])).rows[0];
  if(!tenant||tenant.is_domian_admin)fail('SUBSCRIPTION_COMPANY_NOT_FOUND','No encontramos la empresa de destino.',404);
  req[subscriptionDocumentsContext]={tenantId,capabilities:[...req.subscriptionAccess.capabilities]};req.auth={...req.auth,tenantId};req.url=download?`/${fileId}`:'/';filesRouter.handle(req,res,next);
 }catch(error){next(error);}
}
subscriptionRouter.post('/subscriptions/admin/companies/:id/documents',requireSubscriptionCapability('requests.documents'),(req,res,next)=>delegateFiles(req,res,next));
subscriptionRouter.get('/subscriptions/admin/companies/:id/documents/:fileId',(req,res,next)=>delegateFiles(req,res,next,true));
