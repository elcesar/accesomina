import { useEffect, useMemo, useState } from 'react'
import { IconBriefcase, IconChevronDown, IconChevronUp, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/prospectos.css'

const rows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)
const OPEN_STAGES = ['prospecto', 'contactado', 'calificado', 'propuesta', 'negociacion']
const STAGES = [
  ['prospecto', 'Prospecto'],
  ['contactado', 'Contactado'],
  ['calificado', 'Calificado'],
  ['propuesta', 'Propuesta'],
  ['negociacion', 'Negociación'],
  ['ganada', 'Ganada'],
  ['perdida', 'Perdida'],
]
const TYPES = [
  ['nuevo_cliente', 'Nuevo cliente'],
  ['nuevo_contrato', 'Nuevo contrato'],
  ['nuevo_servicio', 'Nuevo proyecto / servicio'],
]

const stageLabel = value => STAGES.find(([key]) => key === String(value || '').toLowerCase())?.[1] || value || 'Prospecto'
const typeLabel = value => TYPES.find(([key]) => key === String(value || '').toLowerCase())?.[1] || value || 'Oportunidad'
const money = (value, currency = 'CLP') => {
  const amount = Number(value || 0)
  try { return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency || 'CLP', maximumFractionDigits: 0 }).format(amount) }
  catch { return `${currency || 'CLP'} ${amount.toLocaleString('es-CL')}` }
}
const companyName = row => row.company || row.empresa || row.razon || row.razonSocial || row.name || 'Empresa sin nombre'
const contactName = row => row.contact || row.contacto || row.contactName || row.nombreContacto || 'Sin contacto'
const nextAction = row => row.nextAction || row.proximaGestion || row.nextActionAt || row.proximaAccion || ''
const amountOf = row => Number(row.amount ?? row.monto ?? row.value ?? 0)
const probabilityOf = row => Number(row.probability ?? row.probabilidad ?? 0)
const isOpen = row => OPEN_STAGES.includes(String(row.stage || row.etapa || 'prospecto').toLowerCase())

function emptyForm() {
  return {
    id: '', type: 'nuevo_cliente', stage: 'prospecto', company: '', rut: '', service: '',
    contact: '', role: '', email: '', phone: '', amount: '', currency: 'CLP', probability: 20,
    expectedClose: '', nextAction: '', owner: '', clientId: '', contractId: '', region: '', commune: '', notes: ''
  }
}

