import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/activos-inventario.css'

function rows(value) { return Array.isArray(value) ? value : [] }

function inventoryCategory(item) {
  const source = `${item.type || ''} ${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (/maquin/.test(source)) return 'maquinaria'
  if (/herramient|tool/.test(source)) return 'herramientas'
  if (/\bepp\b|protecci[oó]n personal|casco|calzado de seguridad|lentes de seguridad|guantes/.test(source)) return 'epp'
  if (/material|ferreter/.test(source)) return 'materiales'
  if (/insumo|consumible/.test(source)) return 'insumos'
  return 'equipos'
}

function itemStatus(item) {
  return Number(item.stock || 0) <= Number(item.minStock || 0) ? 'Reponer' : 'Disponible'
}

function emptyItem() {
  return { id: '', name: '', code: '', type: 'Equipo', category: 'equipos', stock: 0, minStock: 0, location: '' }
}

export default function ActivosInventarioPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyItem())

  async function load() {
    setLoading(true)
    setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar el inventario.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const items = rows(state.inventoryItems).length ? rows(state.inventoryItems) : rows(state.activos)
  const movements = rows(state.inventoryMovements)
  const stocktakes = rows(state.inventoryStocktakes)
  const replenishments = rows(state.replenishmentRequests)
  const orders = rows(state.mantenciones).length ? rows(state.mantenciones) : rows(state.proyectos)
  const reservations = rows(state.assetReservations)

  const filtered = useMemo(() => items.filter(item => {
    const term = query.trim().toLowerCase()
    const cat = inventoryCategory(item)
    const status = itemStatus(item)
    return (!term || [item.name, item.code, item.serial, item.serie, item.type, item.location].some(v => String(v || '').toLowerCase().includes(term))) &&
      (!category || cat === category) &&
      (!statusFilter || status === statusFilter)
  }), [items, query, category, statusFilter])

  const summary = useMemo(() => ({
    total: items.length,
    low: items.filter(item => Number(item.stock || 0) <= Number(item.minStock || 0)).length,
    pending: replenishments.filter(row => ['pendiente', 'aprobada'].includes(row.status)).length,
    counts: stocktakes.length,
  }), [items, replenishments, stocktakes])

  const orderAvailability = useMemo(() => orders.slice(0, 8).map(order => {
    const current = reservations.filter(row => String(row.projectId || row.mantId) === String(order.id) && row.status !== 'cancelada')
    const available = current.filter(row => {
      const item = items.find(entry => String(entry.id) === String(row.itemId))
      return item && String(item.status || itemStatus(item)) === 'Disponible'
    }).length
    return { order, reserved: current.length, available }
  }), [orders, reservations, items])

  async function saveItem() {
    if (!form.name.trim()) { setError('Ingresa el nombre del recurso.'); return }
    setSaving(true); setError('')
    try {
      const id = form.id || `inv_${Date.now()}`
      const record = { ...form, id, stock: Number(form.stock || 0), minStock: Number(form.minStock || 0), updatedAt: new Date().toISOString(), createdAt: form.createdAt || new Date().toISOString() }
      const next = items.some(item => item.id === id) ? items.map(item => item.id === id ? record : item) : [record, ...items]
      const result = await api.put('/state/modules', {
        reason: `${form.id ? 'Inventario actualizado' : 'Recurso registrado'}: ${record.name}`,
        changes: { inventoryItems: { version: Number(versions.inventoryItems || 0), data: next } },
      })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || state), inventoryItems: next }, moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setForm(record); setFormOpen(false)
    } catch (cause) { setError(cause.message || 'No fue posible guardar el recurso.') }
    finally { setSaving(false) }
  }

  function openNew() { setForm(emptyItem()); setFormOpen(true) }

  function lookupCode() {
    const value = window.prompt('Código, serie o nombre del recurso')
    if (!value) return
    const term = value.toLowerCase()
    const item = items.find(row => [row.code, row.serial, row.serie, row.name].some(field => String(field || '').toLowerCase().includes(term)))
    if (!item) { setError('No se encontró un recurso con ese código.'); return }
    setQuery(item.code || item.serial || item.serie || item.name || value)
  }

  function startStocktake() {
    setError('Conteo físico quedará conectado al módulo de movimientos/bodegas en el siguiente submódulo de Fase 8.')
  }

  function receiveStock() {
    setError('Recepción de reposición quedará conectada al flujo de movimientos en el siguiente submódulo de Fase 8.')
  }

  return (
    <div className="nk-assets-page">
      <header className="nk-assets-header">
        <div><h1>Inventario y existencias</h1><p>Catálogo central de activos, equipos y existencias con stock, mínimos, ubicación y trazabilidad.</p></div>
        <div className="nk-assets-header-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={openNew}><IconPlus size={15}/> Registrar activo o existencia</button></div>
      </header>

      {error && <div className="nk-assets-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}

      <section className="nk-card nk-assets-filters">
        <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar recurso, código, serie o ubicación..."/></label>
        <select className="nk-select" value={category} onChange={e => setCategory(e.target.value)}><option value="">Todas las categorías</option><option value="maquinaria">Maquinaria</option><option value="equipos">Equipos e instrumentos</option><option value="herramientas">Herramientas</option><option value="epp">EPP</option><option value="materiales">Materiales</option><option value="insumos">Insumos</option></select>
        <select className="nk-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Reponer">Reponer</option></select>
      </section>

      <section className="nk-assets-kpis"><article><strong>{summary.total}</strong><span>Recursos controlados</span></article><article><strong>{summary.low}</strong><span>Bajo mínimo</span></article><article><strong>{summary.pending}</strong><span>Recepciones pendientes</span></article><article><strong>{summary.counts}</strong><span>Conteos registrados</span></article></section>

      <section className="nk-card nk-assets-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-assets-table"><thead><tr><th>Recurso</th><th>Tipo</th><th>Stock total</th><th>Mínimo</th><th>Bodega / ubicación</th><th>Estado</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Cargando inventario…</td></tr> : filtered.length ? filtered.map(item => <tr key={item.id}><td><strong>{item.name || 'Sin nombre'}</strong><small>{item.code || item.serial || item.serie || 'Sin código'}</small></td><td>{item.type || 'Recurso'}</td><td>{Number(item.stock || 0)}</td><td>{Number(item.minStock || 0)}</td><td>{item.location || 'Bodega'}</td><td><span className={`nk-badge ${itemStatus(item) === 'Reponer' ? 'nk-badge-error' : 'nk-badge-ok'}`}>{itemStatus(item)}</span></td></tr>) : <tr><td colSpan="6" className="nk-assets-empty">No hay registros para este filtro.</td></tr>}</tbody></table></div></section>

      <section className="nk-card nk-assets-control"><div className="nk-assets-control-head"><div><h2>Control de existencias</h2><p>Consulta recursos por código, registra conteos físicos y prepara recepciones sin perder trazabilidad.</p></div><div><button className="nk-button nk-button-secondary nk-button-sm" onClick={lookupCode}>Buscar código</button><button className="nk-button nk-button-secondary nk-button-sm" onClick={startStocktake}>Conteo físico</button><button className="nk-button nk-button-primary nk-button-sm" onClick={receiveStock}>Recibir reposición</button></div></div><div className="nk-table-wrapper"><table className="nk-table nk-assets-orders"><thead><tr><th>Orden de servicio</th><th>Recursos reservados</th><th>Disponibilidad</th></tr></thead><tbody>{orderAvailability.length ? orderAvailability.map(({order,reserved,available}) => <tr key={order.id}><td><strong>{order.codigo || order.nombre || order.name || order.id}</strong></td><td>{reserved}</td><td><span className={`nk-badge ${reserved === available ? 'nk-badge-ok' : 'nk-badge-warn'}`}>{reserved === available ? 'Recursos disponibles' : 'Revisar disponibilidad'}</span></td></tr>) : <tr><td colSpan="3">Sin órdenes de servicio registradas.</td></tr>}</tbody></table></div></section>

      {formOpen && <section className="nk-card nk-assets-editor"><div className="nk-assets-editor-head"><h2>Registrar activo o existencia</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setFormOpen(false)}>Cerrar</button></div><div className="nk-assets-form"><label><span>Nombre</span><input className="nk-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label><span>Código / serie</span><input className="nk-input" value={form.code} onChange={e => setForm({...form,code:e.target.value})}/></label><label><span>Tipo</span><input className="nk-input" value={form.type} onChange={e => setForm({...form,type:e.target.value})}/></label><label><span>Categoría</span><select className="nk-select" value={form.category} onChange={e => setForm({...form,category:e.target.value})}><option value="maquinaria">Maquinaria</option><option value="equipos">Equipos</option><option value="herramientas">Herramientas</option><option value="epp">EPP</option><option value="materiales">Materiales</option><option value="insumos">Insumos</option></select></label><label><span>Stock</span><input className="nk-input" type="number" min="0" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})}/></label><label><span>Stock mínimo</span><input className="nk-input" type="number" min="0" value={form.minStock} onChange={e => setForm({...form,minStock:e.target.value})}/></label><label className="wide"><span>Bodega / ubicación</span><input className="nk-input" value={form.location} onChange={e => setForm({...form,location:e.target.value})}/></label></div><div className="nk-assets-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setFormOpen(false)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={saveItem} disabled={saving}>{saving ? 'Guardando…' : 'Guardar recurso'}</button></div></section>}
    </div>
  )
}
