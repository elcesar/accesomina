import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import { api } from '../../services/api.js'
import { applyTenantBranding } from '../../services/theme.js'
import { pageDomain } from '../../config/page-domains.js'
import '../../styles/app-layout.css'

export default function AppLayout() {
  const { pathname } = useLocation()
  const domain = pageDomain(pathname)
  const [branding, setBranding] = useState({})

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
      } catch {
        applyBranding({ theme: 'light' })
      }
    }

    const onBrandingChanged = event => {
      applyBranding(event.detail || {})
    }

    loadBranding()
    window.addEventListener('nexo:branding-changed', onBrandingChanged)

    return () => {
      active = false
      window.removeEventListener('nexo:branding-changed', onBrandingChanged)
    }
  }, [])

  return (
    <div className="nk-app-shell">
      <Sidebar />
      <div className="nk-app-content">
        <Header branding={branding} />
        <main className="nk-app-main" data-page-domain={domain || undefined}>
          {domain && <div className="nk-page-domain nk-app-page-domain">{domain}</div>}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
