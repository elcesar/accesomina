import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../services/auth.jsx'
import { canUseModule, moduleFor } from '../private/moduleCatalog.js'
import { IconLayoutDashboard, IconBell, IconSatellite, IconBook, IconUsers, IconClock, IconShield, IconSchool, IconMicroscope, IconStethoscope, IconBan, IconBuilding, IconFileText, IconTool, IconBriefcase, IconSitemap, IconCar, IconBed, IconId, IconBrandWhatsapp, IconCircleCheck, IconAlertTriangle, IconClipboardCheck, IconChartBar, IconArrowsExchange, IconSettings, IconHistory, IconShieldLock, IconBox, IconBuildingWarehouse, IconTools, IconLogout, IconChevronDown } from '@tabler/icons-react'

const groups = [
  ['Centro de control', [['/', 'Panel de control', IconLayoutDashboard], ['alertas', 'Alertas', IconBell], ['gestion-personal-proyecto', 'Gestión de personal por proyecto', IconClipboardCheck], ['centro-operativo', 'Centro Operativo', IconSatellite]]],
  ['Capital humano', [['personas', 'Personas', IconUsers], ['turnos-asistencia', 'Turnos y asistencia', IconClock], ['proteccion-epp', 'Protección personal (EPP)', IconShield], ['formacion', 'Formación y certificaciones', IconSchool], ['examenes', 'Exámenes y aptitudes', IconMicroscope], ['salud-ocupacional', 'Salud ocupacional', IconStethoscope], ['restringidos', 'Restringidos', IconBan]]],
  ['Gestión operacional', [['comunicaciones', 'Comunicaciones y convocatorias', IconBrandWhatsapp], ['vehiculos', 'Flota y equipos móviles', IconCar], ['alojamientos', 'Alojamientos y estadías', IconBed], ['credenciales', 'Credenciales de acceso', IconId], ['incidentes', 'Incidentes y no conformidades', IconAlertTriangle]]],
  ['Empresas colaboradoras', [['terceros-subcontratos', 'Terceros y subcontratos', IconSitemap], ['contratos-convenios', 'Contratos de empresas colaboradoras', IconFileText], ['personal-empresa-servicios', 'Personas de empresas colaboradoras', IconUsers], ['habilitaciones-cumplimiento', 'Requisitos y cumplimiento de terceros', IconCircleCheck], ['evaluacion-desempeno', 'Evaluación de desempeño', IconChartBar]]],
  ['Relación comercial', [['prospectos', 'Prospectos y oportunidades', IconBriefcase], ['clientes', 'Clientes', IconBuilding], ['contratos', 'Contratos y firmas', IconFileText], ['ordenes-servicio', 'Órdenes de servicio', IconTool]]],
  ['Cumplimiento y calidad', [['cumplimiento-corporativo', 'Cumplimiento corporativo', IconBuilding], ['habilitacion-cliente', 'Requisitos del cliente', IconCircleCheck], ['auditoria', 'Auditoría', IconClipboardCheck]]],
  ['Gestión de proyectos y negocios', [['libro-obra', 'Bitácora operativa', IconBook]]],
  ['Activos, equipos e inventario', [['activos-inventario', 'Activos, equipos e inventario', IconBox], ['maquinaria', 'Maquinaria', IconTool], ['equipos-instrumentos', 'Equipos e instrumentos', IconSitemap], ['herramientas', 'Herramientas', IconTools], ['epp-inventario', 'Inventario de EPP', IconShield], ['materiales', 'Materiales y ferretería', IconBox], ['insumos', 'Insumos y consumibles', IconBox], ['bodegas', 'Bodegas', IconBuildingWarehouse], ['movimientos-inventario', 'Movimientos de inventario', IconArrowsExchange], ['mantenimiento', 'Mantenimiento', IconTools], ['asignaciones-prestamos', 'Asignaciones y préstamos', IconClipboardCheck]]],
  ['Gestión y gobierno', [['reportes', 'Reportes y analítica', IconChartBar], ['configuracion', 'Configuración de la empresa', IconSettings], ['importar-exportar', 'Importar y exportar', IconArrowsExchange], ['usuarios-permisos', 'Usuarios y permisos', IconUsers], ['bitacora', 'Bitácora de cambios', IconHistory], ['privacidad', 'Privacidad y datos', IconShieldLock], ['administracion-clientes', 'Administración de clientes', IconBuilding]]],
]

const route = id => id === '/' ? '/app' : `/app/${id}`
function Group({ name, items, session }) { const [open, setOpen] = useState(true); const visible=items.filter(([id])=>id==='/'||canUseModule(moduleFor(id),session)); if(!visible.length)return null; return <section className="nk-side-group"><button className="nk-side-group-title" onClick={() => setOpen(!open)} aria-expanded={open}>{name}<IconChevronDown size={15} className={open ? '' : 'closed'} /></button>{open && visible.map(([id,label,Icon]) => <NavLink end={id === '/'} className={({isActive}) => `nk-side-link ${isActive ? 'active':''}`} to={route(id)} key={id}><Icon size={17}/><span>{label}</span></NavLink>)}</section> }

export default function Sidebar() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }
  return <aside className="nk-sidebar"><div className="nk-sidebar-brand"><img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" /></div>{session?.tenant && <div className="nk-tenant-name">{session.tenant.name}</div>}<nav>{groups.map(([name,items]) => <Group key={name} name={name} items={items} session={session} />)}</nav><div className="nk-sidebar-bottom"><button onClick={handleLogout}><IconLogout size={17}/>Cerrar sesión</button></div></aside>
}
