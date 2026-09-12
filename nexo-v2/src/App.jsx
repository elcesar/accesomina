import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/auth.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import AlertasPage from './pages/AlertasPage.jsx'
import TrabajadoresPage from './pages/TrabajadoresPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import NuevoTrabajadorPage from './pages/NuevoTrabajadorPage.jsx'
import FichaTrabajadorPage from './pages/FichaTrabajadorPage.jsx'
import TurnosPage from './pages/TurnosPage.jsx'
import FormacionPage from './pages/FormacionPage.jsx'
import ExamenesPage from './pages/ExamenesPage.jsx'
import SaludOcupacionalPage from './pages/SaludOcupacionalPage.jsx'
import RestringidosPage from './pages/RestringidosPage.jsx'
import ProteccionEppPage from './pages/ProteccionEppPage.jsx'
import ClientesPage from './pages/ClientesPage.jsx'
import ContratosPage from './pages/ContratosPage.jsx'
import OrdenesServicioPage from './pages/OrdenesServicioPage.jsx'
import ComunicacionesPage from './pages/ComunicacionesPage.jsx'
import VehiculosPage from './pages/VehiculosPage.jsx'
import AlojamientosPage from './pages/AlojamientosPage.jsx'
import CredencialesPage from './pages/CredencialesPage.jsx'
import TercerosSubcontratosPage from './pages/TercerosSubcontratosPage.jsx'
import ConveniosPage from './pages/ConveniosPage.jsx'
import PersonalEmpresaServiciosPage from './pages/PersonalEmpresaServiciosPage.jsx'
import HabilitacionesCumplimientoPage from './pages/HabilitacionesCumplimientoPage.jsx'
import EvaluacionDesempenoPage from './pages/EvaluacionDesempenoPage.jsx'
import CumplimientoCorporativoPage from './pages/CumplimientoCorporativoPage.jsx'
import HabilitacionClientePage from './pages/HabilitacionClientePage.jsx'
import IncidentesPage from './pages/IncidentesPage.jsx'
import AuditoriaPage from './pages/AuditoriaPage.jsx'
import ActivosInventarioPage from './pages/ActivosInventarioPage.jsx'
import MaquinariaPage from './pages/MaquinariaPage.jsx'
import EquiposInstrumentosPage from './pages/EquiposInstrumentosPage.jsx'
import HerramientasPage from './pages/HerramientasPage.jsx'
import EppInventarioPage from './pages/EppInventarioPage.jsx'
import MaterialesPage from './pages/MaterialesPage.jsx'
import InsumosPage from './pages/InsumosPage.jsx'
import BodegasPage from './pages/BodegasPage.jsx'
import MovimientosInventarioPage from './pages/MovimientosInventarioPage.jsx'
import MantenimientoPage from './pages/MantenimientoPage.jsx'
import AsignacionesPrestamosPage from './pages/AsignacionesPrestamosPage.jsx'
import ProspectosPage from './pages/ProspectosPage.jsx'
import LibroObraPage from './pages/LibroObraPage.jsx'
import GestionPersonalProyectoPage from './pages/GestionPersonalProyectoPage.jsx'
import CentroOperativoPage from './pages/CentroOperativoPage.jsx'
import ReportesPage from './pages/ReportesPage.jsx'
import ImportarExportarPage from './pages/ImportarExportarPage.jsx'
import UsuariosPermisosPage from './pages/UsuariosPermisosPage.jsx'
import BitacoraCambiosPage from './pages/BitacoraCambiosPage.jsx'
import PrivacidadDatosPage from './pages/PrivacidadDatosPage.jsx'
import ConfiguracionPage from './pages/ConfiguracionPage.jsx'
import AdministracionClientesPage from './pages/AdministracionClientesPage.jsx'
import MfaSetupPage from './pages/MfaSetupPage.jsx'

function ProtectedRoute({ children, allowPasswordChange = false, allowMfaSetup = false }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F4EFE3' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid #2A2A8C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#5D6B7A' }}>Cargando Nexo Klar…</p>
      </div>
    </div>
  )
  if (!session) return <Navigate to="/login" replace />
  if (session.user?.mustChangePassword && !allowPasswordChange) return <Navigate to="/cambiar-password" replace />
  if (session.user?.mfaEnrollmentRequired && !allowMfaSetup && !allowPasswordChange) return <Navigate to="/configurar-mfa" replace />
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session?.user?.mustChangePassword) return <Navigate to="/cambiar-password" replace />
  if (session?.user?.mfaEnrollmentRequired) return <Navigate to="/configurar-mfa" replace />
  if (session) return <Navigate to="/app" replace />
  return children
}

