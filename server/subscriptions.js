import { pool, query, withTenant } from './db.js';
import { appendAudit } from './audit.js';
import { isValidRut, normalizeRut, sha256 } from './security.js';
import { scheduleSubscriptionNotifications } from './subscription-notifications.js';

export const SUBSCRIPTION_PLAN_CODES = ['FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY'];
export const SUBSCRIPTION_PACKAGE_CODES = ['EXTRA_100','EXTRA_200','EXTRA_500'];
export const SUBSCRIPTION_TIMEZONE = 'America/Santiago';
const MAX_WORKERS = 1000000;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
const payloadHash = value => sha256(JSON.stringify(canonical(value)));
export function subscriptionError(code,message,status=409,details) { return Object.assign(new Error(message),{code,status,...(details?{details}: {})}); }
const fail=(code,message,status=409,details)=>{throw subscriptionError(code,message,status,details);};
const integer=(value,min=0,max=MAX_WORKERS)=>Number.isSafeInteger(Number(value))&&Number(value)>=min&&Number(value)<=max;
const text=value=>String(value??'').trim();
const iso=value=>value?new Date(value).toISOString():null;
const validDate=value=>value&&!Number.isNaN(new Date(value).getTime());
const money=value=>Number(value);
function key(input) { const value=text(input);if(!/^[a-zA-Z0-9_.:-]{8,160}$/.test(value))fail('SUBSCRIPTION_IDEMPOTENCY_REQUIRED','Falta una clave válida para proteger esta operación.',400);return value; }

export async function lockSubscriptionTenant(client,tenantId) {
 const tenant=(await client.query('SELECT id,subscription_managed,subscription_services,status,is_domian_admin,rut,company_name FROM tenants WHERE id=$1 FOR UPDATE',[tenantId])).rows[0];
 if(!tenant)fail('SUBSCRIPTION_COMPANY_NOT_FOUND','No encontramos la empresa.',404);
 return tenant;
}

export function countSubscriptionWorkers(records=[]) {
 if(!Array.isArray(records))fail('SUBSCRIPTION_INVALID_WORKERS','La dotación debe ser una lista válida.',400);
 return new Set(records.map((record,index)=>{
  const rut=normalizeRut(record?.rut||'');
  return rut&&isValidRut(rut) ? `rut:${rut}` : record?.id!=null ? `id:${String(record.id)}` : `unidentified:${index}`;
 })).size;
}

async function readWorkers(client,tenantId) {
 const module=(await client.query("SELECT data FROM tenant_module_state WHERE tenant_id=$1 AND module_key='trabajadores'",[tenantId])).rows[0];
 if(module)return Array.isArray(module.data)?module.data:[];
 const state=(await client.query('SELECT state FROM tenant_state WHERE tenant_id=$1',[tenantId])).rows[0];
 return Array.isArray(state?.state?.trabajadores)?state.state.trabajadores:[];
}

export function subscriptionStatus(contract,now=new Date()) {
 const at=new Date(now).getTime();
 if(at<new Date(contract.starts_at??contract.startsAt).getTime())return 'SUSPENDED';
 if(at<new Date(contract.ends_at??contract.endsAt).getTime())return 'ACTIVE';
 if((contract.plan_code??contract.planCode)!=='FREE'&&at<new Date(contract.grace_ends_at??contract.graceEndsAt).getTime())return 'GRACE_PERIOD';
 return 'SUSPENDED';
}

export async function calendarMonthsAfter(client,date,months,timezone=SUBSCRIPTION_TIMEZONE,anchorDay=null) {
 if(!validDate(date)||!integer(months,1,120))fail('SUBSCRIPTION_INVALID_PERIOD','El período indicado no es válido.',400);
 const result=await client.query(`WITH d AS (SELECT $1::timestamptz AT TIME ZONE $2 AS local), t AS
  (SELECT date_trunc('month',local)+make_interval(months=>$3::integer) AS m,local::time AS clock,
   coalesce($4::integer,extract(day FROM local)::integer) AS anchor FROM d)
  SELECT (((m+(least(anchor,extract(day FROM m+interval '1 month - 1 day')::integer)-1)*interval '1 day')::date+clock) AT TIME ZONE $2) AS value FROM t`,[iso(date),timezone,months,anchorDay]);
 return new Date(result.rows[0].value);
}

async function graceEnd(client,end,days=30,timezone=SUBSCRIPTION_TIMEZONE) {
 return new Date((await client.query("SELECT (($1::timestamptz AT TIME ZONE $3)+make_interval(days=>$2::integer)) AT TIME ZONE $3 AS value",[iso(end),days,timezone])).rows[0].value);
}

function planView(row) {
 return {code:row.code,name:row.name,versionId:row.id,version:row.version,monthlyPrice:money(row.monthly_price),netPrice:money(row.monthly_price),
  currency:row.currency,taxRate:money(row.tax_rate),workerLimit:row.worker_limit,isFree:row.code==='FREE',trialMonths:row.trial_months,
  period:row.code==='FREE'?'trial':'monthly',publicVisible:row.public_visible,recommended:row.recommended,displayOrder:row.display_order,
  description:row.description,publicFeatures:row.public_features||[],ctaText:row.cta_text,active:row.active,features:row.features,state:row.state,graceDays:row.grace_days,warningPercent:row.warning_percent,criticalPercent:row.critical_percent,allowedUpgradeTargets:row.allowed_upgrade_targets||[]};
}
function packageView(row) {
 return {code:row.code,name:row.name,versionId:row.id,version:row.version,workersQuantity:row.workers_quantity,monthlyPrice:money(row.monthly_price),
  currency:row.currency,taxRate:money(row.tax_rate),stackable:row.stackable,repeatable:row.repeatable,maxQuantity:row.max_quantity,active:row.active,displayOrder:row.display_order,state:row.state};
}
export async function getSubscriptionCatalog(client={query}, {admin=false}={}) {
 const plans=(await client.query(`SELECT * FROM subscription_plan_versions ${admin?'':"WHERE state='PUBLISHED' AND active AND public_visible"} ORDER BY display_order,version DESC`)).rows.map(planView);
 const packages=(await client.query(`SELECT * FROM subscription_package_versions ${admin?'':"WHERE state='PUBLISHED' AND active"} ORDER BY display_order,version DESC`)).rows.map(packageView);
 const free=plans.find(p=>p.code==='FREE'&&p.state==='PUBLISHED'&&p.active);
 return {plans,packages,meta:{currency:'CLP',taxPolicy:'NET_PLUS_TAX',period:'monthly',renewal:'manual',trialMonths:free?.trialMonths??null,graceDays:30,termsVersion:'2026-11-05',separateServices:['libroObra','oportunidades']}};
}

