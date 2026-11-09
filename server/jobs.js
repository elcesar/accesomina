import nodemailer from 'nodemailer';
import { config } from './config.js';
import { query, withTenant } from './db.js';
import { appendAudit } from './audit.js';
import { tenantIntegration } from './routes/settings.js';
import { processDueSubscriptionRequests, refreshSubscriptionLifecycle } from './subscriptions.js';
import { processSubscriptionNotifications, runSubscriptionNotificationTick } from './subscription-notifications.js';

const nextDate=(rule,from=new Date())=>{const d=new Date(from);if(rule==='daily')d.setUTCDate(d.getUTCDate()+1);else if(rule==='weekly')d.setUTCDate(d.getUTCDate()+7);else if(rule==='monthly')d.setUTCMonth(d.getUTCMonth()+1);else return null;return d;};
const list=value=>[...(Array.isArray(value)?value:String(value||'').split(/[;,]/))].map(x=>String(x).trim()).filter(Boolean);
const resolved=(tenant,fallback)=>tenant?(tenant.enabled?{...tenant.publicConfig,...tenant.secret}:{}):fallback;
const tenantRecipients=(state,channel)=>list((state.trabajadores||[]).map(x=>channel==='email'?x.email:x.tel));

async function deliver(tenantId,job,state){
  const configured=list(job.audience?.to||job.audience?.recipients);
  const recipients=configured.length?configured:job.audience?.scope==='tenant'?tenantRecipients(state,job.channel):[];
  if(job.channel==='report')return{status:'completed',result:{generatedAt:new Date().toISOString(),summary:{workers:(state.trabajadores||[]).length,contracts:(state.contratos||[]).length,services:(state.mantenciones||[]).length,alerts:(state.alertas||[]).length}}};
  if(!recipients.length)throw new Error('La programación no tiene destinatarios válidos');
  if(job.channel==='email'){
    const smtp=resolved(await tenantIntegration(tenantId,'smtp'),config.smtp);
    if(!smtp.host)throw new Error('Correo no configurado para la empresa');
    const transport=nodemailer.createTransport({host:smtp.host,port:Number(smtp.port||587),secure:smtp.secure===true,auth:smtp.user?{user:smtp.user,pass:smtp.pass}:undefined,connectionTimeout:15_000,socketTimeout:30_000});
    const info=await transport.sendMail({from:smtp.from||config.smtp.from,to:recipients,subject:String(job.name).slice(0,200),text:job.template});
    return{status:'sent',result:{recipients:recipients.length,providerReference:info.messageId}};
  }
  const wa=resolved(await tenantIntegration(tenantId,'whatsapp'),config.whatsapp);
  if(!wa.phoneNumberId||!wa.token)throw new Error('WhatsApp no configurado para la empresa');
  const references=[];
  for(const recipient of recipients.slice(0,250)){
    const phone=recipient.replace(/\D/g,'');if(!phone)continue;
    const response=await fetch(`https://graph.facebook.com/${wa.version||config.whatsapp.version}/${wa.phoneNumberId}/messages`,{method:'POST',headers:{authorization:`Bearer ${wa.token}`,'content-type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'text',text:{body:String(job.template).slice(0,4096)}}),signal:AbortSignal.timeout(15_000)});
    const data=await response.json();if(!response.ok)throw new Error(`WhatsApp rechazó el envío a ${phone}`);references.push(data.messages?.[0]?.id||phone);
  }
  return{status:'sent',result:{recipients:references.length,providerReferences:references}};
}

async function processTenant(tenantId){
  const due=await withTenant(tenantId,async client=>{await client.query(`UPDATE notification_jobs SET status='active',locked_at=NULL WHERE tenant_id=$1 AND status='running' AND locked_at<now()-interval '15 minutes'`,[tenantId]);return client.query(`WITH due AS (SELECT id FROM notification_jobs WHERE tenant_id=$1 AND status='active' AND next_run_at IS NOT NULL AND next_run_at<=now() ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 20) UPDATE notification_jobs j SET status='running',locked_at=now(),attempt_count=attempt_count+1,updated_at=now() FROM due WHERE j.id=due.id RETURNING j.*`,[tenantId]);});
  for(const candidate of due.rows){
    try{
      const state=await withTenant(tenantId,client=>client.query('SELECT state FROM tenant_state WHERE tenant_id=$1',[tenantId]));
      const delivered=await deliver(tenantId,candidate,state.rows[0]?.state||{}),next=nextDate(candidate.schedule_rule);
      await withTenant(tenantId,async client=>{const finalStatus=next?'active':'completed';await client.query('UPDATE notification_jobs SET status=$3,locked_at=NULL,last_run_at=now(),last_result=$4,next_run_at=$5,updated_at=now() WHERE id=$1 AND tenant_id=$2',[candidate.id,tenantId,finalStatus,JSON.stringify(delivered),next]);await appendAudit(client,{tenantId,userId:candidate.created_by,entityType:'notification_job',entityId:candidate.id,action:'notification.executed',newValue:{channel:candidate.channel,status:delivered.status,nextRunAt:next}});});
    }catch(error){await withTenant(tenantId,async client=>{await client.query(`UPDATE notification_jobs SET status='failed',locked_at=NULL,last_run_at=now(),last_result=$3,updated_at=now() WHERE id=$1 AND tenant_id=$2`,[candidate.id,tenantId,JSON.stringify({error:String(error.message).slice(0,1000)})]);await client.query(`INSERT INTO operational_events(tenant_id,source,severity,event_type,message,context) VALUES($1,'scheduler','error','notification.failed',$2,$3)`,[tenantId,String(error.message).slice(0,1000),JSON.stringify({jobId:candidate.id})]);});}
  }
}

export function startJobRunner(){
  let running=false,stopped=false;
  const tick=async()=>{if(running||stopped)return;running=true;try{
    // Legacy jobs remain independent of billing lifecycle failures.
    try{const tenants=await query("SELECT id FROM tenants WHERE status='active'");for(const tenant of tenants.rows)await processTenant(tenant.id);}catch(error){console.error('job runner failed',error);}
    try{await runSubscriptionNotificationTick({processTenant:async tenantId=>{
      try{
        const now=new Date();
        await processDueSubscriptionRequests(tenantId,{now});
        await withTenant(tenantId,client=>refreshSubscriptionLifecycle(client,tenantId,{now}));
        await processSubscriptionNotifications(tenantId,{now});
      }catch{console.error(JSON.stringify({event:'subscription.maintenance.failed',tenantId,code:'SUBSCRIPTION_MAINTENANCE_FAILED'}));}
    }});}catch{console.error(JSON.stringify({event:'subscription.maintenance.failed',code:'SUBSCRIPTION_TENANT_LIST_FAILED'}));}
  }finally{running=false;}};
  const timer=setInterval(tick,config.jobPollSeconds*1000);timer.unref();tick();
  return()=>{stopped=true;clearInterval(timer);};
}
