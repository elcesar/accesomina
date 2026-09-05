import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconAlertTriangle, IconPaperclip, IconRefresh, IconUser } from '@tabler/icons-react'
import { api } from '../services/api.js'

const rowsFor = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const titleFor = item => item.nombre || item.title || item.tipo || item.descripcion || 'Pendiente operativo'
const relatedId = item => item.trabajadorId || item.personaId || item.workerId || item.contratoId || item.activoId || item.entityId || item.id

export default function AlertasPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); try { setResponse(await api.get('/state')) } catch { setStatus('No fue posible cargar las alertas.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const state = response?.state || response || {}
  const people = rowsFor(state.trabajadores)
  const grouped = useMemo(() => {
    const alerts = [...rowsFor(state.alertas), ...rowsFor(state.callouts)]
    return Object.values(alerts.reduce((groups, item) => {
      const id = relatedId(item)
      const person = people.find(row => String(row.id) === String(id))
      const key = person ? `person-${person.id}` : `record-${id}`
      const label = person?.nombre || item.contratoNombre || item.activoNombre || item.entidad || 'Alertas sin relación identificada'
      groups[key] ||= { id, label, person, items: [] }
      groups[key].items.push(item)
      return groups
    }, {})).sort((a, b) => b.items.length - a.items.length)
  }, [state, people])
  const upload = async (event, group) => {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Cargando evidencia…')
    try { await api.upload(file, { entityType: 'alerta', entityId: String(group.id) }); setStatus(`Evidencia adjuntada a ${group.label}.`) }
    catch (cause) { setStatus(cause.message || 'No fue posible adjuntar el archivo.') }
    finally { event.target.value = '' }
  }
  return <section className="nk-module-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Control de cumplimiento</p><h1>Alertas</h1><p>Revisa pendientes agrupados por persona, contrato o recurso y regulariza la evidencia desde un solo lugar.</p></div><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button></header>
    <div className="nk-module-summary"><article><b>{loading ? '…' : grouped.length}</b><span>Relaciones con alertas</span></article><article><b>{loading ? '…' : grouped.reduce((total, group) => total + group.items.length, 0)}</b><span>Acciones pendientes</span></article><article><b>1</b><span>Vista agrupada por contexto</span></article></div>
    {status && <p className="nk-form-message">{status}</p>}
    <div className="nk-alert-groups">{loading ? <div className="nk-module-empty">Cargando alertas…</div> : grouped.length ? grouped.map(group => <article className="nk-alert-group" key={String(group.id)}><header><div><span className="nk-alert-count">{group.items.length}</span><div><h2>{group.label}</h2><p>{group.person ? 'Persona relacionada' : 'Contrato, recurso u otro registro relacionado'}</p></div></div><div className="nk-alert-actions">{group.person && <button className="nk-button nk-button-secondary" onClick={() => navigate(`/app/trabajadores/${group.person.id}`)}><IconUser size={15}/>Ver ficha</button>}<label className="nk-button nk-button-primary"><IconPaperclip size={15}/>Adjuntar evidencia<input type="file" onChange={event => upload(event, group)} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></label></div></header><ul>{group.items.map((item, index) => <li key={item.id || index}><IconAlertTriangle size={16}/><div><b>{titleFor(item)}</b><span>{item.descripcion || item.mensaje || item.estado || 'Requiere revisión y regularización.'}</span></div></li>)}</ul></article>) : <div className="nk-module-empty"><IconAlertTriangle size={28}/><b>No hay alertas pendientes</b><span>Las alertas aparecerán al detectar vencimientos, faltantes o restricciones.</span></div>}</div>
  </section>
}
