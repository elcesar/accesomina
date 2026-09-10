import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconPaperclip, IconRefresh, IconUser } from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import '../styles/control-center.css'

const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const normalize = value => String(value || '').trim().toLowerCase()
const today = () => new Date().toISOString().slice(0, 10)
const daysUntil = value => {
  if (!value) return null
  const target = new Date(`${String(value).slice(0, 10)}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}
const titleFor = item => item.nombre || item.title || item.tipo || item.descripcion || item.msg || 'Pendiente operativo'
const messageFor = item => item.msg || item.mensaje || item.descripcion || item.estado || 'Requiere revisión y regularización.'
const relatedId = item => item.trabajadorId || item.personaId || item.workerId || item.trabId || item.contratoId || item.activoId || item.mantId || item.entityId || item.id
const alertKind = item => {
  const urgency = normalize(item.urgencia || item.estado)
  if (['vencido', 'critico', 'crítico', 'falta', 'bloqueado', 'restringido'].includes(urgency)) return 'critical'
  if (['proximo', 'próximo', 'upcoming'].includes(urgency)) return 'upcoming'
  const body = normalize(JSON.stringify(item))
  if (/vencid|restring|bloque|no habil|faltante|rechazad/.test(body)) return 'critical'
  if (/próxim|proxim|vence/.test(body)) return 'upcoming'
  return 'operation'
}
const CATEGORY = {
  critical: ['Críticas y vencidas', 'Requieren regularización antes de operar'],
  upcoming: ['Próximas a vencer', 'Anticípate a renovaciones y vencimientos'],
  operation: ['Operacionales', 'Pendientes de contratos, recursos u órdenes'],
}
const priority = { critical: 0, upcoming: 1, operation: 2 }

function deriveAlerts(state) {
  const derived = []
  const people = rows(state.trabajadores)
  const contracts = rows(state.contratos)
  const orders = rows(state.mantenciones).length || state.mantenciones ? rows(state.mantenciones) : rows(state.proyectos)

  people.forEach(person => {
    rows(person.workerItems).forEach(item => {
      const left = daysUntil(item.vence)
      const rejected = normalize(item.estado) === 'rechazado'
      if (rejected) derived.push({ id: `derived-person-rejected-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} rechazado`, derived: true })
      if (left !== null && left < 0) derived.push({ id: `derived-person-expired-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'vencido', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vencido`, derived: true })
      else if (left !== null && left <= 7) derived.push({ id: `derived-person-critical-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
      else if (left !== null && left <= 30) derived.push({ id: `derived-person-upcoming-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'proximo', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
    })
    if (person.bloqueado || normalize(person.disponibilidad) === 'bloqueado' || normalize(person.operationalStatus) === 'bloqueado') {
      derived.push({ id: `derived-person-blocked-${person.id}`, tipo: 'persona', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: persona restringida para operar`, derived: true })
    }
  })

  contracts.forEach(contract => {
    const end = contract.fechaTermino || contract.termino
    const left = daysUntil(end)
    if (left !== null && left < 0) derived.push({ id: `derived-contract-expired-${contract.id}`, tipo: 'contrato', urgencia: 'vencido', contratoId: contract.id, minaId: contract.minaId, contratoNombre: contract.nombre || contract.numero, msg: `Contrato ${contract.numero || contract.nombre || contract.id} vencido`, derived: true })
    else if (left !== null && left <= 30) derived.push({ id: `derived-contract-upcoming-${contract.id}`, tipo: 'contrato', urgencia: left <= 7 ? 'critico' : 'proximo', contratoId: contract.id, minaId: contract.minaId, contratoNombre: contract.nombre || contract.numero, msg: `Contrato ${contract.numero || contract.nombre || contract.id} vence en ${left}d`, derived: true })
  })

  orders.forEach(order => {
    if (!order.contratoId) derived.push({ id: `derived-order-contract-${order.id}`, tipo: 'orden', urgencia: 'critico', mantId: order.id, minaId: order.minaId, entidad: order.nombre || order.codigo, msg: `${order.nombre || 'Orden de servicio'}: falta contrato asociado`, derived: true })
    if (!order.minaId) derived.push({ id: `derived-order-client-${order.id}`, tipo: 'orden', urgencia: 'critico', mantId: order.id, entidad: order.nombre || order.codigo, msg: `${order.nombre || 'Orden de servicio'}: falta cliente asociado`, derived: true })
  })

  return derived
}

async function uploadAlertFile(entityId, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entityType', 'alerta')
  formData.append('entityId', String(entityId))
  const headers = {}
  const csrf = getCsrf()
  if (csrf) headers['x-csrf-token'] = csrf
  const response = await fetch('/api/files', { method: 'POST', credentials: 'same-origin', headers, body: formData })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || error.error || 'No fue posible adjuntar la evidencia.')
  }
  return response.json()
}

function contextPath(item, group) {
  if (group.person) return `/app/trabajadores/${group.person.id}`
  if (item.mantId || item.ordenServicioId || item.proyectoId || item.servicioId) return `/app/servicios/${encodeURIComponent(item.mantId || item.ordenServicioId || item.proyectoId || item.servicioId)}`
  if (item.contratoId) return `/app/contratos/${encodeURIComponent(item.contratoId)}`
  if (item.activoId) return '/app/activos-inventario'
  if (item.clienteId || item.minaId) return `/app/clientes/${encodeURIComponent(item.clienteId || item.minaId)}`
  return null
}

