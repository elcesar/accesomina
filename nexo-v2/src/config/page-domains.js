const PAGE_DOMAINS = [
  {
    label: 'Centro de Control',
    exact: ['/app'],
    prefixes: ['/app/alertas', '/app/reclutamiento', '/app/operaciones'],
  },
  {
    label: 'Capital Humano',
    prefixes: ['/app/trabajadores', '/app/turnos', '/app/epp', '/app/cursos', '/app/examenes', '/app/salud', '/app/bloqueados'],
  },
  {
    label: 'Relación Comercial',
    prefixes: ['/app/clientes', '/app/contratos', '/app/servicios'],
  },
  {
    label: 'Gestión Operacional',
    prefixes: ['/app/llamados', '/app/comunicaciones', '/app/vehiculos', '/app/hoteleria', '/app/credenciales'],
  },
  {
    label: 'Contratistas',
    prefixes: ['/app/subcontratos', '/app/convenios', '/app/personal-contratista', '/app/habilitaciones-contratistas', '/app/evaluacion-desempeno'],
  },
  {
    label: 'Cumplimiento y Calidad',
    prefixes: ['/app/acreditacion-empresa', '/app/acreditacion-mandante', '/app/incidentes', '/app/auditoria'],
  },
  {
    label: 'Gestión de Proyectos y Negocios',
    prefixes: ['/app/oportunidades', '/app/libro-obra'],
  },
  {
    label: 'Activos, Equipos e Inventario',
    prefixes: [
      '/app/activos-inventario',
      '/app/maquinaria',
      '/app/equipos-instrumentos',
      '/app/herramientas',
      '/app/epp-inventario',
      '/app/materiales',
      '/app/insumos',
      '/app/bodegas',
      '/app/movimientos-inventario',
      '/app/mantenimiento',
      '/app/asignaciones-prestamos',
    ],
  },
  {
    label: 'Gestión y Administración',
    prefixes: ['/app/reportes', '/app/transferencia', '/app/usuarios', '/app/bitacora', '/app/privacidad', '/app/configuracion'],
  },
]

export function pageDomain(pathname) {
  const match = PAGE_DOMAINS.find(domain =>
    domain.exact?.includes(pathname) || domain.prefixes?.some(prefix => pathname.startsWith(prefix))
  )
  return match?.label || ''
}

export { PAGE_DOMAINS }
