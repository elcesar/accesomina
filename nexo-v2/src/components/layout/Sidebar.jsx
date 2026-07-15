import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/auth.jsx'
import {
  IconLayoutDashboard, IconBell, IconChartBar,
  IconBuilding, IconFileText, IconBriefcase, IconTruck, IconBed,
  IconUsers, IconShieldCheck, IconCertificate, IconHelmet, IconBan,
  IconSettings, IconLogout, IconChevronRight
} from '@tabler/icons-react'

const NAV_GROUPS = [
  {
    label: 'Vista general',
    items: [
      { to: '/', icon: IconLayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/alertas', icon: IconBell, label: 'Alertas', badge: 0 },
      { to: '/reportes', icon: IconChartBar, label: 'Reportes' },
    ]
  },
  {
    label: 'Operación',
    items: [
      { to: '/mandantes', icon: IconBuilding, label: 'Mandantes' },
      { to: '/contratos', icon: IconFileText, label: 'Contratos' },
      { to: '/proyectos', icon: IconBriefcase, label: 'Proyectos' },
      { to: '/vehiculos', icon: IconTruck, label: 'Vehículos' },
      { to: '/hoteleria', icon: IconBed, label: 'Hotelería' },
    ]
  },
  {
    label: 'Personal',
    items: [
      { to: '/trabajadores', icon: IconUsers, label: 'Trabajadores' },
      { to: '/acreditacion', icon: IconShieldCheck, label: 'Acreditación' },
      { to: '/cursos', icon: IconCertificate, label: 'Cursos y exámenes' },
      { to: '/epp', icon: IconHelmet, label: 'EPP' },
      { to: '/bloqueados', icon: IconBan, label: 'Bloqueados' },
    ]
  }
]

function NavItem({ to, icon: Icon, label, badge, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
          isActive
            ? 'bg-brand/15 text-brand font-medium'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`
      }
    >
      <Icon size={17} strokeWidth={1.8} />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="w-56 h-screen bg-surface flex flex-col border-r border-white/8 flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Nexo</p>
            <p className="text-gray-500 text-xs leading-none mt-0.5">by Domian</p>
          </div>
        </div>
      </div>

      {/* Tenant name */}
      {session?.tenant && (
        <div className="px-4 py-2.5 border-b border-white/8">
          <p className="text-xs text-gray-500 truncate">{session.tenant.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-medium text-gray-600 uppercase tracking-wider">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 py-3 border-t border-white/8 space-y-0.5">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-brand/15 text-brand' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`
          }
        >
          <IconSettings size={17} strokeWidth={1.8} />
          <span>Configuración</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors"
        >
          <IconLogout size={17} strokeWidth={1.8} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* User */}
      {session?.user && (
        <div className="px-4 py-3 border-t border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0">
              <span className="text-brand text-xs font-medium">
                {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-300 truncate">{session.user.name || session.user.email}</p>
              <p className="text-xs text-gray-600 truncate capitalize">{session.user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
