import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import MobileModuleNav from './MobileModuleNav.jsx'

export default function AppLayout() {
  return (
    <div className="nk-app-shell">
      <a className="nk-skip-link" href="#contenido-principal">Ir al contenido principal</a>
      <Sidebar />
      <div className="nk-app-content">
        <Header mobileNavigation={<MobileModuleNav />} />
        <main id="contenido-principal" className="nk-app-main" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
