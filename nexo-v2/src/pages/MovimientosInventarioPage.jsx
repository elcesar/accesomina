import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/movimientos-inventario.css'

const rows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)

function movementLabel(type) {
  return {
    entrega: 'Entrega',
    devolucion: 'Devolución',
    reposicion: 'Reposición',
    traslado: 'Traslado',
    perdida: 'Pérdida',
    dano: 'Daño / desgaste',
    ajuste: 'Ajuste',
    ingreso: 'Ingreso',
    egreso: 'Egreso',
    prestamo: 'Préstamo',
  }[type] || type || 'Movimiento'
}

export default function MovimientosInventarioPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar los movimientos de inventario.') }
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

  const sorted = useMemo(() => [...movements].sort((a, b) => String(b.at || b.date || '').localeCompare(String(a.at || a.date || ''))), [movements])

  const filtered = useMemo(() => sorted.filter(row => {
    const term = query.trim().toLowerCase()
    const item = items.find(entry => String(entry.id) === String(row.itemId))
    const worker = workers.find(entry => String(entry.id) === String(row.workerId))
    const order = orders.find(entry => String(entry.id) === String(row.projectId || row.mantId))
    const searchable = [item?.name, item?.code, row.notes, row.user, worker?.nombre, worker?.name, order?.codigo, order?.nombre, order?.name]
    return (!term || searchable.some(value => String(value || '').toLowerCase().includes(term))) &&
      (!typeFilter || row.type === typeFilter) &&
      (!warehouseFilter || String(row.warehouseId) === warehouseFilter || String(row.warehouseToId) === warehouseFilter) &&
      (!dateFilter || String(row.at || row.date || '').slice(0, 10) === dateFilter)
  }), [sorted, query, typeFilter, warehouseFilter, dateFilter, items, workers, orders])

  const summary = useMemo(() => ({
    total: movements.length,
    inbound: movements.filter(row => ['reposicion', 'devolucion', 'ingreso'].includes(row.type)).length,
    outbound: movements.filter(row => ['entrega', 'egreso', 'perdida', 'dano', 'prestamo'].includes(row.type)).length,
    transfers: movements.filter(row => row.type === 'traslado').length,
  }), [movements])

  function itemName(id) {
    return items.find(entry => String(entry.id) === String(id))?.name || 'Recurso'
  }

  function itemCode(id) {
    const item = items.find(entry => String(entry.id) === String(id))
    return item?.code || item?.serie || item?.serial || 'Sin código'
  }

  function warehouseName(id) {
    return warehouses.find(entry => String(entry.id) === String(id))?.name || '—'
  }

  function reference(row) {
    const worker = workers.find(entry => String(entry.id) === String(row.workerId))
    const order = orders.find(entry => String(entry.id) === String(row.projectId || row.mantId))
    return {
      main: worker?.nombre || worker?.name || order?.codigo || order?.nombre || order?.name || row.user || 'Sin referencia',
      sub: row.notes || (row.signed ? 'Con firma' : row.fileName || 'Sin observación'),
    }
  }

  function openNew() {
    setForm({ itemId: '', type: 'reposicion', qty: 1, warehouseId: '', warehouseToId: '', workerId: '', projectId: '', at: today(), notes: '', signed: false })
    setOpen(true)
  }

  async function saveMovement() {
    const qty = Number(form.qty || 0)
    if (!form.itemId || !form.warehouseId || qty <= 0) {
      setError('Completa recurso, bodega y cantidad.')
      return
    }
    if (form.type === 'traslado' && !form.warehouseToId) {
      setError('Selecciona una bodega destino para el traslado.')
      return
    }
    if (form.type === 'traslado' && String(form.warehouseId) === String(form.warehouseToId)) {
      setError('La bodega destino debe ser distinta de la bodega origen.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const item = items.find(entry => String(entry.id) === String(form.itemId))
      if (!item) throw new Error('No se encontró el recurso seleccionado.')

      const stockByLocation = { ...(item.stockByLocation || {}) }
      const beforeOrigin = Number(stockByLocation[form.warehouseId] || 0)
      const beforeDestination = Number(stockByLocation[form.warehouseToId] || 0)
      const subtract = ['entrega', 'traslado', 'perdida', 'dano', 'egreso', 'prestamo'].includes(form.type)
      const add = ['reposicion', 'devolucion', 'ingreso'].includes(form.type)

      if (subtract && beforeOrigin < qty) throw new Error(`Stock insuficiente en la bodega seleccionada. Disponible: ${beforeOrigin}`)

      if (subtract) stockByLocation[form.warehouseId] = beforeOrigin - qty
      if (add) stockByLocation[form.warehouseId] = beforeOrigin + qty
      if (form.type === 'ajuste') stockByLocation[form.warehouseId] = qty
      if (form.type === 'traslado') stockByLocation[form.warehouseToId] = beforeDestination + qty

      const updatedItem = {
        ...item,
        stockByLocation,
        stock: Object.values(stockByLocation).reduce((total, value) => total + Number(value || 0), 0),
        updatedAt: new Date().toISOString(),
      }
      const nextItems = items.map(entry => String(entry.id) === String(item.id) ? updatedItem : entry)
      const movement = {
        id: `mov_${Date.now()}`,
        itemId: item.id,
        warehouseId: form.warehouseId,
        warehouseToId: form.type === 'traslado' ? form.warehouseToId : '',
        type: form.type,
        qty,
        stockBefore: beforeOrigin,
        stockAfter: Number(stockByLocation[form.warehouseId] || 0),
        workerId: form.workerId || '',
        projectId: form.projectId || '',
        notes: form.notes?.trim() || '',
        signed: Boolean(form.signed),
        fileName: '',
        at: form.at ? `${form.at}T12:00:00` : new Date().toISOString(),
      }
      const nextMovements = [movement, ...movements]
      const result = await api.put('/state/modules', {
        reason: `Movimiento de inventario: ${movementLabel(form.type)} de ${item.name}`,
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
      setOpen(false)
    } catch (cause) {
      setError(cause.message || 'No fue posible registrar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="nk-mov-page">
    <header className="nk-mov-header">
      <div className="nk-mov-heading"><h1>Movimientos de inventario</h1><p>Registra ingresos, egresos, traslados y ajustes con trazabilidad por recurso, bodega y referencia operacional.</p></div>
      <div className="nk-mov-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={openNew}><IconPlus size={15}/> Nuevo movimiento</button></div>
    </header>

    {error && <div className="nk-mov-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}

    <section className="nk-card nk-mov-filters">
      <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar recurso, persona, OS o referencia..."/></label>
      <select className="nk-select" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="">Todos los movimientos</option><option value="entrega">Entrega</option><option value="devolucion">Devolución</option><option value="reposicion">Reposición</option><option value="traslado">Traslado</option><option value="perdida">Pérdida</option><option value="dano">Daño / desgaste</option><option value="ajuste">Ajuste</option><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select>
      <select className="nk-select" value={warehouseFilter} onChange={event => setWarehouseFilter(event.target.value)}><option value="">Todas las bodegas</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select>
      <input className="nk-input" type="date" value={dateFilter} onChange={event => setDateFilter(event.target.value)}/>
    </section>

    <section className="nk-mov-kpis"><article><strong>{summary.total}</strong><span>Movimientos registrados</span></article><article><strong>{summary.inbound}</strong><span>Ingresos / devoluciones</span></article><article><strong>{summary.outbound}</strong><span>Salidas / entregas</span></article><article><strong>{summary.transfers}</strong><span>Traslados entre bodegas</span></article></section>

    <section className="nk-card nk-mov-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-mov-table"><thead><tr><th>Recurso</th><th>Movimiento</th><th>Cantidad</th><th>Bodega / destino</th><th>Fecha</th><th>Referencia</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Cargando movimientos…</td></tr> : filtered.length ? filtered.map(row => { const ref = reference(row); return <tr key={row.id}><td className="nk-mov-resource"><strong>{itemName(row.itemId)}</strong><small>{itemCode(row.itemId)}</small></td><td><span className="nk-badge nk-badge-blue">{movementLabel(row.type)}</span></td><td>{Number(row.qty || 0)}</td><td>{row.type === 'traslado' ? `${warehouseName(row.warehouseId)} → ${warehouseName(row.warehouseToId)}` : warehouseName(row.warehouseId)}</td><td>{String(row.at || row.date || '').slice(0, 10) || '—'}</td><td className="nk-mov-ref"><strong>{ref.main}</strong><small>{ref.sub}</small></td></tr> }) : <tr><td colSpan="6" className="nk-mov-empty">No hay movimientos para los filtros seleccionados.</td></tr>}</tbody></table></div></section>

    {open && <section className="nk-card nk-mov-editor"><div className="nk-mov-editor-head"><h2>Registrar movimiento</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setOpen(false)}>Cerrar</button></div><div className="nk-mov-form">
      <label><span>Recurso</span><select className="nk-select" value={form.itemId || ''} onChange={event => setForm({ ...form, itemId: event.target.value })}><option value="">Seleccionar</option>{items.map(item => <option key={item.id} value={item.id}>{item.name} · stock {Number(item.stock || 0)}</option>)}</select></label>
      <label><span>Movimiento</span><select className="nk-select" value={form.type || 'reposicion'} onChange={event => setForm({ ...form, type: event.target.value })}><option value="entrega">Entrega</option><option value="devolucion">Devolución</option><option value="reposicion">Reposición</option><option value="traslado">Traslado entre bodegas</option><option value="perdida">Pérdida</option><option value="dano">Daño / desgaste</option><option value="ajuste">Ajuste de inventario</option></select></label>
      <label><span>Bodega origen</span><select className="nk-select" value={form.warehouseId || ''} onChange={event => setForm({ ...form, warehouseId: event.target.value })}><option value="">Seleccionar</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      {form.type === 'traslado' && <label><span>Bodega destino</span><select className="nk-select" value={form.warehouseToId || ''} onChange={event => setForm({ ...form, warehouseToId: event.target.value })}><option value="">Seleccionar</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>}
      <label><span>Cantidad</span><input className="nk-input" type="number" min="1" value={form.qty || 1} onChange={event => setForm({ ...form, qty: event.target.value })}/></label>
      <label><span>Fecha</span><input className="nk-input" type="date" value={form.at || today()} onChange={event => setForm({ ...form, at: event.target.value })}/></label>
      <label><span>Trabajador</span><select className="nk-select" value={form.workerId || ''} onChange={event => setForm({ ...form, workerId: event.target.value })}><option value="">No aplica</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre || worker.name}</option>)}</select></label>
      <label><span>Orden de servicio</span><select className="nk-select" value={form.projectId || ''} onChange={event => setForm({ ...form, projectId: event.target.value })}><option value="">No aplica</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo || order.nombre || order.name}</option>)}</select></label>
      <label className="wide"><span>Observaciones</span><textarea className="nk-input" rows="3" value={form.notes || ''} onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
    </div><div className="nk-mov-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={saveMovement} disabled={saving}>{saving ? 'Guardando…' : 'Registrar movimiento'}</button></div></section>}
  </div>
}
