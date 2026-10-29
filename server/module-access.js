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

const ADMIN_ROLES = new Set(['domian_admin', 'client_admin'])

export function moduleForEntityType(entityType) {
  return ENTITY_MODULES.get(String(entityType || '').trim().toLowerCase()) || null
}

export function canAccessModule(auth, moduleKey) {
  return Boolean(moduleKey) && (ADMIN_ROLES.has(auth?.role) || auth?.permissions?.modules?.[moduleKey] !== false)
}

export function assertModuleAccess(auth, moduleKey) {
  if (canAccessModule(auth, moduleKey)) return
  throw Object.assign(new Error('Esta cuenta no tiene acceso al módulo solicitado.'), { status: 403, code: 'MODULE_PERMISSION_DENIED' })
}

// Generic file/document endpoints receive an entity type, not a module key.
// Unknown types are denied to non-administrators rather than silently bypassing
// module permissions. Administrators retain their explicit full-tenant access.
export function canAccessEntityType(auth, entityType) {
  return ADMIN_ROLES.has(auth?.role) || canAccessModule(auth, moduleForEntityType(entityType))
}

export function assertEntityTypeAccess(auth, entityType) {
  if (canAccessEntityType(auth, entityType)) return
  throw Object.assign(new Error('Esta cuenta no tiene acceso al módulo solicitado.'), { status: 403, code: 'MODULE_PERMISSION_DENIED' })
}

export function filterAccessibleModules(auth, modules) {
  return Object.fromEntries(Object.entries(modules || {}).filter(([key]) => canAccessModule(auth, key)))
}
