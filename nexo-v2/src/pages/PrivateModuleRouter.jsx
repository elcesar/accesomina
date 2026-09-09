import { useParams } from 'react-router-dom'
import { moduleByPath } from '../config/modules.js'
import ModuleWorkspacePage from './ModuleWorkspacePage.jsx'
import TrabajadoresPage from './TrabajadoresPage.jsx'
import ClientesPage from './ClientesPage.jsx'
import ContratosPage from './ContratosPage.jsx'
import OrdenesServicioPage from './OrdenesServicioPage.jsx'
import AlertasPage from './AlertasPage.jsx'
import GestionPersonalProyectoPage from './GestionPersonalProyectoPage.jsx'
import CentroOperativoPage from './CentroOperativoPage.jsx'
import TurnosAsistenciaPage from './TurnosAsistenciaPage.jsx'
import ProteccionEppPage from './ProteccionEppPage.jsx'
import FormacionPage from './FormacionPage.jsx'
import ExamenesPage from './ExamenesPage.jsx'
import SaludOcupacionalPage from './SaludOcupacionalPage.jsx'
import RestringidosPage from './RestringidosPage.jsx'
import ComunicacionesPage from './ComunicacionesPage.jsx'
import VehiculosPage from './VehiculosPage.jsx'
import AlojamientosPage from './AlojamientosPage.jsx'
import CredencialesPage from './CredencialesPage.jsx'
import TercerosSubcontratosPage from './TercerosSubcontratosPage.jsx'
import ConveniosPage from './ConveniosPage.jsx'
import PersonalEmpresaServiciosPage from './PersonalEmpresaServiciosPage.jsx'
import HabilitacionesCumplimientoPage from './HabilitacionesCumplimientoPage.jsx'
import EvaluacionDesempenoPage from './EvaluacionDesempenoPage.jsx'
import CumplimientoCorporativoPage from './CumplimientoCorporativoPage.jsx'
import HabilitacionClientePage from './HabilitacionClientePage.jsx'
import IncidentesPage from './IncidentesPage.jsx'
import AuditoriaPage from './AuditoriaPage.jsx'
import LibroObraPage from './LibroObraPage.jsx'
import ProspectosPage from './ProspectosPage.jsx'
import ActivosInventarioPage from './ActivosInventarioPage.jsx'
import MaquinariaPage from './MaquinariaPage.jsx'
import EquiposInstrumentosPage from './EquiposInstrumentosPage.jsx'
import HerramientasPage from './HerramientasPage.jsx'
import EppInventarioPage from './EppInventarioPage.jsx'
import MaterialesPage from './MaterialesPage.jsx'
import InsumosPage from './InsumosPage.jsx'
import BodegasPage from './BodegasPage.jsx'
import MovimientosInventarioPage from './MovimientosInventarioPage.jsx'
import MantenimientoPage from './MantenimientoPage.jsx'
import AsignacionesPrestamosPage from './AsignacionesPrestamosPage.jsx'
import ReportesPage from './ReportesPage.jsx'
import ConfiguracionPage from './ConfiguracionPage.jsx'
import ImportarExportarPage from './ImportarExportarPage.jsx'
import UsuariosPermisosPage from './UsuariosPermisosPage.jsx'
import BitacoraCambiosPage from './BitacoraCambiosPage.jsx'
import PrivacidadDatosPage from './PrivacidadDatosPage.jsx'
import AdministracionClientesPage from './AdministracionClientesPage.jsx'

const pages = {
  personas: TrabajadoresPage,
  clientes: ClientesPage,
  contratos: ContratosPage,
  'ordenes-servicio': OrdenesServicioPage,
  alertas: AlertasPage,
  'gestion-personal-proyecto': GestionPersonalProyectoPage,
  'centro-operativo': CentroOperativoPage,
  'turnos-asistencia': TurnosAsistenciaPage,
  'proteccion-epp': ProteccionEppPage,
  formacion: FormacionPage,
  examenes: ExamenesPage,
  'salud-ocupacional': SaludOcupacionalPage,
  restringidos: RestringidosPage,
  comunicaciones: ComunicacionesPage,
  vehiculos: VehiculosPage,
  alojamientos: AlojamientosPage,
  credenciales: CredencialesPage,
  'terceros-subcontratos': TercerosSubcontratosPage,
  'contratos-convenios': ConveniosPage,
  'personal-empresa-servicios': PersonalEmpresaServiciosPage,
  'habilitaciones-cumplimiento': HabilitacionesCumplimientoPage,
  'evaluacion-desempeno': EvaluacionDesempenoPage,
  'cumplimiento-corporativo': CumplimientoCorporativoPage,
  'habilitacion-cliente': HabilitacionClientePage,
  incidentes: IncidentesPage,
  auditoria: AuditoriaPage,
  'libro-obra': LibroObraPage,
  prospectos: ProspectosPage,
  'activos-inventario': ActivosInventarioPage,
  maquinaria: MaquinariaPage,
  'equipos-instrumentos': EquiposInstrumentosPage,
  herramientas: HerramientasPage,
  'epp-inventario': EppInventarioPage,
  materiales: MaterialesPage,
  insumos: InsumosPage,
  bodegas: BodegasPage,
  'movimientos-inventario': MovimientosInventarioPage,
  mantenimiento: MantenimientoPage,
  'asignaciones-prestamos': AsignacionesPrestamosPage,
  reportes: ReportesPage,
  configuracion: ConfiguracionPage,
  'importar-exportar': ImportarExportarPage,
  'usuarios-permisos': UsuariosPermisosPage,
  bitacora: BitacoraCambiosPage,
  privacidad: PrivacidadDatosPage,
  'administracion-clientes': AdministracionClientesPage,
}

export default function PrivateModuleRouter() {
  const { modulePath } = useParams()
  const module = moduleByPath(modulePath)
  const Page = pages[module?.[0]]

  return Page ? <Page /> : <ModuleWorkspacePage />
}
