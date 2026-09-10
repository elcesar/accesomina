import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import MobileModuleNav from './MobileModuleNav.jsx'

function pageDomain(pathname) {
  if (
    pathname.startsWith('/app/trabajadores') ||
    pathname.startsWith('/app/turnos') ||
    pathname.startsWith('/app/epp') ||
    pathname.startsWith('/app/cursos') ||
    pathname.startsWith('/app/examenes') ||
    pathname.startsWith('/app/salud') ||
    pathname.startsWith('/app/bloqueados')
  ) return 'Capital Humano'

  if (
    pathname.startsWith('/app/clientes') ||
    pathname.startsWith('/app/contratos') ||
    pathname.startsWith('/app/servicios')
  ) return 'Relación Comercial'

  if (
    pathname.startsWith('/app/llamados') ||
    pathname.startsWith('/app/comunicaciones') ||
    pathname.startsWith('/app/vehiculos') ||
    pathname.startsWith('/app/hoteleria') ||
    pathname.startsWith('/app/credenciales')
  ) return 'Gestión Operacional'

  return ''
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const domain = pageDomain(pathname)

  return (
    <div className="nk-app-shell" style={{ background: 'var(--bg)' }}>
      <a className="nk-skip-link" href="#contenido-principal">Ir al contenido principal</a>
      <Sidebar />
      <div className="nk-app-content">
        <Header mobileNavigation={<MobileModuleNav />} />
        <main
          id="contenido-principal"
          className="nk-app-main"
          tabIndex="-1"
          data-page-domain={domain || undefined}
          style={{ background: 'var(--bg)' }}
        >
          {domain && <div className="nk-page-domain nk-app-page-domain">{domain}</div>}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
