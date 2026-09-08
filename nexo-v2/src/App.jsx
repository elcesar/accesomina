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
          {/* Landing pública */}
          <Route path="/" element={<LandingPage />} />

          {/* Login */}
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />

          {/* App privada */}
          <Route path="/app" element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
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
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
