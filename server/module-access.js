const ENTITY_MODULES = new Map([
  ['worker', 'trabajadores'], ['person', 'trabajadores'], ['persona', 'trabajadores'],
  ['worker_document', 'trabajadores'], ['worker_health', 'trabajadores'], ['health_protocol', 'trabajadores'],
  ['credential', 'credenciales'], ['epp', 'epp'], ['epp_delivery', 'epp'],
  ['vehicle', 'vehiculos'], ['asset', 'vehiculos'], ['contract', 'contratos'],
  ['service_order', 'mantenciones'], ['maintenance', 'mantenciones'], ['subcontractor', 'subcontratos'],
])

const ADMIN_ROLES = new Set(['domian_admin', 'client_admin'])

export function moduleForEntityType(entityType) {
  return ENTITY_MODULES.get(String(entityType || '').trim().toLowerCase()) || null
}

export function canAccessModule(auth, moduleKey) {
  return !moduleKey || ADMIN_ROLES.has(auth?.role) || auth?.permissions?.modules?.[moduleKey] !== false
}

export function assertModuleAccess(auth, moduleKey) {
  if (canAccessModule(auth, moduleKey)) return
  throw Object.assign(new Error('Esta cuenta no tiene acceso al módulo solicitado.'), { status: 403, code: 'MODULE_PERMISSION_DENIED' })
}

export function filterAccessibleModules(auth, modules) {
  return Object.fromEntries(Object.entries(modules || {}).filter(([key]) => canAccessModule(auth, key)))
}
