import { userCanReadModule } from '../../../shared/role-access.js'

export const ROUTE_MODULES = [
  ['/app/alertas', 'alertas'],
  ['/app/clientes', 'minas'],
  ['/app/trabajadores', 'trabajadores'],
  ['/app/reclutamiento', 'trabajadores'],
  ['/app/cursos', 'trabajadores'],
  ['/app/examenes', 'trabajadores'],
  ['/app/salud', 'trabajadores'],
  ['/app/bloqueados', 'trabajadores'],
  ['/app/turnos', 'turnos'],
  ['/app/epp-inventario', 'epp'],
  ['/app/epp', 'epp'],
  ['/app/servicios', 'mantenciones'],
  ['/app/ordenes-servicio', 'mantenciones'],
  ['/app/operaciones', 'mantenciones'],
  ['/app/acreditacion-empresa', 'auditoria'],
  ['/app/habilitacion-cliente', 'auditoria'],
  ['/app/acreditacion-mandante', 'auditoria'],
  ['/app/hoteleria', 'hoteleria'],
  ['/app/llamados', 'llamados'],
  ['/app/comunicaciones', 'llamados'],
  ['/app/vehiculos', 'vehiculos'],
  ['/app/activos-inventario', 'vehiculos'],
  ['/app/maquinaria', 'vehiculos'],
  ['/app/equipos-instrumentos', 'vehiculos'],
  ['/app/herramientas', 'vehiculos'],
  ['/app/materiales', 'vehiculos'],
  ['/app/insumos', 'vehiculos'],
  ['/app/bodegas', 'vehiculos'],
  ['/app/movimientos-inventario', 'vehiculos'],
  ['/app/mantenimiento', 'vehiculos'],
  ['/app/asignaciones-prestamos', 'vehiculos'],
  ['/app/subcontratos', 'subcontratos'],
  ['/app/convenios', 'subcontratos'],
  ['/app/personal-contratista', 'subcontratos'],
  ['/app/habilitaciones-contratistas', 'subcontratos'],
  ['/app/evaluacion-desempeno', 'subcontratos'],
  ['/app/credenciales', 'credenciales'],
  ['/app/incidentes', 'incidentes'],
  ['/app/auditoria', 'auditoria'],
  ['/app/reportes', 'reportes'],
  ['/app/transferencia', 'transferencia'],
  ['/app/libro-obra', 'libroObra'],
  ['/app/oportunidades', 'prospectos'],
  ['/app/contratos', 'contratos'],
  ['/app/configuracion', 'configuracion'],
  ['/app/usuarios', 'usuarios'],
  ['/app/bitacora', 'bitacora'],
  ['/app/privacidad', 'privacidad'],
  ['/app/administracion-clientes', 'administracion-clientes'],
]

export function moduleForPath(pathname = '') {
  return ROUTE_MODULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] || null
}

export function moduleIsEnabled(companyModules = {}, moduleKey, userModules = {}, role) {
  if (!moduleKey) return true
  if (role == null) return companyModules?.[moduleKey] !== false && userModules?.[moduleKey] !== false
  return companyModules?.[moduleKey] !== false && userCanReadModule({ role, modules: userModules }, moduleKey)
}
