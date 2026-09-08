import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconArrowRight, IconClipboardCheck, IconRefresh, IconShield, IconUsers } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/control-center.css'

const rows = value => Array.isArray(value) ? value : []

function daysUntil(value) {
  if (!value) return null
  const target = new Date(`${value}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function Metric({ icon: Icon, label, value, tone = '' }) {
  return <article className={`nk-dashboard-metric ${tone}`}><Icon size={18}/><div><b>{value}</b><span>{label}</span></div></article>
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
    const alerts = [...rows(state.alertas), ...rows(state.callouts)]
    const restrictions = rows(state.restricted)
    const deliveries = rows(state.eppDeliveries)
    const today = new Date().toISOString().slice(0, 10)
    const attendances = rows(state.asistencias)
    const requirements = people.flatMap(person => rows(person.workerItems).filter(item => ['examen', 'curso', 'certificacion'].includes(item.type)))
    const expiring = requirements.filter(item => {
      const days = daysUntil(item.vence)
      return days !== null && days >= 0 && days <= 30
    }).length
    const expired = requirements.filter(item => {
      const days = daysUntil(item.vence)
      return item.estado === 'rechazado' || (days !== null && days < 0)
    }).length
    const eppDue = deliveries.filter(item => {
      const days = daysUntil(item.replaceAt)
      return days !== null && days <= 30
    }).length

    return {
      people,
      alerts,
      restricted: people.filter(person => person.disponibilidad === 'bloqueado').length || restrictions.length,
      assigned: people.filter(person => person.disponibilidad === 'asignado').length,
      presentToday: attendances.filter(item => (item.fecha || item.date) === today && !/ausente|falta/i.test(String(item.estado || item.status || ''))).length,
      orders: rows(state.mantenciones).length,
      expiring,
      expired,
      eppDue,
    }
  }, [state])

  const priorities = [
    derived.restricted > 0 && { label: `${derived.restricted} persona${derived.restricted === 1 ? '' : 's'} restringida${derived.restricted === 1 ? '' : 's'}`, to: '/app/bloqueados' },
    derived.expired > 0 && { label: `${derived.expired} requisito${derived.expired === 1 ? '' : 's'} vencido${derived.expired === 1 ? '' : 's'} o rechazado${derived.expired === 1 ? '' : 's'}`, to: '/app/examenes' },
    derived.expiring > 0 && { label: `${derived.expiring} requisito${derived.expiring === 1 ? '' : 's'} por vencer`, to: '/app/cursos' },
    derived.eppDue > 0 && { label: `${derived.eppDue} entrega${derived.eppDue === 1 ? '' : 's'} EPP requiere${derived.eppDue === 1 ? '' : 'n'} reposición`, to: '/app/epp' },
    derived.alerts.length > 0 && { label: `${derived.alerts.length} alerta${derived.alerts.length === 1 ? '' : 's'} registrada${derived.alerts.length === 1 ? '' : 's'}`, to: '/app/alertas' },
  ].filter(Boolean).slice(0, 5)

  const role = session?.user?.role || 'consulta'
  const roleFocus = {
    rrhh: { title: 'Personas y asignaciones', copy: 'Revisa disponibilidad, habilitación y personas que requieren intervención.', action: 'Ver personas', to: '/app/trabajadores' },
    prevencion: { title: 'Cumplimiento preventivo', copy: 'Prioriza EPP, exámenes, restricciones y alertas antes de la operación.', action: 'Ver alertas', to: '/app/alertas' },
    acreditacion: { title: 'Habilitación y evidencia', copy: 'Revisa vencimientos y brechas que pueden bloquear a una persona.', action: 'Ver formación', to: '/app/cursos' },
    client_admin: { title: 'Control de la empresa', copy: 'Mantén visibles personas, operación y brechas críticas desde una sola vista.', action: 'Ver alertas', to: '/app/alertas' },
    domian_admin: { title: 'Control de la empresa', copy: 'Mantén visibles personas, operación y brechas críticas desde una sola vista.', action: 'Ver alertas', to: '/app/alertas' },
    consulta: { title: 'Consulta de operación', copy: 'Revisa el estado actualizado de personas, órdenes y alertas.', action: 'Ver personas', to: '/app/trabajadores' },
  }[role] || { title: 'Control de la empresa', copy: 'Revisa brechas y prioridades operativas.', action: 'Ver alertas', to: '/app/alertas' }

  return <section className="nk-dashboard">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Centro de Control · {session?.tenant?.name || 'Empresa'}</p><h1>Estado de la operación</h1><p>Identifica rápidamente qué personas están habilitadas, qué requiere atención y cómo está la operación hoy.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button></header>
    {error && <div className="nk-control-feedback"><span>{error}</span><button className="nk-button nk-button-quiet" type="button" onClick={load}>Reintentar</button></div>}
    <div className="nk-dashboard-grid"><Metric icon={IconUsers} label="Personas registradas" value={loading ? '…' : derived.people.length}/><Metric icon={IconShield} label="Personas restringidas" value={loading ? '…' : derived.restricted} tone="error"/><Metric icon={IconClipboardCheck} label="Órdenes registradas" value={loading ? '…' : derived.orders} tone="teal"/><Metric icon={IconAlertTriangle} label="Alertas pendientes" value={loading ? '…' : derived.alerts.length} tone="amber"/></div>
    <section className="nk-role-focus"><div><p className="nk-module-kicker">Tu prioridad hoy</p><h2>{roleFocus.title}</h2><span>{roleFocus.copy}</span></div><button className="nk-button nk-button-primary" type="button" onClick={() => navigate(roleFocus.to)}>{roleFocus.action}<IconArrowRight size={16}/></button></section>
    <div className="nk-dashboard-columns"><article className="nk-module-card"><h2>Requiere atención</h2><p>Brechas derivadas de Personas, cumplimiento y recursos.</p>{priorities.length ? <ul className="nk-dashboard-list">{priorities.map(item => <li key={item.label}><button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(item.to)}>{item.label}<IconArrowRight size={14}/></button></li>)}</ul> : <div className="nk-module-empty"><IconClipboardCheck size={26}/><b>Sin brechas críticas detectadas</b><span>Las restricciones, vencimientos y reposiciones aparecerán aquí.</span></div>}</article><article className="nk-module-card"><h2>Operación hoy</h2><p>Indicadores rápidos para entender capacidad y ejecución.</p><ol className="nk-dashboard-route"><li>{derived.assigned} personas asignadas</li><li>{derived.presentToday} presentes registrados hoy</li><li>{derived.orders} órdenes/servicios registrados</li><li>{derived.eppDue} reposiciones EPP próximas o vencidas</li></ol></article></div>
  </section>
}
