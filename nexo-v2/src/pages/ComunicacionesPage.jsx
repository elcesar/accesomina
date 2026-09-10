import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IconCheck,
  IconMessageCircle,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconUsers,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/comunicaciones.css'

const rows=value=>Array.isArray(value)?value:[]
const newId=()=>globalThis.crypto?.randomUUID?.()||`callout-${Date.now()}-${Math.random().toString(16).slice(2)}`
const editors=new Set(['domian_admin','client_admin','rrhh'])
const normalize=value=>String(value||'').trim().toLowerCase()
const emptyDraft=()=>({
  tipo:'convocatoria',titulo:'',mensaje:'',mantId:'',trabId:'',fecha:'',estado:'pendiente',
  especialidades:[],turno:'ambos',cupos:0,canal:'WhatsApp',prioridad:'Normal',responderAntes:'',responsable:'',
  enviados:0,respondieron:0,asignados:0,recipients:[],
})
const labelFor=item=>item.titulo||item.nombre||item.title||item.tipo||item.descripcion||'Comunicación'
const statusLabel=value=>({pendiente:'Pendiente',enviado:'Enviado',confirmado:'Confirmado',completado:'Completado',cancelado:'Cancelado'}[normalize(value)]||value||'Pendiente')

function metricRate(item){
  const sent=Number(item.enviados||0)
  const replied=Number(item.respondieron||0)
  return sent?Math.round((replied/sent)*100):0
}

