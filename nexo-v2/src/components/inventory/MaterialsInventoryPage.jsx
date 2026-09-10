import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../../services/api.js'
import '../../styles/inventory-category.css'

const rows = value => Array.isArray(value) ? value : []
const categoryOf = item => {
  const source = `${item.type || ''} ${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (/maquin/.test(source)) return 'maquinaria'
  if (/herramient|tool/.test(source)) return 'herramientas'
  if (/\bepp\b|protecci[oó]n personal|casco|calzado de seguridad|lentes de seguridad|guantes/.test(source)) return 'epp'
  if (/material|ferreter/.test(source)) return 'materiales'
  if (/insumo|consumible/.test(source)) return 'insumos'
  return 'equipos'
}
const stockState = item => Number(item.stock || 0) <= Number(item.minStock || 0) ? 'Reponer' : 'Disponible'

export default function MaterialsInventoryPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ name:'', code:'', type:'Material', unit:'unidad', warehouseId:'', locationId:'', stock:0, minStock:0 })

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar materiales.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const allItems = rows(state.inventoryItems).length ? rows(state.inventoryItems) : rows(state.activos)
  const materials = useMemo(() => allItems.filter(item => categoryOf(item) === 'materiales'), [allItems])
  const warehouses = rows(state.warehouses).length ? rows(state.warehouses) : rows(state.bodegas)
  const locations = rows(state.inventoryLocations)
  const movements = rows(state.inventoryMovements)
  const warehouseName = id => { const row = warehouses.find(w => String(w.id) === String(id)); return row?.name || row?.nombre || row?.label || '' }
  const locationName = id => { const row = locations.find(l => String(l.id) === String(id)); return row?.name || row?.nombre || row?.code || row?.codigo || row?.position || row?.ubicacion || '' }
  const itemLocation = item => [warehouseName(item.warehouseId), locationName(item.locationId)].filter(Boolean).join(' · ') || item.location || 'Sin ubicación definida'
  const formLocations = locations.filter(l => String(l.warehouseId || l.bodegaId || l.parentId || '') === String(form.warehouseId || ''))

  const filtered = useMemo(() => materials.filter(item => {
    const term = query.trim().toLowerCase()
    const matchesText = !term || [item.name,item.code,item.type,item.unit,itemLocation(item)].some(v => String(v || '').toLowerCase().includes(term))
    return matchesText && (!status || stockState(item) === status) && (!warehouseFilter || String(item.warehouseId) === warehouseFilter)
  }), [materials, query, status, warehouseFilter, warehouses, locations])

  const summary = useMemo(() => ({
    total: materials.length,
    units: materials.reduce((sum,item) => sum + Number(item.stock || 0), 0),
    low: materials.filter(item => stockState(item) === 'Reponer').length,
    warehouses: new Set(materials.map(item => item.warehouseId).filter(Boolean)).size,
  }), [materials])

  const lastMovement = item => movements.filter(m => String(m.itemId || m.assetId) === String(item.id)).sort((a,b) => String(b.at || b.date || '').localeCompare(String(a.at || a.date || '')))[0]

  async function save() {
    if (!form.name.trim()) return setError('Ingresa el nombre del material.')
    if (!form.warehouseId) return setError('Selecciona una bodega para registrar el material.')
    setSaving(true); setError('')
    try {
      const id = `inv_${Date.now()}`
      const record = { ...form, id, category:'materiales', stock:Number(form.stock || 0), minStock:Number(form.minStock || 0), location:[warehouseName(form.warehouseId),locationName(form.locationId)].filter(Boolean).join(' · '), status:'disponible', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
      const next = [record, ...allItems]
      const result = await api.put('/state/modules', { reason:`Material registrado: ${record.name}`, changes:{ inventoryItems:{ version:Number(versions.inventoryItems || 0), data:next } } })
      setResponse(current => ({ ...current, state:{ ...(current?.state || state), inventoryItems:next }, moduleVersions:{ ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setFormOpen(false)
    } catch (cause) { setError(cause.message || 'No fue posible guardar el material.') }
    finally { setSaving(false) }
  }

  function openNew() { setForm({ name:'', code:'', type:'Material', unit:'unidad', warehouseId:'', locationId:'', stock:0, minStock:0 }); setFormOpen(true) }

  return <div className="nk-invcat-page nk-invcat-page--materials">
    <header className="nk-invcat-header"><div><h1 className="nk-page-title">Materiales y ferretería</h1><p className="nk-page-description">Controla materiales y artículos de ferretería por existencias, mínimos y distribución física en bodegas.</p></div><div className="nk-invcat-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={openNew}><IconPlus size={15}/> Agregar material</button></div></header>
    {error && <div className="nk-invcat-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}
    <section className="nk-card nk-invcat-filters nk-materials-filters"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar material, código o ubicación..."/></label><select className="nk-select" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}><option value="">Todas las bodegas</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name || w.nombre || w.label || 'Bodega'}</option>)}</select><select className="nk-select" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Reponer">Reponer</option></select></section>
    <section className="nk-invcat-kpis"><article><strong>{summary.total}</strong><span>Materiales registrados</span></article><article><strong>{summary.units}</strong><span>Unidades en existencia</span></article><article><strong>{summary.low}</strong><span>Bajo mínimo / reponer</span></article><article><strong>{summary.warehouses}</strong><span>Bodegas con materiales</span></article></section>
    <section className="nk-card nk-invcat-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-invcat-table nk-invcat-table--materials"><thead><tr><th>Material</th><th>Unidad</th><th>Existencia</th><th>Mínimo / estado</th><th>Bodega / ubicación</th><th>Último movimiento</th></tr></thead><tbody>{loading ? <tr><td colSpan="6">Cargando…</td></tr> : filtered.length ? filtered.map(item => { const movement=lastMovement(item); return <tr key={item.id}><td><strong>{item.name || 'Sin nombre'}</strong><small>{item.code || item.type || 'Material'}</small></td><td>{item.unit || item.unidad || 'unidad'}</td><td><strong>{Number(item.stock || 0)}</strong><small>{item.unit || item.unidad || 'unidades'}</small></td><td><strong>{Number(item.minStock || 0)}</strong><small><span className={`nk-badge ${stockState(item)==='Reponer'?'nk-badge-error':'nk-badge-ok'}`}>{stockState(item)}</span></small></td><td>{itemLocation(item)}</td><td><strong>{movement?.type || 'Sin movimientos'}</strong><small>{movement?.at ? String(movement.at).slice(0,10) : 'Sin fecha'}</small></td></tr> }) : <tr><td colSpan="6" className="nk-invcat-empty">No hay materiales registrados.</td></tr>}</tbody></table></div></section>
    {formOpen && <section className="nk-card nk-invcat-editor"><div className="nk-invcat-editor-head"><h2>Agregar material</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setFormOpen(false)}>Cerrar</button></div>{!warehouses.length && <div className="nk-invcat-feedback"><span>No hay bodegas creadas. Crea una en Bodegas y almacenes antes de registrar materiales.</span></div>}<div className="nk-invcat-form"><label><span>Nombre</span><input className="nk-input" value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label><label><span>Código</span><input className="nk-input" value={form.code} onChange={e => setForm({...form,code:e.target.value})}/></label><label><span>Tipo / familia</span><input className="nk-input" value={form.type} onChange={e => setForm({...form,type:e.target.value})}/></label><label><span>Unidad de medida</span><input className="nk-input" value={form.unit} onChange={e => setForm({...form,unit:e.target.value})} placeholder="unidad, kg, m, caja..."/></label><label><span>Bodega</span><select className="nk-select" value={form.warehouseId} onChange={e => setForm({...form,warehouseId:e.target.value,locationId:''})}><option value="">Seleccionar bodega</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name || w.nombre || w.label || 'Bodega'}</option>)}</select></label><label><span>Ubicación interna</span><select className="nk-select" value={form.locationId} onChange={e => setForm({...form,locationId:e.target.value})} disabled={!form.warehouseId || !formLocations.length}><option value="">{formLocations.length?'Sin ubicación interna':'No hay ubicaciones internas'}</option>{formLocations.map(l => <option key={l.id} value={l.id}>{l.name || l.nombre || l.code || l.codigo || l.position || l.ubicacion || 'Ubicación'}</option>)}</select></label><label><span>Existencia inicial</span><input className="nk-input" type="number" min="0" value={form.stock} onChange={e => setForm({...form,stock:e.target.value})}/></label><label><span>Stock mínimo</span><input className="nk-input" type="number" min="0" value={form.minStock} onChange={e => setForm({...form,minStock:e.target.value})}/></label></div><div className="nk-invcat-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setFormOpen(false)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={save} disabled={saving || !warehouses.length}>{saving?'Guardando…':'Guardar'}</button></div></section>}
  </div>
}
