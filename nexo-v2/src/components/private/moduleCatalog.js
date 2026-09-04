const moduleDefinitions = {
  alertas: { title: 'Alertas', description: 'Prioriza vencimientos, faltantes y acciones pendientes.', data: ['alertas'], action: 'Gestionar alertas', related: ['personas', 'documentos', 'órdenes de servicio'] },
  'gestion-personal-proyecto': { title: 'Gestión de personal por proyecto', description: 'Organiza postulaciones, disponibilidad y asignación de personas a servicios.', data: ['trabajadores', 'proyectos'], action: 'Gestionar personas', related: ['personas', 'órdenes de servicio'] },
  'centro-operativo': { title: 'Centro Operativo', description: 'Consulta el estado de preparación de cada orden de servicio.', data: ['proyectos', 'asignaciones'], action: 'Ver órdenes de servicio', related: ['personas', 'recursos', 'alertas'] },
  'libro-obra': { title: 'Bitácora operativa', description: 'Registra anotaciones correlativas, compromisos, evidencia y firmas.', data: ['workBookEntries'], action: 'Nueva anotación', related: ['clientes', 'contratos', 'órdenes de servicio'] },
  personas: { title: 'Personas', description: 'Centraliza fichas, documentos, relación laboral y disponibilidad.', data: ['trabajadores'], action: 'Nueva persona', related: ['turnos', 'EPP', 'documentos'] },
  'turnos-asistencia': { title: 'Turnos y asistencia', description: 'Planifica jornadas y registra asistencia asociada a cada servicio.', data: ['turnos', 'asistencias'], action: 'Registrar turno', related: ['personas', 'órdenes de servicio'] },
  'proteccion-epp': { title: 'Protección personal (EPP)', description: 'Controla matriz, entregas y reposición de protección personal.', data: ['eppEntregas', 'inventoryItems'], action: 'Registrar entrega', related: ['personas', 'inventario'] },
  formacion: { title: 'Formación y certificaciones', description: 'Controla cursos, certificaciones y vigencias por persona y cargo.', data: ['cursos', 'trabajadores'], action: 'Registrar formación', related: ['personas', 'habilitación'] },
  examenes: { title: 'Exámenes y aptitudes', description: 'Mantiene aptitudes ocupacionales, vencimientos y restricciones.', data: ['examenes', 'trabajadores'], action: 'Registrar examen', related: ['personas', 'salud ocupacional'] },
  'salud-ocupacional': { title: 'Salud ocupacional', description: 'Gestiona protocolos y medidas por exposición, riesgo y cargo.', data: ['protocolosSalud', 'trabajadores'], action: 'Gestionar protocolos', related: ['personas', 'exámenes'] },
  restringidos: { title: 'Restringidos', description: 'Revisa personas o recursos con restricciones vigentes y sus causas.', data: ['trabajadores', 'restricted'], action: 'Revisar restricciones', related: ['personas', 'alertas'] },
  comunicaciones: { title: 'Comunicaciones y convocatorias', description: 'Coordina convocatorias, mensajes y confirmaciones de asistencia.', data: ['comunicaciones', 'convocatorias'], action: 'Nueva comunicación', related: ['personas', 'órdenes de servicio'] },
  vehiculos: { title: 'Flota y equipos móviles', description: 'Administra vehículos, equipos móviles, disponibilidad y documentos.', data: ['vehiculos', 'inventoryItems'], action: 'Registrar recurso', related: ['órdenes de servicio', 'mantenimiento'] },
  alojamientos: { title: 'Alojamientos y estadías', description: 'Planifica reservas, disponibilidad y estadías de las personas.', data: ['hoteles', 'alojamientos'], action: 'Nueva reserva', related: ['personas', 'órdenes de servicio'] },
  credenciales: { title: 'Credenciales de acceso', description: 'Controla credenciales, vigencia y autorización de acceso.', data: ['credenciales', 'trabajadores'], action: 'Emitir credencial', related: ['personas', 'habilitación'] },
  'terceros-subcontratos': { title: 'Terceros y subcontratos', description: 'Gestiona empresas colaboradoras, requisitos y desempeño.', data: ['subcontratos', 'contratistas'], action: 'Nuevo tercero', related: ['convenios', 'cumplimiento'] },
  'contratos-convenios': { title: 'Contratos de empresas colaboradoras', description: 'Registra contratos y convenios con empresas colaboradoras y sus vigencias.', data: ['convenios', 'contratos'], action: 'Nuevo contrato', related: ['terceros', 'cumplimiento'] },
  'personal-empresa-servicios': { title: 'Personas de empresas colaboradoras', description: 'Mantiene el personal exclusivo de cada empresa colaboradora.', data: ['personalContratista', 'trabajadores'], action: 'Nueva persona', related: ['terceros', 'habilitación'] },
  'habilitaciones-cumplimiento': { title: 'Requisitos y cumplimiento de terceros', description: 'Evalúa requisitos documentales y estado de cumplimiento de empresas colaboradoras.', data: ['habilitaciones', 'subcontratos'], action: 'Revisar requisitos', related: ['terceros', 'auditoría'] },
  'evaluacion-desempeno': { title: 'Evaluación de desempeño', description: 'Registra evaluación, observaciones y planes de mejora de terceros.', data: ['evaluaciones'], action: 'Nueva evaluación', related: ['terceros', 'órdenes de servicio'] },
  clientes: { title: 'Clientes', description: 'Gestiona clientes, contactos y relaciones comerciales.', data: ['minas', 'clientes'], action: 'Nuevo cliente', related: ['contratos', 'órdenes de servicio'] },
  contratos: { title: 'Contratos y firmas', description: 'Administra vigencias, responsables, documentos y firmas.', data: ['contratos'], action: 'Nuevo contrato', related: ['clientes', 'órdenes de servicio'] },
  'ordenes-servicio': { title: 'Órdenes de servicio', description: 'Planifica ejecución, personas, recursos, brechas y responsables.', data: ['proyectos', 'mantenciones', 'asignaciones'], action: 'Nueva orden de servicio', related: ['clientes', 'contratos', 'personas'] },
  'cumplimiento-corporativo': { title: 'Cumplimiento corporativo', description: 'Centraliza documentación y requisitos de la empresa.', data: ['empresaDocs', 'documentosEmpresa'], action: 'Cargar documento', related: ['auditoría', 'alertas'] },
  'habilitacion-cliente': { title: 'Requisitos del cliente', description: 'Controla requisitos solicitados por cada cliente.', data: ['acreditacionesMandante', 'requisitosCliente'], action: 'Revisar requisitos', related: ['clientes', 'personas'] },
  incidentes: { title: 'Incidentes y no conformidades', description: 'Registra, investiga y da seguimiento a incidentes y acciones correctivas.', data: ['incidentes'], action: 'Registrar incidente', related: ['personas', 'órdenes de servicio', 'auditoría'] },
  auditoria: { title: 'Auditoría', description: 'Revisa documentos, evidencias, estados y observaciones.', data: ['auditorias', 'documentos'], action: 'Nueva auditoría', related: ['cumplimiento', 'alertas'] },
  prospectos: { title: 'Prospectos y oportunidades', description: 'Gestiona oportunidades, responsables, etapas y próxima acción.', data: ['prospectos', 'oportunidades'], action: 'Nueva oportunidad', related: ['clientes', 'contratos'] },
  'activos-inventario': { title: 'Activos, equipos e inventario', description: 'Controla activos, existencias, ubicaciones, movimientos y mantenimiento.', data: ['inventoryItems', 'activos'], action: 'Nuevo activo', related: ['bodegas', 'asignaciones'] },
  maquinaria: { title: 'Maquinaria', description: 'Administra maquinaria, disponibilidad, mantenimientos y documentos.', data: ['inventoryItems', 'maquinaria'], action: 'Nueva maquinaria', related: ['mantenimiento', 'órdenes de servicio'] },
  'equipos-instrumentos': { title: 'Equipos e instrumentos', description: 'Controla equipos, calibraciones, certificados y custodia.', data: ['inventoryItems', 'equipos'], action: 'Nuevo equipo', related: ['mantenimiento', 'asignaciones'] },
  herramientas: { title: 'Herramientas', description: 'Administra herramientas, stock, asignaciones y devoluciones.', data: ['inventoryItems', 'herramientas'], action: 'Nueva herramienta', related: ['bodegas', 'asignaciones'] },
  'epp-inventario': { title: 'Inventario de EPP', description: 'Controla existencias, tallas, vida útil y reposición de EPP.', data: ['inventoryItems', 'eppEntregas'], action: 'Agregar EPP', related: ['bodegas', 'personas'] },
  materiales: { title: 'Materiales y ferretería', description: 'Gestiona existencias, mínimos y movimientos de materiales.', data: ['inventoryItems', 'materiales'], action: 'Agregar material', related: ['bodegas', 'movimientos'] },
  insumos: { title: 'Insumos y consumibles', description: 'Controla insumos, lotes, vencimientos y reposición.', data: ['inventoryItems', 'insumos'], action: 'Agregar insumo', related: ['bodegas', 'movimientos'] },
  bodegas: { title: 'Bodegas', description: 'Define bodegas, ubicaciones internas y responsables de custodia.', data: ['bodegas', 'inventoryItems'], action: 'Nueva bodega', related: ['inventario', 'movimientos'] },
  'movimientos-inventario': { title: 'Movimientos de inventario', description: 'Registra ingresos, egresos, traslados y ajustes con trazabilidad.', data: ['inventoryMovements', 'movimientosInventario'], action: 'Nuevo movimiento', related: ['bodegas', 'activos'] },
  mantenimiento: { title: 'Mantenimiento', description: 'Planifica mantenimiento preventivo, correctivo y sus costos.', data: ['mantenimientos', 'inventoryItems'], action: 'Programar mantenimiento', related: ['activos', 'alertas'] },
  'asignaciones-prestamos': { title: 'Asignaciones y préstamos', description: 'Entrega activos a personas o servicios con fecha de devolución.', data: ['asignacionesActivos', 'prestamos'], action: 'Nueva asignación', related: ['personas', 'activos'] },
  reportes: { title: 'Reportes y analítica', description: 'Construye reportes por cliente, contrato, orden de servicio o persona.', data: ['reportes'], action: 'Crear reporte', related: ['toda la operación'] },
  configuracion: { title: 'Configuración de la empresa', description: 'Administra catálogos, reglas y parámetros operativos.', data: ['catalogosEmpresa'], action: 'Editar configuración', related: ['todos los módulos'] },
  'importar-exportar': { title: 'Importar y exportar', description: 'Carga datos masivos, revisa errores y descarga respaldos.', data: ['importHistory'], action: 'Importar archivo', related: ['todos los módulos'] },
  'usuarios-permisos': { title: 'Usuarios y permisos', description: 'Gestiona usuarios, roles, acceso y responsabilidades.', data: ['users'], action: 'Invitar usuario', related: ['privacidad', 'bitácora'] },
  bitacora: { title: 'Bitácora de cambios', description: 'Consulta el historial de acciones y cambios relevantes.', data: ['history', 'bitacora'], action: 'Ver historial', related: ['todos los módulos'] },
  privacidad: { title: 'Privacidad y datos', description: 'Administra seguridad, aislamiento y gobierno de información.', data: ['privacySettings'], action: 'Revisar privacidad', related: ['usuarios', 'bitácora'] },
  'administracion-clientes': { title: 'Administración de clientes', description: 'Administra empresas usuarias, planes y estado de sus espacios privados.', data: ['tenants'], action: 'Gestionar clientes', related: ['configuración global'] },
}

