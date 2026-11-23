import EmptyState from '../components/ui/EmptyState.jsx'
import { ActionButton } from '../components/ui/ActionButton.jsx'
import { includesSearch } from '../services/search.js'
import { localDate } from '../services/calendar-date.js'
import { workerComplianceIssues, workerComplianceSummary } from '../services/worker-document-status.js'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconDownload, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/auditoria.css'

function rows(v){return Array.isArray(v)?v:[]}
function pctFor(worker){return workerComplianceSummary(worker).percentage}
function issuesFor(worker){const issues=[]
  if(worker.rut&&!/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/.test(String(worker.rut))&&!/^\d{7,8}-[\dkK]$/.test(String(worker.rut)))issues.push('Revisar formato RUT')
  if(worker.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(worker.email)))issues.push('Email no válido')
  workerComplianceIssues(worker).forEach(issue=>issues.push(issue.message))
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
  const audited=useMemo(()=>workers.map(worker=>{const mantIds=assignments.filter(a=>String(a.trabId)===String(worker.id)).map(a=>String(a.mantId));const inferredClients=[...new Set([...rows(worker.mineras).map(String),...mantIds.map(id=>String(orderMap.get(id)?.minaId||'')).filter(Boolean)])];const summary=workerComplianceSummary(worker),issues=issuesFor(worker);return {worker,mantIds,clientIds:inferredClients,requirements:summary.total,pct:summary.percentage,issues,status:auditState(worker)}}),[workers,assignments,orderMap])
  const filtered=audited.filter(row=>{const term=query.trim().toLowerCase();return (!term||[row.worker.nombre,row.worker.rut].some(v=>includesSearch(String(v||''), term)))&&(!clientFilter||row.clientIds.includes(clientFilter))&&(!statusFilter||row.status.key===statusFilter)})
  const summary={total:filtered.length,puede:filtered.filter(r=>r.status.key==='puede').length,revisar:filtered.filter(r=>r.status.key==='revisar').length,noPuede:filtered.filter(r=>r.status.key==='no_puede').length}
  function exportCsv(){const lines=[['Trabajador','RUT','Clientes','Ordenes de servicio','Requisitos','Validacion','Cumplimiento','Estado'],...filtered.map(r=>[r.worker.nombre||'',r.worker.rut||'',r.clientIds.map(id=>clientMap.get(id)?.nombre||clientMap.get(id)?.name||id).join(' / '),r.mantIds.map(id=>orderMap.get(id)?.codigo||orderMap.get(id)?.nombre||id).join(' / '),r.requirements,r.issues.join(' | '),`${r.pct}%`,r.status.label])].map(row=>row.map(csvEscape).join(',')).join('\n');const blob=new Blob([lines],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`auditoria_documental_${localDate()}.csv`;a.click();URL.revokeObjectURL(url)}
  return <div className="nk-audit-page">
    <header className="nk-audit-header"><div><h1>Auditoría</h1><p>Validación documental, evidencias y trazabilidad de personas habilitadas para operar.</p></div><div className="nk-audit-actions"><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</ActionButton><button className="nk-button nk-button-secondary" onClick={exportCsv}><IconDownload size={15}/> Exportar CSV</button></div></header>
    <section className="nk-card nk-audit-filters"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o RUT..."/></label><select className="nk-select" value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre||c.name||c.id}</option>)}</select><select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="puede">Puede operar</option><option value="revisar">Revisar</option><option value="no_puede">No puede operar / alerta</option></select></section>
    <section className="nk-audit-control"><article><strong>{summary.total}</strong><span>Personas auditadas</span></article><article><strong>{summary.puede}</strong><span>Puede operar</span></article><article><strong>{summary.revisar}</strong><span>Revisar</span></article><article><strong>{summary.noPuede}</strong><span>No puede operar / alerta</span></article></section>
    <section className="nk-card nk-audit-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-audit-table"><caption className="nk-visually-hidden">Auditoría</caption><thead><tr><th scope="col">Trabajador</th><th scope="col">Relación</th><th scope="col">Requisitos</th><th scope="col">Validación inteligente</th><th scope="col">%</th><th scope="col">Estado</th><th scope="col"></th></tr></thead><tbody>{loading?<tr><td colSpan="7">Cargando auditoría…</td></tr>:filtered.length?filtered.map(r=><tr key={r.worker.id}><td><Link className="nk-context-link nk-audit-worker" to={`/app/trabajadores/${r.worker.id}`}>{r.worker.nombre||'Persona'}</Link><small>{r.worker.rut||'Sin RUT'}</small></td><td><div className="nk-audit-rel">{r.clientIds.length?r.clientIds.slice(0,2).map(id=><Link key={id} className="nk-context-link" to={`/app/clientes/${id}`}>{clientMap.get(id)?.nombre||clientMap.get(id)?.name||id}</Link>):<span>—</span>}<small>{r.mantIds.length?r.mantIds.slice(0,2).map(id=>orderMap.get(id)?.codigo||orderMap.get(id)?.nombre||id).join(' · '):'Sin OS'}</small></div></td><td>{r.requirements}</td><td><div className="nk-audit-validation">{r.issues.length?r.issues.slice(0,2).map(issue=><span key={issue} className="nk-badge nk-badge-error" title={issue}>{issue}</span>):<span className="nk-badge nk-badge-ok">Documentos coherentes</span>}{r.issues.length>2&&<small>+{r.issues.length-2} observaciones</small>}</div></td><td><strong>{r.pct}%</strong></td><td><span className={`nk-badge ${r.status.cls}`}>{r.status.label}</span></td><td><Link className="nk-button nk-button-secondary nk-button-sm" to={`/app/trabajadores/${r.worker.id}`}>Ver ficha</Link></td></tr>):<tr><td colSpan="7"><EmptyState title="No hay resultados para estos criterios." filtered description="Ajusta la búsqueda o limpia los filtros para ver más resultados." /></td></tr>}</tbody></table></div></section>
  </div>
}
