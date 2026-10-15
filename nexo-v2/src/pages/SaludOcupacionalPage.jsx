import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconHeartRateMonitor,
  IconPaperclip,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconX,
} from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import '../styles/people-compliance.css'

const initials = nombre => {
  if (!nombre) return '?'
  const parts = nombre.trim().split(/\s+/)
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

function PersonCell({ name, rut, onClick }) {
  return (
    <button className="nk-compliance-person" type="button" onClick={onClick} disabled={!onClick} aria-label={onClick ? `Abrir ficha de ${name || 'persona'}` : undefined}>
      <span className="nk-compliance-person-avatar" aria-hidden="true">{initials(name)}</span>
      <span className="nk-compliance-person-copy">
        <span className="nk-compliance-person-name">{name || 'Sin nombre'}</span>
        <span className="nk-compliance-person-rut">{rut || 'Sin RUT'}</span>
      </span>
    </button>
  )
}

const operationalDayString = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).reduce((date, part) => ({ ...date, [part.type]: part.value }), {})
  return parts.year + '-' + parts.month + '-' + parts.day
}

const scopeFor = item => item.scope === 'global' ? 'global' : (item.scope === 'cliente' || item.minaId ? 'cliente' : 'global')
const evaluationKey = item => [item.workerId || '', scopeFor(item), scopeFor(item) === 'cliente' ? item.minaId || '' : '', String(item.protocolo || '').trim().toLowerCase()].join('|')
const evaluationDate = item => item.evaluatedOn || item.createdAt || ''
const isCurrentEvaluation = (item, records) => {
  const group = records.filter(candidate => !candidate.referenceIssue && evaluationKey(candidate) === evaluationKey(item))
  const latest = [...group].sort((left, right) => String(evaluationDate(right)).localeCompare(String(evaluationDate(left))) || String(right.id || '').localeCompare(String(left.id || '')))[0]
  return latest?.id === item.id
}

const statusFor = (item, records = []) => {
  if (item.referenceIssue) return { label: 'Requiere regularización', cls: 'nk-badge-warn', key: 'regularize' }
  if (item.vence && item.vence < operationalDayString()) return { label: 'Vencido', cls: 'nk-badge-error', key: 'expired' }
  if (!isCurrentEvaluation(item, records)) return { label: 'Histórico', cls: 'nk-badge-none', key: 'history' }
  const raw = String(item.estado || '').toLowerCase()
  if (/cerrad|finalizad|resuelt|vigente/.test(raw)) return { label: 'Vigente', cls: 'nk-badge-ok', key: 'ok' }
  if (/alert|pendiente|restric|seguimiento/.test(raw)) return { label: 'Requiere revisión', cls: 'nk-badge-warn', key: 'warn' }
  return { label: item.estado || 'Sin información', cls: 'nk-badge-none', key: 'none' }
}

async function uploadHealthFile(workerId, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entityType', 'worker_document')
  formData.append('entityId', workerId)

  const headers = {}
  const csrf = getCsrf()
  if (csrf) headers['x-csrf-token'] = csrf

  const response = await fetch('/api/files', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || error.error || 'No fue posible almacenar la evidencia')
  }

  return response.json()
}