export default function AlertasPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [openGroups, setOpenGroups] = useState(new Set())

  async function load() {
    setLoading(true); setStatus('')
    try { setResponse(await api.get('/state')) }
    catch { setStatus('No fue posible cargar las alertas.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const people = rows(state.trabajadores)
  const allAlerts = useMemo(() => [...rows(state.alertas), ...deriveAlerts(state)], [state])

  const groups = useMemo(() => Object.values(allAlerts.reduce((out, item, index) => {
    const id = relatedId(item) || `unrelated-${index}`
    const person = people.find(row => String(row.id) === String(item.trabId || item.workerId || item.trabajadorId || item.personaId || ''))
    const key = person ? `persona-${person.id}` : item.mantId ? `orden-${item.mantId}` : item.contratoId ? `contrato-${item.contratoId}` : `registro-${id}`
    const kind = alertKind(item)
    out[key] ||= { key, id, label: person?.nombre || item.contratoNombre || item.activoNombre || item.entidad || 'Registro sin relación identificada', person, items: [], kinds: new Set() }
    out[key].items.push(item); out[key].kinds.add(kind)
    return out
  }, {})).sort((a, b) => {
    const pa = Math.min(...a.items.map(item => priority[alertKind(item)] ?? 9))
    const pb = Math.min(...b.items.map(item => priority[alertKind(item)] ?? 9))
    return pa - pb || b.items.length - a.items.length || a.label.localeCompare(b.label, 'es')
  }), [allAlerts, people])

  const counts = useMemo(() => allAlerts.reduce((out, item) => { out[alertKind(item)] += 1; return out }, { critical: 0, upcoming: 0, operation: 0 }), [allAlerts])
  const visible = filter === 'all' ? groups : groups.filter(group => group.kinds.has(filter))

  const toggleGroup = key => setOpenGroups(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next })
  const expandAll = () => setOpenGroups(new Set(visible.map(group => group.key)))
  const collapseAll = () => setOpenGroups(new Set())

  async function upload(event, group) {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Cargando evidencia…')
    try { await uploadAlertFile(group.id, file); setStatus(`Evidencia adjuntada a ${group.label}.`) }
    catch (error) { setStatus(error.message || 'No fue posible adjuntar el archivo.') }
    finally { event.target.value = '' }
  }

  return <section className="nk-alerts-page">
    <header className="nk-module-header"><div><h1>Alertas</h1><p>Prioriza vencimientos, restricciones y pendientes derivados de la información operacional y abre el contexto donde deben resolverse.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button></header>

    <div className="nk-alert-summary">{Object.entries(CATEGORY).map(([key, [label, copy]]) => <button key={key} type="button" className={filter === key ? 'active' : ''} onClick={() => { setFilter(filter === key ? 'all' : key); setOpenGroups(new Set()) }}><b>{loading ? '…' : counts[key]}</b><span>{label}</span><small>{copy}</small></button>)}</div>
    {status && <div className="nk-control-feedback"><span>{status}</span><button className="nk-button nk-button-quiet" type="button" onClick={() => setStatus('')}>Cerrar</button></div>}

    {!loading && visible.length > 0 && <div className="nk-alert-bulk-actions"><span>{visible.length} {visible.length === 1 ? 'contexto con alertas' : 'contextos con alertas'}</span><div><button type="button" className="nk-button nk-button-quiet" onClick={expandAll}>Expandir todo</button><button type="button" className="nk-button nk-button-quiet" onClick={collapseAll}>Contraer todo</button></div></div>}

    <div className="nk-alert-groups">{loading ? <div className="nk-module-empty">Cargando alertas…</div> : visible.length ? visible.map(group => {
      const expanded = openGroups.has(group.key)
      const summary = ['critical', 'upcoming', 'operation'].map(kind => [group.items.filter(item => alertKind(item) === kind).length, kind]).filter(([count]) => count).map(([count, kind]) => `${count} ${kind === 'critical' ? 'crítica' : kind === 'upcoming' ? 'próxima' : 'operativa'}${count === 1 ? '' : 's'}`).join(' · ')
      return <article className="nk-alert-group" key={group.key}><button className="nk-alert-group-trigger" type="button" aria-expanded={expanded} onClick={() => toggleGroup(group.key)}><span><b>{group.label}</b><small>{group.person ? `${group.person.rut || 'Sin RUT'} · ${group.person.cargo || group.person.especialidad || 'Sin cargo'}` : 'Cliente, contrato, recurso u orden relacionada'}</small></span><span className="nk-alert-toggle-summary">{summary}</span><span className="nk-alert-plus" aria-hidden="true">{expanded ? '−' : '+'}</span></button>{expanded && <div className="nk-alert-group-detail"><div className="nk-alert-actions">{group.person && <button className="nk-button nk-button-secondary" type="button" onClick={() => navigate(`/app/trabajadores/${group.person.id}`)}><IconUser size={15}/>Ver ficha</button>}<label className="nk-button nk-button-primary"><IconPaperclip size={15}/>Adjuntar evidencia<input type="file" onChange={event => upload(event, group)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"/></label></div><ul className="nk-alert-list">{group.items.map((item, index) => { const path = contextPath(item, group); return <li key={item.id || index}><IconAlertTriangle size={16}/><div><b>{titleFor(item)}</b><span>{messageFor(item)}</span></div><span className={`nk-badge ${alertKind(item) === 'critical' ? 'nk-badge-error' : alertKind(item) === 'upcoming' ? 'nk-badge-warn' : 'nk-badge-neutral'}`}>{item.urgencia || 'operativa'}</span>{path && <button type="button" className="nk-button nk-button-quiet nk-alert-context-link" onClick={() => navigate(path)}>Abrir contexto</button>}</li> })}</ul></div>}</article>
    }) : <div className="nk-module-empty"><IconAlertTriangle size={28}/><b>No hay alertas en esta categoría</b><span>La vista se recalcula desde personas, contratos, órdenes de servicio y alertas registradas.</span></div>}</div>
  </section>
}
