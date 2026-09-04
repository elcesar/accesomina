import { privateModules } from '../components/private/moduleCatalog.js'

export const MODULES = Object.entries(privateModules).map(([key, value]) => [key, value.title])

const aliases = {
  reclutamiento: 'gestion-personal-proyecto', operaciones: 'centro-operativo', turnos: 'turnos-asistencia', epp: 'proteccion-epp', cursos: 'formacion', salud: 'salud-ocupacional', bloqueados: 'restringidos', llamados: 'comunicaciones', hoteleria: 'alojamientos', subcontratos: 'terceros-subcontratos', oportunidades: 'prospectos', transferencia: 'importar-exportar', usuarios: 'usuarios-permisos', 'acreditacion-empresa': 'cumplimiento-corporativo', 'acreditacion-mandante': 'habilitacion-cliente', mantenimientos: 'ordenes-servicio', servicios: 'ordenes-servicio', mineras: 'clientes', 'libro-de-obra': 'libro-obra', activos: 'activos-inventario', inventario: 'activos-inventario',
}

export const moduleByPath = path => MODULES.find(([key]) => key === (aliases[path] || path))
