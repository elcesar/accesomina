import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/auth.jsx'
import {
  IconLayoutDashboard, IconBell, IconBook, IconServer,
  IconUsers, IconClipboardList, IconClock, IconShield, IconSchool,
  IconMicroscope, IconStethoscope, IconBan,
  IconBuilding, IconFileText, IconTool, IconBriefcase, IconSitemap,
  IconCar, IconBed, IconId, IconBrandWhatsapp,
  IconBuildingCommunity, IconCircleCheck, IconAlertTriangle, IconClipboard,
  IconChartBar, IconArrowsUpDown, IconUsersGroup, IconHistory, IconShieldLock,
  IconSettings, IconLogout,
} from '@tabler/icons-react'


const NAV = [
  {
    label: 'Inicio',
    items: [
      { to: '/app',            label: 'Panel General',    icon: IconLayoutDashboard, exact: true },
      { to: '/app/alertas',    label: 'Alertas',          icon: IconBell,            badge: true },
      { to: '/app/libro-obra', label: 'Libro de Obra',    icon: IconBook,            badge: true },
      { to: '/app/operaciones',label: 'Centro Operativo', icon: IconServer },
    ],
  },
  {
    label: 'Personas',
    items: [
      { to: '/app/trabajadores',  label: 'Trabajadores',       icon: IconUsers },
      { to: '/app/reclutamiento', label: 'Personal temporal',  icon: IconClipboardList },
      { to: '/app/turnos',        label: 'Turnos y Jornada',   icon: IconClock },
      { to: '/app/epp',           label: 'EPP y Entregas',     icon: IconShield,       badge: true },
      { to: '/app/cursos',        label: 'Cursos',             icon: IconSchool },
      { to: '/app/examenes',      label: 'Exámenes',           icon: IconMicroscope },
      { to: '/app/salud',         label: 'Salud Ocupacional',  icon: IconStethoscope },
      { to: '/app/bloqueados',    label: 'No habilitados',     icon: IconBan },
    ],
  },
  {
    label: 'Relación comercial',
    items: [
      { to: '/app/clientes',      label: 'Clientes',           icon: IconBuilding },
      { to: '/app/contratos',     label: 'Contratos y Firmas', icon: IconFileText,     badge: true },
      { to: '/app/servicios',     label: 'Órdenes de Servicio',icon: IconTool },
      { to: '/app/oportunidades', label: 'Prospectos',         icon: IconBriefcase },
      { to: '/app/subcontratos',  label: 'Subcontratos',       icon: IconSitemap },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/app/vehiculos',    label: 'Vehículos y Equipos', icon: IconCar },
      { to: '/app/hoteleria',    label: 'Alojamientos',        icon: IconBed },
      { to: '/app/credenciales', label: 'Credenciales',        icon: IconId },
      { to: '/app/llamados',     label: 'Llamados WA',         icon: IconBrandWhatsapp },
    ],
  },
  {
    label: 'Cumplimiento',
    items: [
      { to: '/app/acreditacion-empresa',  label: 'Doc. Empresa',        icon: IconBuildingCommunity },
      { to: '/app/acreditacion-mandante', label: 'Habilitación Cliente', icon: IconCircleCheck },
      { to: '/app/incidentes',            label: 'Incidentes y NC',      icon: IconAlertTriangle },
      { to: '/app/auditoria',             label: 'Auditoría',            icon: IconClipboard },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/app/reportes',      label: 'Reportes',            icon: IconChartBar },
      { to: '/app/transferencia', label: 'Importar / Exportar', icon: IconArrowsUpDown },
      { to: '/app/usuarios',      label: 'Usuarios y Permisos', icon: IconUsersGroup },
      { to: '/app/bitacora',      label: 'Bitácora de Cambios', icon: IconHistory },
      { to: '/app/privacidad',    label: 'Privacidad y Datos',  icon: IconShieldLock },
    ],
  },
]

function NavItem({ to, icon: Icon, label, badge, exact, badgeCount }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-[#E3E3F0] text-[#2A2A8C] font-semibold'
            : 'text-[#5D6B7A] hover:text-[#141A20] hover:bg-[#FBF9F5]'
        }`
      }
    >
      <Icon size={16} strokeWidth={1.7} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge && badgeCount > 0 && (
        <span className="bg-[#FBE8E6] text-[#B3261E] text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums">
          {badgeCount}
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

  const badges = {
    '/app/alertas':    session?.state?.alertCount       || 0,
    '/app/libro-obra': session?.state?.workBookCount    || 0,
    '/app/contratos':  session?.state?.pendingSignatures|| 0,
    '/app/epp':        session?.state?.eppPending       || 0,
  }

  return (
    <aside
      className="w-56 h-screen flex flex-col flex-shrink-0"
      style={{ background: '#FFFFFF', borderRight: '1px solid #E3DED2' }}
    >
      {/* Logo */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #E3DED2' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: '#2A2A8C' }}
          >
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: '#141A20', fontFamily: 'Manrope, sans-serif' }}>
              Nexo <span style={{ color: '#00706A' }}>Klar</span>
            </p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#8A96A1' }}>
              Gestión operativa
            </p>
          </div>
        </div>
      </div>

      {/* Tenant */}
      {session?.tenant && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid #E3DED2' }}>
          <p className="text-xs truncate" style={{ color: '#5D6B7A' }}>
            {session.tenant.name}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(group => (
          <div key={group.label}>
            <p
              className="px-3 mb-1 text-xs font-bold uppercase tracking-wider"
              style={{ color: '#8A96A1' }}
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem
                  key={item.to}
                  {...item}
                  badgeCount={badges[item.to] || 0}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Configuración + logout */}
      <div className="px-2 py-3 space-y-0.5" style={{ borderTop: '1px solid #E3DED2' }}>
        <NavLink
          to="/app/configuracion"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-[#E3E3F0] text-[#2A2A8C] font-semibold'
                : 'text-[#5D6B7A] hover:text-[#141A20] hover:bg-[#FBF9F5]'
            }`
          }
        >
          <IconSettings size={16} strokeWidth={1.7} />
          <span>Configuración</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: '#5D6B7A' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#B3261E'; e.currentTarget.style.background = '#FBE8E6' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5D6B7A'; e.currentTarget.style.background = 'transparent' }}
        >
          <IconLogout size={16} strokeWidth={1.7} />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Usuario */}
      {session?.user && (
        <div className="px-4 py-3" style={{ borderTop: '1px solid #E3DED2' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: '#E3E3F0', color: '#2A2A8C' }}
            >
              {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#141A20' }}>
                {session.user.name || session.user.email}
              </p>
              <p className="text-xs truncate capitalize" style={{ color: '#8A96A1' }}>
                {session.user.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
