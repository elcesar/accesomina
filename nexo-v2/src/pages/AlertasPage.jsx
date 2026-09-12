import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconPaperclip, IconRefresh, IconUser } from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import { alertKind, operationalAlerts, rows } from '../services/operational-alerts.js'
import '../styles/control-center.css'

const titleFor = item => item.nombre || item.title || item.tipo || item.descripcion || item.msg || 'Pendiente operativo'
const messageFor = item => item.msg || item.mensaje || item.descripcion || item.estado || 'Requiere revisión y regularización.'
const relatedId = item => item.trabajadorId || item.personaId || item.workerId || item.trabId || item.contratoId || item.activoId || item.mantId || item.entityId || item.id
const CATEGORY = {
  critical: ['Críticas y vencidas', 'Requieren regularización antes de operar'],
  upcoming: ['Próximas a vencer', 'Anticípate a renovaciones y vencimientos'],
  operation: ['Operacionales', 'Pendientes de contratos, recursos u órdenes'],
}
const priority = { critical: 0, upcoming: 1, operation: 2 }

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

function personServiceContext(person, state) {
  if (!person) return ''
  const assignments = rows(state.asignaciones)
  const orders = rows(state.mantenciones).length || state.mantenciones ? rows(state.mantenciones) : rows(state.proyectos)
  const personAssignments = assignments.filter(assignment => String(assignment.trabajadorId || assignment.personaId || assignment.workerId || assignment.trabId || '') === String(person.id))
  const names = [...new Set(personAssignments.map(assignment => {
    const orderId = assignment.mantId || assignment.ordenServicioId || assignment.proyectoId || assignment.servicioId
    const order = orders.find(row => String(row.id) === String(orderId))
    return order?.nombre || order?.codigo || assignment.mantNombre || assignment.ordenServicioNombre || assignment.proyectoNombre || assignment.servicioNombre
  }).filter(Boolean))]

  if (!names.length) {
    const fallback = person.ordenServicio || person.proyecto || person.servicio || person.mantencion
    return fallback ? String(fallback) : ''
  }
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
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
  const allAlerts = useMemo(() => operationalAlerts(state), [state])

  const groups = useMemo(() => Object.values(allAlerts.reduce((out, item, index) => {
    const id = relatedId(item) || `unrelated-${index}`
    const person = people.find(row => String(row.id) === String(item.trabId || item.workerId || item.trabajadorId || item.personaId || ''))
    const key = person ? `persona-${person.id}` : item.mantId ? `orden-${item.mantId}` : item.contratoId ? `contrato-${item.contratoId}` : `registro-${id}`
    const kind = alertKind(item)
    out[key] ||= {
      key,
      id,
      label: person?.nombre || item.contratoNombre || item.activoNombre || item.entidad || 'Registro sin relación identificada',
      person,
      serviceContext: personServiceContext(person, state),
      items: [],
      kinds: new Set(),
    }
    out[key].items.push(item); out[key].kinds.add(kind)
    return out
  }, {})).sort((a, b) => {
    const pa = Math.min(...a.items.map(item => priority[alertKind(item)] ?? 9))
    const pb = Math.min(...b.items.map(item => priority[alertKind(item)] ?? 9))
    return pa - pb || b.items.length - a.items.length || a.label.localeCompare(b.label, 'es')
  }), [allAlerts, people, state])

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

    <div className="nk-alert-summary">{Object.entries(CATEGORY).map(([key, [label, copy]]) => <button key={key} type="button" aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => { setFilter(filter === key ? 'all' : key); setOpenGroups(new Set()) }}><b>{loading ? '…' : counts[key]}</b><span>{label}</span><small>{copy}</small></button>)}</div>
    {status && <div className="nk-control-feedback"><span>{status}</span><button className="nk-button nk-button-quiet" type="button" onClick={() => setStatus('')}>Cerrar</button></div>}

    {!loading && visible.length > 0 && <div className="nk-alert-bulk-actions"><span>{visible.length} {visible.length === 1 ? 'contexto con alertas' : 'contextos con alertas'}</span><div><button type="button" className="nk-button nk-button-quiet" onClick={expandAll}>Expandir todo</button><button type="button" className="nk-button nk-button-quiet" onClick={collapseAll}>Contraer todo</button></div></div>}

    <div className="nk-alert-groups">{loading ? <div className="nk-module-empty">Cargando alertas…</div> : visible.length ? visible.map(group => {
      const expanded = openGroups.has(group.key)
      const detailId = `alert-detail-${group.key}`
      const summary = ['critical', 'upcoming', 'operation'].map(kind => [group.items.filter(item => alertKind(item) === kind).length, kind]).filter(([count]) => count).map(([count, kind]) => `${count} ${kind === 'critical' ? 'crítica' : kind === 'upcoming' ? 'próxima' : 'operativa'}${count === 1 ? '' : 's'}`).join(' · ')
      const personMeta = group.person
        ? [group.person.rut || 'Sin RUT', group.person.cargo || group.person.especialidad || 'Sin cargo', group.serviceContext ? `OS: ${group.serviceContext}` : 'Sin orden asignada'].join(' · ')
        : 'Cliente, contrato, recurso u orden relacionada'

      return <article className="nk-alert-group" key={group.key}><button className="nk-alert-group-trigger" type="button" aria-expanded={expanded} aria-controls={detailId} aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} ${group.items.length} alertas de ${group.label}`} onClick={() => toggleGroup(group.key)}><span><b>{group.label}</b><small>{personMeta}</small></span><span className="nk-alert-toggle-summary">{summary}</span><span className="nk-alert-plus" aria-hidden="true">{expanded ? '−' : '+'}</span></button>{expanded && <div id={detailId} className="nk-alert-group-detail"><div className="nk-alert-actions">{group.person && <button className="nk-button nk-button-secondary" type="button" onClick={() => navigate(`/app/trabajadores/${group.person.id}`)}><IconUser size={15}/>Ver ficha</button>}<label className="nk-button nk-button-primary"><IconPaperclip size={15}/>Adjuntar evidencia<input type="file" onChange={event => upload(event, group)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"/></label></div><ul className="nk-alert-list">{group.items.map((item, index) => { const path = contextPath(item, group); return <li key={item.id || index}><IconAlertTriangle size={16}/><div><b>{titleFor(item)}</b><span>{messageFor(item)}</span></div><span className={`nk-badge ${alertKind(item) === 'critical' ? 'nk-badge-error' : alertKind(item) === 'upcoming' ? 'nk-badge-warn' : 'nk-badge-neutral'}`}>{item.urgencia || 'operativa'}</span>{path && <button type="button" className="nk-button nk-button-quiet nk-alert-context-link" onClick={() => navigate(path)}>Abrir contexto</button>}</li> })}</ul></div>}</article>
    }) : <div className="nk-module-empty"><IconAlertTriangle size={28}/><b>No hay alertas en esta categoría</b><span>La vista se recalcula desde personas, contratos, órdenes de servicio y alertas registradas.</span></div>}</div>
  </section>
}
