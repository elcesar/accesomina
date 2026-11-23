import { separateServiceEnabled, separateServiceForModule, separateServiceForEntity } from './subscription-entitlements.js';
import { isAdministrator, moduleAccessKey, userCanReadModule } from '../shared/role-access.js';

const ENTITY_MODULES = new Map([
  ['worker', 'trabajadores'], ['person', 'trabajadores'], ['persona', 'trabajadores'],
  ['worker_document', 'trabajadores'], ['worker_health', 'trabajadores'], ['health_protocol', 'trabajadores'],
  ['credential', 'credenciales'], ['epp', 'epp'], ['epp_delivery', 'epp'],
  ['vehicle', 'vehiculos'], ['asset', 'vehiculos'],
  ['client', 'minas'], ['mine', 'minas'], ['client_document', 'minas'],
  ['contract', 'contratos'], ['contract_document', 'contratos'],
  ['service_order', 'mantenciones'], ['order_document', 'mantenciones'], ['maintenance', 'mantenciones'],
  ['subcontractor', 'subcontratos'],
  ['company_document', 'auditoria'], ['client_accreditation', 'auditoria'],
  ['incident_evidence', 'incidentes'], ['alerta', 'auditoria'],
])

export function moduleForEntityType(entityType) {
  return ENTITY_MODULES.get(String(entityType || '').trim().toLowerCase()) || null
}

// The company setting is a hard boundary for every ordinary account.  Nexo Klar
// administrators retain an explicit support exception; their actions are still
// recorded by the routes that mutate tenant data.
function companyModuleIsEnabled(auth, moduleKey) {
  if (auth?.role === 'domian_admin') return true
  const rawKey = String(moduleKey || '').trim()
  const key = moduleAccessKey(rawKey)
  const modules = auth?.tenantModules || {}
  return Boolean(key) && modules?.[rawKey] !== false && modules?.[key] !== false
}

export function canAccessModule(auth, moduleKey) {
  const key = moduleAccessKey(moduleKey)
  if (!companyModuleIsEnabled(auth, key)) return false
  const service=separateServiceForModule(key);
  if(auth?.subscriptionManaged&&service&&!separateServiceEnabled(auth.subscriptionServices,service))return false;
  return userCanReadModule({ role: auth?.role, modules: auth?.permissions?.modules }, key)
}

export function assertModuleAccess(auth, moduleKey) {
  if (canAccessModule(auth, moduleKey)) return
  throw Object.assign(new Error('Esta cuenta no tiene acceso al módulo solicitado.'), { status: 403, code: 'MODULE_PERMISSION_DENIED' })
}

// Generic file/document endpoints receive an entity type, not a module key.
// A known type always follows its module policy. Unknown types remain available
// only to administrators, because they cannot safely be assigned to a module.
export function canAccessEntityType(auth, entityType) {
  const service=separateServiceForEntity(entityType);
  if(service)return canAccessModule(auth,service==='oportunidades'?'prospectos':'libroObra');
  const moduleKey=moduleForEntityType(entityType);
  return moduleKey ? canAccessModule(auth,moduleKey) : isAdministrator(auth?.role)
}

export function assertEntityTypeAccess(auth, entityType) {
  if (canAccessEntityType(auth, entityType)) return
  throw Object.assign(new Error('Esta cuenta no tiene acceso al módulo solicitado.'), { status: 403, code: 'MODULE_PERMISSION_DENIED' })
}

export function filterAccessibleModules(auth, modules) {
  return Object.fromEntries(Object.entries(modules || {}).filter(([key]) => canAccessModule(auth, key)))
}