// Each screen owns its visible data collection and a minimum form definition.
// The mapping keeps legacy state keys compatible while the UI uses neutral names.
const writeKeys = {
  alertas: 'alertas', 'gestion-personal-proyecto': 'trabajadores', 'centro-operativo': 'mantenciones', 'libro-obra': 'workBookEntries',
  personas: 'trabajadores', 'turnos-asistencia': 'turnos', 'proteccion-epp': 'eppDeliveries', formacion: 'cursos', examenes: 'examenes',
  'salud-ocupacional': 'protocolosSalud', restringidos: 'restricted', comunicaciones: 'comunicaciones', vehiculos: 'vehiculos', alojamientos: 'hoteles',
  credenciales: 'credenciales', 'terceros-subcontratos': 'subcontratos', 'contratos-convenios': 'convenios', 'personal-empresa-servicios': 'personalContratista',
  'habilitaciones-cumplimiento': 'habilitaciones', 'evaluacion-desempeno': 'evaluaciones', clientes: 'minas', contratos: 'contratos',
  'ordenes-servicio': 'mantenciones', 'cumplimiento-corporativo': 'empresaDocs', 'habilitacion-cliente': 'acreditacionesMandante',
  incidentes: 'incidentes', auditoria: 'auditorias', prospectos: 'prospectos', 'activos-inventario': 'inventoryItems', maquinaria: 'maquinaria',
  'equipos-instrumentos': 'equipos', herramientas: 'herramientas', 'epp-inventario': 'inventoryItems', materiales: 'materiales', insumos: 'insumos',
  bodegas: 'bodegas', 'movimientos-inventario': 'inventoryMovements', mantenimiento: 'mantenimientos', 'asignaciones-prestamos': 'asignacionesActivos',
  reportes: 'reportes', configuracion: 'catalogosEmpresa', 'importar-exportar': 'importHistory', 'usuarios-permisos': 'tenantUsers', bitacora: 'bitacora',
  privacidad: 'privacySettings', 'administracion-clientes': 'tenants',
}

