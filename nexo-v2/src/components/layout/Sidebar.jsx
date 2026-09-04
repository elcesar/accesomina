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
  IconSettings, IconLogout, IconPackage, IconTruckDelivery, IconTools,
  IconBox, IconTestPipe, IconBuildingWarehouse, IconArrowsExchange, IconChevronDown,
} from '@tabler/icons-react'
import { useState } from 'react'

// ─── GRUPOS (estructura 1:1 con Ricardo v6 AccesoMina_v6.html) ──────────────
// Grupos: Centro de Control · Capital Humano · Gestión Operacional ·
//         Contratistas · Relación Comercial · Cumplimiento y Calidad ·
//         Gestión de Proyectos y Negocios · Activos Equipos e Inventario ·
//         Gestión y Administración
const NAV = [
  {
    key: 'centro-control',
    label: 'Centro de Control',
    items: [
      { to: '/app',              label: 'Panel General',                   icon: IconLayoutDashboard, exact: true },
      { to: '/app/alertas',      label: 'Alertas',                         icon: IconBell,            badge: true },
      { to: '/app/reclutamiento',label: 'Gestión de trabajadores por proyecto', icon: IconClipboardList },
      { to: '/app/operaciones',  label: 'Centro Operativo',                icon: IconServer },
    ],
  },
  {
    key: 'capital-humano',
    label: 'Capital Humano',
    items: [
      { to: '/app/trabajadores', label: 'Personas',                        icon: IconUsers },
      { to: '/app/turnos',       label: 'Turnos y asistencia',             icon: IconClock },
      { to: '/app/epp',          label: 'Protección personal / EPP',       icon: IconShield,          badge: true },
      { to: '/app/cursos',       label: 'Formación y certificaciones',     icon: IconSchool },
      { to: '/app/examenes',     label: 'Exámenes y aptitudes',            icon: IconMicroscope },
      { to: '/app/salud',        label: 'Salud Ocupacional',               icon: IconStethoscope },
      { to: '/app/bloqueados',   label: 'Restringidos',                    icon: IconBan },
    ],
  },
  {
    key: 'gestion-operacional',
    label: 'Gestión Operacional',
    items: [
      { to: '/app/llamados',     label: 'Comunicaciones y convocatorias',  icon: IconBrandWhatsapp },
      { to: '/app/vehiculos',    label: 'Vehículos, activos y equipos',    icon: IconCar },
      { to: '/app/hoteleria',    label: 'Alojamientos y estadías',         icon: IconBed },
      { to: '/app/credenciales', label: 'Credenciales',                    icon: IconId },
    ],
  },
  {
    key: 'contratistas',
    label: 'Contratistas',
    items: [
      { to: '/app/subcontratos',                              label: 'Terceros y subcontratos',       icon: IconSitemap },
      { to: '/app/modulos/contratos-convenios',               label: 'Contratos y convenios',         icon: IconFileText },
      { to: '/app/modulos/personal-empresa-servicios',        label: 'Personal del contratista',      icon: IconUsers },
      { to: '/app/modulos/habilitaciones-cumplimiento',       label: 'Habilitaciones y cumplimiento', icon: IconCircleCheck },
      { to: '/app/modulos/evaluacion-desempeno',              label: 'Evaluación de desempeño',       icon: IconChartBar },
    ],
  },
  {
    key: 'relacion-comercial',
    label: 'Relación Comercial',
    items: [
      { to: '/app/clientes',      label: 'Clientes',                       icon: IconBuilding },
      { to: '/app/contratos',     label: 'Contratos y firmas',             icon: IconFileText,        badge: true },
      { to: '/app/servicios',     label: 'Órdenes de servicio',            icon: IconTool },
    ],
  },
  {
    key: 'cumplimiento-calidad',
    label: 'Cumplimiento y Calidad',
    items: [
      { to: '/app/acreditacion-empresa',  label: 'Documentación de la Empresa',  icon: IconBuildingCommunity },
      { to: '/app/acreditacion-mandante', label: 'Habilitación del Cliente',      icon: IconCircleCheck },
      { to: '/app/incidentes',            label: 'Incidentes y no conformidades', icon: IconAlertTriangle },
      { to: '/app/auditoria',             label: 'Auditoría',                     icon: IconClipboard },
    ],
  },
  {
    key: 'proyectos-negocios',
    label: 'Gestión de Proyectos y Negocios',
    items: [
      { to: '/app/libro-obra',    label: 'Libro de obra',                  icon: IconBook,            badge: true },
      { to: '/app/oportunidades', label: 'Prospectos y oportunidades',     icon: IconBriefcase },
    ],
  },
  {
    key: 'activos-inventario',
    label: 'Activos, Equipos e Inventario',
    items: [
      { to: '/app/modulos/activos-inventario',  label: 'Inventario y existencias',    icon: IconPackage },
      { to: '/app/modulos/maquinaria',          label: 'Maquinaria',                  icon: IconTruckDelivery },
      { to: '/app/modulos/equipos-instrumentos',label: 'Equipos e instrumentos',      icon: IconTool },
      { to: '/app/modulos/herramientas',        label: 'Herramientas',                icon: IconTools },
      { to: '/app/modulos/epp-inventario',      label: 'EPP y protección personal',   icon: IconShield },
      { to: '/app/modulos/materiales',          label: 'Materiales y ferretería',     icon: IconBox },
      { to: '/app/modulos/insumos',             label: 'Insumos y consumibles',       icon: IconTestPipe },
      { to: '/app/modulos/bodegas',             label: 'Bodegas y almacenes',         icon: IconBuildingWarehouse },
      { to: '/app/modulos/movimientos-inventario', label: 'Movimientos de inventario', icon: IconArrowsExchange },
      { to: '/app/modulos/mantenimiento',       label: 'Mantenimiento',               icon: IconTools },
      { to: '/app/modulos/asignaciones-prestamos', label: 'Asignaciones y préstamos', icon: IconClipboardList },
    ],
  },
  {
    key: 'gestion-administracion',
    label: 'Gestión y Administración',
    items: [
      { to: '/app/reportes',      label: 'Reportes y analítica',           icon: IconChartBar },
      { to: '/app/transferencia', label: 'Importar y exportar',            icon: IconArrowsUpDown },
      { to: '/app/usuarios',      label: 'Usuarios y permisos',            icon: IconUsersGroup },
      { to: '/app/bitacora',      label: 'Bitácora de cambios',            icon: IconHistory },
      { to: '/app/privacidad',    label: 'Privacidad y datos',             icon: IconShieldLock },
    ],
  },
]

