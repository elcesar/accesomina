import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch, IconTool } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/mantenimiento.css'

const rows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)

function inventoryCategory(item) {
  const source = `${item.type || ''} ${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (/maquin/.test(source)) return 'maquinaria'
  if (/herramient|tool/.test(source)) return 'herramientas'
  if (/\bepp\b|protecci[oó]n personal/.test(source)) return 'epp'
  if (/material|ferreter/.test(source)) return 'materiales'
  if (/insumo|consumible/.test(source)) return 'insumos'
  return 'equipos'
}

function planState(plan) {
  if (!plan?.nextDue) return { label: 'Sin programación', cls: 'nk-badge-warn' }
  if (plan.nextDue < today()) return { label: 'Vencido', cls: 'nk-badge-error' }
  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  if (plan.nextDue <= soon) return { label: 'Próximo', cls: 'nk-badge-warn' }
  return { label: 'Programado', cls: 'nk-badge-ok' }
}

const emptyPlan = () => ({ assetId: '', type: 'Preventivo', frequencyDays: 30, nextDue: today(), owner: '', checklist: '' })
const emptyRecord = () => ({ assetId: '', type: 'Preventivo', date: today(), meter: '', downtime: '', cost: '', projectId: '', note: '' })

export default function MantenimientoPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState('')
  const [planForm, setPlanForm] = useState(emptyPlan())
  const [recordForm, setRecordForm] = useState(emptyRecord())

  async function load() {
    setLoading(true)
    setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar mantenimiento.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const items = rows(state.inventoryItems)
  const assets = items.filter(item => ['maquinaria', 'equipos', 'herramientas'].includes(inventoryCategory(item)))
  const plans = rows(state.assetMaintenancePlans)
  const records = rows(state.assetMaintenanceRecords)
  const orders = rows(state.mantenciones).length ? rows(state.mantenciones) : rows(state.proyectos)

  const itemName = id => assets.find(item => String(item.id) === String(id))?.name || 'Activo'
  const itemCode = id => {
    const item = assets.find(entry => String(entry.id) === String(id))
    return item?.code || item?.serial || item?.serie || ''
  }
  const orderName = id => {
    const order = orders.find(entry => String(entry.id) === String(id))
    return order?.codigo || order?.code || order?.nombre || order?.name || '—'
  }

  const filteredPlans = useMemo(() => plans.filter(plan => {
    const term = query.trim().toLowerCase()
    const stateLabel = planState(plan).label
    return (!term || `${itemName(plan.assetId)} ${itemCode(plan.assetId)} ${plan.type || ''} ${plan.owner || ''} ${plan.checklist || ''}`.toLowerCase().includes(term)) &&
      (!status || stateLabel === status)
  }), [plans, query, status, assets])

  const filteredRecords = useMemo(() => records.filter(record => {
    const term = query.trim().toLowerCase()
    return !term || `${itemName(record.assetId)} ${itemCode(record.assetId)} ${record.type || ''} ${record.note || ''} ${orderName(record.projectId)}`.toLowerCase().includes(term)
  }), [records, query, assets, orders])

  const summary = useMemo(() => ({
    plans: plans.length,
    overdue: plans.filter(plan => planState(plan).label === 'Vencido').length,
    cost: records.reduce((sum, row) => sum + Number(row.cost || 0), 0),
    downtime: records.reduce((sum, row) => sum + Number(row.downtime || 0), 0),
  }), [plans, records])

  function openPlan() { setPlanForm(emptyPlan()); setEditor('plan') }
  function openRecord() { setRecordForm(emptyRecord()); setEditor('record') }

  async function savePlan() {
    if (!planForm.assetId) { setError('Selecciona un activo.'); return }
    if (!planForm.nextDue) { setError('Ingresa la próxima fecha de ejecución.'); return }
    if (Number(planForm.frequencyDays || 0) < 1) { setError('La frecuencia debe ser de al menos 1 día.'); return }

    setSaving(true); setError('')
    try {
      const id = `amp_${Date.now()}`
      const record = { id, ...planForm, frequencyDays: Number(planForm.frequencyDays || 0), status: 'activo', createdAt: new Date().toISOString() }
      const nextPlans = [...plans.filter(plan => String(plan.assetId) !== String(planForm.assetId)), record]
      const nextItems = items.map(item => String(item.id) === String(planForm.assetId) ? { ...item, nextMaintenance: record.nextDue, maintenancePlanId: id, updatedAt: new Date().toISOString() } : item)
      const result = await api.put('/state/modules', {
        reason: `Mantenimiento preventivo programado: ${itemName(planForm.assetId)}`,
        changes: {
          assetMaintenancePlans: { version: Number(versions.assetMaintenancePlans || 0), data: nextPlans },
          inventoryItems: { version: Number(versions.inventoryItems || 0), data: nextItems },
        },
      })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || state), assetMaintenancePlans: nextPlans, inventoryItems: nextItems }, moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setEditor('')
    } catch (cause) { setError(cause.message || 'No fue posible programar el mantenimiento.') }
    finally { setSaving(false) }
  }

  async function saveRecord() {
    if (!recordForm.assetId) { setError('Selecciona un activo.'); return }
    if (!recordForm.date) { setError('Ingresa la fecha del mantenimiento.'); return }

    setSaving(true); setError('')
    try {
      const id = `amr_${Date.now()}`
      const maintenanceRecord = {
        id,
        ...recordForm,
        meter: Number(recordForm.meter || 0),
        downtime: Number(recordForm.downtime || 0),
        cost: Number(recordForm.cost || 0),
        owner: 'usuario',
        createdAt: new Date().toISOString(),
      }

      const plan = plans.find(row => String(row.assetId) === String(recordForm.assetId))
      let nextDue = plan?.nextDue || ''
      let nextPlans = plans
      if (plan?.frequencyDays) {
        const due = new Date(`${recordForm.date}T12:00:00`)
        due.setDate(due.getDate() + Number(plan.frequencyDays))
        nextDue = due.toISOString().slice(0, 10)
        nextPlans = plans.map(row => row.id === plan.id ? { ...row, nextDue } : row)
      }

      const nextRecords = [maintenanceRecord, ...records]
      const nextItems = items.map(item => {
        if (String(item.id) !== String(recordForm.assetId)) return item
        return {
          ...item,
          meter: maintenanceRecord.meter || item.meter,
          lastMaintenance: recordForm.date,
          maintenanceCost: Number(item.maintenanceCost || 0) + maintenanceRecord.cost,
          nextMaintenance: nextDue || item.nextMaintenance,
          updatedAt: new Date().toISOString(),
        }
      })

      const changes = {
        assetMaintenanceRecords: { version: Number(versions.assetMaintenanceRecords || 0), data: nextRecords },
        inventoryItems: { version: Number(versions.inventoryItems || 0), data: nextItems },
      }
      if (nextPlans !== plans) changes.assetMaintenancePlans = { version: Number(versions.assetMaintenancePlans || 0), data: nextPlans }

      const result = await api.put('/state/modules', {
        reason: `Mantenimiento registrado: ${itemName(recordForm.assetId)}`,
        changes,
      })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || state), assetMaintenanceRecords: nextRecords, assetMaintenancePlans: nextPlans, inventoryItems: nextItems }, moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setEditor('')
    } catch (cause) { setError(cause.message || 'No fue posible registrar el mantenimiento.') }
    finally { setSaving(false) }
  }

  const money = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0)

  return (
    <div className="nk-maint-page">
      <header className="nk-maint-header nk-page-header">
        <div className="nk-maint-heading nk-page-heading">
          <h1 className="nk-page-title">Mantenimiento</h1>
          <p className="nk-page-description">Programa mantenimiento preventivo, controla vencimientos y registra costo y disponibilidad real de activos.</p>
        </div>
        <div className="nk-maint-actions nk-page-header-actions">
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button>
          <button className="nk-button nk-button-secondary" onClick={openPlan}><IconPlus size={15}/> Programar preventivo</button>
          <button className="nk-button nk-button-primary" onClick={openRecord}><IconTool size={15}/> Registrar mantenimiento</button>
        </div>
      </header>

      {error && <div className="nk-maint-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}

      <section className="nk-card nk-maint-filters">
        <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar activo, código, responsable o tipo..."/></label>
        <select className="nk-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos los estados</option><option>Programado</option><option>Próximo</option><option>Vencido</option><option>Sin programación</option>
        </select>
      </section>

      <section className="nk-maint-kpis">
        <article><strong>{summary.plans}</strong><span>Planes activos</span></article>
        <article><strong>{summary.overdue}</strong><span>Planes vencidos</span></article>
        <article><strong>{money(summary.cost)}</strong><span>Costo acumulado</span></article>
        <article><strong>{summary.downtime} h</strong><span>Tiempo fuera de servicio</span></article>
      </section>

      <section className="nk-card nk-maint-section">
        <div className="nk-maint-section-head"><div><h2>Planificación preventiva</h2><p>Un plan activo por recurso, con próxima ejecución y responsable.</p></div><button className="nk-button nk-button-secondary nk-button-sm" onClick={openPlan}>Programar preventivo</button></div>
        <div className="nk-table-wrapper"><table className="nk-table nk-maint-table nk-maint-plans"><thead><tr><th>Activo</th><th>Tipo</th><th>Próxima ejecución</th><th>Responsable</th><th>Frecuencia</th><th>Estado</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="6">Cargando…</td></tr> : filteredPlans.length ? filteredPlans.map(plan => { const current = planState(plan); return <tr key={plan.id}><td><strong>{itemName(plan.assetId)}</strong><small>{itemCode(plan.assetId) || 'Sin código'}</small></td><td>{plan.type || 'Preventivo'}</td><td>{plan.nextDue || '—'}</td><td>{plan.owner || 'Sin responsable'}</td><td>{plan.frequencyDays ? `${plan.frequencyDays} días` : '—'}</td><td><span className={`nk-badge ${current.cls}`}>{current.label}</span></td></tr> }) : <tr><td colSpan="6" className="nk-maint-empty">Aún no hay mantenimientos preventivos programados.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="nk-card nk-maint-section">
        <div className="nk-maint-section-head"><div><h2>Historial de mantenimiento</h2><p>Mantenciones ejecutadas, costos, uso y tiempo fuera de servicio.</p></div><button className="nk-button nk-button-primary nk-button-sm" onClick={openRecord}>Registrar mantenimiento</button></div>
        <div className="nk-table-wrapper"><table className="nk-table nk-maint-table nk-maint-records"><thead><tr><th>Activo</th><th>Fecha / tipo</th><th>Medidor</th><th>Fuera servicio</th><th>Costo</th><th>OS / observación</th></tr></thead><tbody>
          {loading ? <tr><td colSpan="6">Cargando…</td></tr> : filteredRecords.length ? filteredRecords.map(record => <tr key={record.id}><td><strong>{itemName(record.assetId)}</strong><small>{itemCode(record.assetId) || 'Sin código'}</small></td><td><strong>{record.date || '—'}</strong><small>{record.type || 'Mantenimiento'}</small></td><td>{record.meter ? record.meter.toLocaleString('es-CL') : '—'}</td><td>{Number(record.downtime || 0)} h</td><td>{money(record.cost)}</td><td><strong>{record.projectId ? orderName(record.projectId) : 'Sin OS'}</strong><small>{record.note || 'Sin observación'}</small></td></tr>) : <tr><td colSpan="6" className="nk-maint-empty">Aún no hay mantenimientos ejecutados registrados.</td></tr>}
        </tbody></table></div>
      </section>

      {editor === 'plan' && <section className="nk-card nk-maint-editor">
        <div className="nk-maint-editor-head"><h2>Programar mantenimiento preventivo</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setEditor('')}>Cerrar</button></div>
        <div className="nk-maint-form">
          <label className="wide"><span>Activo *</span><select className="nk-select" value={planForm.assetId} onChange={e => setPlanForm({ ...planForm, assetId: e.target.value })}><option value="">Seleccionar</option>{assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Tipo *</span><select className="nk-select" value={planForm.type} onChange={e => setPlanForm({ ...planForm, type: e.target.value })}><option>Preventivo</option><option>Inspección</option><option>Calibración</option><option>Certificación</option></select></label>
          <label><span>Frecuencia (días)</span><input className="nk-input" type="number" min="1" value={planForm.frequencyDays} onChange={e => setPlanForm({ ...planForm, frequencyDays: e.target.value })}/></label>
          <label><span>Próxima ejecución *</span><input className="nk-input" type="date" value={planForm.nextDue} onChange={e => setPlanForm({ ...planForm, nextDue: e.target.value })}/></label>
          <label><span>Responsable</span><input className="nk-input" value={planForm.owner} onChange={e => setPlanForm({ ...planForm, owner: e.target.value })} placeholder="Persona o cargo responsable"/></label>
          <label className="wide"><span>Checklist o instrucciones</span><textarea className="nk-input" value={planForm.checklist} onChange={e => setPlanForm({ ...planForm, checklist: e.target.value })} placeholder="Inspecciones, lubricación, certificados, fotografías..."/></label>
        </div>
        <div className="nk-maint-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setEditor('')}>Cancelar</button><button className="nk-button nk-button-primary" onClick={savePlan} disabled={saving}>{saving ? 'Guardando…' : 'Guardar plan'}</button></div>
      </section>}

      {editor === 'record' && <section className="nk-card nk-maint-editor">
        <div className="nk-maint-editor-head"><h2>Registrar mantenimiento ejecutado</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setEditor('')}>Cerrar</button></div>
        <div className="nk-maint-form">
          <label className="wide"><span>Activo *</span><select className="nk-select" value={recordForm.assetId} onChange={e => setRecordForm({ ...recordForm, assetId: e.target.value })}><option value="">Seleccionar</option>{assets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Fecha *</span><input className="nk-input" type="date" value={recordForm.date} onChange={e => setRecordForm({ ...recordForm, date: e.target.value })}/></label>
          <label><span>Tipo</span><select className="nk-select" value={recordForm.type} onChange={e => setRecordForm({ ...recordForm, type: e.target.value })}><option>Preventivo</option><option>Correctivo</option><option>Inspección</option><option>Calibración</option><option>Certificación</option></select></label>
          <label><span>Medidor / lectura</span><input className="nk-input" type="number" min="0" value={recordForm.meter} onChange={e => setRecordForm({ ...recordForm, meter: e.target.value })}/></label>
          <label><span>Tiempo fuera de servicio (h)</span><input className="nk-input" type="number" min="0" value={recordForm.downtime} onChange={e => setRecordForm({ ...recordForm, downtime: e.target.value })}/></label>
          <label><span>Costo</span><input className="nk-input" type="number" min="0" value={recordForm.cost} onChange={e => setRecordForm({ ...recordForm, cost: e.target.value })}/></label>
          <label><span>Orden de servicio</span><select className="nk-select" value={recordForm.projectId} onChange={e => setRecordForm({ ...recordForm, projectId: e.target.value })}><option value="">Sin orden</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo || order.code || order.nombre || order.name}</option>)}</select></label>
          <label className="wide"><span>Observación</span><textarea className="nk-input" value={recordForm.note} onChange={e => setRecordForm({ ...recordForm, note: e.target.value })} placeholder="Trabajo realizado, hallazgos, repuestos o recomendaciones..."/></label>
        </div>
        <div className="nk-maint-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setEditor('')}>Cancelar</button><button className="nk-button nk-button-primary" onClick={saveRecord} disabled={saving}>{saving ? 'Guardando…' : 'Registrar mantenimiento'}</button></div>
      </section>}
    </div>
  )
}