function OpportunityDialog({ opportunity, clients, contracts, onClose, onSaved }) {
  const [form, setForm] = useState(() => opportunity ? {
    ...emptyForm(), ...opportunity,
    type: opportunity.type || opportunity.tipo || 'nuevo_cliente',
    stage: opportunity.stage || opportunity.etapa || 'prospecto',
    company: companyName(opportunity) === 'Empresa sin nombre' ? '' : companyName(opportunity),
    service: opportunity.service || opportunity.servicio || opportunity.interest || '',
    contact: contactName(opportunity) === 'Sin contacto' ? '' : contactName(opportunity),
    amount: opportunity.amount ?? opportunity.monto ?? '',
    probability: opportunity.probability ?? opportunity.probabilidad ?? 20,
    expectedClose: opportunity.expectedClose || opportunity.cierreEstimado || '',
    nextAction: nextAction(opportunity),
    owner: opportunity.owner || opportunity.responsable || '',
    clientId: opportunity.clientId || opportunity.minaId || '',
    contractId: opportunity.contractId || opportunity.contratoId || '',
    commune: opportunity.commune || opportunity.comuna || '',
    notes: opportunity.notes || opportunity.notas || opportunity.need || ''
  } : emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    if (!form.company.trim() || saving) return
    setSaving(true); setError('')
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const version = response?.moduleVersions?.prospectos ?? 0
      const current = rows(state.prospectos)
      const record = {
        ...(opportunity || {}),
        id: opportunity?.id || `opp_${Date.now()}`,
        type: form.type, stage: form.stage, company: form.company.trim(), rut: form.rut.trim(),
        service: form.service.trim(), contact: form.contact.trim(), role: form.role.trim(), email: form.email.trim(),
        phone: form.phone.trim(), amount: Number(form.amount || 0), currency: form.currency || 'CLP',
        probability: Number(form.probability || 0), expectedClose: form.expectedClose, nextAction: form.nextAction,
        owner: form.owner.trim(), clientId: form.clientId, contractId: form.contractId, region: form.region,
        commune: form.commune.trim(), notes: form.notes.trim(), updatedAt: new Date().toISOString(),
        createdAt: opportunity?.createdAt || new Date().toISOString()
      }
      const data = opportunity ? current.map(item => String(item.id) === String(opportunity.id) ? record : item) : [...current, record]
      await api.put('/state/modules', { reason: opportunity ? 'Oportunidad comercial actualizada' : 'Oportunidad comercial registrada', changes: { prospectos: { version, data } } })
      onSaved()
    } catch (cause) { setError(cause.message || 'No fue posible guardar la oportunidad.') }
    finally { setSaving(false) }
  }

  const clientContracts = contracts.filter(contract => !form.clientId || String(contract.minaId || contract.clientId || '') === String(form.clientId))
  return <div className="nk-dialog-backdrop" onMouseDown={onClose}>
    <form className="nk-dialog nk-opportunity-dialog" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header className="nk-dialog-header"><div><h2 className="nk-dialog-title">{opportunity ? 'Editar oportunidad' : 'Nueva oportunidad'}</h2><p className="nk-opportunity-subtle">Registra la oportunidad y su próxima gestión comercial.</p></div><button className="nk-icon-button" type="button" onClick={onClose}><IconX size={18}/></button></header>
      <div className="nk-dialog-body"><div className="nk-opportunity-form-grid">
        <label className="nk-field"><span className="nk-label">Tipo</span><select className="nk-select" value={form.type} onChange={e => setForm({...form,type:e.target.value})}>{TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Etapa</span><select className="nk-select" value={form.stage} onChange={e => setForm({...form,stage:e.target.value})}>{STAGES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="nk-field nk-opportunity-wide"><span className="nk-label">Empresa</span><input className="nk-input" required value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">RUT</span><input className="nk-input" value={form.rut} onChange={e=>setForm({...form,rut:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Servicio de interés</span><input className="nk-input" value={form.service} onChange={e=>setForm({...form,service:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Contacto</span><input className="nk-input" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Cargo</span><input className="nk-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Email</span><input className="nk-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Teléfono</span><input className="nk-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Monto</span><input className="nk-input" type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Moneda</span><select className="nk-select" value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>CLP</option><option>USD</option><option>UF</option></select></label>
        <label className="nk-field"><span className="nk-label">Probabilidad %</span><input className="nk-input" type="number" min="0" max="100" value={form.probability} onChange={e=>setForm({...form,probability:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Cierre estimado</span><input className="nk-input" type="date" value={form.expectedClose} onChange={e=>setForm({...form,expectedClose:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Próxima gestión</span><input className="nk-input" type="date" value={form.nextAction} onChange={e=>setForm({...form,nextAction:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Responsable</span><input className="nk-input" value={form.owner} onChange={e=>setForm({...form,owner:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Región</span><input className="nk-input" value={form.region} onChange={e=>setForm({...form,region:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Comuna</span><input className="nk-input" value={form.commune} onChange={e=>setForm({...form,commune:e.target.value})}/></label>
        <label className="nk-field"><span className="nk-label">Cliente existente (opcional)</span><select className="nk-select" value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value,contractId:''})}><option value="">Sin cliente asociado</option>{clients.map(client=><option key={client.id} value={client.id}>{client.razon || client.nombre || client.name || client.id}</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Contrato existente (opcional)</span><select className="nk-select" value={form.contractId} onChange={e=>setForm({...form,contractId:e.target.value})}><option value="">Sin contrato asociado</option>{clientContracts.map(contract=><option key={contract.id} value={contract.id}>{contract.codigo || contract.numero || contract.nombre || contract.id}</option>)}</select></label>
        <label className="nk-field nk-opportunity-wide"><span className="nk-label">Notas / necesidad</span><textarea className="nk-textarea" rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      </div>{error && <p className="nk-form-error">{error}</p>}</div>
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar oportunidad'}</button></footer>
    </form>
  </div>
}

export default function ProspectosPage() {
  const [response,setResponse] = useState(null)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [query,setQuery] = useState('')
  const [typeFilter,setTypeFilter] = useState('todos')
  const [stageFilter,setStageFilter] = useState('todos')
  const [regionFilter,setRegionFilter] = useState('')
  const [communeFilter,setCommuneFilter] = useState('')
  const [moreFilters,setMoreFilters] = useState(false)
  const [editing,setEditing] = useState(null)

  async function load(){setLoading(true);setError('');try{setResponse(await api.get('/state'))}catch(cause){setError(cause.message||'No fue posible cargar prospectos y oportunidades.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const state=response?.state||response||{}
  const opportunities=rows(state.prospectos)
  const clients=rows(state.minas).length?rows(state.minas):rows(state.clientes)
  const contracts=rows(state.contratos)
  const regions=[...new Set(opportunities.map(item=>item.region||item.regionName).filter(Boolean))].sort()
  const communes=[...new Set(opportunities.map(item=>item.commune||item.comuna).filter(Boolean))].sort()

  const filtered=useMemo(()=>{const text=query.trim().toLowerCase();return opportunities.filter(item=>{
    const type=String(item.type||item.tipo||'nuevo_cliente').toLowerCase();const stage=String(item.stage||item.etapa||'prospecto').toLowerCase();
    const matchesText=!text||[companyName(item),contactName(item),item.service,item.servicio,item.rut,item.owner,item.responsable].some(value=>String(value||'').toLowerCase().includes(text))
    return matchesText&&(typeFilter==='todos'||type===typeFilter)&&(stageFilter==='todos'||stage===stageFilter)&&(!regionFilter||String(item.region||item.regionName||'')===regionFilter)&&(!communeFilter||String(item.commune||item.comuna||'')===communeFilter)
  })},[opportunities,query,typeFilter,stageFilter,regionFilter,communeFilter])

  const summary=filtered.reduce((acc,item)=>{acc.total++;if(isOpen(item)){const amount=amountOf(item);acc.gross+=amount;acc.weighted+=amount*(probabilityOf(item)/100);const due=nextAction(item);if(due&&due<today())acc.overdue++}return acc},{total:0,gross:0,weighted:0,overdue:0})

  return <div className="nk-opportunity-page">
    <header className="nk-opportunity-header"><div><h1>Prospectos y oportunidades</h1><p>Gestiona el embudo comercial, responsables, etapas y próxima acción antes de convertir una oportunidad en Cliente, Contrato u Orden de servicio.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={15}/>Actualizar</button><button className="nk-button nk-button-primary" onClick={()=>setEditing({})}><IconPlus size={15}/>Nueva oportunidad</button></div></header>
    {error&&<div className="nk-opportunity-feedback error">{error}</div>}
    <section className="nk-card nk-opportunity-filter-card"><div className="nk-opportunity-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa, contacto o servicio"/></label><select className="nk-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="todos">Todos los tipos</option>{TYPES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><select className="nk-select" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="todos">Todas las etapas</option>{STAGES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><button className="nk-button nk-button-secondary" type="button" onClick={()=>setMoreFilters(value=>!value)}>Más filtros {moreFilters?<IconChevronUp size={14}/>:<IconChevronDown size={14}/>}</button></div>{moreFilters&&<div className="nk-opportunity-more-filters"><select className="nk-select" value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}><option value="">Todas las regiones</option>{regions.map(value=><option key={value}>{value}</option>)}</select><select className="nk-select" value={communeFilter} onChange={e=>setCommuneFilter(e.target.value)}><option value="">Todas las comunas</option>{communes.map(value=><option key={value}>{value}</option>)}</select></div>}</section>
    <section className="nk-opportunity-summary"><article><strong>{loading?'…':summary.total}</strong><span>Oportunidades</span></article><article><strong>{loading?'…':money(summary.gross)}</strong><span>Pipeline bruto</span></article><article><strong>{loading?'…':money(summary.weighted)}</strong><span>Pipeline ponderado</span></article><article><strong>{loading?'…':summary.overdue}</strong><span>Gestiones vencidas</span></article></section>
    <section className="nk-card nk-opportunity-table-card">{loading?<div className="nk-empty"><IconBriefcase size={30}/><p className="nk-empty-title">Cargando oportunidades…</p></div>:!filtered.length?<div className="nk-empty"><IconBriefcase size={30}/><p className="nk-empty-title">Sin oportunidades para mostrar</p><p>Crea una oportunidad o ajusta los filtros.</p></div>:<div className="nk-table-wrapper"><table className="nk-table nk-opportunity-table"><thead><tr><th>Empresa / oportunidad</th><th>Ubicación</th><th>Tipo</th><th>Contacto</th><th>Etapa</th><th>Monto / prob.</th><th>Próxima gestión</th><th>Seguimiento</th><th>Acciones</th></tr></thead><tbody>{filtered.map(item=>{const stage=item.stage||item.etapa||'prospecto';const due=nextAction(item);const overdue=isOpen(item)&&due&&due<today();return <tr key={item.id}><td><strong>{companyName(item)}</strong><div className="nk-opportunity-subtle">{item.service||item.servicio||'Sin servicio definido'}</div></td><td>{[item.commune||item.comuna,item.region].filter(Boolean).join(' · ')||'—'}</td><td>{typeLabel(item.type||item.tipo)}</td><td>{contactName(item)}<div className="nk-opportunity-subtle">{item.role||item.cargo||item.email||'—'}</div></td><td><span className={`nk-badge nk-stage-${String(stage).toLowerCase()}`}>{stageLabel(stage)}</span></td><td><strong>{money(amountOf(item),item.currency||item.moneda||'CLP')}</strong><div className="nk-opportunity-subtle">{probabilityOf(item)}% · ponderado {money(amountOf(item)*(probabilityOf(item)/100),item.currency||item.moneda||'CLP')}</div></td><td><span className={overdue?'nk-opportunity-overdue':''}>{due||'Sin fecha'}</span></td><td>{item.owner||item.responsable||'Sin responsable'}<div className="nk-opportunity-subtle">{item.notes||item.notas||'Sin nota'}</div></td><td><button className="nk-button nk-button-secondary nk-button-small" onClick={()=>setEditing(item)}>Abrir</button></td></tr>})}</tbody></table></div>}</section>
    {editing!==null&&<OpportunityDialog opportunity={editing.id?editing:null} clients={clients} contracts={contracts} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);load()}}/>}
  </div>
}
