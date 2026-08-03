import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './services/auth.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TrabajadoresPage from './pages/TrabajadoresPage.jsx'
import ContratosPage from './pages/ContratosPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Cargando Nexo Klar...</p>
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
            <Route path="trabajadores" element={<TrabajadoresPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
