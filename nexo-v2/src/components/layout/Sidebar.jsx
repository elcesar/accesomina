import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../services/auth.jsx'
import {
  IconLayoutDashboard, IconBell, IconBook, IconServer,
  IconUsers, IconClipboardList, IconClock, IconShield, IconSchool,
  IconMicroscope, IconStethoscope, IconBan,
  IconBuilding, IconFileText, IconTool, IconBriefcase, IconSitemap,
  IconCar, IconBed, IconId, IconBrandWhatsapp,
  IconBuildingCommunity, IconCircleCheck, IconAlertTriangle, IconClipboard,
  IconChartBar, IconArrowsUpDown, IconUsersGroup, IconHistory, IconShieldLock,
  IconSettings, IconPackage, IconTruckDelivery, IconTools,
  IconBox, IconTestPipe, IconBuildingWarehouse, IconArrowsExchange, IconChevronDown,
} from '@tabler/icons-react'
import '../../styles/sidebar.css'

const NAV = [
  {
    key: 'centro-control',
    label: 'Centro de Control',
    items: [
      { to: '/app', label: 'Panel General', icon: IconLayoutDashboard, exact: true },
      { to: '/app/alertas', label: 'Alertas', icon: IconBell, badge: true },
      { to: '/app/reclutamiento', label: 'Gestión de trabajadores por proyecto', icon: IconClipboardList },
      { to: '/app/operaciones', label: 'Centro Operativo', icon: IconServer },
    ],
  },
  {
    key: 'capital-humano',
    label: 'Capital Humano',
    items: [
      { to: '/app/trabajadores', label: 'Personas', icon: IconUsers },
      { to: '/app/turnos', label: 'Turnos y asistencia', icon: IconClock },
      { to: '/app/epp', label: 'Protección personal / EPP', icon: IconShield, badge: true },
      { to: '/app/cursos', label: 'Formación y certificaciones', icon: IconSchool },
      { to: '/app/examenes', label: 'Exámenes y aptitudes', icon: IconMicroscope },
      { to: '/app/salud', label: 'Salud Ocupacional', icon: IconStethoscope },
      { to: '/app/bloqueados', label: 'Restringidos', icon: IconBan },
    ],
  },
  {
    key: 'gestion-operacional',
    label: 'Gestión Operacional',
    items: [
      { to: '/app/llamados', label: 'Comunicaciones y convocatorias', icon: IconBrandWhatsapp },
      { to: '/app/vehiculos', label: 'Vehículos, activos y equipos', icon: IconCar },
      { to: '/app/hoteleria', label: 'Alojamientos y estadías', icon: IconBed },
      { to: '/app/credenciales', label: 'Credenciales', icon: IconId },
    ],
  },
  {
    key: 'contratistas',
    label: 'Contratistas',
    items: [
      { to: '/app/subcontratos', label: 'Terceros y subcontratos', icon: IconSitemap },
      { to: '/app/modulos/contratos-convenios', label: 'Contratos y convenios', icon: IconFileText },
      { to: '/app/modulos/personal-empresa-servicios', label: 'Personal del contratista', icon: IconUsers },
      { to: '/app/modulos/habilitaciones-cumplimiento', label: 'Habilitaciones y cumplimiento', icon: IconCircleCheck },
      { to: '/app/modulos/evaluacion-desempeno', label: 'Evaluación de desempeño', icon: IconChartBar },
    ],
  },
  {
    key: 'relacion-comercial',
    label: 'Relación Comercial',
    items: [
      { to: '/app/clientes', label: 'Clientes', icon: IconBuilding },
      { to: '/app/contratos', label: 'Contratos y firmas', icon: IconFileText, badge: true },
      { to: '/app/servicios', label: 'Órdenes de servicio', icon: IconTool },
    ],
  },
  {
    key: 'cumplimiento-calidad',
    label: 'Cumplimiento y Calidad',
    items: [
      { to: '/app/acreditacion-empresa', label: 'Documentación de la Empresa', icon: IconBuildingCommunity },
      { to: '/app/acreditacion-mandante', label: 'Habilitación del Cliente', icon: IconCircleCheck },
      { to: '/app/incidentes', label: 'Incidentes y no conformidades', icon: IconAlertTriangle },
      { to: '/app/auditoria', label: 'Auditoría', icon: IconClipboard },
    ],
  },
  {
    key: 'proyectos-negocios',
    label: 'Gestión de Proyectos y Negocios',
    items: [
      { to: '/app/libro-obra', label: 'Libro de obra', icon: IconBook, badge: true },
      { to: '/app/oportunidades', label: 'Prospectos y oportunidades', icon: IconBriefcase },
    ],
  },
  {
    key: 'activos-inventario',
    label: 'Activos, Equipos e Inventario',
    items: [
      { to: '/app/modulos/activos-inventario', label: 'Inventario y existencias', icon: IconPackage },
      { to: '/app/modulos/maquinaria', label: 'Maquinaria', icon: IconTruckDelivery },
      { to: '/app/modulos/equipos-instrumentos', label: 'Equipos e instrumentos', icon: IconTool },
      { to: '/app/modulos/herramientas', label: 'Herramientas', icon: IconTools },
      { to: '/app/modulos/epp-inventario', label: 'EPP y protección personal', icon: IconShield },
      { to: '/app/modulos/materiales', label: 'Materiales y ferretería', icon: IconBox },
      { to: '/app/modulos/insumos', label: 'Insumos y consumibles', icon: IconTestPipe },
      { to: '/app/modulos/bodegas', label: 'Bodegas y almacenes', icon: IconBuildingWarehouse },
      { to: '/app/modulos/movimientos-inventario', label: 'Movimientos de inventario', icon: IconArrowsExchange },
      { to: '/app/modulos/mantenimiento', label: 'Mantenimiento', icon: IconTools },
      { to: '/app/modulos/asignaciones-prestamos', label: 'Asignaciones y préstamos', icon: IconClipboardList },
    ],
  },
  {
    key: 'gestion-administracion',
    label: 'Gestión y Administración',
    items: [
      { to: '/app/reportes', label: 'Reportes y analítica', icon: IconChartBar },
      { to: '/app/transferencia', label: 'Importar y exportar', icon: IconArrowsUpDown },
      { to: '/app/usuarios', label: 'Usuarios y permisos', icon: IconUsersGroup },
      { to: '/app/bitacora', label: 'Bitácora de cambios', icon: IconHistory },
      { to: '/app/privacidad', label: 'Privacidad y datos', icon: IconShieldLock },
    ],
  },
]

