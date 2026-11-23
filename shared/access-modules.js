// Assignable product modules shared by the user invitation and configuration
// experiences. Administrative views and the dashboard are intentionally absent:
// they follow their own role policies and are not granted per person.
export const ASSIGNABLE_MODULES = Object.freeze([
  Object.freeze({ key: 'alertas', label: 'Alertas' }),
  Object.freeze({ key: 'trabajadores', label: 'Personas' }),
  Object.freeze({ key: 'minas', label: 'Clientes' }),
  Object.freeze({ key: 'turnos', label: 'Turnos y asistencia' }),
  Object.freeze({ key: 'epp', label: 'Protección personal / EPP' }),
  Object.freeze({ key: 'mantenciones', label: 'Órdenes de servicio' }),
  Object.freeze({ key: 'contratos', label: 'Contratos y firmas' }),
  Object.freeze({ key: 'hoteleria', label: 'Alojamientos y estadías' }),
  Object.freeze({ key: 'llamados', label: 'Comunicaciones y convocatorias' }),
  Object.freeze({ key: 'vehiculos', label: 'Flota y equipos móviles' }),
  Object.freeze({ key: 'subcontratos', label: 'Terceros y subcontratos' }),
  Object.freeze({ key: 'credenciales', label: 'Credenciales de acceso' }),
  Object.freeze({ key: 'incidentes', label: 'Incidentes y no conformidades' }),
  Object.freeze({ key: 'auditoria', label: 'Auditoría' }),
  Object.freeze({ key: 'reportes', label: 'Reportes' }),
  Object.freeze({ key: 'libroObra', label: 'Libro de obra' }),
  Object.freeze({ key: 'prospectos', label: 'Prospectos y oportunidades' }),
])

export const ASSIGNABLE_MODULE_KEYS = new Set(ASSIGNABLE_MODULES.map(({ key }) => key))

export function emptyAssignableModulePermissions() {
  return Object.fromEntries(ASSIGNABLE_MODULES.map(({ key }) => [key, false]))
}
