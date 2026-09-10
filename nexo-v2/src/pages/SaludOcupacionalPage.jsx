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

const statusFor = item => {
  const raw = String(item.estado || '').toLowerCase()
  if (/cerrad|finalizad|resuelt/.test(raw)) return { label: 'Vigente', cls: 'nk-badge-ok', key: 'ok' }
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

function HealthDialog({ workers, onClose, onSaved }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    workerId: '',
    protocolo: '',
    riesgo: '',
    estado: 'seguimiento',
    responsable: '',
    notes: '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.workerId || !form.protocolo.trim() || saving) return

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
              <input
                className="nk-input"
                required
                value={form.protocolo}
                onChange={event => setForm(current => ({ ...current, protocolo: event.target.value }))}
                placeholder="Ej.: Vigilancia por exposición a ruido"
              />
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
  const records = useMemo(() => (state.protocolosSalud || []).map(item => {
    const workerId = item.workerId || item.trabId || item.personaId
    const worker = workers.find(person => person.id === workerId)
    return {
      ...item,
      workerId,
      workerName: worker?.nombre || item.persona || 'Persona no identificada',
      workerRut: worker?.rut || item.rut || '',
      workerRole: worker?.cargo || worker?.especialidad || '',
      protocolo: item.protocolo || item.nombre || item.title || 'Seguimiento ocupacional',
    }
  }), [state.protocolosSalud, workers])

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim()
    return records.filter(item => {
      const status = statusFor(item)
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
    const key = statusFor(item).key
    if (key === 'ok') acc.ok += 1
    if (key === 'warn') acc.warn += 1
    if (key === 'none') acc.none += 1
    return acc
  }, { total: 0, ok: 0, warn: 0, none: 0 }), [records])

  return (
    <div className="nk-compliance-page">
      <header className="nk-compliance-header">
        <div>
          <h1>Salud Ocupacional</h1>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => {
                  const status = statusFor(item)
                  return (
                    <tr key={item.id || index}>
                      <td>
                        <div className="nk-compliance-person">
                          <strong>{item.workerName}</strong>
                          <span>{item.workerRut || 'Sin RUT'} · {item.workerRole || 'Sin cargo'}</span>
                        </div>
                      </td>
                      <td>{item.protocolo}</td>
                      <td>{item.riesgo || '—'}</td>
                      <td>{item.responsable || '—'}</td>
                      <td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td>
                      <td>{item.fileName || '—'}</td>
                      <td>
                        {item.workerId && (
                          <button className="nk-button nk-button-quiet" onClick={() => navigate(`/app/trabajadores/${item.workerId}`)}>
                            Ver ficha
                          </button>
                        )}
                      </td>
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
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load() }}
        />
      )}
    </div>
  )
}
