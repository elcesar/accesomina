import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IconCheck, IconDownload, IconFileText, IconLoader2, IconPaperclip,
  IconPlus, IconRefresh, IconSearch, IconUpload,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/contratos.css'

const rows = value => Array.isArray(value) ? value : []
const newId = () => globalThis.crypto?.randomUUID?.() || `contrato-${Date.now()}-${Math.random().toString(16).slice(2)}`
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const MAX_FILE_SIZE = 25 * 1024 * 1024

const emptyContract = () => ({
  numero: '',
  nombre: '',
  minaId: '',
  fechaInicio: '',
  fechaTermino: '',
  estado: 'vigente',
  responsable: '',
  observacion: '',
  fileId: '',
  archivo: '',
  archivoTipo: '',
  archivoTamano: 0,
  archivoFecha: '',
})

function SummaryField({ label, value }) {
  return <div className="nk-contract-summary-field"><strong>{value}</strong><span>{label}</span></div>
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ContratosPage() {
  const { session } = useAuth()
  const canEdit = session?.user?.role !== 'consulta'
  const fileInputRef = useRef(null)
  const [response, setResponse] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyContract)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function load() {
    setLoading(true)
    setMessage('')
    setMessageTone('')
    try {
      setResponse(await api.get('/state'))
    } catch {
      setMessage('No fue posible cargar los contratos. Revisa tu conexión e inténtalo nuevamente.')
      setMessageTone('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const contracts = useMemo(() => rows(state.contratos), [state.contratos])
  const clients = useMemo(() => {
    const canonical = rows(state.minas)
    return canonical.length || state.minas ? canonical : rows(state.clientes)
  }, [state.minas, state.clientes])
  const clientById = useMemo(() => new Map(clients.map(client => [String(client.id), client])), [clients])
  const visibleContracts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return contracts.filter(contract => {
      const matchesStatus = !statusFilter || (contract.estado || 'vigente') === statusFilter
      if (!matchesStatus) return false
      if (!term) return true
      const client = clientById.get(String(contract.minaId))
      return [contract.numero, contract.nombre, contract.responsable, contract.archivo, client?.nombre]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    })
  }, [contracts, search, statusFilter, clientById])

  const selected = contracts.find(contract => String(contract.id) === String(selectedId)) || null
  const activeCount = contracts.filter(contract => (contract.estado || 'vigente') === 'vigente').length
  const clientCount = new Set(contracts.map(contract => String(contract.minaId || '')).filter(Boolean)).size
  const documentCount = contracts.filter(contract => contract.fileId).length

  useEffect(() => {
    if (!contracts.length) {
      setSelectedId(null)
      if (!creating) setDraft(emptyContract())
      return
    }
    const current = contracts.find(contract => String(contract.id) === String(selectedId)) || contracts[0]
    if (String(current.id) !== String(selectedId)) setSelectedId(current.id)
    if (!creating) setDraft({ ...emptyContract(), ...current })
  }, [contracts, selectedId, creating])

  const update = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  async function uploadDocument(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !canEdit) return

    if (!ALLOWED_FILE_TYPES.has(file.type)) {
      setMessage('Formato no permitido. Usa PDF, JPG, PNG, Word o Excel.')
      setMessageTone('error')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage('El archivo supera el máximo permitido de 25 MB.')
      setMessageTone('error')
      return
    }

    const contractId = draft.id || selectedId || newId()
    setUploading(true)
    setMessage('')
    setMessageTone('')
    try {
      const uploaded = await api.upload('/files', file, {
        entityType: 'contract_document',
        entityId: contractId,
      })
      setDraft(current => ({
        ...current,
        id: contractId,
        fileId: uploaded.id,
        archivo: uploaded.original_name || file.name,
        archivoTipo: uploaded.content_type || file.type,
        archivoTamano: uploaded.byte_size || file.size,
        archivoFecha: uploaded.created_at || new Date().toISOString(),
      }))
      setMessage('Documento cargado. Guarda los cambios para vincularlo definitivamente al contrato.')
      setMessageTone('ok')
    } catch (error) {
      setMessage(error.message || 'No fue posible cargar el documento del contrato.')
      setMessageTone('error')
    } finally {
      setUploading(false)
    }
  }

  async function save(event) {
    event.preventDefault()
    if (!canEdit) return
    if (draft.nombre.trim().length < 2 || !draft.minaId) {
      setMessage('Indica el nombre del contrato y el cliente asociado.')
      setMessageTone('error')
      return
    }
    if (draft.fechaInicio && draft.fechaTermino && draft.fechaTermino < draft.fechaInicio) {
      setMessage('La fecha de término no puede ser anterior a la fecha de inicio.')
      setMessageTone('error')
      return
    }
    const duplicate = contracts.find(item =>
      String(item.id) !== String(selectedId) && draft.numero.trim() &&
      String(item.numero || '').trim().toLowerCase() === draft.numero.trim().toLowerCase()
    )
    if (duplicate) {
      setMessage('Ya existe un contrato con el mismo número.')
      setMessageTone('error')
      return
    }

    setSaving(true)
    setMessage('')
    setMessageTone('')
    try {
      const id = creating ? (draft.id || newId()) : selectedId
      const saved = {
        ...draft,
        id,
        numero: draft.numero.trim(),
        nombre: draft.nombre.trim(),
        responsable: draft.responsable.trim(),
        observacion: draft.observacion.trim(),
        updatedAt: new Date().toISOString(),
        ...(creating ? { createdAt: draft.createdAt || new Date().toISOString() } : {}),
      }
      const next = creating ? [...contracts, saved] : contracts.map(item => String(item.id) === String(id) ? saved : item)
      const result = await api.put('/state/modules', {
        changes: { contratos: { version: Number(response?.moduleVersions?.contratos || 0), data: next } },
        reason: creating ? 'Contrato creado desde Relación Comercial' : 'Contrato actualizado desde Relación Comercial',
      })
      setResponse(current => ({
        ...(current || {}),
        state: { ...(current?.state || current || {}), contratos: next },
        moduleVersions: { ...(current?.moduleVersions || {}), ...result.moduleVersions },
      }))
      setSelectedId(id)
      setCreating(false)
      setDraft(saved)
      setMessage(creating ? 'Contrato creado y vinculado al cliente.' : 'Cambios del contrato guardados con trazabilidad.')
      setMessageTone('ok')
    } catch (error) {
      setMessage(error.message || 'No fue posible guardar el contrato. Actualiza la información e inténtalo nuevamente.')
      setMessageTone('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="nk-contract-page">
      <header className="nk-contract-header">
        <div>
          <p className="nk-contract-kicker">Relación comercial</p>
          <h1>Contratos</h1>
          <p>Administra acuerdos, vigencias, responsables y documentación vinculada a cada cliente.</p>
        </div>
        <div className="nk-actions nk-contract-header-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16} />Actualizar</button>
          {canEdit && <button className="nk-button nk-button-primary" type="button" onClick={() => {
            setCreating(true); setSelectedId(null); setDraft({ ...emptyContract(), id: newId() }); setMessage(''); setMessageTone('')
          }}><IconPlus size={16} />Nuevo contrato</button>}
        </div>
      </header>

      {message && <div className={`nk-contract-feedback ${messageTone}`}>{message}</div>}

      <section className="nk-contract-summary">
        <SummaryField label="Contratos" value={contracts.length} />
        <SummaryField label="Vigentes" value={activeCount} />
        <SummaryField label="Clientes con contrato" value={clientCount} />
        <SummaryField label="Con documento" value={documentCount} />
      </section>

      <div className="nk-contract-layout">
        <aside className="nk-contract-list nk-card">
          <div className="nk-contract-list-head"><strong>Contratos registrados</strong><span className="nk-badge nk-badge-none">{visibleContracts.length}/{contracts.length}</span></div>
          <div className="nk-contract-list-filters">
            <div className="nk-search nk-contract-search"><IconSearch size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar contrato..." aria-label="Buscar contrato" /></div>
            <select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar contratos por estado">
              <option value="">Todos los estados</option><option value="vigente">Vigentes</option><option value="borrador">Borradores</option><option value="finalizado">Finalizados</option><option value="suspendido">Suspendidos</option>
            </select>
          </div>
          {loading ? <div className="nk-contract-empty">Cargando contratos…</div> : !contracts.length ? <div className="nk-contract-empty">Aún no hay contratos registrados.</div> : !visibleContracts.length ? <div className="nk-contract-empty">No hay contratos que coincidan con los filtros.</div> : visibleContracts.map(contract => {
            const client = clientById.get(String(contract.minaId))
            return <button type="button" key={contract.id} className={`nk-contract-list-item ${String(contract.id) === String(selectedId) && !creating ? 'active' : ''}`} onClick={() => { setCreating(false); setSelectedId(contract.id); setMessage(''); setMessageTone('') }}>
              <IconFileText size={17} /><span><strong>{contract.numero || contract.nombre}</strong><small>{contract.nombre}{client?.nombre ? ` · ${client.nombre}` : ''}</small></span>
            </button>
          })}
        </aside>

        <form className="nk-contract-workspace nk-card" onSubmit={save}>
          <div className="nk-contract-workspace-head">
            <div><p className="nk-contract-kicker">{creating ? 'Nuevo contrato' : 'Ficha del contrato'}</p><h2>{creating ? 'Registra un contrato' : draft.nombre || 'Contrato sin nombre'}</h2><p>Fuente funcional: contratos. Cliente relacionado mediante minaId.</p></div>
            {canEdit && <button className="nk-button nk-button-primary" disabled={saving || uploading}>{saving ? <IconLoader2 className="nk-contract-spin" size={16} /> : <IconCheck size={16} />}{saving ? 'Guardando…' : 'Guardar cambios'}</button>}
          </div>

          <div className="nk-contract-form-grid">
            <div className="nk-field"><label className="nk-label">Número o código</label><input className="nk-input" disabled={!canEdit} value={draft.numero} onChange={update('numero')} placeholder="CTR-2026-001" /></div>
            <div className="nk-field"><label className="nk-label">Estado</label><select className="nk-select" disabled={!canEdit} value={draft.estado} onChange={update('estado')}><option value="vigente">Vigente</option><option value="borrador">Borrador</option><option value="finalizado">Finalizado</option><option value="suspendido">Suspendido</option></select></div>
            <div className="nk-field nk-contract-wide"><label className="nk-label">Nombre del contrato</label><input className="nk-input" required disabled={!canEdit} value={draft.nombre} onChange={update('nombre')} placeholder="Servicio de soporte operacional" /></div>
            <div className="nk-field nk-contract-wide"><label className="nk-label">Cliente</label><select className="nk-select" required disabled={!canEdit} value={draft.minaId} onChange={update('minaId')}><option value="">Seleccionar cliente…</option>{clients.map(client => <option key={client.id} value={client.id}>{client.nombre}</option>)}</select></div>
            <div className="nk-field"><label className="nk-label">Fecha de inicio</label><input className="nk-input" type="date" disabled={!canEdit} value={draft.fechaInicio} onChange={update('fechaInicio')} /></div>
            <div className="nk-field"><label className="nk-label">Fecha de término</label><input className="nk-input" type="date" disabled={!canEdit} value={draft.fechaTermino} onChange={update('fechaTermino')} /></div>
            <div className="nk-field nk-contract-wide"><label className="nk-label">Responsable</label><input className="nk-input" disabled={!canEdit} value={draft.responsable} onChange={update('responsable')} placeholder="Responsable comercial u operativo" /></div>
            <div className="nk-field nk-contract-wide"><label className="nk-label">Observaciones</label><textarea className="nk-textarea" rows="3" disabled={!canEdit} value={draft.observacion} onChange={update('observacion')} placeholder="Alcance, condiciones o antecedentes relevantes." /></div>
          </div>

          <section className="nk-contract-document">
            <div className="nk-contract-document-head">
              <div>
                <strong>Documento contractual</strong>
                <small>PDF, JPG, PNG, Word o Excel · máximo 25 MB.</small>
              </div>
              {canEdit && <>
                <input ref={fileInputRef} className="nk-contract-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={uploadDocument} />
                <button className="nk-button nk-button-secondary" type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <IconLoader2 className="nk-contract-spin" size={16} /> : <IconUpload size={16} />}
                  {uploading ? 'Cargando…' : draft.fileId ? 'Reemplazar documento' : 'Adjuntar documento'}
                </button>
              </>}
            </div>
            {draft.fileId ? (
              <div className="nk-contract-document-file">
                <IconPaperclip size={18} />
                <span><strong>{draft.archivo || 'Documento adjunto'}</strong><small>{[draft.archivoTipo, formatBytes(draft.archivoTamano)].filter(Boolean).join(' · ')}</small></span>
                <a className="nk-button nk-button-quiet" href={`/api/files/${encodeURIComponent(draft.fileId)}`} download><IconDownload size={16} />Descargar</a>
              </div>
            ) : <p className="nk-contract-document-empty">Sin documento adjunto.</p>}
          </section>

          {!creating && selected && <section className="nk-contract-relation"><strong>Cliente asociado</strong><span>{clientById.get(String(selected.minaId))?.nombre || 'Cliente no disponible'}</span><small>Esta relación será utilizada por las órdenes de servicio.</small></section>}
        </form>
      </div>
    </section>
  )
}
