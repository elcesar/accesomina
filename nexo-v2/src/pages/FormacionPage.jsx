import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconBook, IconDownload, IconPaperclip, IconPlus, IconRefresh,
  IconSearch, IconX,
} from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import '../styles/formacion.css'

const FORMATION_TYPES = {
  curso: 'Curso / capacitación',
  certificacion: 'Certificación técnica',
}

function daysUntil(date) {
  if (!date) return null
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function statusFor(date, itemState) {
  if (itemState === 'rechazado') return { label: 'No habilitado', cls: 'nk-badge-error', key: 'error' }
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin información', cls: 'nk-badge-none', key: 'none' }
  if (days < 0) return { label: 'No habilitado', cls: 'nk-badge-error', key: 'error' }
  if (days <= 30) return { label: 'Por vencer', cls: 'nk-badge-warn', key: 'warn' }
  return { label: 'Vigente', cls: 'nk-badge-ok', key: 'ok' }
}

async function uploadFormationFile(workerId, file) {
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
    throw new Error(error.message || error.error || 'No fue posible almacenar el archivo')
  }

  return response.json()
}

function FormationDialog({ workers, onClose, onSaved }) {
  const fileRef = useRef(null)
  const [form, setForm] = useState({ workerId: '', type: 'curso', name: '', vence: '', notes: '' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.workerId || !form.name.trim() || saving) return
    setSaving(true)
    setError('')

    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.trabajadores ?? 0
      const worker = (state.trabajadores || []).find(item => item.id === form.workerId)
      if (!worker) throw new Error('La persona seleccionada ya no está disponible.')

      let fileMeta = {}
      if (file) {
        const uploaded = await uploadFormationFile(worker.id, file)
        fileMeta = {
          fileId: uploaded.id,
          fileName: uploaded.original_name || file.name,
          fileType: uploaded.content_type,
          fileSize: uploaded.byte_size,
        }
      }

      const item = {
        id: `d_${Date.now()}`,
        type: form.type,
        name: form.name.trim(),
        vence: form.vence,
        notes: form.notes.trim(),
        cargado: new Date().toISOString().split('T')[0],
        ...fileMeta,
      }

      const workersNext = (state.trabajadores || []).map(current => current.id === worker.id
        ? { ...current, workerItems: [...(current.workerItems || []), item] }
        : current)

      await api.put('/state/modules', {
        reason: `Formación registrada para ${worker.nombre}`,
        changes: { trabajadores: { version, data: workersNext } },
      })

      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar la formación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="nk-dialog" role="dialog" aria-modal="true" aria-labelledby="training-dialog-title" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
        <header className="nk-dialog-header">
          <div>
            <h2 className="nk-dialog-title" id="training-dialog-title">Registrar formación</h2>
            <p className="nk-training-subtle">El registro quedará asociado directamente a la ficha de la persona.</p>
          </div>
          <button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={18} /></button>
        </header>

        <div className="nk-dialog-body">
          <div className="nk-training-dialog-grid">
            <div className="nk-field nk-training-dialog-wide">
              <label className="nk-label" htmlFor="training-worker">Persona</label>
              <select id="training-worker" className="nk-select" required value={form.workerId} onChange={event => setForm(current => ({ ...current, workerId: event.target.value }))}>
                <option value="">Seleccionar persona</option>
                {workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre} · {worker.rut || 'Sin RUT'}</option>)}
              </select>
            </div>

            <div className="nk-field">
              <label className="nk-label" htmlFor="training-type">Tipo</label>
              <select id="training-type" className="nk-select" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value }))}>
                <option value="curso">Curso / capacitación</option>
                <option value="certificacion">Certificación técnica</option>
              </select>
            </div>

            <div className="nk-field">
              <label className="nk-label" htmlFor="training-expiry">Fecha de vencimiento</label>
              <input id="training-expiry" className="nk-input" type="date" value={form.vence} onChange={event => setForm(current => ({ ...current, vence: event.target.value }))} />
            </div>

            <div className="nk-field nk-training-dialog-wide">
              <label className="nk-label" htmlFor="training-name">Curso o certificación</label>
              <input id="training-name" className="nk-input" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ej.: Trabajo en altura física" />
            </div>

            <div className="nk-field nk-training-dialog-wide">
              <label className="nk-label" htmlFor="training-notes">Notas</label>
              <input id="training-notes" className="nk-input" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Institución, código, alcance u observaciones" />
            </div>

            <div className="nk-field nk-training-dialog-wide">
              <label className="nk-label" htmlFor="training-file">Evidencia</label>
              <input ref={fileRef} id="training-file" className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={event => setFile(event.target.files?.[0] || null)} />
              {file && <span className="nk-training-file"><IconPaperclip size={14} />{file.name}</span>}
            </div>
          </div>
          {error && <p className="nk-form-error">{error}</p>}
        </div>

        <footer className="nk-dialog-footer">
          <button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="nk-button nk-button-primary" disabled={saving || !form.workerId || !form.name.trim()}>
            {saving ? 'Guardando…' : 'Guardar formación'}
          </button>
        </footer>
      </form>
    </div>
  )
}

