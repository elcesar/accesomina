import AccessibleTable from '../components/ui/AccessibleTable.jsx'
import { ActionButton } from '../components/ui/ActionButton.jsx'
import { formatChileDate } from '../services/chile-format.js'
import { includesSearch } from '../services/search.js'
import { calendarDaysUntil } from '../services/calendar-date.js'
import { localDate } from '../services/calendar-date.js'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPackage, IconPlus, IconRefresh, IconSearch, IconShield, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { buildEppDelivery } from '../services/epp-delivery.js'
import { DEFAULT_HELMET_COLORS, helmetOptions } from '../config/ppe-catalog.js'
import { isHelmetItem } from '../../../shared/helmet-policy.js'
import { mergeCollections } from '../services/report-collections.js'
import { workerSegment } from '../services/worker-segments.js'
import { helmetCompliance, helmetComplianceBadgeClass } from '../services/helmet-compliance.js'
import '../styles/proteccion-epp.css'

const asRows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const today = () => localDate()

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(/\s+/)
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

function PersonCell({ name, rut, onClick }) {
  const content = <><span className="nk-epp-person-avatar" aria-hidden="true">{initials(name)}</span><span className="nk-epp-person-copy"><span className="nk-epp-person-name">{name || 'Sin nombre'}</span><span className="nk-epp-person-rut">{rut || 'Sin RUT'}</span></span></>
  return onClick ? <button className="nk-epp-person" type="button" onClick={onClick} aria-label={`Abrir ficha de ${name || 'persona'}`}>{content}</button> : <div className="nk-epp-person">{content}</div>
}

function daysUntil(date) { return calendarDaysUntil(date) }

function replaceStatus(date) {
  const days = daysUntil(date)
  if (days === null) return { label: 'Sin información', cls: 'nk-badge-none', key: 'none' }
  if (days < 0) return { label: 'Reposición vencida', cls: 'nk-badge-error', key: 'error' }
  if (days <= 30) return { label: 'Reposición próxima', cls: 'nk-badge-warn', key: 'warn' }
  return { label: 'Vigente', cls: 'nk-badge-ok', key: 'ok' }
}

function workerSize(worker, itemName) {
  const epp = worker?.epp || {}
  const name = String(itemName || '').toLowerCase()
  if (/pantal/.test(name)) return epp.pantalon || ''
  if (/calzad|bot|zapat/.test(name)) return epp.calzado || epp.zapato || ''
  if (/guant/.test(name)) return epp.guante || ''
  if (/casco/.test(name)) return epp.helmet?.size || epp.casco || ''
  if (/arn[eé]s/.test(name)) return epp.arnes || ''
  if (/respir/.test(name)) return epp.respirador || ''
  if (/ropa|polera|camisa|chaqueta|overol/.test(name)) return epp.ropa || epp.polera || ''
  return ''
}