async function publishedPlan(client,code,versionId) {
 if(!SUBSCRIPTION_PLAN_CODES.includes(code))fail('SUBSCRIPTION_PLAN_INVALID','Selecciona uno de los cinco planes disponibles.',400);
 const row=(await client.query(`SELECT * FROM subscription_plan_versions WHERE code=$1 AND state='PUBLISHED' AND active ${versionId?'AND id=$2':''}`,[code,...(versionId?[versionId]:[])])).rows[0];
 if(!row)fail('SUBSCRIPTION_OFFER_CHANGED','La oferta cambió. Revisa las condiciones vigentes antes de confirmar.',409);
 return planView(row);
}
export function resolvePackageComposition(plan,items=[],catalog=[]) {
 if(!Array.isArray(items)||items.length>3)fail('SUBSCRIPTION_PACKAGES_INVALID','Revisa la composición de paquetes.',400);
 if(items.length&&plan.code!=='PUERTO_OCTAY')fail('SUBSCRIPTION_PACKAGES_PLAN','Sólo Puerto Octay permite paquetes de trabajadores.',400);
 const used=new Set();
 const packages=items.map(item=>{
  const p=catalog.find(p=>p.code===item.code&&(!item.versionId||p.versionId===item.versionId));
  if(item.versionId&&(!p||p.state!=='PUBLISHED'||p.active===false))fail('SUBSCRIPTION_OFFER_CHANGED','El precio o la disponibilidad de un paquete cambió. Revisa y confirma la propuesta.',409);
  if(!p||p.state!=='PUBLISHED'||p.active===false||used.has(p.code)||!integer(item.quantity??1,1,p.maxQuantity)||(!p.repeatable&&Number(item.quantity??1)>1))fail('SUBSCRIPTION_PACKAGE_INVALID','El paquete no está disponible o su cantidad no está permitida.',400);
  used.add(p.code);return {...p,quantity:Number(item.quantity??1)};
 });
 if(packages.length>1&&packages.some(p=>!p.stackable))fail('SUBSCRIPTION_PACKAGES_NOT_STACKABLE','Esta combinación de paquetes no está permitida.',400);
 return packages;
}
function proposal(plan,packages) {
 const totalCapacity=plan.workerLimit+packages.reduce((sum,p)=>sum+p.workersQuantity*p.quantity,0);
 const monthlyNetPrice=plan.monthlyPrice+packages.reduce((sum,p)=>sum+p.monthlyPrice*p.quantity,0);
 if(!integer(totalCapacity,1,MAX_WORKERS)||!Number.isSafeInteger(monthlyNetPrice))fail('SUBSCRIPTION_CAPACITY_INVALID','La capacidad o importe excede el máximo permitido.',400);
 if(packages.some(p=>p.currency!==plan.currency||p.taxRate!==plan.taxRate))fail('SUBSCRIPTION_PACKAGE_CURRENCY','Los paquetes deben compartir moneda e impuestos del plan.',400);
 return {plan,packages,totalCapacity,monthlyNetPrice,currency:plan.currency,taxRate:plan.taxRate,taxPolicy:'NET_PLUS_TAX',timezone:SUBSCRIPTION_TIMEZONE,graceDays:plan.code==='FREE'?0:plan.graceDays,warningPercent:plan.warningPercent,criticalPercent:plan.criticalPercent};
}

export function recommendSubscription(catalog,{workers,freeEligible=true,existingPackages=[]}={}) {
 if(!integer(workers,1,MAX_WORKERS)||!Array.isArray(existingPackages)||existingPackages.some(p=>!integer(p.quantity,1,1000)||!SUBSCRIPTION_PACKAGE_CODES.includes(p.code)))fail('SUBSCRIPTION_WORKERS_INVALID','Indica una cantidad entera de trabajadores entre 1 y 1.000.000.',400);
 workers=Number(workers);const candidates=catalog.plans.filter(p=>p.state==='PUBLISHED'&&p.active!==false&&(p.code!=='FREE'||freeEligible)).sort((a,b)=>a.workerLimit-b.workerLimit||a.displayOrder-b.displayOrder);
 let plan=existingPackages.length?null:candidates.find(p=>p.workerLimit>=workers);
 if(plan)return {...proposal(plan,[]),planCode:plan.code,workers,baseCapacity:plan.workerLimit,available:plan.workerLimit-workers,additionalPackages:[],selectionRule:'capacity_then_package_count'};
 plan=candidates.find(p=>p.code==='PUERTO_OCTAY');
 if(!plan)return {requiresQuote:true,workers,reason:'NO_VALID_COMBINATION'};
 const normalizedExisting=[];
 for(const existing of existingPackages){
  const offered=catalog.packages.find(p=>p.code===existing.code&&p.state==='PUBLISHED'&&p.active!==false);
  if(!offered)return {requiresQuote:true,workers,reason:'EXISTING_PACKAGE_NOT_OFFERED'};
  const previous=normalizedExisting.find(p=>p.code===existing.code);if(previous)previous.quantity+=existing.quantity;else normalizedExisting.push({...offered,quantity:existing.quantity});
 }
 if(normalizedExisting.some(p=>p.quantity>p.maxQuantity||!p.repeatable&&p.quantity>1)||normalizedExisting.length>1&&normalizedExisting.some(p=>!p.stackable))return {requiresQuote:true,workers,reason:'EXISTING_COMPOSITION_NOT_OFFERED'};
 // New recommendations use today's offer consistently; historical package
 // snapshots and their capacity remain unchanged until an authorized change.
 const currentCapacity=plan.workerLimit+normalizedExisting.reduce((s,p)=>s+p.workersQuantity*p.quantity,0),needed=workers-currentCapacity;
 if(needed<=0)return {...proposal(plan,normalizedExisting),planCode:plan.code,workers,baseCapacity:plan.workerLimit,available:currentCapacity-workers,additionalPackages:[],additionalOnly:true};
 const packs=catalog.packages.filter(p=>p.state==='PUBLISHED'&&p.active!==false).sort((a,b)=>a.code.localeCompare(b.code));
 // Bounded dynamic program: smallest surplus, then units, then stable code ordering.
 // Search is independent of prices, which are displayed only after a valid selection.
 const maximum=Math.min(MAX_WORKERS-plan.workerLimit,needed+Math.max(0,...packs.map(p=>p.workersQuantity)));
 let states=new Map([[0,[]]]);
 for(const pack of packs){
  const next=new Map(states);
  for(const [capacity,items]of states){
   const existingQuantity=existingPackages.filter(p=>p.code===pack.code).reduce((s,p)=>s+p.quantity,0);
   const max=pack.repeatable?Math.min(Math.max(0,pack.maxQuantity-existingQuantity),Math.ceil(maximum/pack.workersQuantity)):existingQuantity?0:1;
   for(let quantity=1;quantity<=max;quantity++){
    const cap=capacity+quantity*pack.workersQuantity;if(cap>maximum)break;
    if([...existingPackages,...items].some(p=>p.code!==pack.code)&&(!pack.stackable||[...existingPackages,...items].some(p=>!p.stackable)))continue;
    const selected=[...items,{...pack,quantity}],existing=next.get(cap);
    const units=list=>list.reduce((s,p)=>s+p.quantity,0);
    if(!existing||units(selected)<units(existing)||units(selected)===units(existing)&&JSON.stringify(selected.map(p=>p.code)).localeCompare(JSON.stringify(existing.map(p=>p.code)))<0)next.set(cap,selected);
   }
  }
  states=next;if(states.size>20000)return {requiresQuote:true,workers,reason:'SEARCH_LIMIT'};
 }
 const match=[...states.entries()].filter(([cap])=>cap>=needed).sort((a,b)=>a[0]-b[0])[0];
 if(!match)return {requiresQuote:true,workers,reason:'NO_VALID_COMBINATION'};
 const combined=normalizedExisting.map(p=>({...p}));
 for(const p of match[1]){const existing=combined.find(q=>q.code===p.code);if(existing)existing.quantity+=p.quantity;else combined.push(p);}
 const result=proposal(plan,combined);
 return {...result,planCode:plan.code,workers,baseCapacity:plan.workerLimit,available:currentCapacity+match[0]-workers,additionalPackages:match[1],additionalOnly:existingPackages.length>0,selectionRule:'capacity_then_package_count'};
}