const rolesByArea = {
  personas: ['domian_admin','client_admin','rrhh','prevencion','acreditacion'],
  cumplimiento: ['domian_admin','client_admin','prevencion','acreditacion'],
  operaciones: ['domian_admin','client_admin','rrhh','prevencion','acreditacion'],
  gobierno: ['domian_admin','client_admin'],
  comercial: ['domian_admin','client_admin','rrhh','acreditacion'],
}

const areaFor = id => {
  if (['personas','gestion-personal-proyecto','turnos-asistencia','proteccion-epp','formacion','examenes','salud-ocupacional','restringidos'].includes(id)) return 'personas'
  if (['cumplimiento-corporativo','habilitacion-cliente','auditoria','incidentes','habilitaciones-cumplimiento'].includes(id)) return 'cumplimiento'
  if (['configuracion','usuarios-permisos','bitacora','privacidad','administracion-clientes','importar-exportar'].includes(id)) return 'gobierno'
  if (['prospectos','clientes','contratos','ordenes-servicio','terceros-subcontratos','contratos-convenios','personal-empresa-servicios','evaluacion-desempeno'].includes(id)) return 'comercial'
  return 'operaciones'
}

export const privateModules = Object.fromEntries(Object.entries(moduleDefinitions).map(([id, definition]) => [id, {
  ...definition,
  id,
  writeKey: writeKeys[id] || definition.data[0] || id,
  roles: rolesByArea[areaFor(id)],
}]))

