import OperationFeedback from '../ui/OperationFeedback.jsx'
import { ErrorPage } from '../ui/ErrorPage.jsx'
import { IconLock } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { api } from '../../services/api.js'
import { applyTenantBranding } from '../../services/theme.js'
import { pageDomain } from '../../config/page-domains.js'
import { ModuleAccessProvider, useModuleAccess } from '../../services/module-access.jsx'
import { moduleForPath } from '../../services/module-access.js'
import { useAuth } from '../../services/auth.jsx'
import { SubscriptionProvider, useSubscription } from '../../services/subscription.jsx'
import { FreePlanNotice } from '../ui/SubscriptionComponents.jsx'
import '../../styles/layout/app-layout.css'

function ModuleOutlet() {
  const { pathname } = useLocation()
  const { loading, isEnabled } = useModuleAccess()
  const { session } = useAuth()
  const { summary } = useSubscription()
  const moduleKey = moduleForPath(pathname)
  const isCompanyAdmin = ['client_admin', 'domian_admin'].includes(session?.user?.role)
  const isNexoAdmin = session?.user?.role === 'domian_admin'

  if (loading) return <div className="nk-module-empty">Cargando configuración de módulos…</div>
  if (pathname === '/app/administracion-planes' && !isNexoAdmin) {
    return <ErrorPage as="section" code="Error 403" title="Acceso reservado a Nexo Klar" description="La administración de planes requiere un permiso global." icon={IconLock} actions={<Link className="nk-button nk-button-primary" to="/app">Ir al panel</Link>} />
  }
  const separateCode = pathname.startsWith('/app/libro-obra') ? 'libroObra' : pathname.startsWith('/app/oportunidades') ? 'oportunidades' : null
  const separateService = separateCode && summary?.separateServices?.[separateCode]
  const separateAllowed = separateService?.enabled && (!separateService.endsAt || Date.parse(separateService.endsAt) > Date.now())
  if (summary?.managed && separateCode && !separateAllowed && !isNexoAdmin) {
    return <ErrorPage as="section" title="Este servicio requiere contratación independiente" description="Libro de Obra y Gestor de Oportunidades tienen condiciones propias. Consulta a tu administrador para habilitar el servicio." icon={IconLock} actions={<Link className="nk-button nk-button-primary" to="/app/mi-plan">Ver mi plan</Link>} />
  }
  if (summary?.managed && summary.canOperate === false && pathname !== '/app/mi-plan' && !pathname.startsWith('/app/administracion-') && !separateAllowed) {
    return <section className="nk-module-page"><header className="nk-module-header"><div><h1>{summary.contract ? 'Tu plan requiere renovación' : 'Tu plan está pendiente de activación'}</h1><p>Tu información permanece registrada. Gestiona la contratación o renovación desde Mi plan.</p></div></header><Link className="nk-button nk-button-primary" to="/app/mi-plan">Ir a Mi plan</Link></section>
  }
  if (moduleKey && !isEnabled(moduleKey)) {
    return <section className="nk-module-page"><div className="nk-module-empty" role="alert"><b>Módulo no habilitado</b><span>Este módulo no está disponible para esta empresa. Solicita su habilitación desde Configuración de la empresa.</span></div></section>
  }
  if (['configuracion', 'usuarios', 'bitacora', 'privacidad'].includes(moduleKey) && !isCompanyAdmin) {
    return <ErrorPage as="section" code="Error 403" title="No tienes permiso para acceder" description="Esta vista está disponible sólo para administradores de la empresa. Solicita acceso a tu administrador." icon={IconLock} actions={<Link className="nk-button nk-button-primary" to="/app">Ir al panel</Link>} />
  }
  if (moduleKey === 'administracion-clientes' && !isNexoAdmin) {
    return <ErrorPage as="section" code="Error 403" title="Acceso reservado a Nexo Klar" description="Esta vista está reservada para la administración global. Solicita ayuda a soporte si necesitas gestionar tu empresa." icon={IconLock} actions={<Link className="nk-button nk-button-primary" to="/app">Ir al panel</Link>} />
  }
  return <Outlet />
}

function AppLayoutContent() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const domain = pageDomain(pathname)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
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

  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    const sidebar = document.getElementById('nk-primary-sidebar')
    sidebar?.querySelector('.nk-sidebar-mobile-close')?.focus()
    const onKeyDown = event => {
      if (event.key === 'Tab' && sidebar) {
        const focusable = [...sidebar.querySelectorAll('a[href], button:not([disabled])')].filter(element => element.getClientRects().length)
        if (focusable.length) {
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) { event.preventDefault(); first.focus() }
        }
      }
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const onResize = () => { if (window.innerWidth >= 1024) setMobileMenuOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [mobileMenuOpen])

  return (
    <ModuleAccessProvider modules={modules} userModules={['client_admin', 'domian_admin'].includes(session?.user?.role) ? {} : (session?.user?.permissions?.modules || {})} loading={loadingModules}>
      <div className="nk-app-shell">
        {mobileMenuOpen && <button className="nk-mobile-backdrop" type="button" aria-label="Cerrar navegación" onClick={() => { setMobileMenuOpen(false); menuButtonRef.current?.focus() }} />}
        <Sidebar mobileOpen={mobileMenuOpen} onClose={() => { setMobileMenuOpen(false); menuButtonRef.current?.focus() }} />
        <div className="nk-app-content">
          <Header branding={branding} menuOpen={mobileMenuOpen} menuButtonRef={menuButtonRef} onToggleMenu={() => setMobileMenuOpen(value => !value)} />
          <main className="nk-app-main" data-page-domain={domain || undefined}>
            {domain && <div className="nk-page-domain nk-app-page-domain">{domain}</div>}
            <OperationFeedback><ModuleOutlet /></OperationFeedback>
            <FreePlanNotice />
          </main>
        </div>
      </div>
    </ModuleAccessProvider>
  )
}

export default function AppLayout() { return <SubscriptionProvider><AppLayoutContent /></SubscriptionProvider> }