function NavItem({ to, icon: Icon, label, badge, exact, badgeCount }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => `nk-side-link ${isActive ? 'active' : ''}`}
    >
      <Icon size={15} strokeWidth={1.7} />
      <span className="nk-side-link-label">{label}</span>
      {badge && badgeCount > 0 && (
        <span className="nk-side-badge">{badgeCount}</span>
      )}
    </NavLink>
  )
}

function NavGroup({ group, badges, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="nk-side-group">
      <button
        className="nk-side-group-title"
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <IconChevronDown size={12} strokeWidth={2} />
      </button>

      {open && (
        <div className="nk-side-group-items">
          {group.items.map(item => (
            <NavItem
              key={item.to}
              {...item}
              badgeCount={badges[item.to] || 0}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function Sidebar() {
  const { session } = useAuth()

  const badges = {
    '/app/alertas': session?.state?.alertCount || 0,
    '/app/libro-obra': session?.state?.workBookCount || 0,
    '/app/contratos': session?.state?.pendingSignatures || 0,
    '/app/epp': session?.state?.eppPending || 0,
  }

  return (
    <aside className="nk-sidebar">
      <div className="nk-sidebar-brand">
        <img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
      </div>

      <nav className="nk-sidebar-nav" aria-label="Navegación principal">
        {NAV.map(group => (
          <NavGroup
            key={group.key}
            group={group}
            badges={badges}
            defaultOpen={['centro-control', 'capital-humano', 'relacion-comercial'].includes(group.key)}
          />
        ))}
      </nav>

      <div className="nk-sidebar-bottom">
        <NavLink
          to="/app/configuracion"
          className={({ isActive }) => `nk-sidebar-action ${isActive ? 'active' : ''}`}
        >
          <IconSettings size={15} strokeWidth={1.7} />
          <span>Configuración</span>
        </NavLink>
      </div>
    </aside>
  )
}
