import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { decryptJson, encryptJson } from '../security.js';
import { normalizeBranding, validLogoObject, tenantLogoObject, INACTIVE_INTEGRATIONS } from '../branding.js';
import { readStoredFile } from './files.js';
import { sanitizeJson } from '../validation.js';

export const settingsRouter=Router();
const providers=new Set(['smtp','whatsapp','signature','erp','accreditation']);
const admins=allowRoles('domian_admin','client_admin');
const isSafeEndpoint=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!['localhost','127.0.0.1','::1'].includes(u.hostname)&&!/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname);}catch{return false;}};
const isHttps=value=>{if(!value)return true;try{return new URL(value).protocol==='https:';}catch{return false;}};
const isValidIanaTimeZone=value=>{try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format();return true;}catch{return false;}};
export async function tenantOperationalTimeZone(tenantId){return withTenant(tenantId,async client=>{const row=(await client.query('SELECT catalogs FROM tenant_settings WHERE tenant_id=$1',[tenantId])).rows[0];const value=String(row?.catalogs?.operationalTimeZone||'America/Santiago');return isValidIanaTimeZone(value)?value:'America/Santiago';});}

export async function tenantIntegration(tenantId,provider){if(INACTIVE_INTEGRATIONS.has(provider))return {enabled:false,available:false,publicConfig:{},secret:{}};return withTenant(tenantId,async client=>{const row=(await client.query('SELECT enabled,public_config,encrypted_secret FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',[tenantId,provider])).rows[0];return row?{enabled:row.enabled,publicConfig:row.public_config||{},secret:decryptJson(row.encrypted_secret)}:null;});}

settingsRouter.get('/',async(req,res)=>{const result=await withTenant(req.auth.tenantId,async client=>{const settings=(await client.query('SELECT branding,modules,alerts,catalogs,updated_at FROM tenant_settings WHERE tenant_id=$1',[req.auth.tenantId])).rows[0]||{};const integrations=(await client.query('SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at FROM tenant_integrations WHERE tenant_id=$1 ORDER BY provider',[req.auth.tenantId])).rows;return{settings,integrations};});res.json(result);});

settingsRouter.put('/',admins,async(req,res)=>{const clean=sanitizeJson(req.body||{}),incomingBranding=clean.branding||{},branding=normalizeBranding(incomingBranding),modules=Object.fromEntries(Object.entries(clean.modules||{}).filter(([,v])=>typeof v==='boolean')),alerts={warningDays:Math.min(365,Math.max(1,Number(clean.alerts?.warningDays)||30)),criticalDays:Math.min(365,Math.max(1,Number(clean.alerts?.criticalDays)||7))},catalogs={...(clean.catalogs||{})};catalogs.operationalTimeZone=String(catalogs.operationalTimeZone||'America/Santiago').trim();if(!isHttps(branding.logoUrl))return res.status(400).json({error:'INVALID_LOGO_URL'});if(!isValidIanaTimeZone(catalogs.operationalTimeZone))return res.status(400).json({error:'INVALID_OPERATIONAL_TIME_ZONE'});if(alerts.criticalDays>alerts.warningDays)return res.status(400).json({error:'INVALID_ALERT_THRESHOLDS'});if(Array.isArray(catalogs.specialties))catalogs.specialties=[...new Set(catalogs.specialties.map(x=>String(x).trim()).filter(Boolean))].slice(0,100);const row=await withTenant(req.auth.tenantId,async client=>{if(branding.logoFileId){const file=await tenantLogoObject(client,req.auth.tenantId,branding.logoFileId);if(!validLogoObject(file))throw Object.assign(new Error('Selecciona un logo PNG o JPG disponible de hasta 2 MB.'),{status:400,code:'INVALID_LOGO_FILE'});}const before=(await client.query('SELECT branding,modules,alerts,catalogs FROM tenant_settings WHERE tenant_id=$1',[req.auth.tenantId])).rows[0];const updated=(await client.query(`INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,catalogs,updated_by) VALUES($1,$2,$3,$4,$5,$6)
ON CONFLICT(tenant_id) DO UPDATE SET branding=$2,modules=$3,alerts=$4,catalogs=$5,updated_by=$6,updated_at=now() RETURNING branding,modules,alerts,catalogs,updated_at`,[req.auth.tenantId,branding,modules,alerts,catalogs,req.auth.userId])).rows[0];await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'tenant_settings',action:'settings.updated',oldValue:before,newValue:updated});return updated;});res.json(row);});

settingsRouter.put('/integrations/:provider',admins,async(req,res)=>{const provider=req.params.provider;if(INACTIVE_INTEGRATIONS.has(provider))return res.status(409).json({error:'INTEGRATION_NOT_AVAILABLE'});if(!providers.has(provider))return res.status(404).json({error:'UNKNOWN_PROVIDER'});const enabled=req.body.enabled===true,publicConfig=sanitizeJson(req.body.publicConfig||{}),secret=sanitizeJson(req.body.secret||{});if(['signature','erp','accreditation'].includes(provider)&&publicConfig.url&&!isSafeEndpoint(publicConfig.url))return res.status(400).json({error:'UNSAFE_INTEGRATION_URL'});const row=await withTenant(req.auth.tenantId,async client=>{const before=(await client.query('SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',[req.auth.tenantId,provider])).rows[0];const encrypted=Object.keys(secret).length?encryptJson(secret):null;const updated=(await client.query(`INSERT INTO tenant_integrations(tenant_id,provider,enabled,public_config,encrypted_secret,updated_by) VALUES($1,$2,$3,$4,$5,$6)
ON CONFLICT(tenant_id,provider) DO UPDATE SET enabled=$3,public_config=$4,encrypted_secret=COALESCE($5,tenant_integrations.encrypted_secret),updated_by=$6,updated_at=now() RETURNING provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at`,[req.auth.tenantId,provider,enabled,publicConfig,encrypted,req.auth.userId])).rows[0];await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'tenant_integration',entityId:null,action:'integration.configured',oldValue:before,newValue:{provider,enabled,publicConfig,configured:updated.configured}});return updated;});res.json(row);});

settingsRouter.get('/logo',async(req,res)=>{
 const file=await withTenant(req.auth.tenantId,async client=>{
  const settings=(await client.query('SELECT branding FROM tenant_settings WHERE tenant_id=$1',[req.auth.tenantId])).rows[0]
  const id=settings?.branding?.logoFileId
  if(!id)return null
  return await tenantLogoObject(client,req.auth.tenantId,id)
 })
 if(!validLogoObject(file))return res.status(404).json({error:'FILE_NOT_FOUND'})
 res.set({'Content-Type':file.content_type,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(await readStoredFile(file))
})