function LegacyOrderServiceRedirect() {
  const { orderId } = useParams()
  return <Navigate to={`/app/servicios/${orderId}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/recuperar-contrasena" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/restablecer-contrasena" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/cambiar-password" element={<ProtectedRoute allowPasswordChange><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/configurar-mfa" element={<ProtectedRoute allowMfaSetup><MfaSetupPage /></ProtectedRoute>} />
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="alertas" element={<AlertasPage />} />
            <Route path="reclutamiento" element={<GestionPersonalProyectoPage />} />
            <Route path="operaciones" element={<CentroOperativoPage />} />
            <Route path="trabajadores" element={<TrabajadoresPage />} />
            <Route path="trabajadores/nuevo" element={<NuevoTrabajadorPage />} />
            <Route path="trabajadores/:id" element={<FichaTrabajadorPage />} />
            <Route path="turnos" element={<TurnosPage />} />
            <Route path="epp" element={<ProteccionEppPage />} />
            <Route path="cursos" element={<FormacionPage />} />
            <Route path="examenes" element={<ExamenesPage />} />
            <Route path="salud" element={<SaludOcupacionalPage />} />
            <Route path="bloqueados" element={<RestringidosPage />} />
            <Route path="llamados" element={<ComunicacionesPage />} />
            <Route path="comunicaciones" element={<Navigate to="/app/llamados" replace />} />
            <Route path="vehiculos" element={<VehiculosPage />} />
            <Route path="hoteleria" element={<AlojamientosPage />} />
            <Route path="credenciales" element={<CredencialesPage />} />
            <Route path="subcontratos" element={<TercerosSubcontratosPage />} />
            <Route path="convenios" element={<ConveniosPage />} />
            <Route path="personal-contratista" element={<PersonalEmpresaServiciosPage />} />
            <Route path="habilitaciones-contratistas" element={<HabilitacionesCumplimientoPage />} />
            <Route path="evaluacion-desempeno" element={<EvaluacionDesempenoPage />} />
            <Route path="acreditacion-empresa" element={<CumplimientoCorporativoPage />} />
            <Route path="acreditacion-mandante" element={<HabilitacionClientePage />} />
            <Route path="incidentes" element={<IncidentesPage />} />
            <Route path="auditoria" element={<AuditoriaPage />} />
            <Route path="libro-obra" element={<LibroObraPage />} />
            <Route path="oportunidades" element={<ProspectosPage />} />
            <Route path="activos-inventario" element={<ActivosInventarioPage />} />
            <Route path="maquinaria" element={<MaquinariaPage />} />
            <Route path="equipos-instrumentos" element={<EquiposInstrumentosPage />} />
            <Route path="herramientas" element={<HerramientasPage />} />
            <Route path="epp-inventario" element={<EppInventarioPage />} />
            <Route path="materiales" element={<MaterialesPage />} />
            <Route path="insumos" element={<InsumosPage />} />
            <Route path="bodegas" element={<BodegasPage />} />
            <Route path="movimientos-inventario" element={<MovimientosInventarioPage />} />
            <Route path="mantenimiento" element={<MantenimientoPage />} />
            <Route path="asignaciones-prestamos" element={<AsignacionesPrestamosPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="transferencia" element={<ImportarExportarPage />} />
            <Route path="usuarios" element={<UsuariosPermisosPage />} />
            <Route path="bitacora" element={<BitacoraCambiosPage />} />
            <Route path="privacidad" element={<PrivacidadDatosPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
            <Route path="administracion-clientes" element={<AdministracionClientesPage />} />
            <Route path="clientes" element={<ClientesPage key="clientes-list" />} />
            <Route path="clientes/nuevo" element={<ClientesPage key="clientes-new" createMode />} />
            <Route path="clientes/:clientId" element={<ClientesPage key="clientes-detail" />} />
            <Route path="contratos" element={<ContratosPage key="contratos-list" />} />
            <Route path="contratos/nuevo" element={<ContratosPage key="contratos-new" createMode />} />
            <Route path="contratos/:contractId" element={<ContratosPage key="contratos-detail" />} />
            <Route path="servicios" element={<OrdenesServicioPage key="servicios-list" />} />
            <Route path="servicios/nuevo" element={<OrdenesServicioPage key="servicios-new" createMode />} />
            <Route path="servicios/:orderId" element={<OrdenesServicioPage key="servicios-detail" />} />
            <Route path="ordenes-servicio" element={<Navigate to="/app/servicios" replace />} />
            <Route path="ordenes-servicio/:orderId" element={<LegacyOrderServiceRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
