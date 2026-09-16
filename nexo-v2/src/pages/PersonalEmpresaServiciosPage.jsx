import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconRefresh, IconSearch, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/contractors-secondary.css'

const asRows = value => Array.isArray(value) ? value : []
const isRestricted = worker => Boolean(worker?.bloqueado) || String(worker?.disponibilidad || '').toLowerCase() === 'bloqueado'
const itemName = item => item?.numero || item?.codigo || item?.nombre || item?.name || 'Sin referencia'

function PersonDialog({ companies, workers, agreements, orders, onClose, onSaved }) {
  const [form, setForm] = useState({ subcontratoId: '', trabId: '', convenioId: '', orderId: '', cargo: '', estado: 'activo', observacion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const companyAgreements = agreements.filter(item => String(item.subcontratoId || item.terceroId) === String(form.subcontratoId))

  async function save(event) {
    event.preventDefault()
    if (!form.subcontratoId || !form.trabId || saving) return
    setSaving(true)
    setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.personalContratista ?? 0
      const current = asRows(state.personalContratista)
      if (current.some(item => String(item.subcontratoId || item.terceroId) === String(form.subcontratoId) && String(item.trabId || item.workerId) === String(form.trabId))) throw new Error('La persona ya está asociada a esta empresa colaboradora.')
      const record = { id: `pc_${Date.now()}`, subcontratoId: form.subcontratoId, trabId: form.trabId, convenioId: form.convenioId || '', orderId: form.orderId || '', cargo: form.cargo.trim(), estado: form.estado, observacion: form.observacion.trim(), createdAt: new Date().toISOString() }
      await api.put('/state/modules', { reason: 'Persona asociada a empresa colaboradora', changes: { personalContratista: { version, data: [...current, record] } } })
      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible asociar la persona.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="nk-dialog-backdrop" onMouseDown={onClose}>
    <form className="nk-dialog" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header className="nk-dialog-header"><div><h2 className="nk-dialog-title">Asociar persona colaboradora</h2><p className="nk-contractor-subtle">La ficha, formación, aptitudes y restricciones siguen perteneciendo a la persona.</p></div><button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={18} /></button></header>
      <div className="nk-dialog-body"><div className="nk-contractor-form-grid">
        <div className="nk-field"><label className="nk-label">Empresa colaboradora</label><select className="nk-select" required value={form.subcontratoId} onChange={event => setForm(current => ({ ...current, subcontratoId: event.target.value, convenioId: '' }))}><option value="">Seleccionar empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{company.razon || company.nombre}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Persona</label><select className="nk-select" required value={form.trabId} onChange={event => setForm(current => ({ ...current, trabId: event.target.value }))}><option value="">Seleccionar persona</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre} · {worker.rut || 'Sin RUT'}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Contrato o convenio</label><select className="nk-select" value={form.convenioId} disabled={!form.subcontratoId || !companyAgreements.length} onChange={event => setForm(current => ({ ...current, convenioId: event.target.value }))}><option value="">{companyAgreements.length ? 'Sin convenio asociado' : 'Sin convenios registrados'}</option>{companyAgreements.map(agreement => <option key={agreement.id} value={agreement.id}>{itemName(agreement)}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Orden de servicio</label><select className="nk-select" value={form.orderId} onChange={event => setForm(current => ({ ...current, orderId: event.target.value }))}><option value="">Sin orden asociada</option>{orders.map(order => <option key={order.id} value={order.id}>{itemName(order)}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Cargo o función</label><input className="nk-input" value={form.cargo} onChange={event => setForm(current => ({ ...current, cargo: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Estado del vínculo</label><select className="nk-select" value={form.estado} onChange={event => setForm(current => ({ ...current, estado: event.target.value }))}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
        <div className="nk-field nk-contractor-wide"><label className="nk-label">Observaciones</label><input className="nk-input" value={form.observacion} onChange={event => setForm(current => ({ ...current, observacion: event.target.value }))} /></div>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Asociar persona'}</button></footer>
    </form>
  </div>
}

export default function PersonalEmpresaServiciosPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('todos')
  const [error, setError] = useState('')
  async function load() { setLoading(true); setError(''); try { setResponse(await api.get('/state')) } catch (cause) { setError(cause.message || 'No fue posible cargar las personas de empresas colaboradoras.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const companies = asRows(state.subcontratos)
  const workers = asRows(state.trabajadores)
  const agreements = asRows(state.convenios)
  const orders = asRows(state.mantenciones).length ? asRows(state.mantenciones) : asRows(state.proyectos)
  const companyById = new Map(companies.map(company => [String(company.id), company]))
  const workerById = new Map(workers.map(worker => [String(worker.id), worker]))
  const agreementById = new Map(agreements.map(agreement => [String(agreement.id), agreement]))
  const orderById = new Map(orders.map(order => [String(order.id), order]))
  const canonical = asRows(state.personalContratista)
  const canonicalPairs = new Set(canonical.map(row => `${row.subcontratoId || row.terceroId}|${row.trabId || row.workerId}`))
  const legacy = workers.filter(worker => worker.subcontratoId || worker.subcontractId).filter(worker => !canonicalPairs.has(`${worker.subcontratoId || worker.subcontractId}|${worker.id}`)).map(worker => ({ id: `legacy-${worker.id}`, subcontratoId: worker.subcontratoId || worker.subcontractId, trabId: worker.id, cargo: worker.cargo || worker.especialidad || '', estado: 'activo', legacy: true }))
  const rows = [...canonical, ...legacy].map(row => ({ ...row, company: companyById.get(String(row.subcontratoId || row.terceroId)), worker: workerById.get(String(row.trabId || row.workerId)), agreement: agreementById.get(String(row.convenioId || row.agreementId)), order: orderById.get(String(row.orderId || row.mantId || row.projectId)) }))
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(row => {
      const restricted = isRestricted(row.worker)
      return (!term || [row.worker?.nombre, row.worker?.rut, row.cargo, row.worker?.cargo, row.company?.razon, itemName(row.agreement), itemName(row.order)].some(value => String(value || '').toLowerCase().includes(term))) && (!companyFilter || String(row.company?.id) === String(companyFilter)) && (stateFilter === 'todos' || (stateFilter === 'habilitadas' ? !restricted : restricted))
    })
  }, [rows, query, companyFilter, stateFilter])
  const people = new Set(rows.map(row => row.worker?.id).filter(Boolean)).size
  const restricted = rows.filter(row => isRestricted(row.worker)).length
  const active = rows.filter(row => !isRestricted(row.worker) && String(row.estado || 'activo') !== 'inactivo').length

  return <div className="nk-contractor-page">
    <header className="nk-contractor-header"><div><h1>Personas de empresas colaboradoras</h1><p>Relaciona a cada persona con su empresa, contrato o convenio y orden de servicio, sin duplicar su ficha individual ni sus controles de habilitación.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={15} />Actualizar</button><button className="nk-button nk-button-primary" onClick={() => setCreating(true)} disabled={!companies.length || !workers.length}><IconPlus size={15} />Asociar persona</button></div></header>
    {error && <div className="nk-contractor-feedback error">{error}</div>}
    <section className="nk-contractor-summary"><article><strong>{loading ? '…' : companies.length}</strong><span>Empresas</span></article><article><strong>{loading ? '…' : people}</strong><span>Personas vinculadas</span></article><article><strong>{loading ? '…' : active}</strong><span>Habilitadas</span></article><article><strong>{loading ? '…' : restricted}</strong><span>Restringidas</span></article></section>
    <section className="nk-card"><div className="nk-contractor-toolbar"><label className="nk-search"><IconSearch size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT, cargo, empresa o servicio" /></label><select className="nk-select" value={companyFilter} onChange={event => setCompanyFilter(event.target.value)}><option value="">Todas las empresas</option>{companies.map(company => <option key={company.id} value={company.id}>{company.razon || company.nombre}</option>)}</select><select className="nk-select" value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="todos">Todos</option><option value="habilitadas">Habilitadas</option><option value="restringidas">Restringidas</option></select></div></section>
    <section className="nk-card nk-contractor-table-card">{loading ? <div className="nk-empty nk-contractor-empty"><IconUsers size={30} /><p className="nk-empty-title">Cargando personas…</p></div> : !filtered.length ? <div className="nk-empty nk-contractor-empty"><p className="nk-empty-title">Sin personas para mostrar</p></div> : <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Empresa colaboradora</th><th>Persona</th><th>Cargo o función</th><th>Contrato o convenio</th><th>Orden de servicio</th><th>Habilitación</th><th>Acción</th></tr></thead><tbody>{filtered.map(row => { const workerRestricted = isRestricted(row.worker); return <tr key={row.id}><td><strong>{row.company?.razon || row.company?.nombre || 'Empresa no identificada'}</strong><div className="nk-contractor-subtle">{row.company?.rut || 'Sin RUT'}</div></td><td>{row.worker?.nombre || 'Persona no identificada'}<div className="nk-contractor-subtle">{row.worker?.rut || 'Sin RUT'}</div></td><td>{row.cargo || row.worker?.cargo || row.worker?.especialidad || '—'}</td><td>{row.agreement ? itemName(row.agreement) : 'Sin convenio asociado'}</td><td>{row.order ? itemName(row.order) : 'Sin orden asociada'}</td><td><span className={`nk-badge ${workerRestricted ? 'nk-badge-error' : 'nk-badge-ok'}`}>{workerRestricted ? 'No habilitada' : 'Habilitada'}</span></td><td>{row.worker?.id && <button className="nk-button nk-button-quiet" onClick={() => navigate(`/app/trabajadores/${row.worker.id}`)}>Ver persona</button>}</td></tr> })}</tbody></table></div>}</section>
    {creating && <PersonDialog companies={companies} workers={workers} agreements={agreements} orders={orders} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}
