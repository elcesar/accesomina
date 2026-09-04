import { useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconClipboardCheck, IconFileText, IconRefresh, IconUsers } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

const count = value => Array.isArray(value) ? value.length : 0
function Metric({ icon: Icon, label, value, tone = 'indigo' }) { return <article className={`nk-dashboard-metric ${tone}`}><Icon size={18}/><div><b>{value}</b><span>{label}</span></div></article> }

export default function DashboardPage() {
  const { session } = useAuth()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); try { setResponse(await api.get('/state')) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const state = response?.state || {}
  const metrics = useMemo(() => ({
    personas: count(state.trabajadores),
    contratos: count(state.contratos),
    alertas: count(state.alertas) + count(state.callouts),
    ordenes: count(state.mantenciones),
  }), [state])
  const recent = [...(state.alertas || []), ...(state.callouts || [])].slice(0, 5)
  return <section className="nk-dashboard">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Panel de control · {session?.tenant?.name || 'Empresa'}</p><h1>Estado de la operación</h1><p>Consulta personas, contratos, órdenes de servicio y alertas de la empresa actual.</p></div><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button></header>
    <div className="nk-dashboard-grid"><Metric icon={IconUsers} label="Personas registradas" value={loading ? '…' : metrics.personas}/><Metric icon={IconFileText} label="Contratos registrados" value={loading ? '…' : metrics.contratos}/><Metric icon={IconClipboardCheck} label="Órdenes de servicio" value={loading ? '…' : metrics.ordenes} tone="teal"/><Metric icon={IconAlertTriangle} label="Alertas pendientes" value={loading ? '…' : metrics.alertas} tone="amber"/></div>
    <div className="nk-dashboard-columns"><article className="nk-module-card"><h2>Prioridades recientes</h2><p>Alertas y comunicaciones pendientes para el equipo.</p>{recent.length ? <ul className="nk-dashboard-list">{recent.map((item,index)=><li key={item.id || index}><b>{item.nombre || item.title || item.tipo || 'Pendiente operativo'}</b><span>{item.descripcion || item.mensaje || item.estado || 'Requiere revisión'}</span></li>)}</ul> : <div className="nk-module-empty"><IconAlertTriangle size={26}/><b>No hay alertas registradas</b><span>Las alertas aparecerán aquí cuando se cargue información operativa.</span></div>}</article><article className="nk-module-card"><h2>Ruta de trabajo</h2><p>La información mantiene su contexto comercial y operativo.</p><ol className="nk-dashboard-route"><li>Cliente</li><li>Contrato</li><li>Orden de servicio</li><li>Personas y recursos</li><li>Control y evidencia</li></ol></article></div>
  </section>
}
