import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBuildingFactory2, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/terceros-subcontratos.css'

const EMPTY_FORM = {
  razon: '', rut: '', contratoId: '', servicios: '', responsable: '', contacto: '', personal: 0,
  f30: '', f301: '', cotizaciones: '', seguro: '', estado: 'vigente', observaciones: '',
}

function daysUntil(date) {
  if (!date) return null
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function expiryState(date) {
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin fecha', cls: 'nk-badge-none', alert: true }
  if (days < 0) return { label: 'Vencido', cls: 'nk-badge-error', alert: true }
  if (days <= 30) return { label: 'Por vencer', cls: 'nk-badge-warn', alert: true }
  return { label: 'Vigente', cls: 'nk-badge-ok', alert: false }
}

function complianceAlertCount(item) {
  return ['f30', 'f301', 'cotizaciones', 'seguro'].filter(key => expiryState(item[key]).alert).length
}

function StatusBadge({ value }) {
  const map = {
    vigente: ['nk-badge-ok', 'Vigente'],
    observado: ['nk-badge-warn', 'Observado'],
    bloqueado: ['nk-badge-error', 'Restringido'],
  }
  const [cls, label] = map[value] || ['nk-badge-none', value || 'Sin estado']
  return <span className={`nk-badge ${cls}`}>{label}</span>
}

function ExpiryCell({ label, value }) {
  const state = expiryState(value)
  return (
    <div className="nk-third-expiry">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
      <span className={`nk-badge ${state.cls}`}>{state.label}</span>
    </div>
  )
}

export default function TercerosSubcontratosPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setResponse(await api.get('/state'))
    } catch (cause) {
      setError(cause.message || 'No fue posible cargar terceros y subcontratos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const moduleVersions = response?.moduleVersions || {}
  const rows = Array.isArray(state.subcontratos) ? state.subcontratos : []
  const contracts = Array.isArray(state.contratos) ? state.contratos : []

  const selected = rows.find(item => String(item.id) === String(selectedId)) || null

  useEffect(() => {
    if (creating) setForm(EMPTY_FORM)
    else if (selected) {
      setForm({
        razon: selected.razon || selected.nombre || '',
        rut: selected.rut || '',
        contratoId: selected.contratoId || '',
        servicios: selected.servicios || selected.servicio || '',
        responsable: selected.responsable || '',
        contacto: selected.contacto || selected.email || selected.telefono || '',
        personal: Number(selected.personal || selected.dotacion || 0),
        f30: selected.f30 || '',
        f301: selected.f301 || '',
        cotizaciones: selected.cotizaciones || '',
        seguro: selected.seguro || '',
        estado: selected.estado || 'vigente',
        observaciones: selected.observaciones || selected.observacion || '',
      })
    }
  }, [creating, selectedId])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter(item => {
      const matchesText = !term || [item.razon, item.nombre, item.rut, item.responsable, item.servicios, item.servicio]
        .some(value => String(value || '').toLowerCase().includes(term))
      return matchesText && (!contractFilter || String(item.contratoId) === String(contractFilter)) && (!statusFilter || item.estado === statusFilter)
    })
  }, [rows, query, contractFilter, statusFilter])

  const summary = useMemo(() => filtered.reduce((acc, item) => {
    acc.total += 1
    if (!complianceAlertCount(item)) acc.ok += 1
    else acc.alerts += 1
    acc.people += Number(item.personal || item.dotacion || 0)
    return acc
  }, { total: 0, ok: 0, alerts: 0, people: 0 }), [filtered])

  const contractName = id => {
    const item = contracts.find(contract => String(contract.id) === String(id))
    return item?.numero || item?.codigo || item?.nombre || '—'
  }

  function openNew() {
    setSelectedId(null)
    setCreating(true)
  }

  function openDetail(id) {
    setCreating(false)
    setSelectedId(id)
  }

  function closeDetail() {
    setSelectedId(null)
    setCreating(false)
    setForm(EMPTY_FORM)
  }

  async function save() {
    if (!form.razon.trim() || !form.rut.trim() || saving) return
    setSaving(true)
    setError('')
    try {
      const current = Array.isArray(state.subcontratos) ? state.subcontratos : []
      const record = {
        ...(selected || {}),
        id: selected?.id || `subc_${Date.now()}`,
        razon: form.razon.trim(),
        rut: form.rut.trim(),
        contratoId: form.contratoId || '',
        servicios: form.servicios.trim(),
        responsable: form.responsable.trim(),
        contacto: form.contacto.trim(),
        personal: Number(form.personal) || 0,
        f30: form.f30,
        f301: form.f301,
        cotizaciones: form.cotizaciones,
        seguro: form.seguro,
        estado: form.estado,
        observaciones: form.observaciones.trim(),
      }
      const next = selected
        ? current.map(item => String(item.id) === String(selected.id) ? record : item)
        : [...current, record]

      const result = await api.put('/state/modules', {
        reason: selected ? `Ficha de tercero actualizada: ${record.razon}` : `Nuevo tercero registrado: ${record.razon}`,
        changes: { subcontratos: { version: Number(moduleVersions.subcontratos || 0), data: next } },
      })
      setResponse(currentResponse => ({
        ...(currentResponse || {}),
        state: { ...(currentResponse?.state || state), subcontratos: next },
        moduleVersions: { ...(currentResponse?.moduleVersions || moduleVersions), ...(result?.moduleVersions || {}) },
      }))
      setSelectedId(record.id)
      setCreating(false)
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar el tercero.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="nk-third-page">
      <header className="nk-third-header">
        <div>
          <h1>Terceros y subcontratos</h1>
          <p>Empresas colaboradoras, contratos asociados, dotación y control laboral/previsional.</p>
        </div>
        <div className="nk-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15} /> Actualizar</button>
          <button className="nk-button nk-button-primary" type="button" onClick={openNew}><IconPlus size={15} /> Nuevo tercero</button>
        </div>
      </header>

      {error && <div className="nk-third-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')}><IconX size={15} /></button></div>}

      <section className="nk-third-filters nk-card" aria-label="Filtros de terceros">
        <label className="nk-search"><IconSearch size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Razón social, RUT o servicio" /></label>
        <select className="nk-select" value={contractFilter} onChange={event => setContractFilter(event.target.value)}>
          <option value="">Todos los contratos</option>
          {contracts.map(contract => <option key={contract.id} value={contract.id}>{contract.numero || contract.codigo || contract.nombre}</option>)}
        </select>
        <select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="vigente">Vigente</option>
          <option value="observado">Observado</option>
          <option value="bloqueado">Restringido</option>
        </select>
      </section>

      <section className="nk-third-summary" aria-label="Resumen de terceros">
        <article className="nk-third-kpi"><strong>{loading ? '…' : summary.total}</strong><span>Subcontratistas</span></article>
        <article className="nk-third-kpi"><strong>{loading ? '…' : summary.ok}</strong><span>Cumplimiento vigente</span></article>
        <article className="nk-third-kpi"><strong>{loading ? '…' : summary.alerts}</strong><span>Con alertas</span></article>
        <article className="nk-third-kpi"><strong>{loading ? '…' : summary.people}</strong><span>Dotación</span></article>
      </section>

      <section className="nk-card nk-third-table-card">
        {loading ? (
          <div className="nk-empty nk-third-empty"><IconBuildingFactory2 size={30} /><p className="nk-empty-title">Cargando terceros…</p></div>
        ) : filtered.length === 0 ? (
          <div className="nk-empty nk-third-empty"><IconBuildingFactory2 size={30} /><p className="nk-empty-title">Sin terceros para mostrar</p><p className="nk-empty-description">Ajusta los filtros o registra una empresa colaboradora.</p></div>
        ) : (
          <div className="nk-table-wrapper">
            <table className="nk-table">
              <thead><tr><th>Empresa</th><th>Contrato</th><th>Servicio</th><th>Responsable</th><th>Vencimientos</th><th>Dotación</th><th>Estado</th><th /></tr></thead>
              <tbody>{filtered.map(item => (
                <tr key={item.id}>
                  <td><div className="nk-third-company"><strong>{item.razon || item.nombre}</strong><span>{item.rut || 'Sin RUT'}</span></div></td>
                  <td>{item.contratoId ? <button className="nk-context-link nk-third-link" type="button" onClick={() => navigate(`/app/contratos/${item.contratoId}`)}>{contractName(item.contratoId)}</button> : '—'}</td>
                  <td>{item.servicios || item.servicio || '—'}</td>
                  <td>{item.responsable || '—'}</td>
                  <td><div className="nk-third-expiry-list"><ExpiryCell label="F30" value={item.f30} /><ExpiryCell label="F30-1" value={item.f301} /><ExpiryCell label="Cotiz." value={item.cotizaciones} /><ExpiryCell label="Seguro" value={item.seguro} /></div></td>
                  <td>{Number(item.personal || item.dotacion || 0)}</td>
                  <td><StatusBadge value={item.estado} /></td>
                  <td><button className="nk-button nk-button-quiet" type="button" onClick={() => openDetail(item.id)}>Abrir ficha</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {(selected || creating) && (
        <section className="nk-card nk-third-detail">
          <div className="nk-third-detail-head">
            <div><span className="nk-third-eyebrow">Ficha del tercero</span><h2>{creating ? 'Nuevo tercero' : form.razon || 'Empresa colaboradora'}</h2></div>
            <button className="nk-button nk-button-secondary" type="button" onClick={closeDetail}>Volver al listado</button>
          </div>

          <div className="nk-third-form">
            <div className="nk-field nk-third-wide"><label className="nk-label">Razón social</label><input className="nk-input" value={form.razon} onChange={e => setForm(current => ({ ...current, razon: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">RUT</label><input className="nk-input" value={form.rut} onChange={e => setForm(current => ({ ...current, rut: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">Estado</label><select className="nk-select" value={form.estado} onChange={e => setForm(current => ({ ...current, estado: e.target.value }))}><option value="vigente">Vigente</option><option value="observado">Observado</option><option value="bloqueado">Restringido</option></select></div>
            <div className="nk-field"><label className="nk-label">Contrato asociado</label><select className="nk-select" value={form.contratoId} onChange={e => setForm(current => ({ ...current, contratoId: e.target.value }))}><option value="">Sin contrato</option>{contracts.map(contract => <option key={contract.id} value={contract.id}>{contract.numero || contract.codigo || contract.nombre}</option>)}</select></div>
            <div className="nk-field"><label className="nk-label">Dotación</label><input className="nk-input" type="number" min="0" value={form.personal} onChange={e => setForm(current => ({ ...current, personal: e.target.value }))} /></div>
            <div className="nk-field nk-third-wide"><label className="nk-label">Servicios</label><input className="nk-input" value={form.servicios} onChange={e => setForm(current => ({ ...current, servicios: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">Responsable</label><input className="nk-input" value={form.responsable} onChange={e => setForm(current => ({ ...current, responsable: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">Contacto</label><input className="nk-input" value={form.contacto} onChange={e => setForm(current => ({ ...current, contacto: e.target.value }))} /></div>
          </div>

          <div className="nk-third-section-title"><h3>Control laboral y previsional</h3><p>Fechas de vigencia utilizadas para detectar alertas operacionales.</p></div>
          <div className="nk-third-form nk-third-compliance-grid">
            <div className="nk-field"><label className="nk-label">F30</label><input className="nk-input" type="date" value={form.f30} onChange={e => setForm(current => ({ ...current, f30: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">F30-1</label><input className="nk-input" type="date" value={form.f301} onChange={e => setForm(current => ({ ...current, f301: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">Cotizaciones</label><input className="nk-input" type="date" value={form.cotizaciones} onChange={e => setForm(current => ({ ...current, cotizaciones: e.target.value }))} /></div>
            <div className="nk-field"><label className="nk-label">Seguro</label><input className="nk-input" type="date" value={form.seguro} onChange={e => setForm(current => ({ ...current, seguro: e.target.value }))} /></div>
            <div className="nk-field nk-third-wide"><label className="nk-label">Observaciones</label><textarea className="nk-textarea" rows="3" value={form.observaciones} onChange={e => setForm(current => ({ ...current, observaciones: e.target.value }))} /></div>
          </div>

          <div className="nk-third-detail-actions">
            <button className="nk-button nk-button-primary" type="button" disabled={saving || !form.razon.trim() || !form.rut.trim()} onClick={save}>{saving ? 'Guardando…' : creating ? 'Registrar tercero' : 'Guardar cambios'}</button>
          </div>
        </section>
      )}
    </div>
  )
}
