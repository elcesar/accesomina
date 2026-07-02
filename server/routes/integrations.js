import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { tenantIntegration } from './settings.js';

export const integrationsRouter=Router();
integrationsRouter.use(rateLimit({windowMs:60_000,limit:120,standardHeaders:true,legacyHeaders:false}));
const senderRoles=allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion');

async function record(req,{provider,eventType,entityType,entityId,requestPayload,responsePayload,status,providerReference,errorMessage}){
  return withTenant(req.auth.tenantId,async client=>{
    const result=await client.query(`INSERT INTO integration_events (tenant_id,user_id,provider,event_type,entity_type,entity_id,request_payload,response_payload,status,provider_reference,error_message)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11) RETURNING id,status,provider_reference,created_at`,
      [req.auth.tenantId,req.auth.userId,provider,eventType,entityType||null,entityId||null,JSON.stringify(requestPayload||{}),JSON.stringify(responsePayload||{}),status,providerReference||null,errorMessage||null]);
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'integration',entityId:result.rows[0].id,action:`${provider}.${eventType}`,newValue:{status,entityType,entityId,providerReference}});
    return result.rows[0];
  });
}

function resolvedConfig(tenant,globalConfig){return tenant?(tenant.enabled?{...tenant.publicConfig,...tenant.secret}:{}):globalConfig;}

integrationsRouter.post('/email',senderRoles,async(req,res)=>{
  const {to,subject,text,html,entityType,entityId}=req.body,tenant=await tenantIntegration(req.auth.tenantId,'smtp'),smtp=resolvedConfig(tenant,config.smtp);
  if(!smtp.host)return res.status(503).json({error:'EMAIL_NOT_CONFIGURED'});
  if(!Array.isArray(to)||!to.length||!subject||(!text&&!html))return res.status(400).json({error:'INVALID_EMAIL_REQUEST'});
  const transport=nodemailer.createTransport({host:smtp.host,port:Number(smtp.port||587),secure:smtp.secure===true,auth:smtp.user?{user:smtp.user,pass:smtp.pass}:undefined,connectionTimeout:15_000,greetingTimeout:15_000,socketTimeout:30_000});
  try{
    const info=await transport.sendMail({from:smtp.from||config.smtp.from,to,subject:String(subject).slice(0,200),text,html});
    const event=await record(req,{provider:'smtp',eventType:'email.sent',entityType,entityId,requestPayload:{to,subject},responsePayload:{messageId:info.messageId},status:'sent',providerReference:info.messageId});res.status(202).json(event);
  }catch(error){await record(req,{provider:'smtp',eventType:'email.failed',entityType,entityId,requestPayload:{to,subject},status:'failed',errorMessage:error.message});throw error;}
});

integrationsRouter.post('/whatsapp',senderRoles,async(req,res)=>{
  const {to,message,entityType,entityId}=req.body,phone=String(to||'').replace(/\D/g,''),tenant=await tenantIntegration(req.auth.tenantId,'whatsapp'),wa=resolvedConfig(tenant,config.whatsapp);
  if(!wa.phoneNumberId||!wa.token)return res.status(503).json({error:'WHATSAPP_NOT_CONFIGURED'});
  if(!phone||!message)return res.status(400).json({error:'INVALID_WHATSAPP_REQUEST'});
  const payload={messaging_product:'whatsapp',to:phone,type:'text',text:{body:String(message).slice(0,4096)}};
  const response=await fetch(`https://graph.facebook.com/${wa.version||config.whatsapp.version}/${wa.phoneNumberId}/messages`,{method:'POST',headers:{authorization:`Bearer ${wa.token}`,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15_000)});
  const data=await response.json(),status=response.ok?'sent':'failed',reference=data.messages?.[0]?.id;
  const event=await record(req,{provider:'whatsapp',eventType:`message.${status}`,entityType,entityId,requestPayload:{to:phone},responsePayload:data,status,providerReference:reference,errorMessage:response.ok?null:JSON.stringify(data)});res.status(response.ok?202:502).json(event);
});

async function webhook(req,res,provider,globalConfig){
  const tenant=await tenantIntegration(req.auth.tenantId,provider),entry=resolvedConfig(tenant,globalConfig);
  if(!entry.url)return res.status(503).json({error:`${provider.toUpperCase()}_NOT_CONFIGURED`});
  const response=await fetch(entry.url,{method:'POST',headers:{'content-type':'application/json',...(entry.token?{authorization:`Bearer ${entry.token}`}:{})},body:JSON.stringify({...req.body,tenantId:req.auth.tenantId,requestedBy:req.auth.userId}),signal:AbortSignal.timeout(15_000)});
  const text=await response.text(),payload={status:response.status,body:text.slice(0,4000)};
  const event=await record(req,{provider,eventType:response.ok?'request.sent':'request.failed',entityType:req.body.entityType,entityId:req.body.entityId,requestPayload:req.body,responsePayload:payload,status:response.ok?'sent':'failed',errorMessage:response.ok?null:text.slice(0,1000)});res.status(response.ok?202:502).json(event);
}
integrationsRouter.post('/signature',senderRoles,(req,res)=>webhook(req,res,'signature',config.integrations.signature));
integrationsRouter.post('/erp',senderRoles,(req,res)=>webhook(req,res,'erp',config.integrations.erp));
integrationsRouter.post('/accreditation',senderRoles,(req,res)=>webhook(req,res,'accreditation',config.integrations.accreditation));
integrationsRouter.get('/events',async(req,res)=>{const result=await withTenant(req.auth.tenantId,client=>client.query('SELECT id,provider,event_type,entity_type,entity_id,status,provider_reference,error_message,created_at FROM integration_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200',[req.auth.tenantId]));res.json(result.rows);});
