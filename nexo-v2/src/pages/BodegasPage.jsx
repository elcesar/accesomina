import { useEffect, useMemo, useState } from 'react'
import { IconBuildingWarehouse, IconMapPin, IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/bodegas.css'

const rows = value => Array.isArray(value) ? value : []

export default function BodegasPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState({})

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (e) { setError(e.message || 'No fue posible cargar bodegas y ubicaciones.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const warehouseKey = rows(state.warehouses).length ? 'warehouses' : 'bodegas'
  const warehouses = rows(state[warehouseKey])
  const locations = rows(state.inventoryLocations)
  const items = rows(state.inventoryItems)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return warehouses
    return warehouses.filter(warehouse => {
      const ownLocations = locations.filter(location => String(location.warehouseId || location.bodegaId) === String(warehouse.id))
      return [warehouse.name, warehouse.type, warehouse.zone, warehouse.location, warehouse.responsible, ...ownLocations.flatMap(location => [location.name, location.code, location.zone])]
        .some(value => String(value || '').toLowerCase().includes(term))
    })
  }, [warehouses, locations, query])

  const stockForWarehouse = warehouseId => items.reduce((sum, item) => sum + Number(item.stockByLocation?.[warehouseId] || 0), 0)
  const locationCount = warehouseId => locations.filter(location => String(location.warehouseId || location.bodegaId) === String(warehouseId)).length
  const locationNames = warehouseId => locations.filter(location => String(location.warehouseId || location.bodegaId) === String(warehouseId)).map(location => location.name || location.code || 'Ubicación')

  const summary = useMemo(() => ({
    warehouses: warehouses.length,
    locations: locations.length,
    stock: warehouses.reduce((sum, warehouse) => sum + stockForWarehouse(warehouse.id), 0),
    low: items.filter(item => Number(item.stock || 0) <= Number(item.minStock || 0)).length,
  }), [warehouses, locations, items])

  function openWarehouse() {
    setForm({ name: '', type: 'Central', zone: '', responsible: '' })
    setEditor('warehouse')
  }

  function openLocation() {
    setForm({ warehouseId: warehouses[0]?.id || '', name: '', code: '', zone: '', responsible: '' })
    setEditor('location')
  }

  async function save() {
    if (editor === 'warehouse' && !String(form.name || '').trim()) { setError('Ingresa el nombre de la bodega.'); return }
    if (editor === 'location' && (!form.warehouseId || !String(form.name || '').trim())) { setError('Selecciona la bodega e ingresa el nombre de la ubicación interna.'); return }
    setSaving(true); setError('')
    try {
      const id = `${editor}_${Date.now()}`
      const key = editor === 'warehouse' ? warehouseKey : 'inventoryLocations'
      const source = editor === 'warehouse' ? warehouses : locations
      const record = editor === 'warehouse'
        ? { id, ...form, active: true, createdAt: new Date().toISOString() }
        : { id, ...form, bodegaId: form.warehouseId, active: true, createdAt: new Date().toISOString() }
      const next = [record, ...source]
      const result = await api.put('/state/modules', {
        reason: editor === 'warehouse' ? `Bodega creada: ${record.name}` : `Ubicación interna creada: ${record.name}`,
        changes: { [key]: { version: Number(versions[key] || 0), data: next } },
      })
      setResponse(current => ({
        ...(current || {}),
        state: { ...(current?.state || state), [key]: next },
        moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) },
      }))
      setEditor(null)
    } catch (e) { setError(e.message || 'No fue posible guardar el registro.') }
    finally { setSaving(false) }
  }

  return (
    <div className="nk-warehouses-page">
      <header className="nk-page-header nk-warehouses-header">
        <div className="nk-page-heading">
          <h1 className="nk-page-title">Bodegas y almacenes</h1>
          <p className="nk-page-description">Administra bodegas, ubicaciones internas, responsables y existencias distribuidas por ubicación.</p>
        </div>
        <div className="nk-page-header-actions">
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button>
          <button className="nk-button nk-button-secondary" onClick={openLocation} disabled={!warehouses.length}><IconMapPin size={15}/> Ubicación interna</button>
          <button className="nk-button nk-button-primary" onClick={openWarehouse}><IconPlus size={15}/> Crear bodega</button>
        </div>
      </header>

      {error && <div className="nk-warehouses-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}

      <section className="nk-card nk-warehouses-toolbar">
        <label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar bodega, ubicación o responsable..."/></label>
      </section>

      <section className="nk-warehouses-kpis">
        <article><IconBuildingWarehouse size={18}/><div><strong>{summary.warehouses}</strong><span>Bodegas</span></div></article>
        <article><IconMapPin size={18}/><div><strong>{summary.locations}</strong><span>Ubicaciones internas</span></div></article>
        <article><div><strong>{summary.stock}</strong><span>Existencias distribuidas</span></div></article>
        <article><div><strong>{summary.low}</strong><span>Recursos bajo mínimo</span></div></article>
      </section>

      <section className="nk-card nk-warehouses-table-card">
        <div className="nk-warehouses-section-head">
          <div><h2>Distribución física</h2><p>Cada bodega mantiene su saldo y puede subdividirse en ubicaciones internas.</p></div>
        </div>
        <div className="nk-table-wrapper">
          <table className="nk-table nk-warehouses-table">
            <thead><tr><th>Bodega</th><th>Tipo</th><th>Ubicación</th><th>Responsable</th><th>Ubicaciones internas</th><th>Existencias</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="6">Cargando bodegas…</td></tr> : filtered.length ? filtered.map(warehouse => {
              const names = locationNames(warehouse.id)
              return <tr key={warehouse.id}>
                <td><strong>{warehouse.name || 'Sin nombre'}</strong><small>{warehouse.code || 'Bodega activa'}</small></td>
                <td>{warehouse.type || 'General'}</td>
                <td>{warehouse.zone || warehouse.location || '—'}</td>
                <td>{warehouse.responsible || 'Sin responsable'}</td>
                <td><strong>{locationCount(warehouse.id)}</strong><small>{names.length ? names.slice(0, 2).join(' · ') : 'Sin ubicaciones internas'}</small></td>
                <td><strong>{stockForWarehouse(warehouse.id)}</strong><small>unidades</small></td>
              </tr>
            }) : <tr><td colSpan="6" className="nk-warehouses-empty">Crea una bodega para comenzar a distribuir existencias.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      {editor && <section className="nk-card nk-warehouses-editor">
        <div className="nk-warehouses-editor-head"><div><h2>{editor === 'warehouse' ? 'Nueva bodega' : 'Nueva ubicación interna'}</h2><p>{editor === 'warehouse' ? 'Define el punto físico de almacenamiento.' : 'Ubica físicamente recursos dentro de una bodega existente.'}</p></div><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setEditor(null)}>Cerrar</button></div>
        <div className="nk-warehouses-form">
          {editor === 'location' && <label><span>Bodega</span><select className="nk-select" value={form.warehouseId || ''} onChange={e => setForm({...form, warehouseId:e.target.value})}><option value="">Seleccionar</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>}
          <label><span>Nombre</span><input className="nk-input" value={form.name || ''} onChange={e => setForm({...form, name:e.target.value})}/></label>
          {editor === 'warehouse' ? <>
            <label><span>Tipo</span><select className="nk-select" value={form.type || 'Central'} onChange={e => setForm({...form,type:e.target.value})}><option>Central</option><option>Móvil</option><option>Terreno</option><option>Sucursal</option><option>General</option></select></label>
            <label><span>Ubicación</span><input className="nk-input" value={form.zone || ''} onChange={e => setForm({...form,zone:e.target.value})}/></label>
          </> : <>
            <label><span>Código</span><input className="nk-input" value={form.code || ''} onChange={e => setForm({...form,code:e.target.value})} placeholder="Ej. PAS-01"/></label>
            <label><span>Sector / posición</span><input className="nk-input" value={form.zone || ''} onChange={e => setForm({...form,zone:e.target.value})} placeholder="Pasillo, estante, patio, casillero…"/></label>
          </>}
          <label><span>Responsable</span><input className="nk-input" value={form.responsible || ''} onChange={e => setForm({...form,responsible:e.target.value})}/></label>
        </div>
        <div className="nk-warehouses-editor-actions"><button className="nk-button nk-button-secondary" onClick={() => setEditor(null)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </section>}
    </div>
  )
}
