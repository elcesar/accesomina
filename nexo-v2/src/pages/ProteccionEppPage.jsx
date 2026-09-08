import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPackage, IconPlus, IconRefresh, IconSearch, IconShield, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/proteccion-epp.css'

const asRows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const today = () => new Date().toISOString().split('T')[0]

function daysUntil(date) {
  if (!date) return null
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function replaceStatus(date) {
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin información', cls: 'nk-badge-none', key: 'none' }
  if (days < 0) return { label: 'Reposición vencida', cls: 'nk-badge-error', key: 'error' }
  if (days <= 30) return { label: 'Reposición próxima', cls: 'nk-badge-warn', key: 'warn' }
  return { label: 'Vigente', cls: 'nk-badge-ok', key: 'ok' }
}

function workerSize(worker, itemName) {
  const epp = worker?.epp || {}
  const name = String(itemName || '').toLowerCase()
  if (/pantal/.test(name)) return epp.pantalon || ''
  if (/calzad|bot/.test(name)) return epp.calzado || ''
  if (/guant/.test(name)) return epp.guante || ''
  if (/casco/.test(name)) return epp.casco || ''
  if (/arn[eé]s/.test(name)) return epp.arnes || ''
  if (/respir/.test(name)) return epp.respirador || ''
  if (/ropa|polera|chaqueta|overol/.test(name)) return epp.ropa || ''
  return ''
}

function DeliveryDialog({ workers, inventory, onClose, onSaved }) {
  const [form, setForm] = useState({ workerId: '', inventoryId: '', itemName: '', size: '', brandModel: '', certification: '', deliveredAt: today(), replaceAt: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedWorker = workers.find(item => item.id === form.workerId)

  function chooseInventory(id) {
    const item = inventory.find(current => current.id === id)
    setForm(current => ({
      ...current,
      inventoryId: id,
      itemName: item?.nombre || item?.name || item?.itemName || current.itemName,
      brandModel: item?.brandModel || item?.marcaModelo || item?.marca || current.brandModel,
      certification: item?.certification || item?.certificacion || current.certification,
      size: workerSize(selectedWorker, item?.nombre || item?.name || item?.itemName) || current.size,
    }))
  }

  function chooseWorker(id) {
    const worker = workers.find(current => current.id === id)
    setForm(current => ({ ...current, workerId: id, size: workerSize(worker, current.itemName) || current.size }))
  }

  async function save(event) {
    event.preventDefault()
    if (!form.workerId || !form.itemName.trim() || saving) return
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.eppDeliveries ?? response?.moduleVersions?.eppEntregas ?? 0
      const current = asRows(state.eppDeliveries || state.eppEntregas)
      const record = {
        id: `epp_${Date.now()}`,
        workerId: form.workerId,
        inventoryId: form.inventoryId || undefined,
        itemName: form.itemName.trim(),
        size: form.size.trim(),
        brandModel: form.brandModel.trim(),
        certification: form.certification.trim(),
        deliveredAt: form.deliveredAt,
        replaceAt: form.replaceAt,
        notes: form.notes.trim(),
        createdAt: new Date().toISOString(),
      }
      await api.put('/state/modules', {
        reason: `Entrega EPP registrada para ${workers.find(item => item.id === form.workerId)?.nombre || 'persona'}`,
        changes: { eppDeliveries: { version, data: [...current, record] } },
      })
      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible registrar la entrega de EPP.')
    } finally { setSaving(false) }
  }

  return <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <form className="nk-dialog" role="dialog" aria-modal="true" aria-labelledby="epp-dialog-title" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header className="nk-dialog-header"><div><h2 className="nk-dialog-title" id="epp-dialog-title">Registrar entrega de EPP</h2><p className="nk-epp-subtle">La entrega quedará asociada a la Persona y visible en su ficha.</p></div><button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={18}/></button></header>
      <div className="nk-dialog-body"><div className="nk-epp-dialog-grid">
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">Persona</label><select className="nk-select" required value={form.workerId} onChange={event => chooseWorker(event.target.value)}><option value="">Seleccionar persona</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre} · {worker.rut || 'Sin RUT'}</option>)}</select></div>
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">EPP del inventario</label><select className="nk-select" value={form.inventoryId} onChange={event => chooseInventory(event.target.value)}><option value="">Registrar manualmente / sin ítem asociado</option>{inventory.map(item => <option key={item.id} value={item.id}>{item.nombre || item.name || item.itemName || item.codigo || 'Equipo EPP'}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Equipo de protección</label><input className="nk-input" required value={form.itemName} onChange={event => setForm(current => ({ ...current, itemName: event.target.value, size: workerSize(selectedWorker, event.target.value) || current.size }))} placeholder="Ej.: Casco de seguridad" /></div>
        <div className="nk-field"><label className="nk-label">Talla / medida</label><input className="nk-input" value={form.size} onChange={event => setForm(current => ({ ...current, size: event.target.value }))} placeholder="Ej.: M, 42, universal" />{selectedWorker && <span className="nk-epp-size-hint">Se sugiere la talla registrada en la ficha cuando existe.</span>}</div>
        <div className="nk-field"><label className="nk-label">Marca / modelo</label><input className="nk-input" value={form.brandModel} onChange={event => setForm(current => ({ ...current, brandModel: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Certificación</label><input className="nk-input" value={form.certification} onChange={event => setForm(current => ({ ...current, certification: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Fecha de entrega</label><input className="nk-input" type="date" required value={form.deliveredAt} onChange={event => setForm(current => ({ ...current, deliveredAt: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Fecha de reposición</label><input className="nk-input" type="date" value={form.replaceAt} onChange={event => setForm(current => ({ ...current, replaceAt: event.target.value }))} /></div>
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">Observaciones</label><input className="nk-input" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Condición de entrega, lote u observaciones" /></div>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving || !form.workerId || !form.itemName.trim()}>{saving ? 'Guardando…' : 'Registrar entrega'}</button></footer>
    </form>
  </div>
}

export default function ProteccionEppPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [personFilter, setPersonFilter] = useState('todos')

  async function load() { setLoading(true); setError(''); try { setResponse(await api.get('/state')) } catch (cause) { setError(cause.message || 'No fue posible cargar Protección personal / EPP.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const workers = asRows(state.trabajadores)
  const inventory = asRows(state.inventoryItems).filter(item => /epp|protecci|casco|guante|arn[eé]s|respir|calzad|bot|overol|lente/i.test(JSON.stringify(item)))
  const deliveries = asRows(state.eppDeliveries || state.eppEntregas)

  const records = useMemo(() => deliveries.map(item => {
    const worker = workers.find(person => person.id === (item.workerId || item.trabId))
    return { ...item, workerId: item.workerId || item.trabId, workerName: worker?.nombre || item.workerName || 'Persona no identificada', workerRut: worker?.rut || item.rut || '', workerRole: worker?.cargo || worker?.especialidad || '', itemName: item.itemName || item.nombre || item.epp || 'EPP registrado' }
  }), [deliveries, workers])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return records.filter(item => {
      const status = replaceStatus(item.replaceAt).key
      const matchesQuery = !term || [item.workerName, item.workerRut, item.workerRole, item.itemName, item.brandModel, item.certification].some(value => String(value || '').toLowerCase().includes(term))
      return matchesQuery && (statusFilter === 'todos' || status === statusFilter) && (personFilter === 'todos' || item.workerId === personFilter)
    })
  }, [records, query, statusFilter, personFilter])

  const summary = useMemo(() => records.reduce((acc, item) => { acc.total += 1; const status = replaceStatus(item.replaceAt).key; if (status === 'ok') acc.ok += 1; if (status === 'warn') acc.warn += 1; if (status === 'error') acc.error += 1; return acc }, { total: 0, ok: 0, warn: 0, error: 0 }), [records])

  return <div className="nk-epp-page">
    <header className="nk-epp-header"><div><h1>Protección personal / EPP</h1><p>Gestiona entregas, tallas, certificaciones y reposiciones por persona. El historial se comparte con la ficha individual.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/>Actualizar</button><button className="nk-button nk-button-primary" type="button" onClick={() => setCreating(true)} disabled={!workers.length}><IconPlus size={15}/>Registrar entrega</button></div></header>
    {error && <div className="nk-epp-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')} aria-label="Cerrar"><IconX size={15}/></button></div>}
    <section className="nk-epp-summary"><article className="nk-epp-kpi"><strong>{loading ? '…' : summary.total}</strong><span>Entregas registradas</span></article><article className="nk-epp-kpi"><strong>{loading ? '…' : summary.ok}</strong><span>Vigentes</span></article><article className="nk-epp-kpi"><strong>{loading ? '…' : summary.warn}</strong><span>Reposición próxima</span></article><article className="nk-epp-kpi"><strong>{loading ? '…' : summary.error}</strong><span>Reposición vencida</span></article></section>
    <section className="nk-card"><div className="nk-epp-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT o EPP" /></label><div className="nk-field"><label className="nk-label">Persona</label><select className="nk-select" value={personFilter} onChange={event => setPersonFilter(event.target.value)}><option value="todos">Todas</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre}</option>)}</select></div><div className="nk-field"><label className="nk-label">Reposición</label><select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos</option><option value="ok">Vigente</option><option value="warn">Próxima</option><option value="error">Vencida</option><option value="none">Sin información</option></select></div></div></section>
    <section className="nk-card nk-epp-table-card">{loading ? <div className="nk-empty nk-epp-empty"><IconShield size={30}/><p className="nk-empty-title">Cargando entregas…</p></div> : filtered.length === 0 ? <div className="nk-empty nk-epp-empty"><IconPackage size={30}/><p className="nk-empty-title">Sin entregas para mostrar</p><p className="nk-empty-description">Ajusta los filtros o registra una entrega para una persona.</p></div> : <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>EPP</th><th>Talla</th><th>Entrega</th><th>Reposición</th><th>Estado</th><th /></tr></thead><tbody>{filtered.map((item,index) => { const status = replaceStatus(item.replaceAt); return <tr key={item.id || index}><td><div className="nk-epp-person"><strong>{item.workerName}</strong><span className="nk-epp-subtle">{item.workerRut || item.workerRole || 'Sin información'}</span></div></td><td><div className="nk-epp-item"><strong>{item.itemName}</strong><span className="nk-epp-subtle">{item.brandModel || 'Sin marca/modelo'}{item.certification ? ` · ${item.certification}` : ''}</span></div></td><td>{item.size || '—'}</td><td>{item.deliveredAt || '—'}</td><td>{item.replaceAt || 'Según inspección'}</td><td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td><td>{item.workerId ? <button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(`/app/trabajadores/${item.workerId}`)}>Ver persona</button> : '—'}</td></tr> })}</tbody></table></div>}</section>
    {creating && <DeliveryDialog workers={workers} inventory={inventory} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}
