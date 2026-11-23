import { z } from 'zod';
import { appendAudit } from './audit.js';
import { resolveSubscriptionAccess } from './subscription-permissions.js';

const reason=z.string().trim().min(3).max(2000);
export const subscriptionOperatorInput=z.object({profile:z.enum(['COMMERCIAL','OPERATIONS']).nullable(),reason}).strict();
export const subscriptionPolicyInput=z.object({
 kind:z.enum(['CANCELLATION','RETENTION']),status:z.enum(['DRAFT','APPROVED']),
 noticeDays:z.number().int().min(0).max(36500).nullable().optional(),
 retentionDays:z.number().int().min(0).max(36500).nullable().optional(),
 reference:z.string().trim().max(2000).default(''),reason,
 automaticDeletion:z.literal(false).default(false),expectedVersion:z.number().int().nonnegative().default(0)
}).strict().superRefine((input,ctx)=>{
 if(input.status==='APPROVED') {
  if(input.reference.length<3)ctx.addIssue({code:'custom',path:['reference'],message:'Indica la referencia de aprobación.'});
  const field=input.kind==='CANCELLATION'?'noticeDays':'retentionDays';
  if(input[field]===null||input[field]===undefined)ctx.addIssue({code:'custom',path:[field],message:'Indica un plazo aprobado explícitamente.'});
 }
});
function fail(status,code,message) { throw Object.assign(new Error(message),{status,code}); }
async function authorize(client,actor,capability) {
 const access=await resolveSubscriptionAccess(client,actor);
 if(!access.capabilities.includes(capability))fail(403,'SUBSCRIPTION_PERMISSION_DENIED','No tienes autorización para esta acción.');
 return access;
}
const operatorView=row=>({userId:row.id||row.user_id,name:row.full_name,email:row.email,role:row.role,active:row.active,profile:row.revoked_at?null:row.profile||null,grantedAt:row.granted_at||null,revokedAt:row.revoked_at||null});
const policyView=row=>({id:row.id,kind:row.kind,version:Number(row.version),status:row.status,noticeDays:row.notice_days,retentionDays:row.retention_days,reference:row.reference,reason:row.reason,automaticDeletion:false,createdBy:row.created_by,createdAt:row.created_at});

export async function listSubscriptionOperators(client,actor) {
 await authorize(client,actor,'operators.manage');
 return (await client.query(`SELECT u.id,u.full_name,u.email,u.role,u.active,p.profile,p.granted_at,p.revoked_at
  FROM app_users u LEFT JOIN subscription_operator_profiles p ON p.tenant_id=u.tenant_id AND p.user_id=u.id
  WHERE u.tenant_id=$1 ORDER BY u.full_name,u.id`,[actor.tenantId])).rows.map(operatorView);
}
export async function setSubscriptionOperator(client,actor,userId,value) {
 const input=subscriptionOperatorInput.parse(value);
 await authorize(client,actor,'operators.manage');
 if(userId===actor.userId)fail(403,'SUBSCRIPTION_SELF_DELEGATION_DENIED','No puedes modificar tu propio acceso.');
 const user=(await client.query('SELECT id,full_name,email,role,active FROM app_users WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[userId,actor.tenantId])).rows[0];
 if(!user)fail(404,'USER_NOT_FOUND','El usuario no pertenece a la administración global.');
 if(user.role==='domian_admin')fail(403,'DOMIAN_ADMIN_PROTECTED','El acceso global se administra mediante los roles existentes.');
 if(input.profile&&!user.active)fail(409,'SUBSCRIPTION_OPERATOR_INACTIVE','Activa al usuario antes de delegar permisos.');
 const previous=(await client.query('SELECT * FROM subscription_operator_profiles WHERE tenant_id=$1 AND user_id=$2',[actor.tenantId,userId])).rows[0]||null;
 let updated;
 if(input.profile) {
  updated=(await client.query(`INSERT INTO subscription_operator_profiles(tenant_id,user_id,profile,granted_by,reason)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,user_id) DO UPDATE SET profile=EXCLUDED.profile,
   granted_by=EXCLUDED.granted_by,granted_at=now(),revoked_by=NULL,revoked_at=NULL,reason=EXCLUDED.reason,updated_at=now() RETURNING *`,
   [actor.tenantId,userId,input.profile,actor.userId,input.reason])).rows[0];
 } else {
  updated=(await client.query(`UPDATE subscription_operator_profiles SET revoked_by=$3,revoked_at=now(),reason=$4,updated_at=now()
   WHERE tenant_id=$1 AND user_id=$2 RETURNING *`,[actor.tenantId,userId,actor.userId,input.reason])).rows[0];
 }
 await appendAudit(client,{tenantId:actor.tenantId,userId:actor.userId,entityType:'subscription_operator',entityId:userId,action:input.profile?'subscription.operator.granted':'subscription.operator.revoked',oldValue:previous,newValue:{profile:input.profile,reason:input.reason}});
 return operatorView({...user,...updated,id:user.id});
}
export async function listSubscriptionPolicies(client,actor) {
 await authorize(client,actor,'read');
 const history=(await client.query('SELECT * FROM subscription_governance_policies WHERE tenant_id=$1 ORDER BY kind,version DESC LIMIT 200',[actor.tenantId])).rows;
 const approved=(await client.query(`SELECT DISTINCT ON(kind) * FROM subscription_governance_policies
   WHERE tenant_id=$1 AND status='APPROVED' ORDER BY kind,version DESC`,[actor.tenantId])).rows;
 // Optimistic locking must not depend on the capped history. One policy can
 // have hundreds of versions while the other remains absent from that page.
 const versions=(await client.query('SELECT kind,max(version) version FROM subscription_governance_policies WHERE tenant_id=$1 GROUP BY kind',[actor.tenantId])).rows;
 const latestVersions={CANCELLATION:0,RETENTION:0};
 for(const row of versions)latestVersions[row.kind]=Number(row.version);
 return {policies:history.map(policyView),latestVersions,current:{cancellation:approved.find(row=>row.kind==='CANCELLATION')?policyView(approved.find(row=>row.kind==='CANCELLATION')):null,retention:approved.find(row=>row.kind==='RETENTION')?policyView(approved.find(row=>row.kind==='RETENTION')):null},automaticDeletion:false};
}
export async function saveSubscriptionPolicy(client,actor,value) {
 const input=subscriptionPolicyInput.parse(value);
 await authorize(client,actor,'policies.manage');
 await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`subscription-policy:${actor.tenantId}:${input.kind}`]);
 const version=Number((await client.query('SELECT coalesce(max(version),0)::integer version FROM subscription_governance_policies WHERE tenant_id=$1 AND kind=$2',[actor.tenantId,input.kind])).rows[0].version);
 if(version!==input.expectedVersion)fail(409,'SUBSCRIPTION_POLICY_VERSION_CONFLICT','La política cambió. Recarga y revisa la versión antes de guardar.');
 const row=(await client.query(`INSERT INTO subscription_governance_policies(tenant_id,kind,version,status,notice_days,retention_days,reference,reason,automatic_deletion,created_by)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,false,$9) RETURNING *`,[actor.tenantId,input.kind,version+1,input.status,input.noticeDays??null,input.retentionDays??null,input.reference,input.reason,actor.userId])).rows[0];
 const policy=policyView(row);
 await appendAudit(client,{tenantId:actor.tenantId,userId:actor.userId,entityType:'subscription_policy',entityId:row.id,action:'subscription.policy.version.created',newValue:policy});
 return policy;
}
