import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconDownload, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/auditoria.css'

const REQUIRED_ITEMS=[
  {type:'documento',name:'Cédula de identidad'},
  {type:'contrato',name:'Contrato de trabajo'},
  {type:'documento',name:'Certificado AFP'},
  {type:'documento',name:'Certificado Fonasa/Isapre'},
  {type:'examen',name:'Examen preocupacional'},
  {type:'curso',name:'ODI / Derecho a Saber'},
  {type:'curso',name:'Reglamento Interno'},
]
function rows(v){return Array.isArray(v)?v:[]}
function daysUntil(date){if(!date)return null;const d=new Date(`${date}T23:59:59`);return Number.isNaN(d.getTime())?null:Math.ceil((d-new Date())/86400000)}
function itemMatches(item,req){return item.type===req.type&&String(item.name||'').toLowerCase().includes(req.name.toLowerCase().split('/')[0].trim())}
function pctFor(worker){const items=rows(worker.workerItems);const ok=REQUIRED_ITEMS.filter(req=>items.some(item=>itemMatches(item,req)&&item.estado!=='rechazado'&&!(item.vence&&daysUntil(item.vence)<0))).length;return Math.round(ok/REQUIRED_ITEMS.length*100)}
function issuesFor(worker){const issues=[];const items=rows(worker.workerItems)
  if(worker.rut&&!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(String(worker.rut))&&!/^\d{7,8}-[\dkK]$/.test(String(worker.rut)))issues.push('Revisar formato RUT')
  if(worker.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(worker.email)))issues.push('Email no válido')
  items.forEach(it=>{if(!(it.fileName||it.cloudUrl))issues.push(`${it.name||'Documento'}: sin respaldo`);if(it.vence&&daysUntil(it.vence)<0)issues.push(`${it.name||'Documento'}: vencido`)})
  REQUIRED_ITEMS.forEach(req=>{if(!items.some(item=>itemMatches(item,req)&&item.estado!=='rechazado'&&!(item.vence&&daysUntil(item.vence)<0)))issues.push(`Falta o vencido: ${req.name}`)})
  return [...new Set(issues)]
}
function auditState(worker){const pct=pctFor(worker),issues=issuesFor(worker);if(issues.length||pct<60)return {key:'no_puede',label:issues.length?'Alerta':'No puede operar',cls:'nk-badge-error'};if(pct>=85)return {key:'puede',label:'Puede operar',cls:'nk-badge-ok'};return {key:'revisar',label:'Revisar',cls:'nk-badge-warn'}}
function csvEscape(v){return `"${String(v??'').replaceAll('"','""')}"`}