async function currentContract(client,tenantId) {
 return (await client.query('SELECT * FROM subscription_contracts WHERE tenant_id=$1 AND is_current',[tenantId])).rows[0]||null;
}
function safeAuditValue(value) {
 if(!value||typeof value!=='object')return null;
 const fields=['code','name','version','planCode','status','contractId','reason','effectiveAt','startsAt','endsAt','type','requiresPaidActivation','workerLimit','workersQuantity','monthlyPrice','totalCapacity','trialMonths','active','displayOrder','workersAtRequest','description','ctaText','publicVisible','recommended','taxRate','graceDays','warningPercent','criticalPercent','repeatable','stackable','maxQuantity'];
 const result=Object.fromEntries(fields.filter(k=>['string','number','boolean'].includes(typeof value[k])||value[k]===null).map(k=>[k,value[k]]));
 for(const field of ['publicFeatures','allowedUpgradeTargets'])if(Array.isArray(value[field]))result[field]=value[field].filter(v=>typeof v==='string');
 return result;
}
export async function getSubscriptionAuditPage(client,tenantId,{cursor,limit=200}={}) {
 if(!integer(limit,1,200))fail('SUBSCRIPTION_AUDIT_PAGE_INVALID','El tamaño de página debe estar entre 1 y 200.',400);
 let after=null;
 if(cursor){
  try{
   if(typeof cursor!=='string'||cursor.length>512||!/^[A-Za-z0-9_-]+$/.test(cursor))throw new Error('cursor');
   after=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));
   if(!after||typeof after.at!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(after.at)||!validDate(after.at)||new Date(after.at).toISOString()!==after.at.slice(0,23)+'Z'||typeof after.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(after.id))throw new Error('cursor');
  }catch{fail('SUBSCRIPTION_AUDIT_CURSOR_INVALID','El cursor de historial no es válido.',400);}
 }
 const rows=(await client.query(`SELECT a.*,u.full_name AS actor_name,rq.requested_by,requester.full_name AS requester_name,ct.created_by AS contract_created_by,
  to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at FROM audit_log a LEFT JOIN app_users u ON u.id=a.user_id
  LEFT JOIN subscription_requests rq ON rq.id=a.entity_id AND rq.tenant_id=$1
  LEFT JOIN app_users requester ON requester.id=rq.requested_by
  LEFT JOIN subscription_contracts ct ON ct.id=a.entity_id AND ct.tenant_id=$1
  WHERE ((a.tenant_id=$1 AND a.entity_type IN('subscription','subscription_services')) OR
   (a.entity_type='subscription_catalog' AND (EXISTS(SELECT 1 FROM subscription_contracts c WHERE c.tenant_id=$1 AND c.plan_version_id=a.entity_id)
    OR EXISTS(SELECT 1 FROM subscription_contract_packages p WHERE p.tenant_id=$1 AND p.package_version_id=a.entity_id)
    OR EXISTS(SELECT 1 FROM subscription_requests r WHERE r.tenant_id=$1 AND r.target_plan_version_id=a.entity_id))))
   AND ($2::timestamptz IS NULL OR (a.created_at,a.id)<($2::timestamptz,$3::uuid))
  ORDER BY a.created_at DESC,a.id DESC LIMIT $4`,[tenantId,after?.at||null,after?.id||null,Number(limit)+1])).rows;
 const page=rows.slice(0,Number(limit)),last=page.at(-1);
 return {events:page.map(row=>({id:row.id,action:row.action,entityType:row.entity_type,entityId:row.entity_id,createdAt:iso(row.created_at),actorId:row.user_id,actorName:row.actor_name||'Sistema',requestedBy:row.requested_by||null,requesterName:row.requester_name||null,contractCreatedBy:row.contract_created_by||null,reason:row.new_value?.reason||row.old_value?.reason||'',oldValue:safeAuditValue(row.old_value),newValue:safeAuditValue(row.new_value)})),nextCursor:rows.length>Number(limit)?Buffer.from(JSON.stringify({at:last.cursor_created_at,id:last.id})).toString('base64url'):null};
}
export async function getSubscriptionSummary(client,tenantId,{now=new Date(),includeAudit=false}={}) {
 const tenant=(await client.query('SELECT id,subscription_managed,subscription_services,status,rut FROM tenants WHERE id=$1',[tenantId])).rows[0];
 if(!tenant)fail('SUBSCRIPTION_COMPANY_NOT_FOUND','No encontramos la empresa.',404);
 const history=includeAudit?await getSubscriptionAuditPage(client,tenantId):{events:[],nextCursor:null};
 const auditFields={audit:history.events,auditNextCursor:history.nextCursor};
 if(!tenant.subscription_managed)return {legacy:true,managed:false,canOperate:true,freeEligible:false,contract:null,capacity:null,packages:[],requests:[],...auditFields,daysInGraceRemaining:0,graceDaysUsed:0,separateServices:tenant.subscription_services||{}};
 const [contract,records,requestResult]=await Promise.all([currentContract(client,tenantId),readWorkers(client,tenantId),client.query('SELECT * FROM subscription_requests WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100',[tenantId])]);
 const used=countSubscriptionWorkers(records),at=new Date(now).getTime();
 if(!contract)return {legacy:false,managed:true,canOperate:false,freeEligible:false,contract:null,capacity:{base:0,additional:0,total:0,used,available:0,overCapacity:used},packages:[],requests:requestResult.rows.map(requestView),...auditFields,daysInGraceRemaining:0,graceDaysUsed:0,separateServices:tenant.subscription_services||{}};
 const status=subscriptionStatus(contract,now);
 const packages=(await client.query('SELECT * FROM subscription_contract_packages WHERE tenant_id=$1 AND subscription_id=$2 ORDER BY code',[tenantId,contract.id])).rows.map(row=>({...row.snapshot,quantity:row.quantity,startsAt:iso(row.starts_at),endsAt:iso(row.ends_at)}));
 // Coterminal packages remain effective during the principal's expressly granted grace.
 const effectivePackages=packages.filter(p=>at>=new Date(p.startsAt).getTime()&&(at<new Date(p.endsAt).getTime()||status==='GRACE_PERIOD'));
 const additional=effectivePackages.reduce((s,p)=>s+p.workersQuantity*p.quantity,0),base=contract.snapshot.plan.workerLimit,total=base+additional;
 const dayStats=(await client.query(`SELECT greatest(0,($2::timestamptz AT TIME ZONE $4)::date-($3::timestamptz AT TIME ZONE $4)::date)::integer AS remaining,
  greatest(0,($3::timestamptz AT TIME ZONE $4)::date-($1::timestamptz AT TIME ZONE $4)::date)::integer AS used,
  (($2::timestamptz AT TIME ZONE $4)::date-($1::timestamptz AT TIME ZONE $4)::date)::integer AS total,
  greatest(0,($5::timestamptz AT TIME ZONE $4)::date-($3::timestamptz AT TIME ZONE $4)::date)::integer AS grace_remaining,
  greatest(0,least(($3::timestamptz AT TIME ZONE $4)::date,($5::timestamptz AT TIME ZONE $4)::date)-($2::timestamptz AT TIME ZONE $4)::date)::integer AS grace_used`,[iso(contract.starts_at),iso(contract.ends_at),iso(now),contract.timezone,iso(contract.grace_ends_at)])).rows[0];
 return {legacy:false,managed:true,canOperate:tenant.status==='active'&&status!=='SUSPENDED',freeEligible:false,
  contract:{id:contract.id,periodId:contract.current_period_id,planCode:contract.plan_code,planName:contract.snapshot.plan.name,status,
   startsAt:iso(contract.starts_at),endsAt:iso(contract.ends_at),graceEndsAt:iso(contract.grace_ends_at),timezone:contract.timezone,
   monthlyNetPrice:contract.snapshot.monthlyNetPrice,workerLimit:base,currency:contract.snapshot.currency,taxRate:contract.snapshot.taxRate,snapshot:contract.snapshot},
  capacity:{base,additional,total,used,available:Math.max(0,total-used),overCapacity:Math.max(0,used-total),warningPercent:contract.snapshot.warningPercent??80,criticalPercent:contract.snapshot.criticalPercent??90},packages,
  daysRemaining:dayStats.remaining,daysUsed:Math.min(dayStats.used,dayStats.total),totalTrialDays:dayStats.total,
  daysInGraceRemaining:status==='GRACE_PERIOD'?dayStats.grace_remaining:0,graceDaysUsed:contract.plan_code==='FREE'?0:dayStats.grace_used,
  requests:requestResult.rows.map(requestView),...auditFields,separateServices:tenant.subscription_services||{}};
}

