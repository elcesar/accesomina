import { useEffect, useMemo, useState } from 'react'
import {
  IconCheck, IconFileText, IconLoader2, IconPlus, IconRefresh, IconSearch,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/contratos.css'

const rows = value => Array.isArray(value) ? value : []
const newId = () => globalThis.crypto?.randomUUID?.() || `contrato-${Date.now()}-${Math.random().toString(16).slice(2)}`
const emptyContract = () => ({
  numero: '',
  nombre: '',
  minaId: '',
  fechaInicio: '',
  fechaTermino: '',
  estado: 'vigente',
  responsable: '',
  observacion: '',
})

function SummaryField({ label, value }) {
  return <div className="nk-contract-summary-field"><strong>{value}</strong><span>{label}</span></div>
}

export default function ContratosPage() {
  const { session } = useAuth()
  const canEdit = session?.user?.role !== 'consulta'
  const [response, setResponse] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyContract)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      return [contract.numero, contract.nombre, contract.responsable, client?.nombre]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    })
  }, [contracts, search, statusFilter, clientById])

  const selected = contracts.find(contract => String(contract.id) === String(selectedId)) || null
  const activeCount = contracts.filter(contract => (contract.estado || 'vigente') === 'vigente').length
  const clientCount = new Set(contracts.map(contract => String(contract.minaId || '')).filter(Boolean)).size

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
      const id = creating ? newId() : selectedId
      const saved = {
        ...draft,
        id,
        numero: draft.numero.trim(),
        nombre: draft.nombre.trim(),
        responsable: draft.responsable.trim(),
        observacion: draft.observacion.trim(),
        updatedAt: new Date().toISOString(),
        ...(creating ? { createdAt: new Date().toISOString() } : {}),
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
          <p>Administra los acuerdos comerciales y su vínculo con cada cliente.</p>
        </div>
        <div className="nk-actions nk-contract-header-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16} />Actualizar</button>
          {canEdit && <button className="nk-button nk-button-primary" type="button" onClick={() => {
            setCreating(true); setSelectedId(null); setDraft(emptyContract()); setMessage(''); setMessageTone('')
          }}><IconPlus size={16} />Nuevo contrato</button>}
        </div>
      </header>

      {message && <div className={`nk-contract-feedback ${messageTone}`}>{message}</div>}

      <section className="nk-contract-summary">
        <SummaryField label="Contratos" value={contracts.length} />
        <SummaryField label="Vigentes" value={activeCount} />
        <SummaryField label="Clientes con contrato" value={clientCount} />
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
            <div><p className="nk-contract-kicker">{creating ? 'Nuevo contrato' : 'Ficha del contrato'}</p><h2>{creating ? 'Registra un contrato' : draft.nombre || 'Contrato sin nombre'}</h2><p>Fuente funcional: contratos. Cliente relacionado mediante la referencia vigente.</p></div>
            {canEdit && <button className="nk-button nk-button-primary" disabled={saving}>{saving ? <IconLoader2 className="nk-contract-spin" size={16} /> : <IconCheck size={16} />}{saving ? 'Guardando…' : 'Guardar cambios'}</button>}
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

          {!creating && selected && <section className="nk-contract-relation"><strong>Cliente asociado</strong><span>{clientById.get(String(selected.minaId))?.nombre || 'Cliente no disponible'}</span><small>Esta relación será utilizada por las futuras órdenes de servicio.</small></section>}
        </form>
      </div>
    </section>
  )
}