export const moduleFor = id => privateModules[id] || { id, title: 'Módulo', description: 'Espacio de trabajo de Nexo Klar.', data: [], writeKey: id, roles: [] }

export function canUseModule(module, session) {
  if (!session?.user) return false
  if (session.user.permissions?.modules?.[module.id] === false) return false
  if (session.user.role === 'consulta') return module.id !== 'administracion-clientes'
  return module.roles.includes(session.user.role)
}

const editableKeysByRole = {
  rrhh: new Set(['trabajadores','asignaciones','firmas','callouts','turnos','credenciales','hotelAsig','waGroups','contractTemplates','eppDeliveries','eppMeasurements']),
  prevencion: new Set(['trabajadores','incidentes','protocolosSalud','permisosTrabajo','vehiculos','turnos','eppCatalog','eppDeliveries','eppMeasurements']),
  acreditacion: new Set(['trabajadores','empresaDocs','acreditacionesMandante','permisosTrabajo','credenciales','firmas','eppDeliveries','eppMeasurements']),
}

export function canEditModule(module, session) {
  const role = session?.user?.role
  if (!canUseModule(module, session) || role === 'consulta') return false
  if (role === 'domian_admin' || role === 'client_admin') return true
  return editableKeysByRole[role]?.has(module.writeKey) === true
}
