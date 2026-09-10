import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../../services/api.js'
import '../../styles/inventory-category.css'

function rows(value) { return Array.isArray(value) ? value : [] }

function categoryOf(item) {
  const source = `${item.type || ''} ${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (/maquin/.test(source)) return 'maquinaria'
  if (/herramient|tool/.test(source)) return 'herramientas'
  if (/\bepp\b|protecci[oó]n personal|casco|calzado de seguridad|lentes de seguridad|guantes/.test(source)) return 'epp'
  if (/material|ferreter/.test(source)) return 'materiales'
  if (/insumo|consumible/.test(source)) return 'insumos'
  return 'equipos'
}

function stockState(item) {
  return Number(item.stock || 0) <= Number(item.minStock || 0) ? 'Reponer' : 'Disponible'
}

function machineryState(item, activeAssignments) {
  const status = String(item.status || '').toLowerCase()
  if (['mantenimiento', 'mantencion', 'fuera_servicio', 'fuera de servicio'].includes(status)) return 'Mantenimiento'
  if (activeAssignments.length) return 'Asignada'
  if (['inactivo', 'baja', 'no_disponible'].includes(status)) return 'No disponible'
  return 'Disponible'
}

function equipmentState(item) {
  const today = new Date().toISOString().slice(0, 10)
  if (!item.calibrationDue) return 'Sin calibración'
  if (item.calibrationDue <= today) return 'Calibración vencida'
  return 'Calibración vigente'
}

function toolState(item, activeAssignments) {
  const status = String(item.status || '').toLowerCase()
  if (['mantenimiento', 'mantencion', 'fuera_servicio', 'fuera de servicio'].includes(status)) return 'Mantenimiento'
  if (activeAssignments.length) return 'Asignada'
  if (['inactivo', 'baja', 'no_disponible'].includes(status)) return 'No disponible'
  return Number(item.stock || 0) > 0 ? 'Disponible' : 'Sin stock'
}

function emptyItem(category, type) {
  return {
    id: '', name: '', code: '', serie: '', type, category,
    stock: 0, minStock: 0, location: '', status: 'disponible',
    nextMaintenance: '', calibrationDue: '', certificate: '', custodian: '',
    size: '', usefulLifeMonths: '', expiryDate: '',
  }
}

export default function InventoryCategoryPage({ category, title, description, singular, defaultType, focus = 'stock' }) {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyItem(category, defaultType))

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || `No fue posible cargar ${title.toLowerCase()}.`) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const versions = response?.moduleVersions || {}
  const allItems = rows(state.inventoryItems).length ? rows(state.inventoryItems) : rows(state.activos)
  const items = useMemo(() => allItems.filter(item => categoryOf(item) === category), [allItems, category])
  const maintenancePlans = rows(state.assetMaintenancePlans)
  const maintenances = rows(state.mantenimientos)
  const workers = rows(state.trabajadores)
  const orders = rows(state.mantenciones).length ? rows(state.mantenciones) : rows(state.proyectos)
  const movementAssignments = rows(state.inventoryMovements).filter(row => row.type === 'prestamo' && !['devuelto', 'cerrado', 'cancelado'].includes(String(row.status || '').toLowerCase()))
  const legacyAssignments = rows(state.asignacionesActivos).length ? rows(state.asignacionesActivos) : rows(state.prestamos)
  const assignments = movementAssignments.length ? movementAssignments : legacyAssignments
  const eppDeliveries = rows(state.eppEntregas)

  const assignmentFor = item => assignments.filter(row => String(row.itemId || row.assetId) === String(item.id) && !['devuelto', 'cerrado', 'cancelado'].includes(String(row.status || '').toLowerCase()))
  const workerName = id => {
    const row = workers.find(worker => String(worker.id) === String(id))
    return row ? [row.nombre || row.nombres || row.name, row.apellido || row.apellidos].filter(Boolean).join(' ') : ''
  }
  const orderName = id => {
    const row = orders.find(order => String(order.id) === String(id))
    return row?.codigo || row?.code || row?.nombre || row?.name || ''
  }

  const filtered = useMemo(() => items.filter(item => {
    const term = query.trim().toLowerCase()
    const searchable = [item.name, item.code, item.serie, item.serial, item.type, item.location, item.custodian, item.certificate, item.size]
    const activeAssignments = assignmentFor(item)
    const stateLabel = focus === 'machinery' ? machineryState(item, activeAssignments) : focus === 'equipment' ? equipmentState(item) : focus === 'tools' ? toolState(item, activeAssignments) : stockState(item)
    return (!term || searchable.some(value => String(value || '').toLowerCase().includes(term))) && (!statusFilter || stateLabel === statusFilter)
  }), [items, query, statusFilter, assignments, focus])

  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const low = items.filter(item => stockState(item) === 'Reponer').length
    const assigned = assignments.filter(row => items.some(item => String(item.id) === String(row.itemId || row.assetId)) && !['devuelto', 'cerrado', 'cancelado'].includes(String(row.status || '').toLowerCase())).length
    const due = focus === 'equipment'
      ? items.filter(item => item.calibrationDue && item.calibrationDue <= today).length
      : focus === 'epp'
        ? items.filter(item => item.expiryDate && item.expiryDate <= today).length
        : focus === 'machinery'
          ? items.filter(item => {
              const plan = maintenancePlans.find(row => String(row.assetId || row.itemId) === String(item.id))
              const date = plan?.nextDate || plan?.nextMaintenance || item.nextMaintenance
              return date && date <= today
            }).length
          : maintenances.filter(row => items.some(item => String(item.id) === String(row.itemId || row.assetId)) && row.status !== 'completado').length
    const delivered = focus === 'epp'
      ? eppDeliveries.filter(row => items.some(item => String(item.id) === String(row.itemId || row.eppId))).length
      : assigned
    const available = focus === 'machinery' ? items.filter(item => machineryState(item, assignmentFor(item)) === 'Disponible').length : 0
    const calibrated = focus === 'equipment' ? items.filter(item => item.calibrationDue && item.calibrationDue > today).length : 0
    const certified = focus === 'equipment' ? items.filter(item => String(item.certificate || '').trim()).length : 0
    const toolAvailable = focus === 'tools' ? items.filter(item => toolState(item, assignmentFor(item)) === 'Disponible').length : 0
    const toolOverdue = focus === 'tools' ? assignments.filter(row => items.some(item => String(item.id) === String(row.itemId || row.assetId)) && row.expectedReturnAt && row.expectedReturnAt < today).length : 0
    return { total: items.length, low, assigned: delivered, due, available, calibrated, certified, toolAvailable, toolOverdue }
  }, [items, assignments, maintenancePlans, maintenances, eppDeliveries, focus])

  async function saveItem() {
    if (!form.name.trim()) { setError(`Ingresa el nombre de ${singular.toLowerCase()}.`); return }
    setSaving(true); setError('')
    try {
      const id = form.id || `inv_${Date.now()}`
      const record = {
        ...form, id, category,
        stock: Number(form.stock || 0),
        minStock: Number(form.minStock || 0),
        usefulLifeMonths: form.usefulLifeMonths === '' ? '' : Number(form.usefulLifeMonths || 0),
        updatedAt: new Date().toISOString(),
        createdAt: form.createdAt || new Date().toISOString(),
      }
      const next = allItems.some(item => item.id === id) ? allItems.map(item => item.id === id ? record : item) : [record, ...allItems]
      const result = await api.put('/state/modules', {
        reason: `${singular} ${form.id ? 'actualizada' : 'registrada'}: ${record.name}`,
        changes: { inventoryItems: { version: Number(versions.inventoryItems || 0), data: next } },
      })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || state), inventoryItems: next }, moduleVersions: { ...(current?.moduleVersions || versions), ...(result?.moduleVersions || {}) } }))
      setFormOpen(false)
    } catch (cause) { setError(cause.message || `No fue posible guardar ${singular.toLowerCase()}.`) }
    finally { setSaving(false) }
  }

  function openNew() { setForm(emptyItem(category, defaultType)); setFormOpen(true) }

  const fourthKpiLabel = focus === 'epp' ? 'Vida útil / vencidos' : 'Mantenimientos pendientes'
  const thirdKpiLabel = focus === 'epp' ? 'Entregas registradas' : 'Asignados / prestados'
  const lastColumnLabel = focus === 'epp' ? 'Talla / vida útil' : 'Mantenimiento / estado'
  const actionLabel = focus === 'epp' ? 'Agregar EPP' : `Agregar ${singular.toLowerCase()}`

  return <div className={`nk-invcat-page nk-invcat-page--${focus}`}>
    <header className="nk-invcat-header"><div><h1 className="nk-page-title">{title}</h1><p className="nk-page-description">{description}</p></div><div className="nk-invcat-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={openNew}><IconPlus size={15}/> {actionLabel}</button></div></header>
    {error && <div className="nk-invcat-feedback"><span>{error}</span><button className="nk-button nk-button-quiet nk-button-sm" onClick={() => setError('')}>Cerrar</button></div>}
    <section className="nk-card nk-invcat-filters"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Buscar ${singular.toLowerCase()}, código, serie o ubicación...`}/></label><select className="nk-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{focus === 'machinery' ? <><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Asignada">Asignada</option><option value="Mantenimiento">Mantenimiento</option><option value="No disponible">No disponible</option></> : focus === 'equipment' ? <><option value="">Todos los estados</option><option value="Calibración vigente">Calibración vigente</option><option value="Calibración vencida">Calibración vencida</option><option value="Sin calibración">Sin calibración</option></> : focus === 'tools' ? <><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Asignada">Asignada</option><option value="Mantenimiento">Mantenimiento</option><option value="Sin stock">Sin stock</option><option value="No disponible">No disponible</option></> : <><option value="">Todos los estados</option><option value="Disponible">Disponible</option><option value="Reponer">Reponer</option></>}</select></section>
    {focus === 'machinery' ? <section className="nk-invcat-kpis"><article><strong>{summary.total}</strong><span>Maquinarias registradas</span></article><article><strong>{summary.available}</strong><span>Disponibles</span></article><article><strong>{summary.assigned}</strong><span>Asignadas / prestadas</span></article><article><strong>{summary.due}</strong><span>Mantenimiento vencido</span></article></section> : focus === 'equipment' ? <section className="nk-invcat-kpis"><article><strong>{summary.total}</strong><span>Equipos registrados</span></article><article><strong>{summary.calibrated}</strong><span>Calibración vigente</span></article><article><strong>{summary.certified}</strong><span>Con certificado</span></article><article><strong>{summary.due}</strong><span>Calibración vencida</span></article></section> : focus === 'tools' ? <section className="nk-invcat-kpis"><article><strong>{summary.total}</strong><span>Herramientas registradas</span></article><article><strong>{summary.toolAvailable}</strong><span>Disponibles en bodega</span></article><article><strong>{summary.assigned}</strong><span>Asignadas / prestadas</span></article><article><strong>{summary.toolOverdue}</strong><span>Devoluciones vencidas</span></article></section> : <section className="nk-invcat-kpis"><article><strong>{summary.total}</strong><span>Registrados</span></article><article><strong>{summary.low}</strong><span>Requieren reposición</span></article><article><strong>{summary.assigned}</strong><span>{thirdKpiLabel}</span></article><article><strong>{summary.due}</strong><span>{fourthKpiLabel}</span></article></section>}
    <section className="nk-card nk-invcat-table-card"><div className="nk-table-wrapper">{focus === 'machinery' ? <table className="nk-table nk-invcat-table nk-invcat-table--machinery"><thead><tr><th>Maquinaria</th><th>Estado operativo</th><th>Asignación</th><th>Bodega / ubicación</th><th>Próx. mantenimiento</th><th>Stock</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Cargando…</td></tr>:filtered.length?filtered.map(item=>{
      const activeAssignments = assignmentFor(item)
      const plan = maintenancePlans.find(row => String(row.assetId || row.itemId) === String(item.id))
      const nextMaintenance = plan?.nextDate || plan?.nextMaintenance || item.nextMaintenance
      const stateLabel = machineryState(item, activeAssignments)
      return <tr key={item.id}><td><strong>{item.name||'Sin nombre'}</strong><small>{item.code||item.serie||item.serial||item.type||'Sin código'}</small></td><td><span className={`nk-badge ${stateLabel === 'Disponible' ? 'nk-badge-ok' : stateLabel === 'Mantenimiento' || stateLabel === 'No disponible' ? 'nk-badge-error' : ''}`}>{stateLabel}</span></td><td><strong>{activeAssignments.length ? `${activeAssignments.length} asignación(es)` : 'Sin asignación'}</strong><small>{activeAssignments.length ? 'Gestionar en Asignaciones y préstamos' : 'Disponible para asignar'}</small></td><td>{item.location||'Sin ubicación definida'}</td><td><strong>{nextMaintenance || 'Sin programación'}</strong><small>{nextMaintenance && nextMaintenance <= new Date().toISOString().slice(0,10) ? 'Requiere atención' : 'Plan preventivo'}</small></td><td><strong>{Number(item.stock||0)}</strong><small>unidades</small></td></tr>
    }):<tr><td colSpan="6" className="nk-invcat-empty">No hay maquinaria registrada.</td></tr>}</tbody></table> : focus === 'equipment' ? <table className="nk-table nk-invcat-table nk-invcat-table--equipment"><thead><tr><th>Equipo / instrumento</th><th>Calibración</th><th>Certificado</th><th>Custodia</th><th>Bodega / ubicación</th><th>Stock</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Cargando…</td></tr>:filtered.length?filtered.map(item=>{
      const stateLabel = equipmentState(item)
      return <tr key={item.id}><td><strong>{item.name||'Sin nombre'}</strong><small>{item.code||item.serie||item.serial||item.type||'Sin código'}</small></td><td><span className={`nk-badge ${stateLabel === 'Calibración vigente' ? 'nk-badge-ok' : stateLabel === 'Calibración vencida' ? 'nk-badge-error' : ''}`}>{stateLabel}</span><small>{item.calibrationDue || 'Sin fecha definida'}</small></td><td><strong>{item.certificate || 'Sin certificado'}</strong><small>{item.certificate ? 'Referencia registrada' : 'Pendiente de respaldo'}</small></td><td><strong>{item.custodian || 'Sin custodio'}</strong><small>{item.custodian ? 'Responsable registrado' : 'Sin asignación de custodia'}</small></td><td>{item.location || 'Sin ubicación definida'}</td><td><strong>{Number(item.stock||0)}</strong><small>mín. {Number(item.minStock||0)}</small></td></tr>
    }):<tr><td colSpan="6" className="nk-invcat-empty">No hay equipos o instrumentos registrados.</td></tr>}</tbody></table> : focus === 'tools' ? <table className="nk-table nk-invcat-table nk-invcat-table--tools"><thead><tr><th>Herramienta</th><th>Disponibilidad</th><th>Asignada a</th><th>Orden de servicio</th><th>Devolución esperada</th><th>Bodega / stock</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Cargando…</td></tr>:filtered.length?filtered.map(item=>{
      const activeAssignments = assignmentFor(item)
      const loan = activeAssignments[0]
      const stateLabel = toolState(item, activeAssignments)
      const expected = loan?.expectedReturnAt || loan?.returnAt || loan?.dueDate || ''
      const overdue = expected && expected < new Date().toISOString().slice(0,10)
      return <tr key={item.id}><td><strong>{item.name||'Sin nombre'}</strong><small>{item.code||item.serie||item.serial||item.type||'Sin código'}</small></td><td><span className={`nk-badge ${stateLabel === 'Disponible' ? 'nk-badge-ok' : stateLabel === 'Mantenimiento' || stateLabel === 'No disponible' || stateLabel === 'Sin stock' ? 'nk-badge-error' : ''}`}>{stateLabel}</span></td><td><strong>{loan ? workerName(loan.workerId || loan.personId) || loan.workerName || loan.responsible || 'Asignación activa' : 'Sin asignación'}</strong><small>{loan ? 'Gestionar en Asignaciones y préstamos' : 'Disponible para asignar'}</small></td><td>{loan ? orderName(loan.projectId || loan.orderId || loan.mantId) || loan.projectName || loan.orderName || 'Sin OS' : '—'}</td><td><strong>{expected || '—'}</strong><small>{overdue ? 'Devolución vencida' : loan ? 'Préstamo activo' : 'Sin préstamo'}</small></td><td><strong>{item.location || 'Sin ubicación'}</strong><small>{Number(item.stock||0)} disponible(s)</small></td></tr>
    }):<tr><td colSpan="6" className="nk-invcat-empty">No hay herramientas registradas.</td></tr>}</tbody></table> : <table className="nk-table nk-invcat-table"><thead><tr><th>Recurso</th><th>Tipo</th><th>Stock</th><th>Mínimo</th><th>Bodega / ubicación</th><th>{lastColumnLabel}</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Cargando…</td></tr>:filtered.length?filtered.map(item=>{
      return <tr key={item.id}><td><strong>{item.name||'Sin nombre'}</strong><small>{item.code||item.serie||item.serial||'Sin código'}</small></td><td>{item.type||defaultType}</td><td>{Number(item.stock||0)}</td><td>{Number(item.minStock||0)}</td><td>{item.location||'Bodega'}</td><td><div className="nk-invcat-state">{focus==='epp'?<><span>{item.size ? `Talla: ${item.size}` : 'Sin talla definida'}</span><small>{item.expiryDate ? `Vence: ${item.expiryDate}` : item.usefulLifeMonths ? `Vida útil: ${item.usefulLifeMonths} meses` : 'Sin vida útil definida'}</small></>:<><span>{item.nextMaintenance ? `Próx.: ${item.nextMaintenance}` : 'Sin mantenimiento programado'}</span><small><span className={`nk-badge ${stockState(item)==='Reponer'?'nk-badge-error':'nk-badge-ok'}`}>{stockState(item)}</span></small></>}</div></td></tr>
    }):<tr><td colSpan="6" className="nk-invcat-empty">No hay registros en esta categoría.</td></tr>}</tbody></table>}</div></section>
    {formOpen&&<section className="nk-card nk-invcat-editor"><div className="nk-invcat-editor-head"><h2>{actionLabel}</h2><button className="nk-button nk-button-quiet nk-button-sm" onClick={()=>setFormOpen(false)}>Cerrar</button></div><div className="nk-invcat-form"><label><span>Nombre</span><input className="nk-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span>Código / serie</span><input className="nk-input" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label><label><span>Tipo</span><input className="nk-input" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}/></label><label><span>Bodega / ubicación</span><input className="nk-input" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label><label><span>Stock</span><input className="nk-input" type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label><span>Stock mínimo</span><input className="nk-input" type="number" min="0" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})}/></label>{focus==='equipment'?<><label><span>Próxima calibración</span><input className="nk-input" type="date" value={form.calibrationDue} onChange={e=>setForm({...form,calibrationDue:e.target.value})}/></label><label><span>Custodio</span><input className="nk-input" value={form.custodian} onChange={e=>setForm({...form,custodian:e.target.value})}/></label><label className="wide"><span>Certificado / referencia</span><input className="nk-input" value={form.certificate} onChange={e=>setForm({...form,certificate:e.target.value})}/></label></>:focus==='epp'?<><label><span>Talla</span><input className="nk-input" value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></label><label><span>Vida útil (meses)</span><input className="nk-input" type="number" min="0" value={form.usefulLifeMonths} onChange={e=>setForm({...form,usefulLifeMonths:e.target.value})}/></label><label className="wide"><span>Fecha de vencimiento</span><input className="nk-input" type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})}/></label></>:focus==='tools'?null:<label className="wide"><span>Próximo mantenimiento</span><input className="nk-input" type="date" value={form.nextMaintenance} onChange={e=>setForm({...form,nextMaintenance:e.target.value})}/></label>}</div><div className="nk-invcat-editor-actions"><button className="nk-button nk-button-secondary" onClick={()=>setFormOpen(false)}>Cancelar</button><button className="nk-button nk-button-primary" onClick={saveItem} disabled={saving}>{saving?'Guardando…':'Guardar'}</button></div></section>}
  </div>
}
