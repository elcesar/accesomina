import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertTriangle, IconCheck, IconExternalLink, IconPaperclip, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/incidentes.css'

const TYPE_LABELS = {
  incidente: 'Incidente',
  observacion: 'Observación',
  no_conformidad: 'No conformidad',
  hallazgo_auditoria: 'Hallazgo auditoría',
}

const STATUS_LABELS = { abierto: 'Abierto', en_cierre: 'En cierre', cerrado: 'Cerrado' }
const SEVERITIES = ['baja', 'media', 'alta', 'critica']

function rows(value) { return Array.isArray(value) ? value : [] }
function today() { return new Date().toISOString().slice(0, 10) }

function priorityOf(item) {
  if (item.priority) return item.priority
  const severity = String(item.severity || '').toLowerCase()
  if (severity === 'critica') return 'Crítica'
  if (severity === 'alta') return 'Alta'
  if (severity === 'baja') return 'Baja'
  return 'Media'
}

function priorityClass(priority) {
  if (priority === 'Crítica') return 'nk-badge-error'
  if (priority === 'Alta') return 'nk-badge-warn'
  return 'nk-badge-info'
}

function statusClass(status) {
  if (status === 'cerrado') return 'nk-badge-ok'
  if (status === 'en_cierre') return 'nk-badge-warn'
  return 'nk-badge-error'
}

function emptyForm() {
  return {
    id: '', tipo: 'incidente', mantId: '', fecha: today(), estado: 'abierto',
    descripcion: '', severity: 'media', accion: '', responsable: '', compromiso: '',
    rootCause: '', closeOwner: '', closeNote: '', evidenceName: '', evidenceUrl: '',
  }
}

