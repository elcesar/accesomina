import { useEffect, useMemo, useState } from 'react'
import { IconCircleCheck, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/contractors-secondary.css'

const asRows = value => Array.isArray(value) ? value : []
const REQUIREMENTS = ['Laboral', 'Previsional', 'Seguridad', 'Seguro', 'Cliente']

function legacyCompliance(company) {
  const source = [company.f30, company.f301, company.cotizaciones, company.seguro]
  const valid = source.filter(Boolean).length
  return { id:`legacy-${company.id}`, subcontratoId:company.id, valid, total:4, missing:4-valid, estado: valid===4?'al_dia':'pendiente', legacy:true }
}

function HabilitacionDialog({ companies, onClose, onSaved }) {
  const [form, setForm] = useState({ subcontratoId:'', requisito:'Laboral', estado:'pendiente', vence:'', responsable:'', observacion:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save(e){
    e.preventDefault(); if(!form.subcontratoId || saving) return
    setSaving(true); setError('')
    try{
      const response = await api.get('/state'); const state = response?.state || response || {}; const version = response?.moduleVersions?.habilitaciones ?? 0
      const record = { id:`hab_${Date.now()}`, ...form, createdAt:new Date().toISOString() }
      await api.put('/state/modules',{ reason:'Habilitación de contratista registrada', changes:{ habilitaciones:{ version, data:[...asRows(state.habilitaciones), record] } } })
      onSaved()
    }catch(c){ setError(c.message || 'No fue posible guardar la habilitación.') } finally { setSaving(false) }
  }
  return <div className="nk-dialog-backdrop" onMouseDown={onClose}><form className="nk-dialog" onSubmit={save} onMouseDown={e=>e.stopPropagation()}><header className="nk-dialog-header"><div><h2 className="nk-dialog-title">Nueva habilitación</h2><p className="nk-contractor-subtle">Registra un requisito de cumplimiento para una empresa colaboradora.</p></div><button className="nk-icon-button" type="button" onClick={onClose}><IconX size={18}/></button></header><div className="nk-dialog-body"><div className="nk-contractor-form-grid"><div className="nk-field nk-contractor-wide"><label className="nk-label">Empresa</label><select className="nk-select" required value={form.subcontratoId} onChange={e=>setForm({...form,subcontratoId:e.target.value})}><option value="">Seleccionar empresa</option>{companies.map(c=><option key={c.id} value={c.id}>{c.razon||c.nombre}</option>)}</select></div><div className="nk-field"><label className="nk-label">Requisito</label><select className="nk-select" value={form.requisito} onChange={e=>setForm({...form,requisito:e.target.value})}>{REQUIREMENTS.map(x=><option key={x}>{x}</option>)}</select></div><div className="nk-field"><label className="nk-label">Estado</label><select className="nk-select" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}><option value="vigente">Vigente</option><option value="pendiente">Pendiente</option><option value="vencido">Vencido</option></select></div><div className="nk-field"><label className="nk-label">Vencimiento</label><input className="nk-input" type="date" value={form.vence} onChange={e=>setForm({...form,vence:e.target.value})}/></div><div className="nk-field"><label className="nk-label">Responsable</label><input className="nk-input" value={form.responsable} onChange={e=>setForm({...form,responsable:e.target.value})}/></div><div className="nk-field nk-contractor-wide"><label className="nk-label">Observación</label><textarea className="nk-textarea" rows="3" value={form.observacion} onChange={e=>setForm({...form,observacion:e.target.value})}/></div></div>{error&&<p className="nk-form-error">{error}</p>}</div><footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving?'Guardando…':'Guardar'}</button></footer></form></div>
}

export default function HabilitacionesCumplimientoPage(){
  const [response,setResponse]=useState(null),[loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[query,setQuery]=useState(''),[statusFilter,setStatusFilter]=useState('todos'),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');try{setResponse(await api.get('/state'))}catch(c){setError(c.message||'No fue posible cargar habilitaciones.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const state=response?.state||response||{}, companies=asRows(state.subcontratos), canonical=asRows(state.habilitaciones)
  const byCompany=new Map(companies.map(c=>[String(c.id),c]))
  const grouped = useMemo(()=>companies.map(company=>{
    const items=canonical.filter(x=>String(x.subcontratoId||x.terceroId)===String(company.id))
    if(!items.length && !canonical.length) return {...legacyCompliance(company),company,items:[]}
    const total=items.length, valid=items.filter(x=>String(x.estado).toLowerCase()==='vigente').length, missing=items.filter(x=>String(x.estado).toLowerCase()!=='vigente').length
    return {id:company.id,subcontratoId:company.id,company,items,total,valid,missing,estado:missing?'pendiente':'al_dia'}
  }),[companies,canonical])
  const filtered=grouped.filter(row=>{const t=query.trim().toLowerCase();return(!t||[row.company?.razon,row.company?.nombre,row.company?.rut].some(v=>String(v||'').toLowerCase().includes(t)))&&(statusFilter==='todos'||row.estado===statusFilter)})
  const summary={total:grouped.length,ok:grouped.filter(x=>x.estado==='al_dia').length,pending:grouped.filter(x=>x.missing>0).length,requirements:canonical.length}
  return <div className="nk-contractor-page"><header className="nk-contractor-header"><div><h1>Habilitaciones y cumplimiento</h1><p>Control de requisitos laborales, previsionales, seguridad, seguros y exigencias particulares del cliente.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={15}/>Actualizar</button><button className="nk-button nk-button-primary" onClick={()=>setCreating(true)} disabled={!companies.length}><IconPlus size={15}/>Nueva habilitación</button></div></header>{error&&<div className="nk-contractor-feedback error">{error}</div>}<section className="nk-contractor-summary"><article><strong>{loading?'…':summary.total}</strong><span>Empresas</span></article><article><strong>{loading?'…':summary.ok}</strong><span>Al día</span></article><article><strong>{loading?'…':summary.pending}</strong><span>Con pendientes</span></article><article><strong>{loading?'…':summary.requirements}</strong><span>Requisitos registrados</span></article></section><section className="nk-card"><div className="nk-contractor-toolbar nk-contractor-toolbar-2"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa o RUT"/></label><select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="todos">Todos los estados</option><option value="al_dia">Al día</option><option value="pendiente">Requiere gestión</option></select></div></section><section className="nk-card nk-contractor-table-card">{loading?<div className="nk-empty nk-contractor-empty"><IconCircleCheck size={30}/><p className="nk-empty-title">Cargando cumplimiento…</p></div>:!filtered.length?<div className="nk-empty nk-contractor-empty"><p className="nk-empty-title">Sin empresas para mostrar</p></div>:<div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Empresa externa</th><th>Base documental</th><th>Pendientes</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{filtered.map(row=>{const pct=row.total?Math.round(row.valid/row.total*100):0;return <tr key={row.id}><td><strong>{row.company?.razon||row.company?.nombre}</strong><div className="nk-contractor-subtle">{row.company?.rut||'Sin RUT'}</div></td><td><div className="nk-compliance-meter"><div><strong>{row.valid}/{row.total}</strong><span>{pct}%</span></div><div className="nk-compliance-track"><span style={{width:`${pct}%`}}/></div></div></td><td>{row.missing}</td><td><span className={`nk-badge ${row.missing?'nk-badge-error':'nk-badge-ok'}`}>{row.missing?'Requiere gestión':'Al día'}</span></td><td>{row.items?.length?<div className="nk-requirement-list">{row.items.slice(0,3).map(item=><span key={item.id} className={`nk-badge ${item.estado==='vigente'?'nk-badge-ok':item.estado==='vencido'?'nk-badge-error':'nk-badge-warn'}`}>{item.requisito||item.tipo||'Requisito'}</span>)}</div>:<span className="nk-contractor-subtle">Base histórica</span>}</td></tr>})}</tbody></table></div>}</section>{creating&&<HabilitacionDialog companies={companies} onClose={()=>setCreating(false)} onSaved={()=>{setCreating(false);load()}}/>}</div>
}