// ─── NAV ITEM ───────────────────────────────────────────────────────────────
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
      <Icon size={15} strokeWidth={1.7} className="flex-shrink-0" />
      <span className="flex-1 truncate text-xs">{label}</span>
      {badge && badgeCount > 0 && (
        <span className="bg-[#FBE8E6] text-[#B3261E] text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums">
          {badgeCount}
        </span>
      )}
    </NavLink>
  )
}

// ─── NAV GROUP ──────────────────────────────────────────────────────────────
function NavGroup({ group, badges, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors"
        style={{ color: '#8A96A1', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#FBF9F5'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span>{group.label}</span>
        <IconChevronDown
          size={12}
          strokeWidth={2}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            color: '#8A96A1',
          }}
        />
      </button>
      {open && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map(item => (
            <NavItem
              key={item.to}
              {...item}
              badgeCount={badges[item.to] || 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const badges = {
    '/app/alertas':    session?.state?.alertCount        || 0,
    '/app/libro-obra': session?.state?.workBookCount     || 0,
    '/app/contratos':  session?.state?.pendingSignatures || 0,
    '/app/epp':        session?.state?.eppPending        || 0,
  }

  return (
    <aside
      className="w-56 h-screen flex flex-col flex-shrink-0"
      style={{ background: '#FFFFFF', borderRight: '1px solid #E3DED2' }}
    >
      {/* Logo — SVG oficial brandbook */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #E3DED2' }}>
        <img
          src="/brand/NK-color-horizontal.svg"
          alt="Nexo Klar"
          style={{ height: 28, width: 'auto', maxWidth: '100%' }}
        />
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
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
        {NAV.map(group => (
          <NavGroup
            key={group.key}
            group={group}
            badges={badges}
            defaultOpen={['centro-control', 'capital-humano', 'relacion-comercial'].includes(group.key)}
          />
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
          <IconSettings size={15} strokeWidth={1.7} />
          <span className="text-xs">Configuración</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: '#5D6B7A' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#B3261E'; e.currentTarget.style.background = '#FBE8E6' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5D6B7A'; e.currentTarget.style.background = 'transparent' }}
        >
          <IconLogout size={15} strokeWidth={1.7} />
          <span className="text-xs">Cerrar sesión</span>
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