export async function assertSubscriptionOperational(client,tenantId,{now=new Date()}={}) {
 const summary=await getSubscriptionSummary(client,tenantId,{now});
 if(summary.managed&&!summary.canOperate)fail('SUBSCRIPTION_SUSPENDED','Tu suscripción no permite operar. Tu información se conserva; solicita la activación o renovación.',403,{status:summary.contract?.status||'NO_CONTRACT',planCode:summary.contract?.planCode||null});
 return summary;
}
export async function assertSubscriptionWorkerCapacity(client,tenantId,previousWorkers,nextWorkers,{now=new Date()}={}) {
 const summary=await assertSubscriptionOperational(client,tenantId,{now});
 if(summary.legacy)return summary;
 const previous=countSubscriptionWorkers(previousWorkers),requested=countSubscriptionWorkers(nextWorkers),limit=summary.capacity.total;
 if(requested>previous&&requested>limit)fail('SUBSCRIPTION_WORKER_LIMIT','Has alcanzado la capacidad máxima de trabajadores de tu plan.',409,{used:previous,limit,available:Math.max(0,limit-previous),requested,planCode:summary.contract.planCode});
 return summary;
}

async function audit(client,tenantId,userId,action,entityId,oldValue,newValue) {
 await appendAudit(client,{tenantId,userId,entityType:'subscription',entityId,action,oldValue,newValue});
}
async function createContract(client,{tenantId,userId,offer,start,now=new Date(),anchorDay}) {
 const timezone=offer.timezone||SUBSCRIPTION_TIMEZONE;
 const anchor=anchorDay||(await client.query('SELECT extract(day FROM $1::timestamptz AT TIME ZONE $2)::integer AS day',[iso(start),timezone])).rows[0].day;
 const end=await calendarMonthsAfter(client,start,offer.plan.code==='FREE'?offer.plan.trialMonths:1,timezone,anchor);
 const grace=offer.plan.code==='FREE'?end:await graceEnd(client,end,offer.graceDays??30,timezone);
 await client.query('UPDATE subscription_contracts SET is_current=false WHERE tenant_id=$1 AND is_current',[tenantId]);
 const contract=(await client.query(`INSERT INTO subscription_contracts(tenant_id,plan_version_id,plan_code,snapshot,starts_at,ends_at,grace_ends_at,timezone,anchor_day,created_by)
  VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10) RETURNING *`,[tenantId,offer.plan.versionId,offer.plan.code,JSON.stringify(offer),iso(start),iso(end),iso(grace),timezone,anchor,userId||null])).rows[0];
 const period=(await client.query('INSERT INTO subscription_periods(tenant_id,subscription_id,snapshot,starts_at,ends_at,grace_ends_at) VALUES($1,$2,$3::jsonb,$4,$5,$6) RETURNING id',[tenantId,contract.id,JSON.stringify(offer),iso(start),iso(end),iso(grace)])).rows[0];
 await client.query('UPDATE subscription_contracts SET current_period_id=$2 WHERE id=$1',[contract.id,period.id]);
 for(const p of offer.packages)await client.query(`INSERT INTO subscription_contract_packages(tenant_id,subscription_id,package_version_id,code,quantity,workers_quantity,monthly_price,snapshot,starts_at,ends_at)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,[tenantId,contract.id,p.versionId,p.code,p.quantity,p.workersQuantity,p.monthlyPrice,JSON.stringify(p),iso(start),iso(end)]);
 await client.query('UPDATE tenants SET subscription_managed=true WHERE id=$1',[tenantId]);
 await client.query("UPDATE subscription_notifications SET status='cancelled',updated_at=now(),claim_token=NULL WHERE tenant_id=$1 AND period_id<>$2 AND status IN('pending','processing','failed')",[tenantId,period.id]);
 await scheduleSubscriptionNotifications(client,{tenantId,subscriptionId:contract.id,periodId:period.id,now});
 return {...contract,current_period_id:period.id};
}

export async function activateFreeSubscription(client,{tenantId,userId,now=new Date()}) {
 const tenant=await lockSubscriptionTenant(client,tenantId);
 if(tenant.is_domian_admin)fail('SUBSCRIPTION_PLATFORM_PROTECTED','La administración global no consume un plan empresarial.',409);
 const current=await currentContract(client,tenantId);
 if(current){if(current.plan_code==='FREE')return getSubscriptionSummary(client,tenantId,{now});fail('SUBSCRIPTION_ALREADY_ASSIGNED','La empresa ya tiene una suscripción.',409);}
 const used=countSubscriptionWorkers(await readWorkers(client,tenantId));
 const plan=await publishedPlan(client,'FREE');if(used>plan.workerLimit)fail('SUBSCRIPTION_WORKER_LIMIT','La dotación supera el cupo Free.',409,{used,limit:plan.workerLimit});
 const fingerprint=sha256(normalizeRut(tenant.rut));
 const end=await calendarMonthsAfter(client,now,plan.trialMonths);
 const inserted=await client.query('INSERT INTO subscription_free_benefits(company_fingerprint,tenant_id,started_at,expires_at) VALUES($1,$2,$3,$4) ON CONFLICT(company_fingerprint) DO NOTHING RETURNING company_fingerprint',[fingerprint,tenantId,iso(now),iso(end)]);
 if(!inserted.rows.length)fail('SUBSCRIPTION_FREE_ALREADY_USED','Esta empresa ya utilizó su beneficio gratuito.',409);
 const contract=await createContract(client,{tenantId,userId,offer:proposal(plan,[]),start:now,now});
 await audit(client,tenantId,userId,'subscription.free.activated',contract.id,null,{planCode:'FREE',startsAt:iso(now),endsAt:iso(contract.ends_at)});
 return getSubscriptionSummary(client,tenantId,{now});
}

// Account approval must remain possible when the same company already used its
// single trial. It then needs an approved paid contract before it can operate.
export async function activateInitialSubscription(client,options) {
 try{return await activateFreeSubscription(client,options);}
 catch(error){
  if(!['SUBSCRIPTION_FREE_ALREADY_USED','SUBSCRIPTION_OFFER_CHANGED'].includes(error.code))throw error;
  const unavailable=error.code==='SUBSCRIPTION_OFFER_CHANGED';
  await client.query('UPDATE tenants SET subscription_managed=true WHERE id=$1',[options.tenantId]);
  await audit(client,options.tenantId,options.userId,unavailable?'subscription.free.unavailable':'subscription.free.previously_used',options.tenantId,null,{requiresPaidActivation:true,reason:unavailable?'La oferta Free no está activa para nuevas asignaciones.':'La empresa ya utilizó su beneficio gratuito.'});
  return {...await getSubscriptionSummary(client,options.tenantId,{now:options.now}),freeEligible:false};
 }
}

export function requestView(row) {
 return {id:row.id,tenantId:row.tenant_id,type:row.type,status:row.status,proposal:row.proposal,documents:row.documents,
  reason:row.reason,decisionReason:row.decision_reason,requestedBy:row.requested_by,reviewedBy:row.reviewed_by,approvedBy:row.approved_by,approvedAt:iso(row.approved_at),workersAtRequest:row.workers_at_request??null,
  sourceContractId:row.source_contract_id,effectiveAt:iso(row.effective_at),executedAt:iso(row.executed_at),
  resultContractId:row.result_contract_id,lastError:row.last_error,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)};
}

export async function createSubscriptionRequest(client,{tenantId,userId,input,asAdmin=false,now=new Date()}) {
 const tenant=await lockSubscriptionTenant(client,tenantId);
 if(tenant.is_domian_admin)fail('SUBSCRIPTION_PLATFORM_PROTECTED','La administración global no consume un plan empresarial.',409);
 const idempotencyKey=key(input.idempotencyKey),hash=payloadHash({...input,idempotencyKey:undefined});
 const old=(await client.query('SELECT * FROM subscription_requests WHERE tenant_id=$1 AND idempotency_key=$2',[tenantId,idempotencyKey])).rows[0];
 if(old){if(old.payload_hash!==hash)fail('SUBSCRIPTION_IDEMPOTENCY_CONFLICT','La clave ya corresponde a otra solicitud.');return requestView(old);}
 let type=text(input.type).toUpperCase();
 if(!['INITIAL','UPGRADE','DOWNGRADE','RENEWAL','PACKAGES'].includes(type))fail('SUBSCRIPTION_REQUEST_TYPE','El tipo de solicitud no es válido.',400);
 const current=await currentContract(client,tenantId);
 if(!current){if(type==='UPGRADE')type='INITIAL';if(type!=='INITIAL')fail('SUBSCRIPTION_NO_CONTRACT','Primero solicita la activación de un plan.',409);}
 if(current&&type==='INITIAL')fail('SUBSCRIPTION_ALREADY_ASSIGNED','La empresa ya tiene una suscripción.');
 const planCode=input.planCode||current?.plan_code;
 if(planCode==='FREE')fail('SUBSCRIPTION_FREE_INITIAL_ONLY','Free se activa sólo una vez en el alta válida de la empresa.',400);
 const plan=await publishedPlan(client,planCode,input.versionId);
 const packagesInput=input.packages??(current?.plan_code===planCode?current.snapshot.packages.map(p=>({code:p.code,quantity:p.quantity})):[]);
 const catalogue=await getSubscriptionCatalog(client);
 const offer={...proposal(plan,resolvePackageComposition(plan,packagesInput,catalogue.packages)),company:{id:tenant.id,name:tenant.company_name,rut:tenant.rut}};
 const workersAtRequest=countSubscriptionWorkers(await readWorkers(client,tenantId));
 if(current){
  const before=current.snapshot.totalCapacity;
  if(type==='UPGRADE'&&SUBSCRIPTION_PLAN_CODES.indexOf(plan.code)<=SUBSCRIPTION_PLAN_CODES.indexOf(current.plan_code))fail('SUBSCRIPTION_CHANGE_DIRECTION','Selecciona un plan superior.',400);
  if(type==='UPGRADE'){
   const currentPolicy=catalogue.plans.find(p=>p.code===current.plan_code)||current.snapshot.plan;
   if(!currentPolicy?.allowedUpgradeTargets.includes(plan.code))fail('SUBSCRIPTION_UPGRADE_ROUTE','El salto directo a ese plan no está habilitado. Solicita al equipo comercial configurar la transición.',409);
  }
  if(type==='DOWNGRADE'&&SUBSCRIPTION_PLAN_CODES.indexOf(plan.code)>=SUBSCRIPTION_PLAN_CODES.indexOf(current.plan_code))fail('SUBSCRIPTION_CHANGE_DIRECTION','Selecciona un plan inferior.',400);
  if(type==='RENEWAL'&&plan.code!==current.plan_code)fail('SUBSCRIPTION_CHANGE_DIRECTION','Una renovación conserva el plan; solicita el cambio por separado.',400);
  if(type==='PACKAGES'&&(current.plan_code!=='PUERTO_OCTAY'||plan.code!==current.plan_code))fail('SUBSCRIPTION_PACKAGES_PLAN','Los paquetes requieren Puerto Octay.',400);
  const used=countSubscriptionWorkers(await readWorkers(client,tenantId));
  if((type==='DOWNGRADE'||type==='RENEWAL'||offer.totalCapacity<before)&&used>offer.totalCapacity)fail('SUBSCRIPTION_DOWNGRADE_CAPACITY',`La empresa mantiene ${used} trabajadores y la capacidad solicitada es ${offer.totalCapacity}.`,409,{used,limit:offer.totalCapacity});
 }
 const reason=text(input.reason);if(reason.length<3||reason.length>2000)fail('SUBSCRIPTION_REASON_REQUIRED','Indica un motivo de entre 3 y 2.000 caracteres.',400);
 const row=(await client.query(`INSERT INTO subscription_requests(tenant_id,type,source_contract_id,target_plan_version_id,proposal,reason,requested_by,idempotency_key,payload_hash,workers_at_request)
  VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10) RETURNING *`,[tenantId,type,current?.id||null,plan.versionId,JSON.stringify(offer),reason,userId||null,idempotencyKey,hash,workersAtRequest])).rows[0];
 await audit(client,tenantId,userId,'subscription.change.requested',row.id,null,{type,proposal:offer,asAdmin,reason,workersAtRequest});
 return requestView(row);
}

const DOCUMENT_STATUSES=['DRAFT','ISSUED','ACCEPTED','PAID','CANCELLED'];
const documentDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&validDate(value)&&new Date(value).toISOString().slice(0,10)===value;
function normalizedDocuments(input={},existing={}) {
 if(!input||typeof input!=='object'||Array.isArray(input))fail('SUBSCRIPTION_DOCUMENTS_INVALID','Los documentos no son válidos.',400);
 return Object.fromEntries(['quote','purchaseOrder','invoice'].filter(name=>input[name]).map(name=>{
  const d=input[name],number=text(d.number),url=text(d.url),fileId=text(d.fileId)||url.match(/^\/api\/files\/([0-9a-f-]{36})(?:\/download)?$/i)?.[1];
  if(number.length<1||number.length>100||!fileId||!/^[0-9a-f-]{36}$/i.test(fileId))fail('SUBSCRIPTION_DOCUMENT_REQUIRED','Registra número y archivo privado de cada documento comercial.',400);
  if(name==='quote'&&d.acceptedAt&&!validDate(d.acceptedAt))fail('SUBSCRIPTION_ACCEPTANCE_REQUIRED','Revisa la fecha de aceptación de la cotización.',400);
  if(name==='quote'&&d.validUntil&&!validDate(d.validUntil))fail('SUBSCRIPTION_QUOTE_EXPIRY','Revisa la vigencia de la cotización.',400);
  const previous=existing[name],legacy=previous&&previous.number===number&&previous.fileId===fileId&&previous.netAmount===undefined;
  const metadataPresent=['netAmount','issuedAt','status','responsible','observations'].some(key=>d[key]!==undefined);
  let metadata={};
  if(!legacy||metadataPresent){
   if(typeof d.netAmount!=='number'||!integer(d.netAmount,0,1000000000000)||!documentDate(d.issuedAt)||!DOCUMENT_STATUSES.includes(d.status)||typeof d.responsible!=='string'||text(d.responsible).length<2||text(d.responsible).length>160||d.observations!==undefined&&(typeof d.observations!=='string'||text(d.observations).length>2000))fail('SUBSCRIPTION_DOCUMENT_METADATA','Completa monto neto CLP, fecha de emisión, estado y responsable válidos del documento comercial.',400);
   metadata={netAmount:Number(d.netAmount),issuedAt:d.issuedAt,status:d.status,responsible:text(d.responsible),observations:text(d.observations)};
  }
  return [name,{...(legacy?previous:{}),number,fileId,url:`/api/files/${fileId}`,...metadata,...(name==='quote'&&d.acceptedAt?{acceptedAt:iso(d.acceptedAt)}:{}),...(name==='quote'&&d.validUntil?{validUntil:iso(d.validUntil)}:{})}];
 }));
}
async function validateDocuments(client,tenantId,documents,now=new Date()) {
 for(const name of ['quote','purchaseOrder','invoice']){
  const d=documents[name];if(!d)fail('SUBSCRIPTION_DOCUMENT_REQUIRED','Completa cotización aceptada, orden de compra y factura antes de programar.');
  if(d.netAmount!==undefined){
   if(['DRAFT','CANCELLED'].includes(d.status))fail('SUBSCRIPTION_DOCUMENT_NOT_CURRENT','No puedes activar con documentos en borrador o cancelados.');
   if(name==='quote'&&d.status!=='ACCEPTED')fail('SUBSCRIPTION_ACCEPTANCE_REQUIRED','La cotización debe tener estado aceptado antes de programar.');
   const dates=(await client.query('SELECT ($1::timestamptz AT TIME ZONE $3)::date::text AS today,($2::timestamptz AT TIME ZONE $3)::date::text AS accepted',[iso(now),d.acceptedAt||null,SUBSCRIPTION_TIMEZONE])).rows[0];
   if(d.issuedAt>dates.today||name==='quote'&&dates.accepted&&d.issuedAt>dates.accepted)fail('SUBSCRIPTION_DOCUMENT_DATE','La fecha de emisión no puede ser futura ni posterior a la aceptación.');
  }
  if(name==='quote'&&!validDate(d.acceptedAt))fail('SUBSCRIPTION_ACCEPTANCE_REQUIRED','Registra la aceptación de la cotización antes de programar.');
  if(name==='quote'&&new Date(d.acceptedAt)>new Date(now))fail('SUBSCRIPTION_ACCEPTANCE_REQUIRED','La aceptación no puede estar en el futuro.');
  if(name==='quote'&&d.validUntil&&new Date(d.acceptedAt)>new Date(d.validUntil))fail('SUBSCRIPTION_QUOTE_EXPIRED','La cotización no fue aceptada durante su vigencia. Requiere una nueva oferta.');
  const file=(await client.query("SELECT id FROM file_objects WHERE id=$1 AND tenant_id=$2 AND entity_type='subscription_document' AND deleted_at IS NULL AND malware_status='clean'",[d.fileId,tenantId])).rows[0];
  if(!file)fail('SUBSCRIPTION_DOCUMENT_UNAVAILABLE','Un documento comercial no está disponible en esta empresa.',409);
 }
}

export async function executeSubscriptionRequest(client,{tenantId,requestId,userId,reason='Ejecución programada de una solicitud previamente aprobada.',now=new Date()}) {
 await lockSubscriptionTenant(client,tenantId);
 const request=(await client.query('SELECT * FROM subscription_requests WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,requestId])).rows[0];
 if(!request)fail('SUBSCRIPTION_REQUEST_NOT_FOUND','No encontramos la solicitud.',404);
 if(request.status==='EXECUTED')return requestView(request);
 if(!['SCHEDULED','EXECUTION_FAILED'].includes(request.status))fail('SUBSCRIPTION_REQUEST_STATE','La solicitud no está aprobada y programada.');
 if(new Date(request.effective_at)>new Date(now))fail('SUBSCRIPTION_NOT_DUE','Todavía no se cumple la fecha acordada.');
 const tenant=(await client.query('SELECT status FROM tenants WHERE id=$1',[tenantId])).rows[0];
 if(tenant.status!=='active')fail('SUBSCRIPTION_COMPANY_DISABLED','La empresa mantiene un bloqueo administrativo independiente.',403);
 const current=await currentContract(client,tenantId);
 if((current?.id||null)!==request.source_contract_id)fail('SUBSCRIPTION_SOURCE_CHANGED','La suscripción cambió después de revisar la solicitud. Requiere nueva revisión.');
 await validateDocuments(client,tenantId,request.documents,now);
 const used=countSubscriptionWorkers(await readWorkers(client,tenantId));
 if(used>request.proposal.totalCapacity)fail('SUBSCRIPTION_DOWNGRADE_CAPACITY',`La dotación actual (${used}) supera la capacidad acordada (${request.proposal.totalCapacity}).`,409,{used,limit:request.proposal.totalCapacity});
 const start=new Date(request.effective_at);
 const contract=await createContract(client,{tenantId,userId:userId||request.approved_by,offer:request.proposal,start,now,
  anchorDay:request.type==='RENEWAL'?current?.anchor_day:undefined});
 const result=(await client.query("UPDATE subscription_requests SET status='EXECUTED',executed_at=$3,result_contract_id=$4,last_error=NULL,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *",[tenantId,requestId,iso(now),contract.id])).rows[0];
 await audit(client,tenantId,userId||request.approved_by,request.type==='RENEWAL'?'subscription.renewed':'subscription.changed',requestId,current?{contractId:current.id}:null,{contractId:contract.id,proposal:request.proposal,reason});
 return requestView(result);
}

export async function transitionSubscriptionRequest(client,{tenantId,requestId,userId,input,now=new Date()}) {
 await lockSubscriptionTenant(client,tenantId);
 const request=(await client.query('SELECT * FROM subscription_requests WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,requestId])).rows[0];
 if(!request)fail('SUBSCRIPTION_REQUEST_NOT_FOUND','No encontramos la solicitud.',404);
 const action=text(input.action),reason=text(input.reason);
 if(reason.length<3||reason.length>2000)fail('SUBSCRIPTION_REASON_REQUIRED','Indica el motivo de la decisión.',400);
 if(action==='approve'&&request.requested_by===userId)fail('SUBSCRIPTION_SELF_APPROVAL_DENIED','La solicitud debe ser aprobada por una persona distinta de quien la creó.',403);
 if(action==='execute')return executeSubscriptionRequest(client,{tenantId,requestId,userId,reason,now});
 if(action==='documents'){
  if(!['REQUESTED','UNDER_REVIEW','APPROVED'].includes(request.status))fail('SUBSCRIPTION_REQUEST_STATE','No se pueden modificar documentos en este estado.');
  const documents={...request.documents,...normalizedDocuments(input.documents,request.documents)};
  const row=(await client.query('UPDATE subscription_requests SET documents=$3::jsonb,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *',[tenantId,requestId,JSON.stringify(documents)])).rows[0];
  await audit(client,tenantId,userId,'subscription.request.documents',requestId,{documents:request.documents},{documents,reason});
  return requestView(row);
 }
 const next={review:'UNDER_REVIEW',approve:'APPROVED',reject:'REJECTED',schedule:'SCHEDULED',cancel:'CANCELLED'}[action];
 if(!next)fail('SUBSCRIPTION_ACTION_INVALID','La acción no está disponible.',400);
 if(request.status===next)return requestView(request);
 const transitions={review:['REQUESTED'],approve:['UNDER_REVIEW'],reject:['REQUESTED','UNDER_REVIEW'],schedule:['APPROVED'],cancel:['REQUESTED','UNDER_REVIEW','APPROVED','SCHEDULED','EXECUTION_FAILED']};
 if(!transitions[action].includes(request.status))fail('SUBSCRIPTION_REQUEST_STATE','El estado de la solicitud no permite esta acción.');
 // A company user can never reach this handler; global approval is audited separately
 // from company acceptance, which must be evidenced by the accepted quote.
 let documents=input.documents?{...request.documents,...normalizedDocuments(input.documents,request.documents)}:request.documents,effective=request.effective_at;
 if(action==='schedule'){
  await validateDocuments(client,tenantId,documents,now);
  if(!validDate(input.effectiveAt))fail('SUBSCRIPTION_EFFECTIVE_DATE','Indica la fecha efectiva acordada.',400);
  effective=new Date(input.effectiveAt);
  const current=await currentContract(client,tenantId);
  if(current?.id!==request.source_contract_id&&!(current===null&&request.source_contract_id===null))fail('SUBSCRIPTION_SOURCE_CHANGED','La suscripción cambió y requiere revisión.');
  if(current&&request.type==='RENEWAL'&&new Date(now)<new Date(current.ends_at)&&effective.getTime()!==new Date(current.ends_at).getTime())fail('SUBSCRIPTION_RENEWAL_ANCHOR','La renovación anticipada comienza al terminar el período actual.');
  const reduction=current&&(request.type==='DOWNGRADE'||request.proposal.totalCapacity<current.snapshot.totalCapacity);
  if(reduction&&effective<new Date(current.ends_at))fail('SUBSCRIPTION_DOWNGRADE_DATE','La reducción se aplica al terminar el período contratado.');
  if(effective<new Date(now.getTime()-5*60_000)&&!(request.type==='RENEWAL'&&current&&effective.getTime()===new Date(current.ends_at).getTime()))fail('SUBSCRIPTION_EFFECTIVE_DATE','La fecha debe corresponder a un inicio acordado vigente.',400);
  if(current&&request.type!=='RENEWAL'&&effective<new Date(current.ends_at)&&!input.immediateChangeTerms)fail('SUBSCRIPTION_MID_PERIOD_TERMS','Un cambio inmediato necesita condiciones comerciales explícitas; no se aplica prorrateo automático.');
  if(input.immediateChangeTerms){const accepted=text(input.immediateChangeTerms);if(accepted.length<10||accepted.length>2000)fail('SUBSCRIPTION_MID_PERIOD_TERMS','Documenta las condiciones económicas del cambio inmediato.',400);documents={...documents,immediateChangeTerms:accepted};}
  const used=countSubscriptionWorkers(await readWorkers(client,tenantId));
  if(used>request.proposal.totalCapacity)fail('SUBSCRIPTION_DOWNGRADE_CAPACITY','El uso actual supera la capacidad propuesta.',409,{used,limit:request.proposal.totalCapacity});
 }
 const row=(await client.query(`UPDATE subscription_requests SET status=$3,decision_reason=$4,reviewed_by=$5,
  approved_by=CASE WHEN $3='APPROVED' THEN $5 ELSE approved_by END,approved_at=CASE WHEN $3='APPROVED' THEN $8 ELSE approved_at END,
  documents=$6::jsonb,effective_at=$7,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *`,[tenantId,requestId,next,reason,userId,JSON.stringify(documents),effective?iso(effective):null,iso(now)])).rows[0];
 await audit(client,tenantId,userId,`subscription.request.${action}`,requestId,{status:request.status},{status:next,reason,effectiveAt:iso(effective)});
 return requestView(row);
}

export async function refreshSubscriptionLifecycle(client,tenantId,{now=new Date()}={}) {
 await lockSubscriptionTenant(client,tenantId);
 const contract=await currentContract(client,tenantId);if(!contract)return null;
 const status=subscriptionStatus(contract,now);
 if(status!==contract.status){await client.query('UPDATE subscription_contracts SET status=$3 WHERE tenant_id=$1 AND id=$2',[tenantId,contract.id,status]);await audit(client,tenantId,null,'subscription.lifecycle.changed',contract.id,{status:contract.status},{status,endsAt:iso(contract.ends_at)});}
 return status;
}

export async function processDueSubscriptionRequests(tenantId,{now=new Date()}={}) {
 const requests=await withTenant(tenantId,async client=>(await client.query("SELECT id FROM subscription_requests WHERE tenant_id=$1 AND status='SCHEDULED' AND effective_at<=$2 ORDER BY effective_at,id LIMIT 50",[tenantId,iso(now)])).rows);
 let executed=0,failed=0;
 for(const request of requests){
  try{await withTenant(tenantId,client=>executeSubscriptionRequest(client,{tenantId,requestId:request.id,now}));executed++;}
  catch(error){failed++;await withTenant(tenantId,async client=>{await lockSubscriptionTenant(client,tenantId);await client.query("UPDATE subscription_requests SET status='EXECUTION_FAILED',last_error=$3,updated_at=now() WHERE tenant_id=$1 AND id=$2 AND status='SCHEDULED'",[tenantId,request.id,String(error.code||'EXECUTION_FAILED').slice(0,100)]);});}
 }
 return {executed,failed};
}

export async function withSubscriptionAdmin(fn,tenantId=null) {
 const client=await pool.connect();
 try{await client.query('BEGIN');await client.query("SELECT set_config('app.subscription_admin','true',true)");if(tenantId)await client.query("SELECT set_config('app.current_tenant_id',$1,true)",[tenantId]);const result=await fn(client);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function saveSubscriptionCatalogVersion(client,{input,userId,auditTenantId}) {
 const isPlan=input.kind==='plan',table=isPlan?'subscription_plan_versions':input.kind==='package'?'subscription_package_versions':null;
 if(!table)fail('SUBSCRIPTION_CATALOG_KIND','Indica plan o paquete.',400);
 const codes=isPlan?SUBSCRIPTION_PLAN_CODES:SUBSCRIPTION_PACKAGE_CODES;if(!codes.includes(input.code))fail('SUBSCRIPTION_CATALOG_CODE','El código de catálogo no es válido.',400);
 // Serialize publication per catalog code. Published commercial values are never edited.
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${table}:${input.code}`]);
 const previous=(await client.query(`SELECT * FROM ${table} WHERE code=$1 ORDER BY version DESC LIMIT 1`,[input.code])).rows[0];
 const price=input.monthlyPrice??previous?.monthly_price,tax=input.taxRate??previous?.tax_rate??.19;
 if(!integer(price,isPlan&&input.code==='FREE'?0:1,1000000000)||!Number.isFinite(Number(tax))||Number(tax)<0||Number(tax)>1)fail('SUBSCRIPTION_PRICE_INVALID','El precio o impuesto no es válido.',400);
 const state=input.action==='publish'?'PUBLISHED':input.action==='draft'?'DRAFT':null;if(!state)fail('SUBSCRIPTION_CATALOG_ACTION','Indica guardar borrador o publicar.',400);
 if(input.versionId&&input.versionId!==previous?.id)fail('SUBSCRIPTION_CATALOG_STALE','El catálogo cambió. Recarga antes de publicar.');
 const name=text(input.name??previous?.name);if(!name||name.length>100)fail('SUBSCRIPTION_CATALOG_NAME','Indica un nombre válido.',400);
 const active=input.active??previous?.active??true,displayOrder=Number(input.displayOrder??previous?.display_order??(isPlan?SUBSCRIPTION_PLAN_CODES.indexOf(input.code)+1:SUBSCRIPTION_PACKAGE_CODES.indexOf(input.code)+1));
 if(typeof active!=='boolean'||!integer(displayOrder,0,10000))fail('SUBSCRIPTION_CATALOG_METADATA','Revisa el estado y el orden de presentación.',400);
 if(isPlan){
  const limit=Number(input.workerLimit??previous?.worker_limit);if(!integer(limit,1))fail('SUBSCRIPTION_CAPACITY_INVALID','El cupo no es válido.',400);
  const description=text(input.description??previous?.description),ctaText=text(input.ctaText??previous?.cta_text??(input.code==='FREE'?'Comenzar gratis':'Solicitar plan'));
  const publicFeatures=input.publicFeatures??previous?.public_features??[],trialMonths=Number(input.trialMonths??previous?.trial_months??(input.code==='FREE'?6:0));
  if(description.length>2000||!ctaText||ctaText.length>80||!Array.isArray(publicFeatures)||publicFeatures.length>30||publicFeatures.some(value=>typeof value!=='string'||!text(value)||text(value).length>240))fail('SUBSCRIPTION_CATALOG_METADATA','Revisa la descripción, características públicas y texto del botón.',400);
  if(!integer(trialMonths,input.code==='FREE'?1:0,input.code==='FREE'?120:0))fail('SUBSCRIPTION_TRIAL_INVALID','Free requiere entre 1 y 120 meses calendario; los planes pagados no tienen período gratuito.',400);
  const graceDays=input.code==='FREE'?0:Number(input.graceDays??previous?.grace_days??30),warning=Number(input.warningPercent??previous?.warning_percent??80),critical=Number(input.criticalPercent??previous?.critical_percent??90);
  const allowed=input.allowedUpgradeTargets??previous?.allowed_upgrade_targets??[];
  if(!Array.isArray(allowed)||new Set(allowed).size!==allowed.length||allowed.some(code=>!SUBSCRIPTION_PLAN_CODES.includes(code)||SUBSCRIPTION_PLAN_CODES.indexOf(code)<=SUBSCRIPTION_PLAN_CODES.indexOf(input.code)))fail('SUBSCRIPTION_UPGRADE_POLICY','Las transiciones deben apuntar a planes superiores válidos.',400);
  if(!integer(graceDays,0,365)||!integer(warning,0,99)||!integer(critical,1,99)||warning>=critical)fail('SUBSCRIPTION_POLICY_INVALID','Revisa los días de gracia y umbrales de capacidad.',400);
  if(input.code==='FREE'&&Number(price)!==0)fail('SUBSCRIPTION_FREE_PRICE','Free debe conservar el precio cero.',400);
  if(state==='PUBLISHED')await client.query(`UPDATE ${table} SET state='RETIRED' WHERE code=$1 AND state='PUBLISHED'`,[input.code]);
  const result=planView((await client.query(`INSERT INTO subscription_plan_versions(code,version,name,monthly_price,tax_rate,worker_limit,trial_months,state,public_visible,recommended,display_order,description,created_by,published_at,grace_days,warning_percent,critical_percent,allowed_upgrade_targets,active,public_features,cta_text,features)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CASE WHEN $8='PUBLISHED' THEN now() END,$14,$15,$16,$17,$18,$19::jsonb,$20,$21::jsonb) RETURNING *`,[input.code,(previous?.version||0)+1,name,price,tax,limit,trialMonths,state,input.publicVisible??previous?.public_visible??true,input.recommended??previous?.recommended??false,displayOrder,description,userId,graceDays,warning,critical,allowed,active,JSON.stringify(publicFeatures.map(text)),ctaText,JSON.stringify(previous?.features??{allCore:true,separateServices:['libroObra','oportunidades']})])).rows[0]);
  if(auditTenantId)await appendAudit(client,{tenantId:auditTenantId,userId,entityType:'subscription_catalog',entityId:result.versionId,action:`subscription.catalog.${input.action}`,oldValue:previous?planView(previous):null,newValue:result});
  return result;
 }
 const workers=Number(input.workersQuantity??previous?.workers_quantity);
 if(!integer(workers,1,MAX_WORKERS))fail('SUBSCRIPTION_PACKAGE_SIZE','El paquete requiere entre 1 y 1.000.000 de trabajadores.',400);
 const repeatable=input.repeatable??previous?.repeatable??false,stackable=input.stackable??previous?.stackable??true,max=Number(input.maxQuantity??(repeatable?(previous?.max_quantity||1):1));
 if(typeof repeatable!=='boolean'||typeof stackable!=='boolean'||!integer(max,1,1000)||!repeatable&&max!==1)fail('SUBSCRIPTION_PACKAGE_QUANTITY','Revisa repetición y cantidad máxima.',400);
 if(state==='PUBLISHED')await client.query(`UPDATE ${table} SET state='RETIRED' WHERE code=$1 AND state='PUBLISHED'`,[input.code]);
 const result=packageView((await client.query(`INSERT INTO subscription_package_versions(code,version,name,workers_quantity,monthly_price,tax_rate,stackable,repeatable,max_quantity,state,display_order,created_by,published_at,active)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $10='PUBLISHED' THEN now() END,$13) RETURNING *`,[input.code,(previous?.version||0)+1,name,workers,price,tax,stackable,repeatable,max,state,displayOrder,userId,active])).rows[0]);
 if(auditTenantId)await appendAudit(client,{tenantId:auditTenantId,userId,entityType:'subscription_catalog',entityId:result.versionId,action:`subscription.catalog.${input.action}`,oldValue:previous?packageView(previous):null,newValue:result});
 return result;
}