export default function AuditoriaPage(){
  const [state,setState]=useState(null),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[clientFilter,setClientFilter]=useState(''),[statusFilter,setStatusFilter]=useState('')
  async function load(){setLoading(true);try{const r=await api.get('/state');setState(r?.state||r)}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const workers=rows(state?.trabajadores).filter(w=>!w.bloqueado),clients=rows(state?.minas).length?rows(state?.minas):rows(state?.clientes),assignments=rows(state?.asignaciones),orders=rows(state?.mantenciones).length?rows(state?.mantenciones):rows(state?.proyectos)
  const clientMap=useMemo(()=>new Map(clients.map(c=>[String(c.id),c])),[clients]),orderMap=useMemo(()=>new Map(orders.map(o=>[String(o.id),o])),[orders])
  const audited=useMemo(()=>workers.map(worker=>{const mantIds=assignments.filter(a=>String(a.trabId)===String(worker.id)).map(a=>String(a.mantId));const inferredClients=[...new Set([...rows(worker.mineras).map(String),...mantIds.map(id=>String(orderMap.get(id)?.minaId||'')).filter(Boolean)])];return {worker,mantIds,clientIds:inferredClients,pct:pctFor(worker),issues:issuesFor(worker),status:auditState(worker)}}),[workers,assignments,orderMap])
  const filtered=audited.filter(row=>{const term=query.trim().toLowerCase();return (!term||[row.worker.nombre,row.worker.rut].some(v=>String(v||'').toLowerCase().includes(term)))&&(!clientFilter||row.clientIds.includes(clientFilter))&&(!statusFilter||row.status.key===statusFilter)})
  const summary={total:filtered.length,puede:filtered.filter(r=>r.status.key==='puede').length,revisar:filtered.filter(r=>r.status.key==='revisar').length,noPuede:filtered.filter(r=>r.status.key==='no_puede').length}
  function exportCsv(){const lines=[['Trabajador','RUT','Clientes','Ordenes de servicio','Requisitos','Validacion','Cumplimiento','Estado'],...filtered.map(r=>[r.worker.nombre||'',r.worker.rut||'',r.clientIds.map(id=>clientMap.get(id)?.nombre||clientMap.get(id)?.name||id).join(' / '),r.mantIds.map(id=>orderMap.get(id)?.codigo||orderMap.get(id)?.nombre||id).join(' / '),REQUIRED_ITEMS.length,r.issues.join(' | '),`${r.pct}%`,r.status.label])].map(row=>row.map(csvEscape).join(',')).join('\n');const blob=new Blob([lines],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`auditoria_documental_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url)}
  return <div className="nk-audit-page">
    <header className="nk-audit-header"><div><h1>Auditoría</h1><p>Validación documental, evidencias y trazabilidad de personas habilitadas para operar.</p></div><div className="nk-audit-actions"><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button><button className="nk-button nk-button-secondary" onClick={exportCsv}><IconDownload size={15}/> Exportar CSV</button></div></header>
    <section className="nk-card nk-audit-filters"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o RUT..."/></label><select className="nk-select" value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre||c.name||c.id}</option>)}</select><select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="puede">Puede operar</option><option value="revisar">Revisar</option><option value="no_puede">No puede operar / alerta</option></select></section>
    <section className="nk-audit-control"><article><strong>{summary.total}</strong><span>Personas auditadas</span></article><article><strong>{summary.puede}</strong><span>Puede operar</span></article><article><strong>{summary.revisar}</strong><span>Revisar</span></article><article><strong>{summary.noPuede}</strong><span>No puede operar / alerta</span></article></section>
    <section className="nk-card nk-audit-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-audit-table"><thead><tr><th>Trabajador</th><th>Relación</th><th>Requisitos</th><th>Validación inteligente</th><th>%</th><th>Estado</th><th></th></tr></thead><tbody>{loading?<tr><td colSpan="7">Cargando auditoría…</td></tr>:filtered.length?filtered.map(r=><tr key={r.worker.id}><td><Link className="nk-context-link nk-audit-worker" to={`/app/trabajadores/${r.worker.id}`}>{r.worker.nombre||'Persona'}</Link><small>{r.worker.rut||'Sin RUT'}</small></td><td><div className="nk-audit-rel">{r.clientIds.length?r.clientIds.slice(0,2).map(id=><Link key={id} className="nk-context-link" to={`/app/clientes/${id}`}>{clientMap.get(id)?.nombre||clientMap.get(id)?.name||id}</Link>):<span>—</span>}<small>{r.mantIds.length?r.mantIds.slice(0,2).map(id=>orderMap.get(id)?.codigo||orderMap.get(id)?.nombre||id).join(' · '):'Sin OS'}</small></div></td><td>{REQUIRED_ITEMS.length}</td><td><div className="nk-audit-validation">{r.issues.length?r.issues.slice(0,2).map(issue=><span key={issue} className="nk-badge nk-badge-error" title={issue}>{issue}</span>):<span className="nk-badge nk-badge-ok">Documentos coherentes</span>}{r.issues.length>2&&<small>+{r.issues.length-2} observaciones</small>}</div></td><td><strong>{r.pct}%</strong></td><td><span className={`nk-badge ${r.status.cls}`}>{r.status.label}</span></td><td><Link className="nk-button nk-button-secondary nk-button-sm" to={`/app/trabajadores/${r.worker.id}`}>Ver ficha</Link></td></tr>):<tr><td colSpan="7">Sin personas para este filtro.</td></tr>}</tbody></table></div></section>
  </div>
}
