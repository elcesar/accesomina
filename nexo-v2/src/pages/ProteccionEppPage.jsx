import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPackage, IconPlus, IconRefresh, IconSearch, IconShield, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/proteccion-epp.css'

const asRows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const today = () => new Date().toISOString().split('T')[0]

function daysUntil(date) {
  if (!date) return null
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

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
  if (/casco/.test(name)) return epp.casco || ''
  if (/arn[eé]s/.test(name)) return epp.arnes || ''
  if (/respir/.test(name)) return epp.respirador || ''
  if (/ropa|polera|camisa|chaqueta|overol/.test(name)) return epp.ropa || epp.polera || ''
  return ''
}

function DeliveryDialog({ workers, inventory, onClose, onSaved }) {
  const [form, setForm] = useState({ workerId: '', inventoryId: '', itemName: '', size: '', brandModel: '', certification: '', deliveredAt: today(), replaceAt: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedWorker = workers.find(item => item.id === form.workerId)

  function chooseInventory(id) {
    const item = inventory.find(current => current.id === id)
    setForm(current => ({ ...current, inventoryId: id, itemName: item?.nombre || item?.name || item?.itemName || current.itemName, brandModel: item?.brandModel || item?.marcaModelo || item?.marca || current.brandModel, certification: item?.certification || item?.certificacion || current.certification, size: workerSize(selectedWorker, item?.nombre || item?.name || item?.itemName) || current.size }))
  }

  function chooseWorker(id) {
    const worker = workers.find(current => current.id === id)
    setForm(current => ({ ...current, workerId: id, size: workerSize(worker, current.itemName) || current.size }))
  }

  async function save(event) {
    event.preventDefault()
    if (!form.workerId || !form.itemName.trim() || saving) return
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.eppDeliveries ?? response?.moduleVersions?.eppEntregas ?? 0
      const current = asRows(state.eppDeliveries || state.eppEntregas)
      const record = { id: `epp_${Date.now()}`, workerId: form.workerId, inventoryId: form.inventoryId || undefined, itemName: form.itemName.trim(), size: form.size.trim(), brandModel: form.brandModel.trim(), certification: form.certification.trim(), deliveredAt: form.deliveredAt, replaceAt: form.replaceAt, notes: form.notes.trim(), createdAt: new Date().toISOString() }
      await api.put('/state/modules', { reason: `Entrega EPP registrada para ${workers.find(item => item.id === form.workerId)?.nombre || 'persona'}`, changes: { eppDeliveries: { version, data: [...current, record] } } })
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
        <div className="nk-field"><label className="nk-label">Talla / medida</label><input className="nk-input" value={form.size} onChange={event => setForm(current => ({ ...current, size: event.target.value }))} placeholder="Ej.: M, 42, universal" />{selectedWorker && <span className="nk-epp-size-hint">Se sugiere la talla registrada en la ficha cuando existe.</span>}</div>
        <div className="nk-field"><label className="nk-label">Marca / modelo</label><input className="nk-input" value={form.brandModel} onChange={event => setForm(current => ({ ...current, brandModel: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Certificación</label><input className="nk-input" value={form.certification} onChange={event => setForm(current => ({ ...current, certification: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Fecha de entrega</label><input className="nk-input" type="date" required value={form.deliveredAt} onChange={event => setForm(current => ({ ...current, deliveredAt: event.target.value }))} /></div>
        <div className="nk-field"><label className="nk-label">Fecha de reposición</label><input className="nk-input" type="date" value={form.replaceAt} onChange={event => setForm(current => ({ ...current, replaceAt: event.target.value }))} /></div>
        <div className="nk-field nk-epp-dialog-wide"><label className="nk-label">Observaciones</label><input className="nk-input" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Condición de entrega, lote u observaciones" /></div>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving || !form.workerId || !form.itemName.trim()}>{saving ? 'Guardando…' : 'Registrar entrega'}</button></footer>
    </form>
  </div>
}

const SEGMENTS=[['todos','Todas'],['permanente','Personal fijo'],['esporadico','Por proyecto'],['disponible','Disponibles'],['bloqueado','Restringidos']]

export default function ProteccionEppPage() {
  const navigate = useNavigate()
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
  const inventory = asRows(state.inventoryItems).filter(item => /epp|protecci|casco|guante|arn[eé]s|respir|calzad|bot|overol|lente/i.test(JSON.stringify(item)))
  const deliveries = asRows(state.eppDeliveries || state.eppEntregas)
  const records = useMemo(() => deliveries.map(item => { const worker = workers.find(person => person.id === (item.workerId || item.trabId)); return { ...item, workerId: item.workerId || item.trabId, workerName: worker?.nombre || item.workerName || 'Persona no identificada', workerRut: worker?.rut || item.rut || '', workerRole: worker?.cargo || worker?.especialidad || '', workerType:worker?.tipo||'',workerAvailability:worker?.disponibilidad||'',workerBlocked:Boolean(worker?.bloqueado), itemName: item.itemName || item.nombre || item.epp || 'EPP registrado' } }), [deliveries, workers])
  const workerMatchesSegment=worker=>segment==='todos'||(segment==='permanente'&&worker.tipo==='permanente'&&!worker.bloqueado)||(segment==='esporadico'&&worker.tipo==='esporadico'&&!worker.bloqueado)||(segment==='disponible'&&worker.disponibilidad==='disponible'&&!worker.bloqueado)||(segment==='bloqueado'&&worker.bloqueado)
  const visibleWorkers=useMemo(()=>workers.filter(worker=>workerMatchesSegment(worker)&&(!query.trim()||[worker.nombre,worker.rut,worker.cargo,worker.especialidad].some(v=>String(v||'').toLowerCase().includes(query.trim().toLowerCase())))),[workers,segment,query])
  const filtered = useMemo(() => { const term = query.trim().toLowerCase(); return records.filter(item => { const status = replaceStatus(item.replaceAt).key; const worker=workers.find(w=>String(w.id)===String(item.workerId)); const matchesQuery = !term || [item.workerName, item.workerRut, item.workerRole, item.itemName, item.brandModel, item.certification].some(value => String(value || '').toLowerCase().includes(term)); return matchesQuery && (statusFilter === 'todos' || status === statusFilter) && (personFilter === 'todos' || item.workerId === personFilter) && (!worker||workerMatchesSegment(worker)) }) }, [records, query, statusFilter, personFilter,segment,workers])
  const personRows=useMemo(()=>visibleWorkers.map(worker=>{const own=records.filter(r=>String(r.workerId)===String(worker.id));const pending=own.filter(r=>['warn','error'].includes(replaceStatus(r.replaceAt).key));const sizes=Object.values(worker.epp||{}).filter(Boolean).length;return{worker,own,pending,sizes}}),[visibleWorkers,records])
  const matrixRows=useMemo(()=>{const map=new Map();workers.filter(workerMatchesSegment).forEach(worker=>{const role=worker.cargo||worker.especialidad||'Sin función';if(!map.has(role))map.set(role,{role,people:0,items:new Map()});const row=map.get(role);row.people++;records.filter(r=>String(r.workerId)===String(worker.id)).forEach(r=>{const key=r.itemName||'EPP';row.items.set(key,(row.items.get(key)||0)+1)})});return[...map.values()].sort((a,b)=>a.role.localeCompare(b.role))},[workers,records,segment])
  const summary = useMemo(() => {const peopleControlled=new Set(records.map(r=>r.workerId).filter(Boolean)).size;const pendingPeople=new Set(records.filter(r=>['warn','error'].includes(replaceStatus(r.replaceAt).key)).map(r=>r.workerId).filter(Boolean)).size;const soon=records.filter(r=>replaceStatus(r.replaceAt).key==='warn').length;const missingSizes=workers.filter(w=>!Object.values(w.epp||{}).filter(Boolean).length).length;return{peopleControlled,pendingPeople,soon,missingSizes}},[records,workers])

  return <div className="nk-epp-page">
    <header className="nk-epp-header"><div><h1>Protección personal / EPP</h1><p>Controla necesidades, matriz por función e historial de entregas por persona.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/>Actualizar</button><button className="nk-button nk-button-primary" type="button" onClick={() => setCreating(true)} disabled={!workers.length}><IconPlus size={15}/>Registrar entrega</button></div></header>
    {error && <div className="nk-epp-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')} aria-label="Cerrar"><IconX size={15}/></button></div>}
    <section className="nk-card nk-epp-toolbar-card"><div className="nk-epp-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT, función o EPP" /></label><div className="nk-field"><label className="nk-label">Persona</label><select className="nk-select" value={personFilter} onChange={event => setPersonFilter(event.target.value)}><option value="todos">Todas</option>{workers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre}</option>)}</select></div><div className="nk-field"><label className="nk-label">Reposición</label><select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="todos">Todos</option><option value="ok">Vigente</option><option value="warn">Próxima</option><option value="error">Vencida</option><option value="none">Sin información</option></select></div></div><div className="nk-epp-segments">{SEGMENTS.map(([key,label])=><button key={key} type="button" className={`nk-epp-segment ${segment===key?'active':''}`} onClick={()=>setSegment(key)}>{label}</button>)}</div></section>
    <section className="nk-epp-summary"><article className="nk-epp-kpi"><strong>{loading?'…':summary.peopleControlled}</strong><span>Personas controladas</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.pendingPeople}</strong><span>Con entregas pendientes</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.soon}</strong><span>Reposición próxima</span></article><article className="nk-epp-kpi"><strong>{loading?'…':summary.missingSizes}</strong><span>Sin tallas registradas</span></article></section>
    <div className="nk-tabs nk-epp-tabs"><button className={`nk-tab ${view==='personas'?'active':''}`} onClick={()=>setView('personas')}><IconUsers size={14}/>Personas</button><button className={`nk-tab ${view==='matriz'?'active':''}`} onClick={()=>setView('matriz')}><IconShield size={14}/>Matriz por función</button><button className={`nk-tab ${view==='historial'?'active':''}`} onClick={()=>setView('historial')}><IconPackage size={14}/>Historial de entregas</button></div>
    {view==='personas'&&<section className="nk-card nk-epp-table-card">{loading?<div className="nk-empty nk-epp-empty"><IconUsers size={30}/><p className="nk-empty-title">Cargando personas…</p></div>:!personRows.length?<div className="nk-empty nk-epp-empty"><p className="nk-empty-title">Sin personas para mostrar</p></div>:<div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>Función</th><th>Entregas</th><th>Pendientes / reposición</th><th>Tallas registradas</th><th/></tr></thead><tbody>{personRows.map(({worker,own,pending,sizes})=><tr key={worker.id}><td><div className="nk-epp-person"><strong>{worker.nombre}</strong><span className="nk-epp-subtle">{worker.rut||'Sin RUT'}</span></div></td><td>{worker.cargo||worker.especialidad||'—'}</td><td>{own.length}</td><td><span className={`nk-badge ${pending.length?'nk-badge-warn':'nk-badge-ok'}`}>{pending.length?`${pending.length} por revisar`:'Al día'}</span></td><td>{sizes||'Sin tallas'}</td><td><button className="nk-button nk-button-quiet" onClick={()=>navigate(`/app/trabajadores/${worker.id}`)}>Ver persona</button></td></tr>)}</tbody></table></div>}</section>}
    {view==='matriz'&&<section className="nk-card nk-epp-table-card">{!matrixRows.length?<div className="nk-empty nk-epp-empty"><p className="nk-empty-title">Sin funciones para mostrar</p></div>:<div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Función / especialidad</th><th>Personas</th><th>EPP observados en entregas</th><th>Cobertura registrada</th></tr></thead><tbody>{matrixRows.map(row=><tr key={row.role}><td><strong>{row.role}</strong></td><td>{row.people}</td><td>{[...row.items.keys()].slice(0,6).join(' · ')||'Sin entregas registradas'}</td><td>{row.items.size?`${row.items.size} tipos de EPP`:'Sin información'}</td></tr>)}</tbody></table></div>}</section>}
    {view==='historial'&&<section className="nk-card nk-epp-table-card">{loading?<div className="nk-empty nk-epp-empty"><IconShield size={30}/><p className="nk-empty-title">Cargando entregas…</p></div>:filtered.length===0?<div className="nk-empty nk-epp-empty"><IconPackage size={30}/><p className="nk-empty-title">Sin entregas para mostrar</p></div>:<div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>EPP</th><th>Talla</th><th>Entrega</th><th>Reposición</th><th>Estado</th><th/></tr></thead><tbody>{filtered.map((item,index)=>{const status=replaceStatus(item.replaceAt);return<tr key={item.id||index}><td><div className="nk-epp-person"><strong>{item.workerName}</strong><span className="nk-epp-subtle">{item.workerRut||item.workerRole||'Sin información'}</span></div></td><td><div className="nk-epp-item"><strong>{item.itemName}</strong><span className="nk-epp-subtle">{item.brandModel||'Sin marca/modelo'}{item.certification?` · ${item.certification}`:''}</span></div></td><td>{item.size||'—'}</td><td>{item.deliveredAt||'—'}</td><td>{item.replaceAt||'Según inspección'}</td><td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td><td>{item.workerId?<button className="nk-button nk-button-quiet" onClick={()=>navigate(`/app/trabajadores/${item.workerId}`)}>Ver persona</button>:'—'}</td></tr>})}</tbody></table></div>}</section>}
    {creating && <DeliveryDialog workers={workers} inventory={inventory} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </div>
}