export default function ComunicacionesPage(){
 const {session}=useAuth();const canEdit=editors.has(session?.user?.role)
 const [response,setResponse]=useState(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);const [selectedId,setSelectedId]=useState(null);const [creating,setCreating]=useState(false);const [draft,setDraft]=useState(emptyDraft);const [search,setSearch]=useState('');const [statusFilter,setStatusFilter]=useState('');const [message,setMessage]=useState('');const [messageTone,setMessageTone]=useState('')
 async function load(){setLoading(true);setMessage('');try{setResponse(await api.get('/state'))}catch{setMessage('No fue posible cargar las comunicaciones.');setMessageTone('error')}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const state=response?.state||response||{}
 const callouts=useMemo(()=>rows(state.callouts),[state.callouts])
 const orders=useMemo(()=>rows(state.mantenciones),[state.mantenciones])
 const workers=useMemo(()=>rows(state.trabajadores),[state.trabajadores])
 const orderById=useMemo(()=>new Map(orders.map(x=>[String(x.id),x])),[orders])
 const workerById=useMemo(()=>new Map(workers.map(x=>[String(x.id),x])),[workers])
 const specialties=useMemo(()=>[...new Set(workers.map(worker=>worker.especialidad).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')),[workers])
 const visible=useMemo(()=>{const term=search.trim().toLowerCase();return callouts.filter(item=>{if(statusFilter&&normalize(item.estado||item.status||'pendiente')!==statusFilter)return false;if(!term)return true;const order=orderById.get(String(item.mantId));const recipientNames=rows(item.recipients).map(recipient=>workerById.get(String(recipient.workerId||recipient.trabId))?.nombre).filter(Boolean);return[labelFor(item),item.mensaje,item.descripcion,order?.nombre,...rows(item.especialidades),...recipientNames].filter(Boolean).some(v=>String(v).toLowerCase().includes(term))})},[callouts,search,statusFilter,orderById,workerById])
 const selected=callouts.find(x=>String(x.id)===String(selectedId))||null
 const pendingCount=callouts.filter(x=>normalize(x.estado||x.status||'pendiente')==='pendiente').length
 const sentCount=callouts.filter(x=>normalize(x.estado||x.status||'pendiente')==='enviado').length
 const confirmedCount=callouts.filter(x=>['confirmado','completado','cerrado'].includes(normalize(x.estado||x.status||'pendiente'))).length
 const eligibleWorkers=useMemo(()=>{
   if(draft.tipo!=='convocatoria'||!rows(draft.especialidades).length)return[]
   const required=new Set(draft.especialidades)
   return workers.filter(worker=>{
     const enabled=!worker.bloqueado&&worker.operationalStatus!=='restringido'&&worker.operationalStatus!=='bloqueado'
     const available=worker.disponibilidad==='disponible'
     const specialty=required.has(worker.especialidad)
     const consent=worker.communicationConsent!==false
     const hasChannel=draft.canal==='Correo'?Boolean(worker.email):draft.canal==='WhatsApp y correo'?Boolean(worker.tel||worker.email):Boolean(worker.tel)
     return enabled&&available&&specialty&&consent&&hasChannel
   })
 },[draft.tipo,draft.especialidades,draft.canal,workers])
 useEffect(()=>{if(!callouts.length){setSelectedId(null);if(!creating)setDraft(emptyDraft());return}const current=callouts.find(x=>String(x.id)===String(selectedId))||callouts[0];if(String(current.id)!==String(selectedId))setSelectedId(current.id);if(!creating)setDraft({...emptyDraft(),...current,titulo:current.titulo||current.nombre||current.title||'',mensaje:current.mensaje||current.descripcion||'',especialidades:rows(current.especialidades),recipients:rows(current.recipients)})},[callouts,selectedId,creating])
 const update=key=>event=>setDraft(current=>({...current,[key]:event.target.value}))
 const updateNumber=key=>event=>setDraft(current=>({...current,[key]:Math.max(0,Number(event.target.value)||0)}))
 const selectItem=id=>{setCreating(false);setSelectedId(id);setMessage('');setMessageTone('')}
 const toggleSpecialty=value=>setDraft(current=>({...current,especialidades:current.especialidades.includes(value)?current.especialidades.filter(item=>item!==value):[...current.especialidades,value]}))
 const applyTemplate=()=>{
   const order=orderById.get(String(draft.mantId))
   const orderName=order?.nombre||'la orden de servicio seleccionada'
   const specialtyText=draft.especialidades.length?draft.especialidades.join(', '):'las especialidades requeridas'
   const slots=Number(draft.cupos||0)>0?`${draft.cupos} cupo${Number(draft.cupos)===1?'':'s'}`:'cupos disponibles'
   setDraft(current=>({...current,mensaje:`Convocatoria para ${orderName}. Se requieren ${specialtyText}, turno ${current.turno||'ambos'}, con ${slots}. Favor confirmar disponibilidad.`}))
 }
 async function save(event){
   event.preventDefault();if(!canEdit)return
   if(draft.titulo.trim().length<2){setMessage('Indica un título para la comunicación.');setMessageTone('error');return}
   if(draft.mantId&&!orders.some(x=>String(x.id)===String(draft.mantId))){setMessage('La orden seleccionada ya no está disponible.');setMessageTone('error');return}
   if(draft.trabId&&!workers.some(x=>String(x.id)===String(draft.trabId))){setMessage('La persona seleccionada ya no está disponible.');setMessageTone('error');return}
   if(draft.tipo==='convocatoria'&&(!draft.mantId||!draft.especialidades.length)){setMessage('Para una convocatoria selecciona una orden de servicio y al menos una especialidad.');setMessageTone('error');return}
   setSaving(true);setMessage('')
   try{
     const id=creating?(draft.id||newId()):selectedId;const now=new Date().toISOString()
     const recipients=draft.tipo==='convocatoria'&&creating?eligibleWorkers.map(worker=>({workerId:worker.id,status:'pendiente',sentAt:'',respondedAt:'',note:''})):rows(draft.recipients)
     const saved={...draft,id,titulo:draft.titulo.trim(),nombre:draft.titulo.trim(),mensaje:draft.mensaje.trim(),descripcion:draft.mensaje.trim(),responsable:draft.responsable.trim(),cupos:Number(draft.cupos||0),especialidades:rows(draft.especialidades),recipients,eligibleCount:draft.tipo==='convocatoria'?eligibleWorkers.length:0,updatedAt:now,...(creating?{createdAt:draft.createdAt||now}:{})}
     const next=creating?[...callouts,saved]:callouts.map(x=>String(x.id)===String(id)?saved:x)
     const result=await api.put('/state/modules',{changes:{callouts:{version:Number(response?.moduleVersions?.callouts||0),data:next}},reason:creating?'Comunicación o convocatoria creada':'Comunicación o convocatoria actualizada'})
     setResponse(current=>({...(current||{}),state:{...(current?.state||current||{}),callouts:next},moduleVersions:{...(current?.moduleVersions||{}),...result.moduleVersions}}));setSelectedId(id);setCreating(false);setDraft(saved);setMessage(creating?'Comunicación creada con destinatarios elegibles preparados.':'Cambios guardados con trazabilidad.');setMessageTone('ok')
   }catch(error){setMessage(error.message||'No fue posible guardar la comunicación.');setMessageTone('error')}finally{setSaving(false)}
 }
 return <section className="nk-comms-page">
  <header className="nk-comms-header"><div><h1>Comunicaciones y convocatorias</h1><p>Coordina mensajes, convocatorias y confirmaciones vinculadas a personas y órdenes de servicio.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button>{canEdit&&<button className="nk-button nk-button-primary" type="button" onClick={()=>{setCreating(true);setSelectedId(null);setDraft({...emptyDraft(),id:newId(),responsable:session?.user?.nombre||session?.user?.name||''});setMessage('')}}><IconPlus size={16}/>Nueva comunicación</button>}</div></header>
  {message&&<div className={`nk-comms-feedback ${messageTone}`}>{message}</div>}
  <section className="nk-comms-summary"><article><IconMessageCircle size={18}/><b>{callouts.length}</b><span>Total</span></article><article><IconUsers size={18}/><b>{pendingCount}</b><span>Pendientes</span></article><article><IconSend size={18}/><b>{sentCount}</b><span>Enviadas</span></article><article><IconCheck size={18}/><b>{confirmedCount}</b><span>Confirmadas</span></article></section>
  <div className="nk-comms-layout">
   <aside className="nk-comms-list nk-card"><div className="nk-comms-list-head"><strong>Registro</strong><span className="nk-badge nk-badge-none">{visible.length}/{callouts.length}</span></div><div className="nk-comms-filters"><label className="nk-search"><IconSearch size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." aria-label="Buscar comunicaciones"/></label><select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option><option value="pendiente">Pendiente</option><option value="enviado">Enviado</option><option value="confirmado">Confirmado</option><option value="cancelado">Cancelado</option></select></div>{loading?<div className="nk-comms-empty">Cargando…</div>:!visible.length?<div className="nk-comms-empty">No hay comunicaciones para mostrar.</div>:visible.map(item=><button type="button" key={item.id} className={`nk-comms-list-item ${String(item.id)===String(selectedId)&&!creating?'active':''}`} onClick={()=>selectItem(item.id)}><strong>{labelFor(item)}</strong><small>{orderById.get(String(item.mantId))?.nombre||'Sin orden'} · {rows(item.especialidades).join(', ')||workerById.get(String(item.trabId||item.trabajadorId||item.personaId))?.nombre||'Sin destinatario específico'}</small><div className="nk-comms-list-meta"><span>{statusLabel(item.estado||item.status)}</span><span>{Number(item.respondieron||0)}/{Number(item.enviados||0)} respuestas</span></div></button>)}</aside>
   <form className="nk-comms-workspace nk-card" onSubmit={save}><div className="nk-comms-workspace-head"><div><p className="nk-comms-kicker">{creating?'Nueva comunicación':'Detalle'}</p><h2>{creating?'Registrar comunicación':draft.titulo||'Comunicación'}</h2><p>{draft.tipo==='convocatoria'?'Define orden, especialidades, turno, cupos y canal antes de preparar destinatarios.':'Registra el mensaje y su contexto operacional.'}</p></div>{canEdit&&<button className="nk-button nk-button-primary" type="submit" disabled={saving}><IconCheck size={16}/>{saving?'Guardando…':'Guardar cambios'}</button>}</div>
    <div className="nk-comms-form-grid"><label className="nk-field"><span className="nk-label">Tipo</span><select className="nk-select" disabled={!canEdit} value={draft.tipo} onChange={update('tipo')}><option value="convocatoria">Convocatoria</option><option value="comunicacion">Comunicación</option><option value="recordatorio">Recordatorio</option></select></label><label className="nk-field"><span className="nk-label">Estado</span><select className="nk-select" disabled={!canEdit} value={draft.estado} onChange={update('estado')}><option value="pendiente">Pendiente</option><option value="enviado">Enviado</option><option value="confirmado">Confirmado</option><option value="cancelado">Cancelado</option></select></label><label className="nk-field nk-comms-wide"><span className="nk-label">Título</span><input className="nk-input" disabled={!canEdit} required value={draft.titulo} onChange={update('titulo')} placeholder="Convocatoria a turno"/></label><label className="nk-field"><span className="nk-label">Orden de servicio</span><select className="nk-select" disabled={!canEdit} value={draft.mantId} onChange={update('mantId')}><option value="">Sin orden asociada</option>{orders.map(x=><option key={x.id} value={x.id}>{x.codigo?`${x.codigo} · `:''}{x.nombre}</option>)}</select></label><label className="nk-field"><span className="nk-label">Fecha</span><input className="nk-input" type="date" disabled={!canEdit} value={draft.fecha} onChange={update('fecha')}/></label>
    {draft.tipo==='convocatoria'?<><div className="nk-field nk-comms-wide"><span className="nk-label">Especialidades</span><div className="nk-comms-specialties">{specialties.length?specialties.map(item=><label key={item} className={`nk-comms-specialty ${draft.especialidades.includes(item)?'active':''}`}><input type="checkbox" checked={draft.especialidades.includes(item)} onChange={()=>toggleSpecialty(item)} disabled={!canEdit}/><span>{item}</span></label>):<span className="nk-comms-muted">No hay especialidades registradas en Personas.</span>}</div></div><label className="nk-field"><span className="nk-label">Turno</span><select className="nk-select" disabled={!canEdit} value={draft.turno} onChange={update('turno')}><option value="ambos">Ambos</option><option value="dia">Día</option><option value="noche">Noche</option></select></label><label className="nk-field"><span className="nk-label">Cupos</span><input className="nk-input" type="number" min="0" disabled={!canEdit} value={draft.cupos} onChange={updateNumber('cupos')}/></label><label className="nk-field"><span className="nk-label">Canal</span><select className="nk-select" disabled={!canEdit} value={draft.canal} onChange={update('canal')}><option>WhatsApp</option><option>Correo</option><option>WhatsApp y correo</option></select></label><label className="nk-field"><span className="nk-label">Prioridad</span><select className="nk-select" disabled={!canEdit} value={draft.prioridad} onChange={update('prioridad')}><option>Normal</option><option>Alta</option><option>Urgente</option></select></label><label className="nk-field"><span className="nk-label">Responder antes de</span><input className="nk-input" type="datetime-local" disabled={!canEdit} value={draft.responderAntes} onChange={update('responderAntes')}/></label><label className="nk-field"><span className="nk-label">Responsable</span><input className="nk-input" disabled={!canEdit} value={draft.responsable} onChange={update('responsable')} placeholder="Responsable de la convocatoria"/></label><section className="nk-comms-eligible nk-comms-wide"><div><strong>{eligibleWorkers.length} personas elegibles</strong><span>Disponibles, no restringidas, con especialidad requerida, canal de contacto y consentimiento vigente.</span></div>{eligibleWorkers.length>0&&<div className="nk-comms-eligible-list">{eligibleWorkers.slice(0,6).map(worker=><span className="nk-badge nk-badge-none" key={worker.id}>{worker.nombre}</span>)}{eligibleWorkers.length>6&&<span className="nk-badge nk-badge-none">+{eligibleWorkers.length-6}</span>}</div>}</section></>:<label className="nk-field nk-comms-wide"><span className="nk-label">Persona</span><select className="nk-select" disabled={!canEdit} value={draft.trabId} onChange={update('trabId')}><option value="">Sin persona específica</option>{workers.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>}
    <label className="nk-field nk-comms-wide"><span className="nk-label">Mensaje / detalle</span><textarea className="nk-textarea" rows="5" disabled={!canEdit} value={draft.mensaje} onChange={update('mensaje')} placeholder="Información que recibirá o deberá confirmar la persona."/></label>{draft.tipo==='convocatoria'&&canEdit&&<div className="nk-comms-wide"><button className="nk-button nk-button-secondary" type="button" onClick={applyTemplate}>Usar plantilla de convocatoria</button></div>}</div>
    {!creating&&selected&&<><section className="nk-comms-metrics"><article><strong>{Number(selected.enviados||0)}</strong><span>Enviados</span></article><article><strong>{Number(selected.respondieron||0)}</strong><span>Respondieron · {metricRate(selected)}%</span></article><article><strong>{Number(selected.asignados||0)}</strong><span>Asignados</span></article><article><strong>{Number(selected.eligibleCount??rows(selected.recipients).length)}</strong><span>Elegibles preparados</span></article></section><section className="nk-comms-context"><strong>Contexto operacional</strong>{selected.mantId&&orderById.get(String(selected.mantId))?<span>Orden: <Link className="nk-comms-context-link" to={`/app/servicios/${selected.mantId}`}>{orderById.get(String(selected.mantId))?.codigo?`${orderById.get(String(selected.mantId)).codigo} · `:''}{orderById.get(String(selected.mantId))?.nombre}</Link></span>:<span>Orden: Sin orden asociada</span>}<span>Especialidades: {rows(selected.especialidades).join(', ')||'No aplica'}</span><span>Turno: {selected.turno||'No informado'}</span></section></>}
   </form>
  </div>
 </section>
}
