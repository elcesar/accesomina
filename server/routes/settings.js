import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { canManageTenantModules } from '../tenant-capabilities.js';
import { decryptJson, encryptJson } from '../security.js';
import { sanitizeJson } from '../validation.js';

export const settingsRouter=Router();
const providers=new Set(['smtp','whatsapp','signature','erp','accreditation']);
const admins=allowRoles('domian_admin','client_admin');
const isSafeEndpoint=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!['localhost','127.0.0.1','::1'].includes(u.hostname)&&!/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname);}catch{return false;}};
const isHttps=value=>{if(!value)return true;try{return new URL(value).protocol==='https:';}catch{return false;}};

export async function tenantIntegration(tenantId,provider){return withTenant(tenantId,async client=>{const row=(await client.query('SELECT enabled,public_config,encrypted_secret FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',[tenantId,provider])).rows[0];return row?{enabled:row.enabled,publicConfig:row.public_config||{},secret:decryptJson(row.encrypted_secret)}:null;});}

settingsRouter.get('/',async(req,res)=>{const result=await withTenant(req.auth.tenantId,async client=>{const settings=(await client.query('SELECT branding,modules,alerts,catalogs,updated_at FROM tenant_settings WHERE tenant_id=$1',[req.auth.tenantId])).rows[0]||{};const integrations=(await client.query('SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at FROM tenant_integrations WHERE tenant_id=$1 ORDER BY provider',[req.auth.tenantId])).rows;return{settings,integrations};});res.json(result);});

const hasOwn=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const isPlainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const settingsError=(code,message,status=400)=>Object.assign(new Error(message),{code,status});
const boundedDay=(value,fallback)=>{const parsed=Number(value);return Number.isFinite(parsed)&&parsed>0?Math.min(365,Math.max(1,parsed)):fallback;};
const objectField=(value,code,label)=>{if(!isPlainObject(value))throw settingsError(code,`${label} debe ser un objeto.`);return value;};
const stringField=(value,key,fallback)=>hasOwn(value,key)?String(value[key]??'').trim():fallback;

export function resolveSettingsUpdate({before={},clean={},canManageModules=false}){
  const previous=isPlainObject(before)?before:{};
  const payload=isPlainObject(clean)?clean:{};
  const previousBranding=isPlainObject(previous.branding)?previous.branding:{};
  const previousAlerts=isPlainObject(previous.alerts)?previous.alerts:{};
  const brandingInput=hasOwn(payload,'branding')?objectField(payload.branding,'INVALID_BRANDING','La identidad visual'):{};
  const alertsInput=hasOwn(payload,'alerts')?objectField(payload.alerts,'INVALID_ALERTS','Las alertas'):{};
  const branding={
    displayName:stringField(brandingInput,'displayName',String(previousBranding.displayName||'').trim()),
    theme:stringField(brandingInput,'theme',String(previousBranding.theme||'light').trim()),
    logoUrl:stringField(brandingInput,'logoUrl',String(previousBranding.logoUrl||'').trim()),
  };
  const alerts={
    warningDays:boundedDay(hasOwn(alertsInput,'warningDays')?alertsInput.warningDays:undefined,boundedDay(previousAlerts.warningDays,30)),
    criticalDays:boundedDay(hasOwn(alertsInput,'criticalDays')?alertsInput.criticalDays:undefined,boundedDay(previousAlerts.criticalDays,7)),
  };
  const catalogs=hasOwn(payload,'catalogs')
    ? {...objectField(payload.catalogs,'INVALID_CATALOGS','Los catálogos')}
    : {...(isPlainObject(previous.catalogs)?previous.catalogs:{})};

  let modules={...(isPlainObject(previous.modules)?previous.modules:{})};
  if(hasOwn(payload,'modules')){
    if(!canManageModules)throw settingsError('MODULE_SETTINGS_PERMISSION_DENIED','Sólo el administrador de esta empresa puede cambiar los módulos habilitados.',403);
    const requested=objectField(payload.modules,'INVALID_MODULE_SETTINGS','Los módulos habilitados');
    if(Object.values(requested).some(value=>typeof value!=='boolean'))throw settingsError('INVALID_MODULE_SETTINGS','Cada módulo debe tener un valor verdadero o falso.');
    modules={...requested};
  }
  if(Array.isArray(catalogs.specialties))catalogs.specialties=[...new Set(catalogs.specialties.map(value=>String(value).trim()).filter(Boolean))].slice(0,100);
  return {branding,modules,alerts,catalogs};
}

settingsRouter.put('/',admins,async(req,res)=>{
  const clean=sanitizeJson(req.body||{});
  const row=await withTenant(req.auth.tenantId,async client=>{
    const before=(await client.query('SELECT branding,modules,alerts,catalogs FROM tenant_settings WHERE tenant_id=$1',[req.auth.tenantId])).rows[0];
    const {branding,modules,alerts,catalogs}=resolveSettingsUpdate({before,clean,canManageModules:canManageTenantModules(req.auth.role)});
    if(!isHttps(branding.logoUrl))throw settingsError('INVALID_LOGO_URL','El logo debe usar una URL HTTPS.');
    if(alerts.criticalDays>alerts.warningDays)throw settingsError('INVALID_ALERT_THRESHOLDS','La alerta crítica no puede superar la alerta preventiva.');
    const updated=(await client.query(`INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,catalogs,updated_by) VALUES($1,$2,$3,$4,$5,$6)
ON CONFLICT(tenant_id) DO UPDATE SET branding=$2,modules=$3,alerts=$4,catalogs=$5,updated_by=$6,updated_at=now() RETURNING branding,modules,alerts,catalogs,updated_at`,[req.auth.tenantId,branding,modules,alerts,catalogs,req.auth.userId])).rows[0];
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'tenant_settings',action:'settings.updated',oldValue:before,newValue:updated});
    return updated;
  });
  res.json(row);
});

settingsRouter.put('/integrations/:provider',admins,async(req,res)=>{const provider=req.params.provider;if(!providers.has(provider))return res.status(404).json({error:'UNKNOWN_PROVIDER'});const enabled=req.body.enabled===true,publicConfig=sanitizeJson(req.body.publicConfig||{}),secret=sanitizeJson(req.body.secret||{});if(['signature','erp','accreditation'].includes(provider)&&publicConfig.url&&!isSafeEndpoint(publicConfig.url))return res.status(400).json({error:'UNSAFE_INTEGRATION_URL'});const row=await withTenant(req.auth.tenantId,async client=>{const before=(await client.query('SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',[req.auth.tenantId,provider])).rows[0];const encrypted=Object.keys(secret).length?encryptJson(secret):null;const updated=(await client.query(`INSERT INTO tenant_integrations(tenant_id,provider,enabled,public_config,encrypted_secret,updated_by) VALUES($1,$2,$3,$4,$5,$6)
ON CONFLICT(tenant_id,provider) DO UPDATE SET enabled=$3,public_config=$4,encrypted_secret=COALESCE($5,tenant_integrations.encrypted_secret),updated_by=$6,updated_at=now() RETURNING provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at`,[req.auth.tenantId,provider,enabled,publicConfig,encrypted,req.auth.userId])).rows[0];await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'tenant_integration',entityId:null,action:'integration.configured',oldValue:before,newValue:{provider,enabled,publicConfig,configured:updated.configured}});return updated;});res.json(row);});