function DeliveryDialog({ workers, inventory, warehouses, orders, state, onClose, onSaved }) {
  const [form, setForm] = useState({ workerId: '', inventoryId: '', itemName: '', quantity: 1, warehouseId: '', orderId: '', size: '', helmetColorCode: '', helmetColorLabel: '', helmetClass: '', brandModel: '', certification: '', lotSerial: '', helmetExpiryDate: '', condition: 'nuevo', deliveredBy: '', receivedBy: '', deliveredAt: today(), replaceAt: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedWorker = workers.find(item => item.id === form.workerId)
  const selectedInventory = inventory.find(item => String(item?.id || '') === String(form.inventoryId || ''))
  const helmet = isHelmetItem(form.itemName) || isHelmetItem(selectedInventory)
  const helmetConfig = helmetOptions(state || {}, { mantId: form.orderId, epp: {} })
  const helmetColors = helmetConfig.colors

  function chooseInventory(id) {
    const item = inventory.find(current => current.id === id)
    setForm(current => ({ ...current, inventoryId: id, warehouseId: item?.warehouseId || item?.bodegaId || '', itemName: item?.nombre || item?.name || item?.itemName || current.itemName, brandModel: item?.brandModel || item?.marcaModelo || item?.marca || current.brandModel, certification: item?.certification || item?.certificacion || current.certification, helmetColorCode: item?.helmetColorCode || item?.colorCode || current.helmetColorCode, helmetColorLabel: item?.helmetColorLabel || item?.colorLabel || current.helmetColorLabel, helmetClass: item?.helmetClass || item?.class || current.helmetClass, lotSerial: item?.lotSerial || item?.serie || item?.serial || current.lotSerial, helmetExpiryDate: item?.helmetExpiryDate || item?.expiryDate || item?.vence || current.helmetExpiryDate, size: workerSize(selectedWorker, item?.nombre || item?.name || item?.itemName) || item?.size || current.size }))
  }

  function chooseWorker(id) {
    const worker = workers.find(current => current.id === id)
    setForm(current => ({ ...current, workerId: id, size: workerSize(worker, current.itemName) || current.size }))
  }

  async function save(event) {
    event.preventDefault()
    const quantity = Number(form.quantity || 0)
    if (!form.workerId || !form.itemName.trim() || quantity <= 0 || saving) return
    if (helmet && (!form.helmetColorCode || !form.helmetColorLabel)) {
      setError('Selecciona el color físico del casco antes de registrar la entrega.')
      return
    }
    if (form.inventoryId && !form.warehouseId) {
      setError('Selecciona la bodega de origen para descontar el EPP entregado.')
      return
    }
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const versions = response?.moduleVersions || {}
      const version = versions.eppDeliveries ?? versions.eppEntregas ?? 0
      // Legacy deliveries stay in their original collection; only canonical records are persisted here.
      const current = asRows(state.eppDeliveries)
      const createdAt = new Date().toISOString()
      const record = buildEppDelivery(form, { id: `epp_${Date.now()}`, createdAt })
      const changes = { eppDeliveries: { version, data: [...current, record] } }

      if (form.inventoryId) {
        const inventoryItems = asRows(state.inventoryItems)
        const selectedItem = inventoryItems.find(item => String(item.id) === String(form.inventoryId))
        if (!selectedItem) throw new Error('No se encontró el EPP seleccionado en inventario.')

        const hasLocationStock = Object.keys(selectedItem.stockByLocation || {}).length > 0 || Boolean(selectedItem.warehouseId || selectedItem.bodegaId)
        if (!hasLocationStock && Number(selectedItem.stock || 0) > 0) throw new Error('Este EPP tiene stock histórico sin bodega definida. Regulariza su ubicación antes de descontar existencias.')
        const stockByLocation = { ...(selectedItem.stockByLocation || {}) }
        if (!Object.keys(stockByLocation).length && (selectedItem.warehouseId || selectedItem.bodegaId)) stockByLocation[selectedItem.warehouseId || selectedItem.bodegaId] = Number(selectedItem.stock || 0)
        const available = Number(stockByLocation[form.warehouseId] || 0)
        if (available < quantity) throw new Error(`Stock insuficiente en la bodega seleccionada. Disponible: ${available}`)
        stockByLocation[form.warehouseId] = available - quantity
        const nextItems = inventoryItems.map(item => String(item.id) === String(selectedItem.id) ? {
          ...item,
          stockByLocation,
          stock: Object.values(stockByLocation).reduce((total, value) => total + Number(value || 0), 0),
          updatedAt: new Date().toISOString(),
        } : item)
        const movements = asRows(state.inventoryMovements)
        const now = new Date().toISOString()
        const movement = { id: `mov_epp_${Date.now()}`, itemId: selectedItem.id, warehouseId: form.warehouseId, type: 'entrega', qty: quantity, stockBefore: available, stockAfter: Number(stockByLocation[form.warehouseId] || 0), workerId: form.workerId, projectId: form.orderId || '', referenceType: 'epp_delivery', referenceId: record.id, lotSerial: form.lotSerial.trim(), notes: form.notes.trim(), effectiveAt: form.deliveredAt || today(), createdAt: now, movementAt: now, at: now }
        changes.inventoryItems = { version: Number(versions.inventoryItems || 0), data: nextItems }
        changes.inventoryMovements = { version: Number(versions.inventoryMovements || 0), data: [movement, ...movements] }
      }

      await api.put('/state/modules', { reason: `Entrega de EPP registrada para ${workers.find(item => item.id === form.workerId)?.nombre || 'persona'}`, changes })
      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible registrar la entrega de EPP.')
    } finally { setSaving(false) }
  }

  return <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <form className="nk-dialog" role="dialog" aria-modal="true" aria-labelledby="epp-dialog-title" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header className="nk-dialog-header"><div><h2 className="nk-dialog-title" id="epp-dialog-title">Registrar entrega de EPP</h2><p className="nk-epp-subtle">La entrega quedará asociada a la Persona y visible en su ficha.</p></div><button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={18}/></button></header>
      <div className="nk-dialog-body"><div className="nk-epp-dialog-grid">
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">Persona</label><select className="nk-select" required value={form.workerId} onChange={event => chooseWorker(event.target.value)}><option value="">Seleccionar persona</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre} · {worker.rut || 'Sin RUT'}</option>)}</select></div>
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">EPP del inventario</label><select className="nk-select" value={form.inventoryId} onChange={event => chooseInventory(event.target.value)}><option value="">Registrar manualmente / sin ítem asociado</option>{inventory.map(item => <option key={item.id} value={item.id}>{item.nombre || item.name || item.itemName || item.codigo || 'Equipo EPP'}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Equipo de protección</label><input className="nk-input" required value={form.itemName} onChange={event => setForm(current => ({ ...current, itemName: event.target.value, size: workerSize(selectedWorker, event.target.value) || current.size }))} placeholder="Ej.: Casco de seguridad" /></div>
        <div className="nk-field"><label className="nk-label">Cantidad</label><input className="nk-input" type="number" min="1" required value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Bodega de origen</label><select className="nk-select" disabled={!form.inventoryId} value={form.warehouseId} onChange={event => setForm(current => ({ ...current, warehouseId: event.target.value }))}><option value="">{form.inventoryId ? 'Seleccionar bodega' : 'Sin descuento de inventario'}</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre || warehouse.name || warehouse.codigo || 'Bodega'}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Orden de servicio</label><select className="nk-select" value={form.orderId} onChange={event => setForm(current => ({ ...current, orderId: event.target.value }))}><option value="">Sin orden asociada</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo ? `${order.codigo} · ` : ''}{order.nombre || order.name || 'Orden de servicio'}</option>)}</select></div>
        <div className="nk-field"><label className="nk-label">Talla / medida</label><input className="nk-input" value={form.size} onChange={event => setForm(current => ({ ...current, size: event.target.value }))} placeholder="Ej.: M, 42, universal" />{selectedWorker && <span className="nk-epp-size-hint">Se sugiere la talla registrada en la ficha cuando existe.</span>}</div>
        {helmet && <><div className="nk-field"><label className="nk-label">Color físico del casco</label><select className="nk-select" required value={form.helmetColorCode} onChange={event => { const color = helmetColors.find(item => item.code === event.target.value); setForm(current => ({ ...current, helmetColorCode: event.target.value, helmetColorLabel: color?.label || '' })) }}><option value="">Seleccionar color</option>{helmetColors.map(color => <option key={color.code} value={color.code}>{color.label}</option>)}</select></div><div className="nk-field"><label className="nk-label">Clase de casco (opcional)</label><input className="nk-input" value={form.helmetClass} onChange={event => setForm(current => ({ ...current, helmetClass: event.target.value }))} /></div><div className="nk-field"><label className="nk-label">Vencimiento del casco</label><input className="nk-input" type="date" value={form.helmetExpiryDate} onChange={event => setForm(current => ({ ...current, helmetExpiryDate: event.target.value }))} /></div></>}
        <div className="nk-field"><label className="nk-label">Marca / modelo</label><input className="nk-input" value={form.brandModel} onChange={event => setForm(current => ({ ...current, brandModel: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Certificación</label><input className="nk-input" value={form.certification} onChange={event => setForm(current => ({ ...current, certification: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Lote / serie</label><input className="nk-input" value={form.lotSerial} onChange={event => setForm(current => ({ ...current, lotSerial: event.target.value }))} placeholder="Opcional" /></div>
        <div className="nk-field"><label className="nk-label">Condición de entrega</label><select className="nk-select" value={form.condition} onChange={event => setForm(current => ({ ...current, condition: event.target.value }))}><option value="nuevo">Nuevo</option><option value="reutilizado-inspeccionado">Reutilizado e inspeccionado</option><option value="repuesto">Repuesto</option><option value="no_registrada">Sin condición registrada</option></select></div>
        <div className="nk-field"><label className="nk-label">Fecha de entrega</label><input className="nk-input" type="date" required value={form.deliveredAt} onChange={event => setForm(current => ({ ...current, deliveredAt: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Fecha de reposición</label><input className="nk-input" type="date" value={form.replaceAt} onChange={event => setForm(current => ({ ...current, replaceAt: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Entregado por</label><input className="nk-input" value={form.deliveredBy} onChange={event => setForm(current => ({ ...current, deliveredBy: event.target.value }))} placeholder="Responsable de la entrega" /></div>
        <div className="nk-field"><label className="nk-label">Recibido por</label><input className="nk-input" value={form.receivedBy} onChange={event => setForm(current => ({ ...current, receivedBy: event.target.value }))} placeholder="Nombre de quien recibe" /></div>
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">Observaciones</label><input className="nk-input" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Condición de entrega, lote u observaciones" /></div>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><ActionButton disabledReason="Completa trabajador, elemento y cantidad válida; o espera a que finalice el guardado." className="nk-button nk-button-primary" disabled={saving || !form.workerId || !form.itemName.trim() || Number(form.quantity || 0) <= 0}>{saving ? 'Guardando…' : 'Registrar entrega'}</ActionButton></footer>
    </form>
  </div>
}

const SEGMENTS=[['todos','Todas'],['permanente','Trabajador fijo'],['esporadico','Trabajador por proyecto'],['disponible','Trabajador disponible'],['bloqueado','No habilitados']]

function helmetColorCode(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function HelmetConfiguration({ state, onSaved, canManage }) {
  const [open, setOpen] = useState(false)
  const [colors, setColors] = useState([])
  const [policies, setPolicies] = useState([])
  const [selectedPolicyId, setSelectedPolicyId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const sourceColors = (Array.isArray(state.helmetColors) && state.helmetColors.length ? state.helmetColors : DEFAULT_HELMET_COLORS).map(color => ({ ...color, active: color.active !== false }))
  const sourcePolicies = Array.isArray(state.helmetPolicies) && state.helmetPolicies.length ? state.helmetPolicies : [{ id: 'default-tenant-helmet-policy', scope: 'tenant', active: true, requireColor: true, requireSize: true, requireModelClass: false, allowedColorCodes: [] }]
  const mines = asRows(state.minas)
  const orders = asRows(state.mantenciones)

  function begin() {
    setColors(sourceColors)
    setPolicies(sourcePolicies)
    setSelectedPolicyId(sourcePolicies[0]?.id || '')
    setError('')
    setOpen(true)
  }
  const selected = policies.find(policy => policy.id === selectedPolicyId) || policies[0]
  function patchPolicy(patch) {
    setPolicies(current => current.map(policy => policy.id === selected?.id ? { ...policy, ...patch } : policy))
  }
  function addColor() {
    const label = newLabel.trim()
    const code = helmetColorCode(label)
    if (!label || !code) return
    if (colors.some(color => color.code === code)) { setError('Ese código de color ya existe. Ajusta la etiqueta o edita el color existente.'); return }
    setColors(current => [...current, { code, label, active: true }])
    setNewLabel('')
  }
  function addPolicy() {
    const id = `helmet-policy-${Date.now()}`
    const next = { id, scope: 'cliente', minaId: mines[0]?.id || '', mantId: '', active: true, requireColor: true, requireSize: true, requireModelClass: false, allowedColorCodes: [] }
    setPolicies(current => [...current, next])
    setSelectedPolicyId(id)
  }
  async function save() {
    if (!colors.some(color => color.active)) { setError('Mantén al menos un color activo.'); return }
    if (policies.some(policy => policy.scope === 'cliente' && !policy.minaId) || policies.some(policy => policy.scope === 'os' && !policy.mantId)) {
      setError('Selecciona el cliente u orden para cada política específica.'); return
    }
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const versions = response?.moduleVersions || {}
      await api.put('/state/modules', {
        reason: 'Actualización de catálogo y política de cascos',
        changes: {
          helmetColors: { version: Number(versions.helmetColors || 0), data: colors },
          helmetPolicies: { version: Number(versions.helmetPolicies || 0), data: policies },
        },
      })
      setOpen(false)
      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar la configuración de casco.')
    } finally { setSaving(false) }
  }

  return <section className="nk-card nk-epp-toolbar-card">
    <div className="nk-epp-toolbar"><div><strong>Política de cascos</strong><p className="nk-epp-subtle">Colores y requisitos configurables por empresa, cliente u orden. No se asignan colores por cargo.</p></div>{canManage ? <ActionButton className="nk-button nk-button-secondary" type="button" onClick={open ? () => setOpen(false) : begin}>{open ? 'Cerrar configuración' : 'Configurar casco'}</ActionButton> : <span className="nk-epp-subtle">Sólo Prevención o administración puede modificar esta política.</span>}</div>
    {open && <div className="nk-person-grid">
      <div className="nk-field"><label className="nk-label">Nuevo color</label><div className="nk-actions"><input className="nk-input" value={newLabel} onChange={event => setNewLabel(event.target.value)} placeholder="Ej.: Negro" /><button className="nk-button nk-button-secondary" type="button" onClick={addColor}>Agregar</button></div></div>
      <div className="nk-field"><span className="nk-label">Catálogo de colores</span>{colors.map(color => <label key={color.code}><input type="checkbox" checked={color.active !== false} onChange={event => setColors(current => current.map(item => item.code === color.code ? { ...item, active: event.target.checked } : item))} /> {color.label} <span className="nk-epp-subtle">({color.code})</span></label>)}</div>
      <div className="nk-field"><label className="nk-label">Política</label><select className="nk-select" value={selected?.id || ''} onChange={event => setSelectedPolicyId(event.target.value)}>{policies.map(policy => <option key={policy.id} value={policy.id}>{policy.scope === 'tenant' ? 'Empresa' : policy.scope === 'cliente' ? `Cliente: ${mines.find(mine => String(mine.id) === String(policy.minaId))?.nombre || 'sin seleccionar'}` : `OS: ${orders.find(order => String(order.id) === String(policy.mantId))?.nombre || 'sin seleccionar'}`}</option>)}</select><button className="nk-button nk-button-quiet nk-button-sm" type="button" onClick={addPolicy}>Agregar regla de cliente / OS</button></div>
      {selected && <><div className="nk-field"><label className="nk-label">Alcance</label><select className="nk-select" value={selected.scope} onChange={event => patchPolicy({ scope: event.target.value, minaId: event.target.value === 'cliente' ? selected.minaId || mines[0]?.id || '' : '', mantId: event.target.value === 'os' ? selected.mantId || orders[0]?.id || '' : '' })}><option value="tenant">Empresa</option><option value="cliente">Cliente / mandante</option><option value="os">Orden de servicio</option></select></div>
      {selected.scope === 'cliente' && <div className="nk-field"><label className="nk-label">Cliente / mandante</label><select className="nk-select" value={selected.minaId || ''} onChange={event => patchPolicy({ minaId: event.target.value })}><option value="">Seleccionar cliente</option>{mines.map(mine => <option key={mine.id} value={mine.id}>{mine.nombre}</option>)}</select></div>}
      {selected.scope === 'os' && <div className="nk-field"><label className="nk-label">Orden de servicio</label><select className="nk-select" value={selected.mantId || ''} onChange={event => patchPolicy({ mantId: event.target.value })}><option value="">Seleccionar orden</option>{orders.map(order => <option key={order.id} value={order.id}>{order.nombre || order.codigo || order.id}</option>)}</select></div>}
      <div className="nk-field"><span className="nk-label">Campos requeridos</span><label><input type="checkbox" checked={selected.requireColor !== false} onChange={event => patchPolicy({ requireColor: event.target.checked })} /> Color</label><label><input type="checkbox" checked={selected.requireSize !== false} onChange={event => patchPolicy({ requireSize: event.target.checked })} /> Talla</label><label><input type="checkbox" checked={selected.requireModelClass === true} onChange={event => patchPolicy({ requireModelClass: event.target.checked })} /> Clase / modelo</label><label><input type="checkbox" checked={selected.active !== false} onChange={event => patchPolicy({ active: event.target.checked })} /> Regla activa</label></div>
      <div className="nk-field"><span className="nk-label">Colores habilitados</span>{colors.filter(color => color.active !== false).map(color => <label key={color.code}><input type="checkbox" checked={(selected.allowedColorCodes || []).includes(color.code)} onChange={event => patchPolicy({ allowedColorCodes: event.target.checked ? [...new Set([...(selected.allowedColorCodes || []), color.code])] : (selected.allowedColorCodes || []).filter(code => code !== color.code) })} /> {color.label}</label>)}<p className="nk-epp-subtle">Sin selección restringe por catálogo activo; con selección sólo permite los colores marcados.</p></div></>}
      {error && <div className="nk-epp-feedback error"><span>{error}</span></div>}
      <div className="nk-actions"><ActionButton className="nk-button nk-button-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar política de casco'}</ActionButton></div>
    </div>}
  </section>
}

export default function ProteccionEppPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const canManageHelmet = ['domian_admin', 'client_admin', 'prevencion'].includes(session?.user?.role)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [personFilter, setPersonFilter] = useState('todos')
  const [segment,setSegment]=useState('todos')
  const [view,setView]=useState('personas')

  async function load() { setLoading(true); setError(''); try { setResponse(await api.get('/state')) } catch (cause) { setError(cause.message || 'No fue posible cargar Protección personal / EPP.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const workers = asRows(state.trabajadores)
  const assignments = asRows(state.asignaciones)
  const projects = asRows(state.mantenciones)
  const restrictions = asRows(state.restricted)
  const inventory = asRows(state.inventoryItems).filter(item => /epp|protecci|casco|guante|arn[eé]s|respir|calzad|bot|overol|lente/i.test(JSON.stringify(item)))
  const warehouses = mergeCollections(state, 'warehouses', 'bodegas')
  const orders = mergeCollections(state, 'mantenciones', 'proyectos')
  const deliveries = mergeCollections(state, 'eppDeliveries', 'eppEntregas')
  const records = useMemo(() => deliveries.map(item => { const worker = workers.find(person => person.id === (item.workerId || item.trabId)); return { ...item, workerId: item.workerId || item.trabId, workerName: worker?.nombre || item.workerName || 'Persona no identificada', workerRut: worker?.rut || item.rut || '', workerRole: worker?.cargo || worker?.especialidad || '', workerType:worker?.tipo||'',workerAvailability:worker?.disponibilidad||'',workerBlocked:Boolean(worker?.bloqueado), itemName: item.itemName || item.nombre || item.epp || 'EPP registrado' } }), [deliveries, workers])
  const workerMatchesSegment = worker => {
    if (segment === 'todos') return true
    const selectedSegment = segment === 'permanente' ? 'planta' : segment === 'bloqueado' ? 'bloqueados' : segment
    return workerSegment(worker, assignments, projects, restrictions) === selectedSegment
  }
  const visibleWorkers=useMemo(()=>workers.filter(worker=>workerMatchesSegment(worker)&&(!query.trim()||[worker.nombre,worker.rut,worker.cargo,worker.especialidad].some(v=>includesSearch(String(v||''), query.trim().toLowerCase())))),[workers,segment,query,assignments,projects,restrictions])
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return records.filter(item => { const status = replaceStatus(item.replaceAt).key; const worker=workers.find(w=>String(w.id)===String(item.workerId)); const matchesQuery = !term || [item.workerName, item.workerRut, item.workerRole, item.itemName, item.brandModel, item.certification].some(value => includesSearch(String(value || ''), term)); return matchesQuery && (statusFilter === 'todos' || status === statusFilter) && (personFilter === 'todos' || item.workerId === personFilter) && (!worker||workerMatchesSegment(worker)) }) }, [records, query, statusFilter, personFilter,segment,workers,assignments,projects,restrictions])
  const personRows=useMemo(()=>visibleWorkers.map(worker=>{const own=records.filter(r=>String(r.workerId)===String(worker.id));const pending=own.filter(r=>['warn','error'].includes(replaceStatus(r.replaceAt).key));const sizes=Object.values(worker.epp||{}).filter(Boolean).length;const helmet=helmetCompliance(worker,state);return{worker,own,pending,sizes,helmet}}),[visibleWorkers,records,state])
  const matrixRows=useMemo(()=>{const map=new Map();workers.filter(workerMatchesSegment).forEach(worker=>{const role=worker.cargo||worker.especialidad||'Sin función';if(!map.has(role))map.set(role,{role,people:0,items:new Map()});const row=map.get(role);row.people++;records.filter(r=>String(r.workerId)===String(worker.id)).forEach(r=>{const key=r.itemName||'EPP';row.items.set(key,(row.items.get(key)||0)+1)})});return[...map.values()].sort((a,b)=>a.role.localeCompare(b.role))},[workers,records,segment,assignments,projects,restrictions])
  const summary = useMemo(() => {const peopleControlled=new Set(records.map(r=>r.workerId).filter(Boolean)).size;const pendingPeople=new Set(records.filter(r=>['warn','error'].includes(replaceStatus(r.replaceAt).key)).map(r=>r.workerId).filter(Boolean)).size;const soon=records.filter(r=>replaceStatus(r.replaceAt).key==='warn').length;const missingSizes=workers.filter(w=>!Object.values(w.epp||{}).filter(Boolean).length).length;const helmetPending=workers.filter(worker=>['pending','incomplete'].includes(helmetCompliance(worker,state).status)).length;return{peopleControlled,pendingPeople,soon,missingSizes,helmetPending}},[records,workers,state])

  return <div className="nk-epp-page">
    <header className="nk-epp-header"><div><h1>Protección personal / EPP</h1><p>Controla necesidades, matriz por función e historial de entregas por persona.</p></div><div className="nk-actions"><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/>Actualizar</ActionButton><ActionButton disabledReason="Completa trabajador, elemento y cantidad válida; o espera a que finalice el guardado." className="nk-button nk-button-primary" type="button" onClick={() => setCreating(true)} disabled={!workers.length}><IconPlus size={15}/>Registrar entrega</ActionButton></div></header>
    {error && <div className="nk-epp-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')} aria-label="Cerrar"><IconX size={15}/></button></div>}
    <HelmetConfiguration state={state} onSaved={load} canManage={canManageHelmet} />
    <section className="nk-card nk-epp-toolbar-card"><div className="nk-epp-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT, función o EPP" /></label><div className="nk-field"><label className="nk-label">Persona</label><select className="nk-select" value={personFilter} onChange={event => setPersonFilter(event.target.value)}><option value="todos">Todas</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre}</option>)}</select></div><div className="nk-field"><label className="nk-label">Reposición</label><select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos</option><option value="ok">Vigente</option><option value="warn">Próxima</option><option value="error">Vencida</option><option value="none">Sin información</option></select></div></div><div className="nk-epp-segments">{SEGMENTS.map(([key,label])=><button key={key} type="button" className={`nk-epp-segment ${segment===key?'active':''}`} onClick={()=>setSegment(key)}>{label}</button>)}</div></section>
    <section className="nk-epp-summary"><article className="nk-epp-kpi"><strong>{loading?'…':summary.peopleControlled}</strong><span>Personas controladas</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.pendingPeople}</strong><span>Con entregas pendientes</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.soon}</strong><span>Reposición próxima</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.helmetPending}</strong><span>Casco pendiente / incompleto</span></article></section>
    <div className="nk-tabs nk-epp-tabs"><button className={`nk-tab ${view==='personas'?'active':''}`} onClick={()=>setView('personas')}><IconUsers size={14}/>Personas</button><button className={`nk-tab ${view==='matriz'?'active':''}`} onClick={()=>setView('matriz')}><IconShield size={14}/>Matriz por función</button><button className={`nk-tab ${view==='historial'?'active':''}`} onClick={()=>setView('historial')}><IconPackage size={14}/>Historial de entregas</button></div>
    {view==='personas'&&<section className="nk-card nk-epp-table-card">{loading?<div className="nk-empty nk-epp-empty"><IconUsers size={30}/><p className="nk-empty-title">Cargando personas…</p></div>:!personRows.length?<div className="nk-empty nk-epp-empty"><p className="nk-empty-title">Sin personas para mostrar</p></div>:<div className="nk-table-wrapper"><AccessibleTable caption="Catálogo de equipos de protección personal" className="nk-table"><thead><tr><th scope="col">Persona</th><th scope="col">Función</th><th scope="col">Casco</th><th scope="col">Entregas</th><th scope="col">Pendientes / reposición</th><th scope="col">Tallas registradas</th></tr></thead><tbody>{personRows.map(({worker,own,pending,sizes,helmet})=><tr key={worker.id}><td><PersonCell name={worker.nombre} rut={worker.rut} onClick={()=>navigate(`/app/trabajadores/${worker.id}`)} /></td><td>{worker.cargo||worker.especialidad||'—'}</td><td><span className={`nk-badge ${helmetComplianceBadgeClass(helmet)}`} title={helmet.detail}>{helmet.label}</span></td><td>{own.length}</td><td><span className={`nk-badge ${pending.length?'nk-badge-warn':'nk-badge-ok'}`}>{pending.length?`${pending.length} por revisar`:'Al día'}</span></td><td>{sizes||'Sin tallas'}</td></tr>)}</tbody></AccessibleTable></div>}</section>}
    {view==='matriz'&&<section className="nk-card nk-epp-table-card">{!matrixRows.length?<div className="nk-empty nk-epp-empty"><p className="nk-empty-title">Sin funciones para mostrar</p></div>:<div className="nk-table-wrapper"><AccessibleTable caption="Asignaciones de equipos de protección personal" className="nk-table"><thead><tr><th scope="col">Función / especialidad</th><th scope="col">Personas</th><th scope="col">EPP observados en entregas</th><th scope="col">Cobertura registrada</th></tr></thead><tbody>{matrixRows.map(row=><tr key={row.role}><td><strong>{row.role}</strong></td><td>{row.people}</td><td>{[...row.items.keys()].slice(0,6).join(' · ')||'Sin entregas registradas'}</td><td>{row.items.size?`${row.items.size} tipos de EPP`:'Sin información'}</td></tr>)}</tbody></AccessibleTable></div>}</section>}
    {view==='historial'&&<section className="nk-card nk-epp-table-card">{loading?<div className="nk-empty nk-epp-empty"><IconShield size={30}/><p className="nk-empty-title">Cargando entregas…</p></div>:filtered.length===0?<div className="nk-empty nk-epp-empty"><IconPackage size={30}/><p className="nk-empty-title">Sin entregas para mostrar</p></div>:<div className="nk-table-wrapper"><AccessibleTable caption="Entregas de equipos de protección personal" className="nk-table"><thead><tr><th scope="col">Persona</th><th scope="col">EPP</th><th scope="col">Cantidad</th><th scope="col">Bodega / orden</th><th scope="col">Entrega</th><th scope="col">Reposición</th><th scope="col">Estado</th></tr></thead><tbody>{filtered.map((item,index)=>{const status=replaceStatus(item.replaceAt);const warehouse=warehouses.find(entry=>String(entry.id)===String(item.warehouseId));const order=orders.find(entry=>String(entry.id)===String(item.orderId));return<tr key={item.id||index}><td><PersonCell name={item.workerName} rut={item.workerRut} onClick={item.workerId?()=>navigate(`/app/trabajadores/${item.workerId}`):undefined} /></td><td><div className="nk-epp-item"><strong>{item.itemName}</strong><span className="nk-epp-subtle">{item.brandModel||'Sin marca/modelo'}{item.certification?` · ${item.certification}`:''}</span></div></td><td>{item.quantity || 1}{item.size ? ` · ${item.size}` : ''}</td><td><span className="nk-epp-subtle">{warehouse?.nombre || warehouse?.name || 'Sin bodega'}{order ? ` · ${order.codigo || order.nombre || order.name}` : ''}</span></td><td>{formatChileDate(item.deliveredAt||'—')}</td><td>{formatChileDate(item.replaceAt||'Según inspección')}</td><td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td></tr>})}</tbody></AccessibleTable></div>}</section>}
    {creating && <DeliveryDialog workers={workers} inventory={inventory} warehouses={warehouses} orders={orders} state={state} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}