function HealthDialog({ workers, clients, onClose, onSaved }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    workerId: '',
    protocolo: '',
    riesgo: '',
    estado: 'seguimiento',
    scope: 'global',
    minaId: '',
    evaluatedOn: operationalDayString(),
    vence: '',
    responsable: '',
    notes: '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.workerId || !form.protocolo.trim() || saving) return
    if (form.scope === 'cliente' && !form.minaId) {
      setError('Selecciona el cliente al que aplica este protocolo.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.protocolosSalud ?? 0
      const worker = (state.trabajadores || []).find(item => item.id === form.workerId)
      if (!worker) throw new Error('La persona ya no está disponible.')

      let fileMeta = {}
      if (file) {
        const uploaded = await uploadHealthFile(worker.id, file)
        fileMeta = {
          fileId: uploaded.id,
          fileName: uploaded.original_name || file.name,
          fileType: uploaded.content_type,
          fileSize: uploaded.byte_size,
        }
      }

      const item = {
        id: `salud_${Date.now()}`,
        workerId: worker.id,
        persona: worker.nombre,
        protocolo: form.protocolo.trim(),
        riesgo: form.riesgo.trim(),
        estado: form.estado,
        responsable: form.responsable.trim(),
        notes: form.notes.trim(),
        scope: form.scope,
        minaId: form.scope === 'cliente' ? form.minaId : '',
        evaluatedOn: form.evaluatedOn || operationalDayString(),
        vence: form.vence || '',
        createdAt: new Date().toISOString(),
        ...fileMeta,
      }

      await api.put('/state/modules', {
        reason: `Protocolo de salud registrado para ${worker.nombre}`,
        changes: {
          protocolosSalud: {
            version,
            data: [...(state.protocolosSalud || []), item],
          },
        },
      })

      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar el protocolo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="nk-dialog" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
        <header className="nk-dialog-header">
          <div>
            <h2 className="nk-dialog-title">Gestionar protocolo</h2>
            <p className="nk-compliance-subtle">Registra seguimiento ocupacional y evidencia asociada a una persona.</p>
          </div>
          <button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </header>

        <div className="nk-dialog-body">
          <div className="nk-compliance-dialog-grid">
            <div className="nk-field nk-compliance-dialog-wide">
              <label className="nk-label">Persona</label>
              <select
                className="nk-select"
                required
                value={form.workerId}
                onChange={event => setForm(current => ({ ...current, workerId: event.target.value }))}
              >
                <option value="">Seleccionar persona</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.nombre} · {worker.rut || 'Sin RUT'}</option>
                ))}
              </select>
            </div>

            <div className="nk-field nk-compliance-dialog-wide">
              <label className="nk-label">Protocolo / seguimiento</label>
              <input className="nk-input" required value={form.protocolo} onChange={event => setForm(current => ({ ...current, protocolo: event.target.value }))} placeholder="Ej.: Vigilancia por exposición a ruido" />
            </div>

            <div className="nk-field">
              <label className="nk-label" htmlFor="health-scope">Alcance</label>
              <select id="health-scope" className="nk-select" value={form.scope} onChange={event => setForm(current => ({ ...current, scope: event.target.value, minaId: event.target.value === 'global' ? '' : current.minaId }))}>
                <option value="global">Persona, aplicable en toda la empresa</option>
                <option value="cliente">Persona y cliente específico</option>
              </select>
            </div>

            {form.scope === 'cliente' && (
              <div className="nk-field">
                <label className="nk-label" htmlFor="health-client">Cliente</label>
                <select id="health-client" className="nk-select" aria-required="true" value={form.minaId} onChange={event => setForm(current => ({ ...current, minaId: event.target.value }))}>
                  <option value="">Seleccionar cliente</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.nombre}</option>)}
                </select>
              </div>
            )}

            <div className="nk-field">
              <label className="nk-label" htmlFor="health-evaluated-on">Fecha de evaluación</label>
              <input id="health-evaluated-on" className="nk-input" type="date" required value={form.evaluatedOn} onChange={event => setForm(current => ({ ...current, evaluatedOn: event.target.value }))} />
            </div>

            <div className="nk-field">
              <label className="nk-label" htmlFor="health-expiry">Vence</label>
              <input id="health-expiry" className="nk-input" type="date" value={form.vence} min={form.evaluatedOn || undefined} onChange={event => setForm(current => ({ ...current, vence: event.target.value }))} />
            </div>
            <div className="nk-field">
              <label className="nk-label">Riesgo / exposición</label>
              <input
                className="nk-input"
                value={form.riesgo}
                onChange={event => setForm(current => ({ ...current, riesgo: event.target.value }))}
              />
            </div>

            <div className="nk-field">
              <label className="nk-label">Estado</label>
              <select
                className="nk-select"
                value={form.estado}
                onChange={event => setForm(current => ({ ...current, estado: event.target.value }))}
              >
                <option value="seguimiento">En seguimiento</option>
                <option value="pendiente">Pendiente</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            <div className="nk-field">
              <label className="nk-label">Responsable</label>
              <input
                className="nk-input"
                value={form.responsable}
                onChange={event => setForm(current => ({ ...current, responsable: event.target.value }))}
              />
            </div>

            <div className="nk-field">
              <label className="nk-label">Observaciones</label>
              <input
                className="nk-input"
                value={form.notes}
                onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
              />
            </div>

            <div className="nk-field nk-compliance-dialog-wide">
              <label className="nk-label" htmlFor="health-evidence">Evidencia</label>
              <input
                ref={fileRef}
                id="health-evidence"
                className="nk-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                onChange={event => setFile(event.target.files?.[0] || null)}
              />
              {file && <span className="nk-compliance-subtle"><IconPaperclip size={14} /> {file.name}</span>}
            </div>
          </div>

          {error && <p className="nk-form-error">{error}</p>}
        </div>

        <footer className="nk-dialog-footer">
          <button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="nk-button nk-button-primary" disabled={saving || !form.workerId || !form.protocolo.trim()}>
            {saving ? 'Guardando…' : 'Guardar protocolo'}
          </button>
        </footer>
      </form>
    </div>
  )
}

