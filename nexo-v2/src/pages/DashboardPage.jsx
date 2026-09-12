import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconArrowRight, IconClipboardCheck, IconRefresh, IconShield, IconUsers } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { alertKind, daysUntil, operationalAlerts, rows } from '../services/operational-alerts.js'
import '../styles/control-center.css'

const ACTIVE_ASSIGNMENT_STAGES = new Set(['asignado', 'habilitado'])

function Metric({ icon: Icon, label, value, tone = '' }) {
  return <article className={`nk-dashboard-metric ${tone}`}><Icon size={18}/><div><b>{value}</b><span>{label}</span></div></article>
}

function assignmentStage(assignment) {
  const explicit = String(assignment?.estadoGestion || '').toLowerCase()
  if (explicit) return explicit
  return String(assignment?.estado || '').toLowerCase() === 'confirmado' ? 'asignado' : ''
}

function activeRestriction(item) {
  if (!item || item.activa === false) return false
  if (item.hasta) {
    const end = new Date(`${String(item.hasta).slice(0, 10)}T23:59:59`)
    if (!Number.isNaN(end.getTime()) && end < new Date()) return false
  }
  return !/levantad|cerrad|inactiv/.test(String(item.estado || '').toLowerCase())
}

export default function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar el panel de control.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const state = response?.state || response || {}

  const derived = useMemo(() => {
    const people = rows(state.trabajadores)
    const alerts = operationalAlerts(state)
    const restrictions = rows(state.restricted).filter(activeRestriction)
    const deliveries = rows(state.eppDeliveries || state.eppEntregas)
    const assignments = rows(state.asignaciones)
    const shifts = rows(state.turnos)
    const orders = rows(state.mantenciones).filter(item => !['cerrada', 'cancelada'].includes(String(item.estado || '').toLowerCase()))
    const today = new Date().toISOString().slice(0, 10)

    const restrictedIds = new Set(restrictions.map(item => item.workerId || item.trabId || item.personaId).filter(Boolean).map(String))
    people.forEach(person => {
      if (person.bloqueado || String(person.disponibilidad || '').toLowerCase() === 'bloqueado' || String(person.operationalStatus || '').toLowerCase() === 'bloqueado') restrictedIds.add(String(person.id))
    })

    const assignedIds = new Set(assignments.filter(item => ACTIVE_ASSIGNMENT_STAGES.has(assignmentStage(item))).map(item => String(item.trabId)).filter(Boolean))
    const presentIds = new Set(shifts.filter(item => (item.fecha || item.date) === today && String(item.asistencia || item.estado || item.status || '').toLowerCase() === 'presente').map(item => String(item.trabId || item.workerId)).filter(Boolean))
    const eppDue = deliveries.filter(item => {
      const days = daysUntil(item.replaceAt)
      return days !== null && days <= 30
    }).length

    const alertCounts = alerts.reduce((out, item) => {
      out[alertKind(item)] += 1
      return out
    }, { critical: 0, upcoming: 0, operation: 0 })

    return {
      people,
      alerts,
      alertCounts,
      restricted: restrictedIds.size,
      assigned: assignedIds.size,
      presentToday: presentIds.size,
      orders: orders.length,
      eppDue,
    }
  }, [state])

  const priorities = [
    derived.alertCounts.critical > 0 && { label: `${derived.alertCounts.critical} alerta${derived.alertCounts.critical === 1 ? '' : 's'} crítica${derived.alertCounts.critical === 1 ? '' : 's'} o vencida${derived.alertCounts.critical === 1 ? '' : 's'}`, to: '/app/alertas' },
    derived.restricted > 0 && { label: `${derived.restricted} persona${derived.restricted === 1 ? '' : 's'} restringida${derived.restricted === 1 ? '' : 's'}`, to: '/app/bloqueados' },
    derived.alertCounts.upcoming > 0 && { label: `${derived.alertCounts.upcoming} alerta${derived.alertCounts.upcoming === 1 ? '' : 's'} próxima${derived.alertCounts.upcoming === 1 ? '' : 's'} a vencer`, to: '/app/alertas' },
    derived.eppDue > 0 && { label: `${derived.eppDue} entrega${derived.eppDue === 1 ? '' : 's'} EPP requiere${derived.eppDue === 1 ? '' : 'n'} reposición`, to: '/app/epp' },
    derived.alertCounts.operation > 0 && { label: `${derived.alertCounts.operation} pendiente${derived.alertCounts.operation === 1 ? '' : 's'} operacional${derived.alertCounts.operation === 1 ? '' : 'es'}`, to: '/app/alertas' },
  ].filter(Boolean).slice(0, 5)

  const role = session?.user?.role || 'consulta'
  const roleFocus = {
    rrhh: { title: 'Personas y asignaciones', copy: 'Revisa disponibilidad, habilitación y personas que requieren intervención.', action: 'Ver personas', to: '/app/trabajadores' },
    prevencion: { title: 'Cumplimiento preventivo', copy: 'Prioriza EPP, restricciones y alertas antes de la operación.', action: 'Ver alertas', to: '/app/alertas' },
    acreditacion: { title: 'Habilitación y evidencia', copy: 'Revisa vencimientos y brechas que pueden impedir la habilitación.', action: 'Ver habilitación', to: '/app/acreditacion-mandante' },
    client_admin: { title: 'Control de la empresa', copy: 'Mantén visibles operación, dotación y brechas críticas desde una sola vista.', action: 'Ver centro operativo', to: '/app/operaciones' },
    domian_admin: { title: 'Control de la empresa', copy: 'Mantén visibles operación, dotación y brechas críticas desde una sola vista.', action: 'Ver centro operativo', to: '/app/operaciones' },
    consulta: { title: 'Consulta de operación', copy: 'Revisa el estado actualizado de personas, órdenes y alertas.', action: 'Ver alertas', to: '/app/alertas' },
  }[role] || { title: 'Control de la empresa', copy: 'Revisa brechas y prioridades operativas.', action: 'Ver centro operativo', to: '/app/operaciones' }

  return <section className="nk-dashboard">
    <header className="nk-module-header"><div><h1>Estado de la operación</h1><p>Identifica rápidamente la capacidad operativa, las restricciones y las alertas que requieren atención.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button></header>
    {error && <div className="nk-control-feedback"><span>{error}</span><button className="nk-button nk-button-quiet" type="button" onClick={load}>Reintentar</button></div>}
    <div className="nk-dashboard-grid"><Metric icon={IconUsers} label="Personas registradas" value={loading ? '…' : derived.people.length}/><Metric icon={IconShield} label="Personas restringidas" value={loading ? '…' : derived.restricted} tone="error"/><Metric icon={IconClipboardCheck} label="OS activas" value={loading ? '…' : derived.orders} tone="teal"/><Metric icon={IconAlertTriangle} label="Alertas pendientes" value={loading ? '…' : derived.alerts.length} tone="amber"/></div>
    <section className="nk-role-focus"><div><p className="nk-module-kicker">Tu prioridad hoy</p><h2>{roleFocus.title}</h2><span>{roleFocus.copy}</span></div><button className="nk-button nk-button-primary" type="button" onClick={() => navigate(roleFocus.to)}>{roleFocus.action}<IconArrowRight size={16}/></button></section>
    <div className="nk-dashboard-columns"><article className="nk-module-card"><h2>Requiere atención</h2><p>Brechas derivadas desde Alertas, Personas y EPP.</p>{priorities.length ? <ul className="nk-dashboard-list">{priorities.map(item => <li key={item.label}><button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(item.to)}>{item.label}<IconArrowRight size={14}/></button></li>)}</ul> : <div className="nk-module-empty"><IconClipboardCheck size={26}/><b>Sin brechas críticas detectadas</b><span>Las restricciones, vencimientos y reposiciones aparecerán aquí.</span></div>}</article><article className="nk-module-card"><h2>Operación hoy</h2><p>Indicadores rápidos de dotación y ejecución.</p><ol className="nk-dashboard-route"><li>{derived.assigned} personas asignadas o habilitadas</li><li>{derived.presentToday} personas presentes registradas hoy</li><li>{derived.orders} órdenes de servicio activas</li><li>{derived.eppDue} reposiciones EPP próximas o vencidas</li></ol></article></div>
  </section>
}
