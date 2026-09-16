import { useEffect, useMemo, useState } from 'react'
import { IconFileText, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/contractors-secondary.css'

const asRows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)

function statusFor(row) {
  const raw = String(row.estado || '').toLowerCase()
  if (raw.includes('venc') || raw.includes('cerr') || (row.termino && row.termino < today())) return { label: 'Vencido', cls: 'nk-badge-error', key: 'vencido' }
  if (row.termino && Math.ceil((new Date(`${row.termino}T23:59:59`) - new Date()) / 86400000) <= 30) return { label: 'Por vencer', cls: 'nk-badge-warn', key: 'por_vencer' }
  return { label: 'Vigente', cls: 'nk-badge-ok', key: 'vigente' }
}

function ConvenioDialog({ companies, onClose, onSaved }) {
  const [form, setForm] = useState({ subcontratoId: '', tipo: 'contrato', numero: '', inicio: '', termino: '', responsable: '', ocs: '', observacion: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save(event) {
    event.preventDefault()
    if (!form.subcontratoId || !form.numero.trim() || saving) return
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.convenios ?? 0
      const record = { id: `cv_${Date.now()}`, subcontratoId: form.subcontratoId, tipo: form.tipo, numero: form.numero.trim(), inicio: form.inicio, termino: form.termino, responsable: form.responsable.trim(), ocs: form.ocs.split(',').map(item => item.trim()).filter(Boolean), observacion: form.observacion.trim(), estado: 'vigente', createdAt: new Date().toISOString() }
      await api.put('/state/modules', { reason: 'Contrato o convenio de empresa colaboradora registrado', changes: { convenios: { version, data: [...asRows(state.convenios), record] } } })
      onSaved()
    } catch (cause) { setError(cause.message || 'No fue posible guardar el contrato o convenio.') } finally { setSaving(false) }
  }
  return <div className="nk-dialog-backdrop" onMouseDown={onClose}>
    <form className="nk-dialog" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header className="nk-dialog-header"><div><h2 className="nk-dialog-title">Nuevo contrato o convenio</h2><p className="nk-contractor-subtle">El documento quedará asociado a una empresa colaboradora.</p></div><button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={18} /></button></header>
      <div className="nk-dialog-body"><div className="nk-contractor-form-grid">
        <div className="nk-field nk-contractor-wide"><label className="nk-label">Empresa colaboradora</label><select className="nk-select" required value={form.subcontratoId} onChange={event => setForm({ ...form, subcontratoId: event.target.value })}><option value="">Seleccionar empresa</option>{companies.map(company => <option key={company.id} value={company.id}>{company.razon || company.nombre}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Tipo</label><select className="nk-select" value={form.tipo} onChange={event => setForm({ ...form, tipo: event.target.value })}><option value="contrato">Contrato</option><option value="convenio">Convenio</option><option value="orden_compra">Orden de compra</option></select></div>
        <div className="nk-field"><label className="nk-label">Número o referencia</label><input className="nk-input" required value={form.numero} onChange={event => setForm({ ...form, numero: event.target.value })} /></div>
        <div className="nk-field"><label className="nk-label">Inicio</label><input className="nk-input" type="date" value={form.inicio} onChange={event => setForm({ ...form, inicio: event.target.value })} /></div>
        <div className="nk-field"><label className="nk-label">Término</label><input className="nk-input" type="date" value={form.termino} onChange={event => setForm({ ...form, termino: event.target.value })} /></div>
        <div className="nk-field"><label className="nk-label">Responsable de renovación</label><input className="nk-input" value={form.responsable} onChange={event => setForm({ ...form, responsable: event.target.value })} /></div>
        <div className="nk-field"><label className="nk-label">Órdenes de compra</label><input className="nk-input" value={form.ocs} onChange={event => setForm({ ...form, ocs: event.target.value })} placeholder="OC-001, OC-002" /></div>
        <div className="nk-field nk-contractor-wide"><label className="nk-label">Observaciones</label><input className="nk-input" value={form.observacion} onChange={event => setForm({ ...form, observacion: event.target.value })} /></div>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></footer>
    </form>
  </div>
}

export default function ConveniosPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [error, setError] = useState('')
  async function load() { setLoading(true); setError(''); try { setResponse(await api.get('/state')) } catch (cause) { setError(cause.message || 'No fue posible cargar contratos y convenios.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const state = response?.state || response || {}
  const companies = asRows(state.subcontratos)
  const companyById = new Map(companies.map(company => [String(company.id), company]))
  const canonical = asRows(state.convenios)
  const legacy = canonical.length ? [] : companies.filter(company => company.contratoRef || company.contratoId || (company.ocs || []).length).map(company => ({ id: `legacy-${company.id}`, subcontratoId: company.id, tipo: 'contrato', numero: company.contratoRef || 'Contrato asociado', termino: company.contratoVence || '', ocs: company.ocs || [], responsable: company.responsable || '', legacy: true }))
  const rows = [...canonical, ...legacy].map(row => ({ ...row, company: companyById.get(String(row.subcontratoId || row.terceroId)) }))
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return rows.filter(row => { const status = statusFor(row); return (!term || [row.company?.razon, row.company?.rut, row.numero, row.responsable, (row.ocs || []).join(' ')].some(value => String(value || '').toLowerCase().includes(term))) && (!companyFilter || String(row.company?.id) === String(companyFilter)) && (statusFilter === 'todos' || status.key === statusFilter) }) }, [rows, query, companyFilter, statusFilter])
  const summary = rows.reduce((result, row) => { result.total += 1; const key = statusFor(row).key; if (key === 'vigente') result.ok += 1; if (key === 'por_vencer') result.warn += 1; if (key === 'vencido') result.error += 1; return result }, { total: 0, ok: 0, warn: 0, error: 0 })

  return <div className="nk-contractor-page">
    <header className="nk-contractor-header"><div><h1>Contratos y convenios</h1><p>Administra contratos, convenios y órdenes de compra de empresas colaboradoras, con vigencia y responsable de renovación.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={15} />Actualizar</button><button className="nk-button nk-button-primary" onClick={() => setCreating(true)} disabled={!companies.length}><IconPlus size={15} />Nuevo contrato o convenio</button></div></header>
    {error && <div className="nk-contractor-feedback error">{error}</div>}
    <section className="nk-contractor-summary"><article><strong>{loading ? '…' : summary.total}</strong><span>Documentos</span></article><article><strong>{loading ? '…' : summary.ok}</strong><span>Vigentes</span></article><article><strong>{loading ? '…' : summary.warn}</strong><span>Por vencer</span></article><article><strong>{loading ? '…' : summary.error}</strong><span>Vencidos</span></article></section>
    <section className="nk-card"><div className="nk-contractor-toolbar"><label className="nk-search"><IconSearch size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar empresa, RUT o contrato" /></label><select className="nk-select" value={companyFilter} onChange={event => setCompanyFilter(event.target.value)}><option value="">Todas las empresas</option>{companies.map(company => <option key={company.id} value={company.id}>{company.razon || company.nombre}</option>)}</select><select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos los estados</option><option value="vigente">Vigentes</option><option value="por_vencer">Por vencer</option><option value="vencido">Vencidos</option></select></div></section>
    <section className="nk-card nk-contractor-table-card">{loading ? <div className="nk-empty nk-contractor-empty"><IconFileText size={30} /><p className="nk-empty-title">Cargando contratos y convenios…</p></div> : !filtered.length ? <div className="nk-empty nk-contractor-empty"><p className="nk-empty-title">Sin contratos o convenios para mostrar</p></div> : <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Empresa</th><th>Contrato o convenio</th><th>Órdenes de compra</th><th>Vigencia</th><th>Responsable</th><th>Estado</th></tr></thead><tbody>{filtered.map(row => { const status = statusFor(row); return <tr key={row.id}><td><strong>{row.company?.razon || row.company?.nombre || 'Empresa no identificada'}</strong><div className="nk-contractor-subtle">{row.company?.rut || 'Sin RUT'}</div></td><td>{row.numero || '—'}<div className="nk-contractor-subtle">{String(row.tipo || 'contrato').replaceAll('_', ' ')}</div></td><td>{(row.ocs || []).join(', ') || '—'}</td><td>{row.termino || 'Sin fecha'}</td><td>{row.responsable || '—'}</td><td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td></tr> })}</tbody></table></div>}</section>
    {creating && <ConvenioDialog companies={companies} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}