export default function SaludOcupacionalPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [unavailableEvidence, setUnavailableEvidence] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      setResponse(await api.get('/state'))
    } catch (cause) {
      setError(cause.message || 'No fue posible cargar salud ocupacional.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const workers = state.trabajadores || []
  const clients = state.minas || []
  const records = useMemo(() => (state.protocolosSalud || []).map(item => {
    const references = [item.workerId, item.trabId, item.personaId].filter(Boolean).map(String)
    const workerId = references[0] || ''
    const worker = workers.find(person => person.id === workerId)
    const referenceIssue = new Set(references).size !== 1 || !worker
    return {
      ...item, workerId, referenceIssue,
      workerName: worker?.nombre || item.persona || 'Persona no identificada',
      workerRut: worker?.rut || item.rut || '',
      workerRole: worker?.cargo || worker?.especialidad || '',
      protocolo: item.protocolo || item.tipo || item.nombre || item.title || 'Seguimiento ocupacional',
    }
  }), [state.protocolosSalud, workers])

  async function downloadEvidence(item) {
    try {
      const response = await fetch('/api/files/' + encodeURIComponent(item.fileId), { credentials: 'same-origin' })
      if (!response.ok) {
        const message = response.status === 403 ? 'No tienes permisos para descargar esta evidencia.' : 'La evidencia ya no está disponible. Registra una nueva evaluación y adjunta el archivo.'
        setUnavailableEvidence(current => ({ ...current, [item.fileId]: message }))
        setError(message)
        return
      }
      const blob = await response.blob()
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = item.fileName || 'evidencia'
      link.click()
      URL.revokeObjectURL(href)
    } catch {
      const message = 'No fue posible descargar la evidencia. Registra una nueva evaluación y adjunta el archivo.'
      setUnavailableEvidence(current => ({ ...current, [item.fileId]: message }))
      setError(message)
    }
  }

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim()
    return records.filter(item => {
      const status = statusFor(item, records)
      const matchesQuery = !term || [
        item.workerName,
        item.workerRut,
        item.workerRole,
        item.protocolo,
        item.riesgo,
        item.responsable,
        item.fileName,
      ].some(value => String(value || '').toLowerCase().includes(term))
      return matchesQuery && (statusFilter === 'todos' || status.key === statusFilter)
    })
  }, [records, query, statusFilter])

  const summary = useMemo(() => records.reduce((acc, item) => {
    acc.total += 1
    const key = statusFor(item, records).key
    if (key === 'ok') acc.ok += 1
    if (key === 'warn') acc.warn += 1
    if (key === 'none') acc.none += 1
    return acc
  }, { total: 0, ok: 0, warn: 0, none: 0 }), [records])

  return (
    <div className="nk-compliance-page">
      <header className="nk-compliance-header">
        <div>
          <h1>Salud ocupacional</h1>
          <p>Gestiona protocolos y seguimientos asociados a exposición, riesgo y cargo, sin mezclar esta vista con los exámenes de aptitud.</p>
        </div>
        <div className="nk-actions">
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}>
            <IconRefresh size={15} /> Actualizar
          </button>
          <button className="nk-button nk-button-primary" onClick={() => setCreating(true)} disabled={!workers.length}>
            <IconPlus size={15} /> Gestionar protocolo
          </button>
        </div>
      </header>

      {error && <div className="nk-compliance-feedback error"><span>{error}</span></div>}

      <section className="nk-compliance-summary">
        <article className="nk-compliance-kpi"><strong>{loading ? '…' : summary.total}</strong><span>Protocolos registrados</span></article>
        <article className="nk-compliance-kpi"><strong>{loading ? '…' : summary.ok}</strong><span>Cerrados</span></article>
        <article className="nk-compliance-kpi"><strong>{loading ? '…' : summary.warn}</strong><span>En revisión</span></article>
        <article className="nk-compliance-kpi"><strong>{loading ? '…' : summary.none}</strong><span>Sin clasificación</span></article>
      </section>

      <section className="nk-card">
        <div className="nk-compliance-toolbar">
          <label className="nk-search">
            <IconSearch size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, protocolo o riesgo" />
          </label>
          <div className="nk-field">
            <label className="nk-label">Estado</label>
            <select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="warn">Requiere revisión</option>
              <option value="ok">Cerrado</option>
              <option value="none">Sin información</option>
              <option value="history">Histórico</option>
              <option value="expired">Vencido</option>
              <option value="regularize">Requiere regularización</option>
            </select>
          </div>
        </div>
      </section>

      <section className="nk-card">
        {loading ? (
          <div className="nk-empty nk-compliance-empty">
            <IconHeartRateMonitor size={30} />
            <p className="nk-empty-title">Cargando salud ocupacional…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="nk-empty nk-compliance-empty">
            <IconHeartRateMonitor size={30} />
            <p className="nk-empty-title">Sin registros para mostrar</p>
          </div>
        ) : (
          <div className="nk-table-wrapper">
            <table className="nk-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Protocolo</th>
                  <th>Riesgo / exposición</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th>Evidencia</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => {
                  const status = statusFor(item, records)
                  return (
                    <tr key={item.id || index}>
                      <td>
                        <PersonCell
                          name={item.workerName}
                          rut={item.workerRut}
                          onClick={item.workerId ? () => navigate(`/app/trabajadores/${item.workerId}`) : undefined}
                        />
                      </td>
                      <td>
                        <div>{item.protocolo}</div>
                        <span className="nk-person-text-muted">
                          {scopeFor(item) === 'cliente' ? 'Cliente específico · ' + (clients.find(client => String(client.id) === String(item.minaId))?.nombre || 'sin cliente') : 'Aplicable en toda la empresa'}
                          {item.evaluatedOn ? ' · Evaluado: ' + item.evaluatedOn : ''}
                        </span>
                      </td>
                      <td>{item.riesgo || '—'}</td>
                      <td>{item.responsable || '—'}</td>
                      <td><span className={'nk-badge ' + status.cls}>{status.label}</span></td>
                      <td>{item.fileId ? (
                        unavailableEvidence[item.fileId]
                          ? <span className="nk-person-text-muted" role="status" title={unavailableEvidence[item.fileId]}>Evidencia no disponible</span>
                          : <button className="nk-context-link" type="button" onClick={() => downloadEvidence(item)} aria-label={'Descargar evidencia de ' + item.protocolo}>{item.fileName || 'Descargar evidencia'}</button>
                      ) : item.fileName ? <span className="nk-person-text-muted" title="Registro histórico: no existe un archivo descargable asociado">{item.fileName} · histórico, sin archivo</span> : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && (
        <HealthDialog
          workers={workers}
          clients={clients}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load() }}
        />
      )}
    </div>
  )
}
