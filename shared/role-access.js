// Canonical role policy shared by the portal and API. It preserves the
// documented responsibilities in docs/CLOUD_ARCHITECTURE.md and the granular
// state scopes that previously lived only in server/validation.js. A user
// restriction can reduce this policy, never expand it.

export const ADMIN_ROLES = new Set(['domian_admin', 'client_admin'])
export const READ_ONLY_ROLES = new Set(['consulta'])

const ADMINISTRATION_MODULES = new Set([
  'configuracion', 'usuarios', 'bitacora', 'privacidad', 'transferencia',
  'administracion-clientes', 'administracion-planes',
])

// The state store contains granular collections as well as portal modules.
// Resolving an alias keeps a permission on (for example) `llamados` effective
// for the underlying `callouts` collection too.
const STATE_MODULE_ALIASES = Object.freeze({
  asignaciones: 'trabajadores',
  restricted: 'trabajadores',
  protocolosSalud: 'trabajadores',
  firmas: 'contratos',
  contractTemplates: 'contratos',
  callouts: 'llamados',
  waGroups: 'llamados',
  hotelAsig: 'hoteleria',
  hoteles: 'hoteleria',
  eppDeliveries: 'epp',
  eppMeasurements: 'epp',
  eppCatalog: 'epp',
  empresaDocs: 'auditoria',
  acreditacionesMandante: 'auditoria',
  permisosTrabajo: 'auditoria',
  dailyLogs: 'mantenciones',
  capaActions: 'incidentes',
  inventoryItems: 'vehiculos',
  inventoryMovements: 'vehiculos',
  inventoryStocktakes: 'vehiculos',
  bodegas: 'vehiculos',
  ubicacionesBodega: 'vehiculos',
  personalContratista: 'subcontratos',
  convenios: 'subcontratos',
  habilitaciones: 'subcontratos',
  evaluaciones: 'subcontratos',
  oportunidades: 'prospectos',
  opportunities: 'prospectos',
})

// Readable portal modules per operational role. Contextual modules (client,
// contract and service references) are intentionally present where an
// existing permitted workflow needs them. Administrative and data-transfer
// capabilities are deliberately absent for every non-admin role.
const ROLE_READ_MODULES = Object.freeze({
  rrhh: new Set([
    'trabajadores', 'minas', 'turnos', 'epp', 'mantenciones', 'contratos',
    'hoteleria', 'llamados', 'credenciales', 'reportes', 'alertas',
  ]),
  prevencion: new Set([
    'trabajadores', 'minas', 'turnos', 'epp', 'mantenciones', 'vehiculos',
    'incidentes', 'auditoria', 'reportes', 'alertas',
  ]),
  acreditacion: new Set([
    'trabajadores', 'minas', 'turnos', 'epp', 'mantenciones', 'contratos',
    'credenciales', 'incidentes', 'auditoria', 'reportes', 'alertas',
  ]),
})

// Exact non-administrator state write scopes formerly enforced by
// server/validation.js. Keep raw keys here: the API validates them before a
// write and individual screens can make finer controls from the same source.
const ROLE_WRITE_STATE_KEYS = Object.freeze({
  rrhh: new Set(['trabajadores', 'asignaciones', 'firmas', 'callouts', 'turnos', 'credenciales', 'hotelAsig', 'waGroups', 'contractTemplates', 'eppDeliveries', 'eppMeasurements']),
  prevencion: new Set(['trabajadores', 'incidentes', 'protocolosSalud', 'permisosTrabajo', 'vehiculos', 'turnos', 'eppCatalog', 'eppDeliveries', 'eppMeasurements']),
  acreditacion: new Set(['trabajadores', 'empresaDocs', 'acreditacionesMandante', 'permisosTrabajo', 'credenciales', 'firmas', 'eppDeliveries', 'eppMeasurements']),
})

// This is intentionally narrower than readable modules: a screen that
// supports several collections continues to rely on the server's exact state
// key check. It is used by global creation actions only, so it never advertises
// an action a role cannot save.
const ROLE_WRITE_MODULES = Object.freeze({
  rrhh: new Set(['trabajadores', 'turnos', 'epp', 'llamados', 'credenciales']),
  prevencion: new Set(['trabajadores', 'turnos', 'epp', 'vehiculos', 'incidentes']),
  acreditacion: new Set(['trabajadores', 'epp', 'credenciales', 'auditoria']),
})

export function moduleAccessKey(moduleKey) {
  const key = String(moduleKey || '').trim()
  return STATE_MODULE_ALIASES[key] || key
}

export function isAdministrator(role) {
  return ADMIN_ROLES.has(role)
}

export function isReadOnly(role) {
  return READ_ONLY_ROLES.has(role)
}

export function roleCanReadModule(role, moduleKey) {
  const key = moduleAccessKey(moduleKey)
  if (!key) return true
  if (isAdministrator(role)) return true
  if (isReadOnly(role)) return !ADMINISTRATION_MODULES.has(key)
  return ROLE_READ_MODULES[role]?.has(key) === true
}

export function roleCanWriteStateKey(role, stateKey) {
  return isAdministrator(role) || ROLE_WRITE_STATE_KEYS[role]?.has(String(stateKey || '').trim()) === true
}

export function roleCanWriteModule(role, moduleKey) {
  const rawKey = String(moduleKey || '').trim()
  const key = moduleAccessKey(rawKey)
  if (!key || isReadOnly(role)) return false
  if (isAdministrator(role)) return true
  return ROLE_WRITE_STATE_KEYS[role]?.has(rawKey) === true || ROLE_WRITE_MODULES[role]?.has(key) === true
}

export function userCanReadModule({ role, modules = {} } = {}, moduleKey) {
  const rawKey = String(moduleKey || '').trim()
  const key = moduleAccessKey(rawKey)
  if (!roleCanReadModule(role, rawKey)) return false
  if (isAdministrator(role)) return true
  return modules?.[rawKey] !== false && modules?.[key] !== false
}

export function userCanWriteModule({ role, modules = {} } = {}, moduleKey) {
  const rawKey = String(moduleKey || '').trim()
  const key = moduleAccessKey(rawKey)
  if (!roleCanWriteModule(role, rawKey)) return false
  if (isAdministrator(role)) return true
  return modules?.[rawKey] !== false && modules?.[key] !== false
}
