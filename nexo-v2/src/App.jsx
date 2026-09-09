import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/auth.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
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
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'
import MfaSetupPage from './pages/MfaSetupPage.jsx'
import PrivateModuleRouter from './pages/PrivateModuleRouter.jsx'

function ProtectedRoute({ children }) {
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
  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/app" replace />
  return children
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
          <Route path="/cambiar-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/configurar-mfa" element={<ProtectedRoute><MfaSetupPage /></ProtectedRoute>} />
          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="alertas" element={<AlertasPage />} />
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
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/nuevo" element={<ClientesPage createMode />} />
            <Route path="clientes/:clientId" element={<ClientesPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/nuevo" element={<ContratosPage createMode />} />
            <Route path="contratos/:contractId" element={<ContratosPage />} />
            <Route path="servicios" element={<OrdenesServicioPage />} />
            <Route path="servicios/nuevo" element={<OrdenesServicioPage createMode />} />
            <Route path="servicios/:orderId" element={<OrdenesServicioPage />} />
            <Route path="ordenes-servicio" element={<Navigate to="/app/servicios" replace />} />
            <Route path="ordenes-servicio/:orderId" element={<OrdenesServicioPage />} />
            <Route path="modulos/:modulePath" element={<PrivateModuleRouter />} />
            <Route path=":modulePath" element={<PrivateModuleRouter />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
