export const ROUTE_MODULES = [
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
  ['/app/transferencia', 'reportes'],
  ['/app/contratos', 'contratos'],
]

export function moduleForPath(pathname = '') {
  return ROUTE_MODULES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] || null
}

export function moduleIsEnabled(modules = {}, moduleKey) {
  return !moduleKey || modules?.[moduleKey] !== false
}
