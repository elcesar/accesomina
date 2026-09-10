import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/asignaciones-prestamos.css'

const rows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)

function categoryOf(item) {
  const source = `${item.type || ''} ${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (/maquin/.test(source)) return 'maquinaria'
  if (/herramient|tool/.test(source)) return 'herramientas'
  if (/\bepp\b|protecci[oó]n personal|casco|calzado de seguridad|lentes de seguridad|guantes/.test(source)) return 'epp'
  if (/material|ferreter/.test(source)) return 'materiales'
  if (/insumo|consumible/.test(source)) return 'insumos'
  return 'equipos'
}

function workerLabel(worker) {
  if (!worker) return '—'
  return [worker.nombres || worker.nombre || worker.name, worker.apellido || worker.apellidos].filter(Boolean).join(' ') || worker.rut || 'Persona'
}

function orderLabel(order) {
  if (!order) return 'Sin orden asociada'
  return order.codigo || order.code || order.nombre || order.name || order.id
}

export default function AsignacionesPrestamosPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [personFilter, setPersonFilter] = useState('')
  const [dueFilter, setDueFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ itemId: '', warehouseId: '', workerId: '', projectId: '', qty: 1, expectedReturnAt: '', notes: '' })

  async function load() {
    setLoading(true)
    setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar las asignaciones.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const items = rows(state.inventoryItems)
  const warehouses = rows(state.warehouses).length ? rows(state.warehouses) : rows(state.bodegas)
  const workers = rows(state.trabajadores)
  const orders = rows(state.mantenciones).length ? rows(state.mantenciones) : rows(state.proyectos)
  const movements = rows(state.inventoryMovements).length ? rows(state.inventoryMovements) : rows(state.movimientosInventario)
  const assignableItems = useMemo(() => items.filter(item => ['maquinaria', 'equipos', 'herramientas'].includes(categoryOf(item))), [items])
  const activeLoans = useMemo(() => movements.filter(move => String(move.type || '').toLowerCase() === 'prestamo' && !['devuelto', 'cerrado', 'cancelado'].includes(String(move.status || '').toLowerCase())), [movements])
  const returnedLoans = useMemo(() => movements.filter(move => String(move.type || '').toLowerCase() === 'prestamo' && ['devuelto', 'cerrado'].includes(String(move.status || '').toLowerCase())), [movements])

  const filtered = useMemo(() => activeLoans.filter(move => {
    const item = items.find(entry => String(entry.id) === String(move.itemId))
    const worker = workers.find(entry => String(entry.id) === String(move.workerId))
    const order = orders.find(entry => String(entry.id) === String(move.projectId || move.mantId))
    const haystack = [item?.name, item?.code, item?.serial, workerLabel(worker), orderLabel(order), move.notes].join(' ').toLowerCase()
    const due = move.expectedReturnAt ? String(move.expectedReturnAt).slice(0, 10) : ''
    const overdue = due && due < today()
    const noDue = !due
    return (!query || haystack.includes(query.toLowerCase())) &&
      (!personFilter || String(move.workerId) === String(personFilter)) &&
      (!dueFilter || (dueFilter === 'vencido' ? overdue : dueFilter === 'sin-fecha' ? noDue : !overdue && !noDue))
  }), [activeLoans, items, workers, orders, query, personFilter, dueFilter])

  const summary = useMemo(() => ({
    active: activeLoans.length,
    units: activeLoans.reduce((sum, move) => sum + Number(move.qty || 1), 0),
    overdue: activeLoans.filter(move => move.expectedReturnAt && String(move.expectedReturnAt).slice(0, 10) < today()).length,
    returned: returnedLoans.length,
  }), [activeLoans, returnedLoans])

  function openNew() {
    setForm({ itemId: '', warehouseId: '', workerId: '', projectId: '', qty: 1, expectedReturnAt: '', notes: '' })
    setFormOpen(true)
    setError('')
  }

  async function saveAssignment() {
    if (!form.itemId) { setError('Selecciona un recurso.'); return }
    if (!form.workerId) { setError('Selecciona una persona responsable.'); return }
    if (!form.warehouseId) { setError('Selecciona la bodega de origen.'); return }
    const qty = Number(form.qty || 0)
    if (qty <= 0) { setError('La cantidad debe ser mayor que cero.'); return }

    const item = items.find(entry => String(entry.id) === String(form.itemId))
    const stockByLocation = { ...(item?.stockByLocation || {}) }
    const available = Number(stockByLocation[form.warehouseId] ?? item?.stock ?? 0)
    if (available < qty) { setError(`Stock insuficiente en la bodega seleccionada. Disponible: ${available}.`); return }

    setSaving(true)
    setError('')
    try {
      const id = `loan_${Date.now()}`
      const stockBefore = available
      stockByLocation[form.warehouseId] = available - qty
      const nextStock = Object.keys(stockByLocation).length ? Object.values(stockByLocation).reduce((sum, value) => sum + Number(value || 0), 0) : Math.max(0, Number(item?.stock || 0) - qty)
      const nextItems = items.map(entry => String(entry.id) === String(form.itemId) ? { ...entry, stockByLocation, stock: nextStock, status: 'Asignado', updatedAt: new Date().toISOString() } : entry)
      const record = {
        id,
        itemId: form.itemId,
        warehouseId: form.warehouseId,
        workerId: form.workerId,
        projectId: form.projectId,
        qty,
        expectedReturnAt: form.expectedReturnAt,
        notes: form.notes,
        type: 'prestamo',
        status: 'activo',
        stockBefore,
        stockAfter: Number(stockByLocation[form.warehouseId] || 0),
        at: new Date().toISOString(),
      }
      const nextMovements = [record, ...movements]
      const result = await api.put('/state/modules', {
        reason: `Recurso asignado: ${item?.name || form.itemId}`,
        changes: {
          inventoryItems: { version: Number(versions.inventoryItems || 0), data: nextItems },
          inventoryMovements: { version: Number(versions.inventoryMovements || 0), data: nextMovements },
        },
      })
      setResponse(current => ({
        ...(current || {}),
        state: { ...(current?.state || state), inventoryItems: nextItems, inventoryMovements: nextMovements },
        moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) },
      }))
      setFormOpen(false)
    } catch (cause) { setError(cause.message || 'No fue posible registrar la asignación.') }
    finally { setSaving(false) }
  }

  async function returnLoan(move) {
    const item = items.find(entry => String(entry.id) === String(move.itemId))
    if (!item) { setError('No se encontró el recurso asociado.'); return }
    const qty = Number(move.qty || 1)
    const warehouseId = move.warehouseId
    if (!warehouseId) { setError('El préstamo no tiene bodega de origen registrada.'); return }

    setSaving(true)
    setError('')
    try {
      const stockByLocation = { ...(item.stockByLocation || {}) }
      stockByLocation[warehouseId] = Number(stockByLocation[warehouseId] || 0) + qty
      const nextStock = Object.values(stockByLocation).reduce((sum, value) => sum + Number(value || 0), 0)
      const stillAssigned = activeLoans.some(other => other.id !== move.id && String(other.itemId) === String(move.itemId))
      const nextItems = items.map(entry => String(entry.id) === String(move.itemId) ? { ...entry, stockByLocation, stock: nextStock, status: stillAssigned ? 'Asignado' : 'Disponible', updatedAt: new Date().toISOString() } : entry)
      const returnedAt = new Date().toISOString()
      const nextMovements = movements.map(entry => entry.id === move.id ? { ...entry, status: 'devuelto', returnedAt, stockReturned: Number(stockByLocation[warehouseId] || 0) } : entry)
      const result = await api.put('/state/modules', {
        reason: `Devolución registrada: ${item.name || item.id}`,
        changes: {
          inventoryItems: { version: Number(versions.inventoryItems || 0), data: nextItems },
          inventoryMovements: { version: Number(versions.inventoryMovements || 0), data: nextMovements },
        },
      })
      setResponse(current => ({
        ...(current || {}),
        state: { ...(current?.state || state), inventoryItems: nextItems, inventoryMovements: nextMovements },
        moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) },
      }))
    } catch (cause) { setError(cause.message || 'No fue posible registrar la devolución.') }
    finally { setSaving(false) }
  }

  return (
    <div className="nk-assign-page">
      <header className="nk-assign-header">
        <div className="nk-assign-heading"><h1>Asignaciones y préstamos</h1><p>Entrega maquinaria, equipos o herramientas a una persona u orden de servicio y controla su devolución.</p></div>
        <div className="nk-assign-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={openNew}><IconPlus size={15}/> Asignar recurso</button></div>
      </header>

      {error && <div className="nk-assign-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}

      <section className="nk-card nk-assign-filters">
        <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar recurso, persona u orden..."/></label>
        <select className="nk-select" value={personFilter} onChange={event => setPersonFilter(event.target.value)}><option value="">Todas las personas</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{workerLabel(worker)}</option>)}</select>
        <select className="nk-select" value={dueFilter} onChange={event => setDueFilter(event.target.value)}><option value="">Todas las devoluciones</option><option value="vigente">Dentro de plazo</option><option value="vencido">Vencidas</option><option value="sin-fecha">Sin fecha</option></select>
      </section>

      <section className="nk-assign-kpis"><article><strong>{summary.active}</strong><span>Préstamos activos</span></article><article><strong>{summary.units}</strong><span>Unidades asignadas</span></article><article><strong>{summary.overdue}</strong><span>Devoluciones vencidas</span></article><article><strong>{summary.returned}</strong><span>Devoluciones registradas</span></article></section>

      <section className="nk-card nk-assign-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-assign-table"><thead><tr><th>Recurso</th><th>Persona responsable</th><th>Orden de servicio</th><th>Cantidad</th><th>Entrega</th><th>Devolución esperada</th><th></th></tr></thead><tbody>{loading ? <tr><td colSpan="7">Cargando asignaciones…</td></tr> : filtered.length ? filtered.map(move => {
        const item = items.find(entry => String(entry.id) === String(move.itemId))
        const worker = workers.find(entry => String(entry.id) === String(move.workerId))
        const order = orders.find(entry => String(entry.id) === String(move.projectId || move.mantId))
        const due = move.expectedReturnAt ? String(move.expectedReturnAt).slice(0, 10) : ''
        const overdue = due && due < today()
        return <tr key={move.id}><td><strong className="nk-assign-primary">{item?.name || 'Recurso'}</strong><small className="nk-assign-secondary">{item?.code || item?.serial || 'Sin código'}</small></td><td><span className="nk-assign-primary">{workerLabel(worker)}</span></td><td><span className="nk-assign-primary">{orderLabel(order)}</span></td><td>{Number(move.qty || 1)}</td><td>{String(move.at || '').slice(0, 10) || '—'}</td><td><div className="nk-assign-due"><span>{due || 'Sin fecha'}</span>{overdue && <span className="nk-badge nk-badge-error">Vencida</span>}</div></td><td><button className="nk-button nk-button-secondary nk-button-sm" onClick={() => returnLoan(move)} disabled={saving}>Devolver</button></td></tr>
      }) : <tr><td colSpan="7" className="nk-assign-empty">No hay préstamos activos para este filtro.</td></tr>}</tbody></table></div></section>

      {formOpen && <section className="nk-card nk-assign-editor"><div className="nk-assign-editor-head"><h2>Asignar recurso</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setFormOpen(false)}>Cerrar</button></div><div className="nk-assign-form">
        <label><span>Recurso</span><select className="nk-select" value={form.itemId} onChange={event => setForm({ ...form, itemId: event.target.value })}><option value="">Seleccionar</option>{assignableItems.map(item => <option key={item.id} value={item.id}>{item.name} · stock {Number(item.stock || 0)}</option>)}</select></label>
        <label><span>Bodega de origen</span><select className="nk-select" value={form.warehouseId} onChange={event => setForm({ ...form, warehouseId: event.target.value })}><option value="">Seleccionar</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name || warehouse.nombre || warehouse.id}</option>)}</select></label>
        <label><span>Persona responsable</span><select className="nk-select" value={form.workerId} onChange={event => setForm({ ...form, workerId: event.target.value })}><option value="">Seleccionar</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{workerLabel(worker)}</option>)}</select></label>
        <label><span>Orden de servicio</span><select className="nk-select" value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">Sin orden asociada</option>{orders.map(order => <option key={order.id} value={order.id}>{orderLabel(order)}</option>)}</select></label>
        <label><span>Cantidad</span><input className="nk-input" type="number" min="1" value={form.qty} onChange={event => setForm({ ...form, qty: event.target.value })}/></label>
        <label><span>Devolución esperada</span><input className="nk-input" type="date" value={form.expectedReturnAt} onChange={event => setForm({ ...form, expectedReturnAt: event.target.value })}/></label>
        <label className="wide"><span>Observaciones</span><textarea className="nk-input" value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Responsable, condición de entrega u otra referencia..."/></label>
      </div><div className="nk-assign-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setFormOpen(false)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={saveAssignment} disabled={saving}>{saving ? 'Guardando…' : 'Registrar asignación'}</button></div></section>}
    </div>
  )
}
