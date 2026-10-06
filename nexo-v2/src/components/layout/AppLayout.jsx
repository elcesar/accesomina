import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { api } from '../../services/api.js'
import { applyTenantBranding } from '../../services/theme.js'
import { pageDomain } from '../../config/page-domains.js'
import { ModuleAccessProvider, useModuleAccess } from '../../services/module-access.jsx'
import { moduleForPath } from '../../services/module-access.js'
import { useAuth } from '../../services/auth.jsx'
import '../../styles/layout/app-layout.css'

function ModuleOutlet() {
  const { pathname } = useLocation()
  const { loading, isEnabled } = useModuleAccess()
  const { session } = useAuth()
  const moduleKey = moduleForPath(pathname)
  const isCompanyAdmin = ['client_admin', 'domian_admin'].includes(session?.user?.role)
  const isNexoAdmin = session?.user?.role === 'domian_admin'

  if (loading) return <div className="nk-module-empty">Cargando configuración de módulos…</div>
  if (moduleKey && !isEnabled(moduleKey)) {
    return <section className="nk-module-page"><div className="nk-module-empty" role="alert"><b>Módulo no habilitado</b><span>Este módulo no está disponible para esta empresa. Solicita su habilitación desde Configuración de la empresa.</span></div></section>
  }
  if (['configuracion', 'usuarios', 'bitacora', 'privacidad'].includes(moduleKey) && !isCompanyAdmin) {
    return <section className="nk-module-page"><div className="nk-module-empty" role="alert"><b>Sin acceso a administración</b><span>Esta vista está disponible sólo para administradores de la empresa.</span></div></section>
  }
  if (moduleKey === 'administracion-clientes' && !isNexoAdmin) {
    return <section className="nk-module-page"><div className="nk-module-empty" role="alert"><b>Sin acceso a administración Nexo Klar</b><span>Esta vista está reservada para el administrador global de Nexo Klar.</span></div></section>
  }
  return <Outlet />
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const domain = pageDomain(pathname)
  const [branding, setBranding] = useState({})
  const [modules, setModules] = useState({})
  const [loadingModules, setLoadingModules] = useState(true)

  useEffect(() => {
    let active = true

    const applyBranding = nextBranding => {
      if (!active) return
      setBranding(nextBranding)
      applyTenantBranding(nextBranding)
    }

    const loadBranding = async () => {
      try {
        const data = await api.get('/settings')
        applyBranding(data?.settings?.branding || {})
        if (active) setModules(data?.settings?.modules || {})
      } catch {
        applyBranding({ theme: 'light' })
        if (active) setModules({})
      } finally {
        if (active) setLoadingModules(false)
      }
    }

    const onBrandingChanged = event => {
      applyBranding(event.detail || {})
    }
    const onModulesChanged = event => {
      if (active) setModules(event.detail?.modules || {})
    }

    loadBranding()
    window.addEventListener('nexo:branding-changed', onBrandingChanged)
    window.addEventListener('nexo:modules-changed', onModulesChanged)

    return () => {
      active = false
      window.removeEventListener('nexo:branding-changed', onBrandingChanged)
      window.removeEventListener('nexo:modules-changed', onModulesChanged)
    }
  }, [])

  return (
    <ModuleAccessProvider modules={modules} userModules={['client_admin', 'domian_admin'].includes(session?.user?.role) ? {} : (session?.user?.permissions?.modules || {})} loading={loadingModules}>
      <div className="nk-app-shell">
        <Sidebar />
        <div className="nk-app-content">
          <Header branding={branding} />
          <main className="nk-app-main" data-page-domain={domain || undefined}>
            {domain && <div className="nk-page-domain nk-app-page-domain">{domain}</div>}
            <ModuleOutlet />
          </main>
        </div>
      </div>
    </ModuleAccessProvider>
  )
}
