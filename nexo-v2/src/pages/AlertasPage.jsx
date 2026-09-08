import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconPaperclip, IconRefresh, IconSearch, IconUser } from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import '../styles/control-center.css'

const rowsFor = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const titleFor = item => item.nombre || item.title || item.tipo || item.descripcion || 'Pendiente operativo'
const relatedId = item => item.trabajadorId || item.personaId || item.workerId || item.trabId || item.contratoId || item.activoId || item.entityId || item.id

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

export default function AlertasPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    setStatus('')
    try { setResponse(await api.get('/state')) }
    catch { setStatus('No fue posible cargar las alertas.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  const state = response?.state || response || {}
  const people = rowsFor(state.trabajadores)

  const grouped = useMemo(() => {
    const alerts = [...rowsFor(state.alertas), ...rowsFor(state.callouts)]
    return Object.values(alerts.reduce((groups, item, index) => {
      const id = relatedId(item) || `unrelated-${index}`
      const person = people.find(row => String(row.id) === String(id))
      const key = person ? `person-${person.id}` : `record-${id}`
      const label = person?.nombre || item.contratoNombre || item.activoNombre || item.entidad || 'Alertas sin relación identificada'
      groups[key] ||= { id, label, person, items: [] }
      groups[key].items.push(item)
      return groups
    }, {})).sort((a, b) => b.items.length - a.items.length)
  }, [state.alertas, state.callouts, people])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return grouped
    return grouped.map(group => ({
      ...group,
      items: group.items.filter(item => [group.label, titleFor(item), item.descripcion, item.mensaje, item.estado]
        .some(value => String(value || '').toLocaleLowerCase().includes(term))),
    })).filter(group => group.items.length > 0)
  }, [grouped, query])

  async function upload(event, group) {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Cargando evidencia…')
    try {
      await uploadAlertFile(group.id, file)
      setStatus(`Evidencia adjuntada a ${group.label}.`)
    } catch (cause) {
      setStatus(cause.message || 'No fue posible adjuntar el archivo.')
    } finally {
      event.target.value = ''
    }
  }

  const total = grouped.reduce((sum, group) => sum + group.items.length, 0)
  const peopleGroups = grouped.filter(group => group.person).length

  return <section className="nk-alerts-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Centro de Control</p><h1>Alertas</h1><p>Prioriza pendientes por persona, contrato o recurso y accede rápidamente al contexto donde deben resolverse.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button></header>
    <div className="nk-alerts-summary"><article><b>{loading ? '…' : grouped.length}</b><span>Contextos con alertas</span></article><article><b>{loading ? '…' : total}</b><span>Acciones pendientes</span></article><article><b>{loading ? '…' : peopleGroups}</b><span>Personas involucradas</span></article></div>
    {status && <div className="nk-control-feedback"><span>{status}</span><button className="nk-button nk-button-quiet" type="button" onClick={() => setStatus('')}>Cerrar</button></div>}
    <section className="nk-card"><div className="nk-alert-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, alerta o estado"/></label></div></section>
    <div className="nk-alert-groups">{loading ? <div className="nk-module-empty">Cargando alertas…</div> : filtered.length ? filtered.map(group => <article className="nk-alert-group" key={String(group.id)}><header><div><span className="nk-alert-count">{group.items.length}</span><div><h2>{group.label}</h2><p>{group.person ? 'Persona relacionada' : 'Cliente, contrato, recurso u otro registro asociado'}</p></div></div><div className="nk-alert-actions">{group.person && <button className="nk-button nk-button-secondary" type="button" onClick={() => navigate(`/app/trabajadores/${group.person.id}`)}><IconUser size={15}/>Ver ficha</button>}<label className="nk-button nk-button-primary"><IconPaperclip size={15}/>Adjuntar evidencia<input type="file" onChange={event => upload(event, group)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"/></label></div></header><ul className="nk-alert-list">{group.items.map((item, index) => <li key={item.id || index}><IconAlertTriangle size={16}/><div><b>{titleFor(item)}</b><span>{item.descripcion || item.mensaje || item.estado || 'Requiere revisión y regularización.'}</span></div></li>)}</ul></article>) : <div className="nk-module-empty"><IconAlertTriangle size={28}/><b>No hay alertas pendientes</b><span>Las alertas aparecerán al registrar vencimientos, faltantes o restricciones.</span></div>}</div>
  </section>
}