export default function FormacionPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setResponse(await api.get('/state'))
    } catch (cause) {
      setError(cause.message || 'No fue posible cargar la formación.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const workers = state.trabajadores || []

  const records = useMemo(() => {
    const peopleRecords = workers.flatMap(worker => (worker.workerItems || [])
      .filter(item => ['curso', 'certificacion'].includes(item.type))
      .map(item => ({
        ...item,
        workerId: worker.id,
        workerName: worker.nombre,
        workerRut: worker.rut,
        workerRole: worker.cargo || worker.especialidad,
        source: 'persona',
      })))

    const knownIds = new Set(peopleRecords.map(item => item.id).filter(Boolean))
    const legacyRecords = (state.cursos || [])
      .filter(item => !item.id || !knownIds.has(item.id))
      .map(item => {
        const workerId = item.workerId || item.trabId || item.personaId || item.trabajadorId
        const worker = workers.find(person => person.id === workerId)
        const rawType = String(item.type || item.tipo || '').toLowerCase()
        return {
          ...item,
          id: item.id || `legacy-${workerId || 'unknown'}-${item.nombre || item.name || Math.random()}`,
          type: rawType.includes('cert') ? 'certificacion' : 'curso',
          name: item.name || item.nombre || item.curso || item.certificacion || 'Formación registrada',
          vence: item.vence || item.fechaVencimiento || item.vencimiento || '',
          notes: item.notes || item.notas || item.institucion || item.descripcion || '',
          workerId,
          workerName: worker?.nombre || item.persona || item.trabajador || 'Persona no identificada',
          workerRut: worker?.rut || item.rut || '',
          workerRole: worker?.cargo || worker?.especialidad || '',
          source: 'legacy',
        }
      })

    return [...peopleRecords, ...legacyRecords]
  }, [workers, state.cursos])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return records.filter(item => {
      const status = statusFor(item.vence, item.estado)
      const matchesQuery = !term || [item.workerName, item.workerRut, item.workerRole, item.name, item.notes]
        .some(value => String(value || '').toLocaleLowerCase().includes(term))
      const matchesType = typeFilter === 'todos' || item.type === typeFilter
      const matchesStatus = statusFilter === 'todos' || status.key === statusFilter
      return matchesQuery && matchesType && matchesStatus
    })
  }, [records, query, typeFilter, statusFilter])

  const summary = useMemo(() => records.reduce((acc, item) => {
    acc.total += 1
    const status = statusFor(item.vence, item.estado).key
    if (status === 'ok') acc.ok += 1
    if (status === 'warn') acc.warn += 1
    if (status === 'error') acc.error += 1
    return acc
  }, { total: 0, ok: 0, warn: 0, error: 0 }), [records])

  return (
    <div className="nk-training-page">
      <header className="nk-training-header">
        <div>
          <h1>Formación y certificaciones</h1>
          <p>Consulta cursos, certificaciones y vigencias por persona. Los nuevos registros quedan vinculados directamente a su ficha.</p>
        </div>
        <div className="nk-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15} /> Actualizar</button>
          <button className="nk-button nk-button-primary" type="button" onClick={() => setCreating(true)} disabled={workers.length === 0}><IconPlus size={15} /> Registrar formación</button>
        </div>
      </header>

      {(error || ok) && (
        <div className={`nk-training-feedback ${error ? 'error' : 'ok'}`}>
          <span>{error || ok}</span>
          <button className="nk-icon-button" type="button" onClick={() => { setError(''); setOk('') }} aria-label="Cerrar mensaje"><IconX size={15} /></button>
        </div>
      )}

      <section className="nk-training-summary" aria-label="Resumen de formación">
        <article className="nk-training-kpi"><strong>{loading ? '…' : summary.total}</strong><span>Registros de formación</span></article>
        <article className="nk-training-kpi"><strong>{loading ? '…' : summary.ok}</strong><span>Vigentes</span></article>
        <article className="nk-training-kpi"><strong>{loading ? '…' : summary.warn}</strong><span>Por vencer</span></article>
        <article className="nk-training-kpi"><strong>{loading ? '…' : summary.error}</strong><span>No habilitados</span></article>
      </section>

      <section className="nk-card">
        <div className="nk-training-toolbar">
          <label className="nk-search">
            <IconSearch size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT o formación" />
          </label>
          <div className="nk-field">
            <label className="nk-label" htmlFor="training-type-filter">Tipo</label>
            <select id="training-type-filter" className="nk-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="curso">Cursos</option>
              <option value="certificacion">Certificaciones</option>
            </select>
          </div>
          <div className="nk-field">
            <label className="nk-label" htmlFor="training-status-filter">Estado</label>
            <select id="training-status-filter" className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="ok">Vigente</option>
              <option value="warn">Por vencer</option>
              <option value="error">No habilitado</option>
              <option value="none">Sin información</option>
            </select>
          </div>
        </div>
      </section>

      <section className="nk-card nk-training-table-card">
        {loading ? (
          <div className="nk-empty nk-training-empty"><IconBook size={30} /><p className="nk-empty-title">Cargando formación…</p></div>
        ) : filtered.length === 0 ? (
          <div className="nk-empty nk-training-empty"><IconBook size={30} /><p className="nk-empty-title">Sin registros para mostrar</p><p className="nk-empty-description">Ajusta los filtros o registra formación para una persona.</p></div>
        ) : (
          <div className="nk-table-wrapper">
            <table className="nk-table">
              <thead><tr><th>Persona</th><th>Formación</th><th>Tipo</th><th>Vencimiento</th><th>Estado</th><th>Evidencia</th><th /></tr></thead>
              <tbody>
                {filtered.map((item, index) => {
                  const status = statusFor(item.vence, item.estado)
                  return (
                    <tr key={`${item.source}-${item.id || index}`}>
                      <td>
                        <div className="nk-training-person">
                          {item.workerId ? <button type="button" onClick={() => navigate(`/app/trabajadores/${item.workerId}`)}>{item.workerName}</button> : <span className="nk-training-name">{item.workerName}</span>}
                          <span>{[item.workerRut, item.workerRole].filter(Boolean).join(' · ') || 'Sin contexto adicional'}</span>
                        </div>
                      </td>
                      <td><span className="nk-training-name">{item.name}</span>{item.notes && <div className="nk-training-subtle">{item.notes}</div>}</td>
                      <td>{FORMATION_TYPES[item.type] || item.type}</td>
                      <td>{item.vence || '—'}</td>
                      <td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td>
                      <td>
                        {item.fileId ? <a className="nk-button nk-button-quiet" href={`/api/files/${item.fileId}`}><IconDownload size={14} />{item.fileName || 'Descargar'}</a> : <span className="nk-training-subtle">{item.fileName ? `${item.fileName} · no disponible` : 'Sin archivo'}</span>}
                      </td>
                      <td>{item.workerId && <button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(`/app/trabajadores/${item.workerId}`)}>Ficha</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating && <FormationDialog workers={workers} onClose={() => setCreating(false)} onSaved={() => {
        setCreating(false)
        setOk('Formación registrada correctamente')
        load()
      }} />}
    </div>
  )
}
