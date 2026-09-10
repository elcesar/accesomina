import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconExternalLink, IconPaperclip, IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/habilitacion-cliente.css'

const STATES=['pendiente','enviado','observado','corregido','rechazado','aprobado','pase_emitido']
const LABELS={pendiente:'Pendiente',enviado:'Enviado',observado:'Observado',corregido:'Corregido',rechazado:'Rechazado',aprobado:'Aprobado',pase_emitido:'Credencial emitida'}
const TYPES={empresa:'Empresa',trabajador:'Persona',vehiculo:'Vehículo/equipo',proyecto:'Orden de servicio'}
function rows(v){return Array.isArray(v)?v:[]}
function accId(tipo,id,minaId){return `acc_${tipo}_${id}_${minaId}`}

export default function HabilitacionClientePage(){
  const [response,setResponse]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [clientFilter,setClientFilter]=useState(''),[typeFilter,setTypeFilter]=useState(''),[statusFilter,setStatusFilter]=useState('')
  const fileRef=useRef(null), uploadRef=useRef(null)
  async function load(){setLoading(true);setError('');try{setResponse(await api.get('/state'))}catch(e){setError(e.message||'No fue posible cargar los requisitos del cliente.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const state=response?.state||response||{}, versions=response?.moduleVersions||{}
  const clients=rows(state.minas).length?rows(state.minas):rows(state.clientes), workers=rows(state.trabajadores), vehicles=rows(state.vehiculos), orders=rows(state.mantenciones).length?rows(state.mantenciones):rows(state.proyectos), records=rows(state.acreditacionesMandante)
  const clientsMap=useMemo(()=>new Map(clients.map(c=>[String(c.id),c])),[clients])
  const derived=useMemo(()=>{
    const out=[]
    clients.forEach(c=>out.push({tipo:'empresa',id:'empresa',minaId:String(c.id),nombre:state.empresa?.nombre||state.empresa?.name||'Empresa',detalle:state.empresa?.rut||''}))
    workers.forEach(w=>{const mids=rows(w.mineras);mids.forEach(mid=>out.push({tipo:'trabajador',id:String(w.id),minaId:String(mid),nombre:w.nombre||w.name||'Persona',detalle:w.rut||w.especialidad||''}))})
    vehicles.forEach(v=>{const mids=rows(v.minaIds);mids.forEach(mid=>out.push({tipo:'vehiculo',id:String(v.id),minaId:String(mid),nombre:v.nombre||v.patente||v.serie||'Vehículo/equipo',detalle:v.patente||v.serie||v.tipo||''}))})
    orders.forEach(o=>{if(o.minaId)out.push({tipo:'proyecto',id:String(o.id),minaId:String(o.minaId),nombre:o.codigo||o.nombre||o.name||'Orden de servicio',detalle:o.descripcion||o.estado||''})})
    return out.map(x=>({ ...x, rec:records.find(r=>r.id===accId(x.tipo,x.id,x.minaId)|| (r.tipo===x.tipo&&String(r.refId||r.objetoId||r.entidadId)===x.id&&String(r.minaId)===x.minaId)) || {id:accId(x.tipo,x.id,x.minaId),tipo:x.tipo,refId:x.id,minaId:x.minaId,estado:'pendiente',responsable:'',plazo:'',observacion:'',evidenceName:'',evidenceUrl:''}}))
  },[clients,workers,vehicles,orders,records,state.empresa])
  const filtered=derived.filter(r=>(!clientFilter||r.minaId===clientFilter)&&(!typeFilter||r.tipo===typeFilter)&&(!statusFilter||r.rec.estado===statusFilter))
  const approved=filtered.filter(r=>['aprobado','pase_emitido'].includes(r.rec.estado)).length, pct=filtered.length?Math.round(approved/filtered.length*100):0

  async function patch(rec,patchData){
    const nextRec={...rec,...patchData,updatedAt:new Date().toISOString()}
    const previousRecords=records
    const next=records.some(r=>r.id===rec.id)?records.map(r=>r.id===rec.id?nextRec:r):[nextRec,...records]

    // Actualización optimista: la grilla refleja el cambio inmediatamente.
    setResponse(cur=>{
      const currentState=cur?.state||cur||{}
      if(cur?.state){
        return {...cur,state:{...currentState,acreditacionesMandante:next}}
      }
      return {...currentState,acreditacionesMandante:next}
    })
    setError('')

    try{
      const result=await api.put('/state/modules',{reason:`Habilitación cliente actualizada: ${nextRec.id}`,changes:{acreditacionesMandante:{version:Number(versions.acreditacionesMandante||0),data:next}}})
      if(result?.moduleVersions){
        setResponse(cur=>cur?.state?{...cur,moduleVersions:{...(cur.moduleVersions||versions),...result.moduleVersions}}:cur)
      }
    }catch(e){
      // Si falla la persistencia, restaurar el valor previo para no mostrar un estado no guardado.
      setResponse(cur=>{
        const currentState=cur?.state||cur||{}
        if(cur?.state){
          return {...cur,state:{...currentState,acreditacionesMandante:previousRecords}}
        }
        return {...currentState,acreditacionesMandante:previousRecords}
      })
      setError(e.message||'No fue posible guardar la acreditación.')
    }
  }

  function chooseFile(rec){uploadRef.current=rec;fileRef.current?.click()}
  function onFile(e){const f=e.target.files?.[0],rec=uploadRef.current;if(f&&rec)patch(rec,{evidenceName:f.name,evidenceUrl:''});e.target.value='';uploadRef.current=null}
  return <div className="nk-clientreq-page">
    <header className="nk-clientreq-header"><div><h1>Habilitación del Cliente</h1><p>Estado final por cliente, empresa, personas, flota y órdenes de servicio.</p></div><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={15}/> Actualizar</button></header>
    {error&&<div className="nk-clientreq-feedback error">{error}</div>}
    <section className="nk-card nk-clientreq-filters">
      <select className="nk-select" value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="">Todos los clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre||c.name||c.id}</option>)}</select>
      <select className="nk-select" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="">Todos los objetos</option>{Object.entries(TYPES).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option>{STATES.map(v=><option key={v} value={v}>{LABELS[v]}</option>)}</select>
    </section>
    <section className="nk-clientreq-kpis"><article><strong>{pct}%</strong><span>Habilitación</span></article><article><strong>{filtered.filter(r=>r.rec.estado==='observado').length}</strong><span>Observados</span></article><article><strong>{filtered.filter(r=>r.rec.estado==='rechazado').length}</strong><span>Rechazados</span></article><article><strong>{filtered.filter(r=>r.rec.estado==='pase_emitido').length}</strong><span>Credenciales emitidas</span></article></section>
    <section className="nk-card nk-clientreq-table-card"><div className="nk-table-wrapper"><table className="nk-table nk-clientreq-table"><thead><tr><th>Entidad</th><th>Cliente</th><th>Estado</th><th>Responsable / plazo</th><th>Observación</th><th>Evidencia</th></tr></thead><tbody>{loading?<tr><td colSpan="6">Cargando…</td></tr>:filtered.length?filtered.map(r=><tr key={`${r.tipo}-${r.id}-${r.minaId}`}><td><span className="nk-badge nk-badge-info">{TYPES[r.tipo]}</span><strong className="nk-clientreq-name">{r.nombre}</strong><small>{r.detalle||'—'}</small></td><td><Link className="nk-context-link" to={`/app/clientes/${r.minaId}`}>{clientsMap.get(r.minaId)?.nombre||clientsMap.get(r.minaId)?.name||'Cliente'}</Link></td><td><select className="nk-select nk-clientreq-status" value={r.rec.estado} onChange={e=>patch(r.rec,{estado:e.target.value})}>{STATES.map(v=><option key={v} value={v}>{LABELS[v]}</option>)}</select></td><td><div className="nk-clientreq-stack"><input className="nk-input" defaultValue={r.rec.responsable||''} placeholder="Responsable" onBlur={e=>patch(r.rec,{responsable:e.target.value})}/><input className="nk-input" type="date" defaultValue={r.rec.plazo||''} onBlur={e=>patch(r.rec,{plazo:e.target.value})}/></div></td><td><input className="nk-input nk-clientreq-note" defaultValue={r.rec.observacion||''} onBlur={e=>patch(r.rec,{observacion:e.target.value})} placeholder="Observación"/></td><td><div className="nk-clientreq-evidence">{r.rec.evidenceUrl?<a className="nk-context-link" href={r.rec.evidenceUrl} target="_blank" rel="noreferrer"><IconExternalLink size={14}/> Ver</a>:r.rec.evidenceName?<span title={r.rec.evidenceName}>Archivo</span>:<span>—</span>}<button className="nk-button nk-button-secondary nk-button-sm" onClick={()=>chooseFile(r.rec)}><IconPaperclip size={14}/> Cargar</button><button className="nk-button nk-button-quiet nk-button-sm" onClick={()=>{const url=window.prompt('URL https de la evidencia',r.rec.evidenceUrl||'');if(url!==null)patch(r.rec,{evidenceUrl:url,evidenceName:''})}}>Link</button></div></td></tr>):<tr><td colSpan="6">Sin acreditaciones para este filtro.</td></tr>}</tbody></table></div></section>
    <input ref={fileRef} hidden type="file" onChange={onFile}/>
  </div>
}
