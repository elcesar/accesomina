import { withTenant } from './db.js';

const commercial = ['read','commercial','requests.create','requests.review','requests.approve','requests.reject','requests.schedule','requests.cancel','requests.documents'];
const operations = ['read','operations','requests.execute','services.manage'];
export const SUBSCRIPTION_ADMIN_CAPABILITIES = Object.freeze({
 SUPER_ADMIN: Object.freeze([...new Set(['read','catalog','governance','catalog.manage','operators.manage','policies.manage',...commercial,...operations])]),
 COMMERCIAL: Object.freeze(commercial), OPERATIONS: Object.freeze(operations)
});
function denied() { return Object.assign(new Error('No tienes autorización para administrar suscripciones.'),{status:403,code:'SUBSCRIPTION_PERMISSION_DENIED'}); }

export async function resolveSubscriptionAccess(client,{tenantId,userId}) {
 if(!tenantId||!userId)throw denied();
 // Both the platform flag and the role are read from the database. Generic
 // permissions JSON and stale authentication snapshots cannot delegate access.
 const identity=(await client.query(`SELECT u.role,u.active,t.is_domian_admin,t.status,p.profile,p.revoked_at
   FROM app_users u JOIN tenants t ON t.id=u.tenant_id
   LEFT JOIN subscription_operator_profiles p ON p.tenant_id=u.tenant_id AND p.user_id=u.id
   WHERE u.id=$1 AND u.tenant_id=$2`,[userId,tenantId])).rows[0];
 if(!identity?.active||identity.status!=='active'||!identity.is_domian_admin)throw denied();
 const profile=identity.role==='domian_admin'?'SUPER_ADMIN':!identity.revoked_at?identity.profile:null;
 const capabilities=SUBSCRIPTION_ADMIN_CAPABILITIES[profile];
 if(!capabilities)throw denied();
 return {profile,capabilities:[...capabilities]};
}
export async function getSubscriptionAccess(auth) {
 if(!auth?.tenantId||!auth?.userId)throw denied();
 return withTenant(auth.tenantId,client=>resolveSubscriptionAccess(client,auth));
}
export async function requireSubscriptionAdmin(req,res,next) {
 try { req.subscriptionAccess=await getSubscriptionAccess(req.auth);next(); } catch(error) { next(error); }
}
export function requireSubscriptionCapability(...capabilities) {
 return async function subscriptionCapability(req,res,next) {
  try {
   // Re-read on every protected action, including after a profile is revoked.
   req.subscriptionAccess=await getSubscriptionAccess(req.auth);
   if(!capabilities.every(capability=>req.subscriptionAccess.capabilities.includes(capability)))throw denied();
   next();
  } catch(error) { next(error); }
 };
}
