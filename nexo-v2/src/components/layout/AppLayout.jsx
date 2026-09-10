import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'

function pageDomain(pathname) {
  if (
    pathname.startsWith('/app/trabajadores') ||
    pathname.startsWith('/app/turnos') ||
    pathname.startsWith('/app/epp') ||
    pathname.startsWith('/app/formacion') ||
    pathname.startsWith('/app/examenes') ||
    pathname.startsWith('/app/salud') ||
    pathname.startsWith('/app/bloqueados')
  ) return 'Capital Humano'

  if (
    pathname.startsWith('/app/clientes') ||
    pathname.startsWith('/app/contratos') ||
    pathname.startsWith('/app/servicios')
  ) return 'Relación Comercial'

  return ''
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const domain = pageDomain(pathname)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F4EFE3', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header />
        <main
          className="nk-app-main"
          data-page-domain={domain || undefined}
          style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
