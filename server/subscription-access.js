import { withTenant } from './db.js';
import { assertSubscriptionOperational, getSubscriptionSummary, lockSubscriptionTenant } from './subscriptions.js';
import { assertSeparateService, separateServiceEnabled, serviceForModules } from './subscription-entitlements.js';
import { assertModuleAccess } from './module-access.js';

// Authentication supplies this flag from PostgreSQL. Older direct route callers
// without subscription metadata retain their legacy contract until opted in.
export async function lockSubscriptionForWrite(client, auth, { modules, lockTenant = lockSubscriptionTenant, assertOperational = assertSubscriptionOperational } = {}) {
  if (typeof auth?.subscriptionManaged !== 'boolean') return null;
  const tenant = await lockTenant(client, auth.tenantId);
  if (tenant?.status !== 'active') {
    throw Object.assign(new Error('La cuenta de la empresa no está activa.'), {
      status: 403, code: 'ACCOUNT_DISABLED',
    });
  }
  if (!tenant.subscription_managed) return null;
  const service=serviceForModules(modules);
  if(service){
    assertSeparateService({...auth,subscriptionManaged:true,subscriptionServices:tenant.subscription_services||{}},service);
    return tenant;
  }
  await assertOperational(client, auth.tenantId);
  return tenant;
}

export function subscriptionAccess({ readSummary = tenantId => withTenant(tenantId, client => getSubscriptionSummary(client, tenantId)) } = {}) {
  return async (req, res, next) => {
    try {
      if (!req.auth?.subscriptionManaged) return next();
      // Commercial endpoints are registered before this middleware. Security and
      // MFA still run first; a commercial renewal never overrides either one.
      const summary = await readSummary(req.auth.tenantId);
      req.auth.subscriptionCanOperate=summary.canOperate===true;
      req.auth.subscriptionServices=summary.separateServices||req.auth.subscriptionServices||{};
      const path = req.path || '';
      const read = ['GET', 'HEAD'].includes(req.method);
      const stateRoot=path==='/state'||path==='/state/';
      const stateModules=path==='/state/modules';
      const service=path==='/work-books'||path.startsWith('/work-books/')?'libroObra'
        : stateModules?serviceForModules(Object.keys(req.body?.changes||{}))
        : /^\/data-transfer\/(?:import|export|template)\/oportunidades\/?$/.test(path)?'oportunidades':null;
      if(service){assertSeparateService(req.auth,service);assertModuleAccess(req.auth,service==='libroObra'?'libroObra':'prospectos');return next();}
      if(summary.canOperate===true)return next();
      const admin = ['client_admin', 'domian_admin'].includes(req.auth.role);
      // Administrators retain controlled reads and export of their own records.
      // Each downstream endpoint continues to apply its tenant/module checks.
      if (read && admin && /^\/(state(?:\/|$)|data-transfer\/(?:export|template)(?:\/|$)|files(?:\/|$)|settings(?:\/|$)|audit(?:\/|$)|privacy(?:\/|$))/.test(path)) return next();
      const services=['libroObra','oportunidades'].filter(key=>separateServiceEnabled(req.auth.subscriptionServices,key));
      if(read&&stateRoot&&services.length){req.subscriptionServicesOnly=services;return next();}
      // File handlers know the actual entity only after parsing multipart data
      // or reading its tenant-scoped metadata. They enforce the deferred check.
      if(/^\/files(?:\/|$)/.test(path)&&services.length)return next();
      return res.status(403).json({
        error: 'SUBSCRIPTION_SUSPENDED',
        message: 'La suscripción está suspendida. Gestiona la renovación desde Mi plan.',
      });
    } catch (error) { next(error); }
  };
}
