const BRAND = 'Nexo Klar'

const publicSections = {
  inicio: 'Control operacional y cumplimiento',
  solucion: 'Plataforma',
  resultados: 'Beneficios',
  producto: 'Producto',
  capacidades: 'Soluciones',
  industrias: 'Industrias',
  implementacion: 'Implementación y privacidad',
  proposito: 'Propósito',
  'registro-empresa': 'Crear empresa',
  contacto: 'Contacto',
}

const routes = [
  ['/login', 'Acceso al sistema'],
  ['/recuperar-contrasena', 'Recuperar contraseña'],
  ['/restablecer-contrasena', 'Restablecer contraseña'],
  ['/cambiar-password', 'Cambiar contraseña'],
  ['/configurar-mfa', 'Configurar doble autenticación'],
  ['/app', 'Panel de control'],
  ['/app/alertas', 'Alertas'],
  ['/app/reclutamiento', 'Gestión de personal por proyecto'],
  ['/app/operaciones', 'Centro operativo'],
  ['/app/trabajadores/nuevo', 'Nueva persona'],
  ['/app/trabajadores', 'Personas'],
  ['/app/turnos', 'Turnos y asistencia'],
  ['/app/epp', 'Protección personal / EPP'],
  ['/app/cursos', 'Formación y certificaciones'],
  ['/app/examenes', 'Exámenes y aptitudes'],
  ['/app/salud', 'Salud ocupacional'],
  ['/app/bloqueados', 'Restringidos'],
  ['/app/llamados', 'Comunicaciones y convocatorias'],
  ['/app/vehiculos', 'Flota y equipos móviles'],
  ['/app/hoteleria', 'Alojamientos y estadías'],
  ['/app/credenciales', 'Credenciales de acceso'],
  ['/app/subcontratos', 'Terceros y subcontratos'],
  ['/app/convenios', 'Convenios y contratos de terceros'],
  ['/app/personal-contratista', 'Personas de empresas colaboradoras'],
  ['/app/habilitaciones-contratistas', 'Habilitaciones y cumplimiento'],
  ['/app/evaluacion-desempeno', 'Evaluación de desempeño'],
  ['/app/clientes/nuevo', 'Nuevo cliente'],
  ['/app/clientes', 'Clientes'],
  ['/app/contratos/nuevo', 'Nuevo contrato'],
  ['/app/contratos', 'Contratos y firmas'],
  ['/app/servicios/nuevo', 'Nueva orden de servicio'],
  ['/app/servicios', 'Órdenes de servicio'],
  ['/app/acreditacion-empresa', 'Documentación de la empresa'],
  ['/app/acreditacion-mandante', 'Habilitación del cliente'],
  ['/app/incidentes', 'Incidentes y no conformidades'],
  ['/app/auditoria', 'Auditoría'],
  ['/app/libro-obra', 'Libro de obra'],
  ['/app/oportunidades', 'Prospectos y oportunidades'],
  ['/app/activos-inventario', 'Inventario y existencias'],
  ['/app/maquinaria', 'Maquinaria'],
  ['/app/equipos-instrumentos', 'Equipos e instrumentos'],
  ['/app/herramientas', 'Herramientas'],
  ['/app/epp-inventario', 'Inventario de equipos de protección personal'],
  ['/app/materiales', 'Materiales y ferretería'],
  ['/app/insumos', 'Insumos y consumibles'],
  ['/app/bodegas', 'Bodegas'],
  ['/app/movimientos-inventario', 'Movimientos de inventario'],
  ['/app/mantenimiento', 'Mantenimiento'],
  ['/app/asignaciones-prestamos', 'Asignaciones y préstamos'],
  ['/app/reportes', 'Reportes y analítica'],
  ['/app/transferencia', 'Importar y exportar'],
  ['/app/configuracion', 'Configuración de la empresa'],
  ['/app/usuarios', 'Usuarios y permisos'],
  ['/app/bitacora', 'Bitácora de cambios'],
  ['/app/privacidad', 'Privacidad y datos'],
  ['/app/administracion-clientes', 'Administración de clientes'],
]

export function pageTitle(pathname = '/', hash = '') {
  if (pathname === '/') return `${BRAND} · ${publicSections[hash.replace(/^#/, '')] || publicSections.inicio}`
  const exact = routes.find(([path]) => path === pathname)
  if (exact) return `${exact[1]} · ${BRAND}`
  if (/^\/app\/trabajadores\/[^/]+$/.test(pathname)) return `Ficha de persona · ${BRAND}`
  if (/^\/app\/clientes\/[^/]+$/.test(pathname)) return `Ficha de cliente · ${BRAND}`
  if (/^\/app\/contratos\/[^/]+$/.test(pathname)) return `Ficha de contrato · ${BRAND}`
  if (/^\/app\/servicios\/[^/]+$/.test(pathname)) return `Orden de servicio · ${BRAND}`
  return BRAND
}