export default function IncidentesPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [orderFilter, setOrderFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [newOpen, setNewOpen] = useState(false)
  const fileRef = useRef(null)

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar los incidentes.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const incidents = rows(state.incidentes)
  const orders = rows(state.mantenciones).length ? rows(state.mantenciones) : rows(state.proyectos)
  const orderMap = useMemo(() => new Map(orders.map(order => [String(order.id), order])), [orders])

  const filtered = useMemo(() => incidents.filter(item => {
    const term = query.trim().toLowerCase()
    const order = orderMap.get(String(item.mantId))
    const orderName = order?.nombre || order?.name || order?.titulo || order?.codigo || ''
    return (!term || [item.descripcion, item.accion, item.responsable, orderName].some(v => String(v || '').toLowerCase().includes(term))) &&
      (!orderFilter || String(item.mantId) === orderFilter) &&
      (!typeFilter || item.tipo === typeFilter) &&
      (!statusFilter || item.estado === statusFilter)
  }), [incidents, orderMap, query, orderFilter, typeFilter, statusFilter])

  const summary = useMemo(() => ({
    total: filtered.length,
    high: filtered.filter(item => ['Alta', 'Crítica'].includes(priorityOf(item))).length,
    overdue: filtered.filter(item => item.compromiso && item.compromiso < today() && item.estado !== 'cerrado').length,
    closed: filtered.filter(item => item.estado === 'cerrado').length,
  }), [filtered])

  function openIncident(item) {
    setSelectedId(item.id)
    setForm({ ...emptyForm(), ...item })
    setNewOpen(false)
  }

  function startNew() {
    setSelectedId('')
    setForm(emptyForm())
    setNewOpen(true)
  }

  function closeEditor() {
    setSelectedId(''); setNewOpen(false); setForm(emptyForm())
  }

  async function saveIncident({ close = false } = {}) {
    if (!form.descripcion.trim()) { setError('Ingresa una descripción del evento.'); return }
    if (!form.mantId) { setError('Selecciona una orden de servicio.'); return }
    if (close && !(form.evidenceName || form.evidenceUrl)) { setError('Para cerrar el evento debes registrar evidencia de verificación.'); return }
    setSaving(true); setError('')
    try {
      const id = form.id || `inc_${Date.now()}`
      const status = close ? 'cerrado' : form.estado === 'cerrado' ? 'en_cierre' : form.estado
      const record = {
        ...form, id, estado: status, status,
        priority: priorityOf(form),
        workflow: status === 'cerrado' ? 'verificado y cerrado' : 'en seguimiento',
        closedAt: status === 'cerrado' ? new Date().toISOString() : form.closedAt || '',
        updatedAt: new Date().toISOString(),
        createdAt: form.createdAt || new Date().toISOString(),
      }
      const next = incidents.some(item => item.id === id) ? incidents.map(item => item.id === id ? record : item) : [record, ...incidents]
      const result = await api.put('/state/modules', {
        reason: `${form.id ? 'Seguimiento actualizado' : 'Incidente registrado'}: ${record.descripcion}`,
        changes: { incidentes: { version: Number(versions.incidentes || 0), data: next } },
      })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || state), incidentes: next }, moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setForm(record); setSelectedId(id); setNewOpen(false)
    } catch (cause) { setError(cause.message || 'No fue posible guardar el incidente.') }
    finally { setSaving(false) }
  }

  function selectEvidence(event) {
    const file = event.target.files?.[0]
    if (file) setForm(current => ({ ...current, evidenceName: file.name, evidenceUrl: '' }))
    event.target.value = ''
  }

  const editorOpen = newOpen || Boolean(selectedId)

  return (
    <div className="nk-incidents-page">
      <header className="nk-incidents-header">
        <div><h1>Incidentes y no conformidades</h1><p>Registra eventos, evalúa prioridad, asigna acciones y cierra solo con verificación y evidencia.</p></div>
        <div className="nk-incidents-header-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" type="button" onClick={startNew}><IconPlus size={15}/> Registrar incidente</button></div>
      </header>

      {error && <div className="nk-incidents-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')}><IconX size={15}/></button></div>}

      <section className="nk-card nk-incidents-filters">
        <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar evento, acción o responsable..."/></label>
        <select className="nk-select" value={orderFilter} onChange={e => setOrderFilter(e.target.value)}><option value="">Todas las OS</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo || order.nombre || order.name || order.id}</option>)}</select>
        <select className="nk-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">Todos los tipos</option>{Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="nk-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos los estados</option>{Object.entries(STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      </section>

      <section className="nk-incidents-kpis">
        <article><strong>{summary.total}</strong><span>Eventos</span></article>
        <article><strong>{summary.high}</strong><span>Alta prioridad</span></article>
        <article><strong>{summary.overdue}</strong><span>Acciones vencidas</span></article>
        <article><strong>{summary.closed}</strong><span>Cerrados y verificados</span></article>
      </section>

      <section className="nk-card nk-incidents-table-card">
        <div className="nk-table-wrapper"><table className="nk-table nk-incidents-table">
          <thead><tr><th>Evento</th><th>Orden de servicio</th><th>Prioridad</th><th>Acción y plazo</th><th>Estado</th><th></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan="6">Cargando eventos…</td></tr> : filtered.length ? filtered.map(item => {
            const order = orderMap.get(String(item.mantId)); const priority = priorityOf(item)
            return <tr key={item.id}>
              <td><div className="nk-incident-event"><span className="nk-badge nk-badge-warn">{TYPE_LABELS[item.tipo] || item.tipo}</span><strong>{item.descripcion || 'Sin descripción'}</strong><small>{item.fecha || 'Sin fecha'} · {item.severity || 'media'}</small></div></td>
              <td>{order ? <Link className="nk-context-link" to={`/app/servicios/${order.id}`}>{order.codigo || order.nombre || order.name || order.id}</Link> : '—'}</td>
              <td><span className={`nk-badge ${priorityClass(priority)}`}>{priority}</span></td>
              <td><div className="nk-incident-action"><strong>{item.accion || 'Sin acción definida'}</strong><small>{item.responsable || 'Sin responsable'} · {item.compromiso || 'Sin plazo'}</small></div></td>
              <td><span className={`nk-badge ${statusClass(item.estado)}`}>{STATUS_LABELS[item.estado] || item.estado || 'Abierto'}</span></td>
              <td><button className="nk-button nk-button-secondary nk-button-sm" type="button" onClick={() => openIncident(item)}>Abrir seguimiento</button></td>
            </tr>
          }) : <tr><td colSpan="6" className="nk-incidents-empty">Sin eventos registrados.</td></tr>}</tbody>
        </table></div>
      </section>

      {editorOpen && <section className="nk-card nk-incident-editor">
        <div className="nk-incident-editor-head"><div><span>{newOpen ? 'Nuevo evento' : 'Seguimiento'}</span><h2>{newOpen ? 'Registrar incidente o no conformidad' : form.descripcion || 'Evento'}</h2></div><button className="nk-icon-button" type="button" onClick={closeEditor}><IconX size={17}/></button></div>
        <div className="nk-incident-form">
          <label><span>Tipo</span><select className="nk-select" value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})}>{Object.entries(TYPE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label><span>Orden de servicio</span><select className="nk-select" value={form.mantId} onChange={e => setForm({...form,mantId:e.target.value})}><option value="">Seleccionar…</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo || order.nombre || order.name || order.id}</option>)}</select></label>
          <label><span>Fecha</span><input className="nk-input" type="date" value={form.fecha} onChange={e => setForm({...form,fecha:e.target.value})}/></label>
          <label><span>Severidad</span><select className="nk-select" value={form.severity} onChange={e => setForm({...form,severity:e.target.value})}>{SEVERITIES.map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <label className="wide"><span>Descripción</span><textarea className="nk-textarea" value={form.descripcion} onChange={e => setForm({...form,descripcion:e.target.value})}/></label>
          <label className="wide"><span>Acción correctiva</span><input className="nk-input" value={form.accion} onChange={e => setForm({...form,accion:e.target.value})}/></label>
          <label><span>Responsable</span><input className="nk-input" value={form.responsable} onChange={e => setForm({...form,responsable:e.target.value})}/></label>
          <label><span>Compromiso cierre</span><input className="nk-input" type="date" value={form.compromiso} onChange={e => setForm({...form,compromiso:e.target.value})}/></label>
          {!newOpen && <><label className="wide"><span>Causa raíz / investigación</span><textarea className="nk-textarea" value={form.rootCause || ''} onChange={e => setForm({...form,rootCause:e.target.value})}/></label><label><span>Responsable de cierre</span><input className="nk-input" value={form.closeOwner || ''} onChange={e => setForm({...form,closeOwner:e.target.value})}/></label><label><span>Estado seguimiento</span><select className="nk-select" value={form.estado === 'cerrado' ? 'cerrado' : form.estado || 'abierto'} onChange={e => setForm({...form,estado:e.target.value === 'cerrado' ? 'en_cierre' : e.target.value})} disabled={form.estado === 'cerrado'}><option value="abierto">Abierto</option><option value="en_cierre">En cierre</option>{form.estado === 'cerrado' && <option value="cerrado">Cerrado</option>}</select></label><label className="wide"><span>Verificación / nota de cierre</span><textarea className="nk-textarea" value={form.closeNote || ''} onChange={e => setForm({...form,closeNote:e.target.value})}/></label></>}
          <div className="wide nk-incident-evidence"><span>Evidencia</span><div>{form.evidenceUrl ? <a className="nk-context-link" href={form.evidenceUrl} target="_blank" rel="noreferrer"><IconExternalLink size={14}/> Ver respaldo</a> : form.evidenceName ? <span className="nk-badge nk-badge-ok"><IconPaperclip size={13}/> {form.evidenceName}</span> : <span className="nk-muted">Sin evidencia</span>}<button className="nk-button nk-button-secondary nk-button-sm" type="button" onClick={() => fileRef.current?.click()}><IconPaperclip size={14}/> Archivo</button><button className="nk-button nk-button-quiet nk-button-sm" type="button" onClick={() => { const url = window.prompt('URL https de la evidencia', form.evidenceUrl || ''); if (url !== null) setForm({...form,evidenceUrl:url,evidenceName:''}) }}>Link</button></div></div>
        </div>
        <div className="nk-incident-editor-actions"><button className="nk-button nk-button-secondary" type="button" onClick={closeEditor}>Cancelar</button><button className="nk-button nk-button-primary" type="button" onClick={() => saveIncident()} disabled={saving}>{saving ? 'Guardando…' : 'Guardar seguimiento'}</button>{!newOpen && form.estado !== 'cerrado' && <button className="nk-button nk-button-primary" type="button" onClick={() => saveIncident({close:true})} disabled={saving}><IconCheck size={15}/> Verificar y cerrar</button>}</div>
      </section>}

      <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={selectEvidence}/>
    </div>
  )
}
