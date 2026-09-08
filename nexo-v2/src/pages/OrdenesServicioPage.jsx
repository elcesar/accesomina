import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconCheck, IconPlus, IconRefresh, IconSearch, IconUsers } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/ordenes-servicio.css'

const rows = value => Array.isArray(value) ? value : []
const newId = () => globalThis.crypto?.randomUUID?.() || `orden-${Date.now()}-${Math.random().toString(16).slice(2)}`
const emptyOrder = () => ({ nombre:'', codigo:'', minaId:'', contratoId:'', inicio:'', termino:'', estado:'activo', responsable:'', descripcion:'' })
const editableRoles = new Set(['domian_admin','client_admin'])

export default function OrdenesServicioPage() {
  const { session } = useAuth()
  const { orderId } = useParams()
  const navigate = useNavigate()
  const canEdit = editableRoles.has(session?.user?.role)
  const [response,setResponse] = useState(null)
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [selectedId,setSelectedId] = useState(null)
  const [creating,setCreating] = useState(false)
  const [draft,setDraft] = useState(emptyOrder)
  const [search,setSearch] = useState('')
  const [statusFilter,setStatusFilter] = useState('')
  const [message,setMessage] = useState('')
  const [messageTone,setMessageTone] = useState('')

  async function load(){setLoading(true);setMessage('');setMessageTone('');try{setResponse(await api.get('/state'))}catch{setMessage('No fue posible cargar las órdenes de servicio.');setMessageTone('error')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])

  const state=response?.state||response||{}
  const orders=useMemo(()=>rows(state.mantenciones),[state.mantenciones])
  const clients=useMemo(()=>{const canonical=rows(state.minas);return canonical.length||state.minas?canonical:rows(state.clientes)},[state.minas,state.clientes])
  const contracts=useMemo(()=>rows(state.contratos),[state.contratos])
  const assignments=useMemo(()=>rows(state.asignaciones),[state.asignaciones])
  const workers=useMemo(()=>rows(state.trabajadores),[state.trabajadores])
  const clientById=useMemo(()=>new Map(clients.map(x=>[String(x.id),x])),[clients])
  const contractById=useMemo(()=>new Map(contracts.map(x=>[String(x.id),x])),[contracts])
  const workerById=useMemo(()=>new Map(workers.map(x=>[String(x.id),x])),[workers])
  const assignmentCount=useMemo(()=>{const map=new Map();assignments.forEach(a=>map.set(String(a.mantId),(map.get(String(a.mantId))||0)+1));return map},[assignments])
  const visible=useMemo(()=>{const term=search.trim().toLowerCase();return orders.filter(order=>{if(statusFilter&&(order.estado||'activo')!==statusFilter)return false;if(!term)return true;const client=clientById.get(String(order.minaId));const contract=contractById.get(String(order.contratoId));return [order.codigo,order.nombre,order.descripcion,order.responsable,client?.nombre,contract?.nombre,contract?.numero].filter(Boolean).some(v=>String(v).toLowerCase().includes(term))})},[orders,search,statusFilter,clientById,contractById])
  const selected=orders.find(x=>String(x.id)===String(selectedId))||null
  const assignedWorkers=selected?assignments.filter(a=>String(a.mantId)===String(selected.id)).map(a=>workerById.get(String(a.trabId))).filter(Boolean):[]
  const activeCount=orders.filter(x=>!['cerrado','finalizado','cancelado'].includes(String(x.estado||'activo'))).length
  const pendingCount=orders.filter(x=>/pendiente|revision|brecha/i.test(String(x.estado||''))).length

  useEffect(()=>{if(!orders.length){setSelectedId(null);if(!creating)setDraft(emptyOrder());return}const requested=orderId?orders.find(x=>String(x.id)===String(orderId)):null;const current=requested||orders.find(x=>String(x.id)===String(selectedId))||orders[0];if(String(current.id)!==String(selectedId))setSelectedId(current.id);if(!creating)setDraft({...emptyOrder(),...current})},[orders,orderId,selectedId,creating])

  const update=key=>event=>setDraft(current=>({...current,[key]:event.target.value}))
  const selectOrder=id=>{setCreating(false);setSelectedId(id);setMessage('');navigate(`/app/servicios/${encodeURIComponent(id)}`)}
  const availableContracts=contracts.filter(contract=>!draft.minaId||String(contract.minaId)===String(draft.minaId))

  async function save(event){event.preventDefault();if(!canEdit)return;if(draft.nombre.trim().length<2||!draft.minaId){setMessage('Indica el nombre de la orden y el cliente asociado.');setMessageTone('error');return}if(draft.inicio&&draft.termino&&draft.termino<draft.inicio){setMessage('La fecha de término no puede ser anterior a la fecha de inicio.');setMessageTone('error');return}const relatedContract=draft.contratoId?contractById.get(String(draft.contratoId)):null;if(relatedContract?.minaId&&String(relatedContract.minaId)!==String(draft.minaId)){setMessage('El contrato seleccionado pertenece a otro cliente.');setMessageTone('error');return}setSaving(true);setMessage('');try{const id=creating?(draft.id||newId()):selectedId;const saved={...draft,id,nombre:draft.nombre.trim(),codigo:draft.codigo.trim(),responsable:draft.responsable.trim(),descripcion:draft.descripcion.trim(),updatedAt:new Date().toISOString(),...(creating?{createdAt:draft.createdAt||new Date().toISOString()}:{})};const next=creating?[...orders,saved]:orders.map(item=>String(item.id)===String(id)?saved:item);const result=await api.put('/state/modules',{changes:{mantenciones:{version:Number(response?.moduleVersions?.mantenciones||0),data:next}},reason:creating?'Orden de servicio creada desde Relación Comercial':'Orden de servicio actualizada desde Relación Comercial'});setResponse(current=>({...(current||{}),state:{...(current?.state||current||{}),mantenciones:next},moduleVersions:{...(current?.moduleVersions||{}),...result.moduleVersions}}));setSelectedId(id);setCreating(false);setDraft(saved);navigate(`/app/servicios/${encodeURIComponent(id)}`,{replace:true});setMessage(creating?'Orden de servicio creada.':'Cambios guardados con trazabilidad.');setMessageTone('ok')}catch(error){setMessage(error.message||'No fue posible guardar la orden de servicio.');setMessageTone('error')}finally{setSaving(false)}}

  return <section className="nk-orders-page">
    <header className="nk-orders-header"><div><p className="nk-orders-kicker">Relación comercial · Planificación de trabajo</p><h1>Órdenes de servicio</h1><p>Gestiona el ciclo de cada orden con responsables, relaciones y personas asignadas.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button>{canEdit&&<button className="nk-button nk-button-primary" type="button" onClick={()=>{setCreating(true);setSelectedId(null);setDraft({...emptyOrder(),id:newId()});navigate('/app/servicios')}}><IconPlus size={16}/>Nueva orden</button>}</div></header>
    {message&&<div className={`nk-orders-feedback ${messageTone}`}>{message}</div>}
    <section className="nk-orders-summary"><article><b>{orders.length}</b><span>Órdenes</span></article><article><b>{activeCount}</b><span>En ejecución / activas</span></article><article><b>{pendingCount}</b><span>Requieren revisión</span></article><article><b>{assignments.length}</b><span>Asignaciones de personas</span></article></section>
    <div className="nk-orders-layout">
      <aside className="nk-orders-list nk-card"><div className="nk-orders-list-head"><strong>Órdenes registradas</strong><span className="nk-badge nk-badge-none">{visible.length}/{orders.length}</span></div><div className="nk-orders-filters"><label className="nk-search"><IconSearch size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar orden..." aria-label="Buscar orden de servicio"/></label><select className="nk-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filtrar por estado"><option value="">Todos los estados</option><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="en_revision">En revisión</option><option value="cerrado">Cerrado</option><option value="cancelado">Cancelado</option></select></div>{loading?<div className="nk-orders-empty">Cargando órdenes…</div>:!visible.length?<div className="nk-orders-empty">No hay órdenes para mostrar.</div>:visible.map(order=>{const client=clientById.get(String(order.minaId));return <button type="button" className={`nk-orders-list-item ${String(order.id)===String(selectedId)&&!creating?'active':''}`} key={order.id} onClick={()=>selectOrder(order.id)}><span><strong>{order.codigo||order.nombre}</strong><small>{order.nombre}</small><small>{client?.nombre||'Sin cliente'} · {order.estado||'activo'} · {assignmentCount.get(String(order.id))||0} personas</small></span></button>})}</aside>
      <form className="nk-orders-workspace nk-card" onSubmit={save}><div className="nk-orders-workspace-head"><div><p className="nk-orders-kicker">{creating?'Crear orden':'Ficha de la orden'}</p><h2>{creating?'Nueva orden de servicio':draft.nombre||'Orden sin nombre'}</h2><p>Crear orden → completar requisitos → asignar recursos → registrar cierre.</p></div>{canEdit&&<button className="nk-button nk-button-primary" disabled={saving}><IconCheck size={16}/>{saving?'Guardando…':'Guardar cambios'}</button>}</div>
        <div className="nk-orders-form-grid"><label className="nk-field"><span className="nk-label">Código</span><input className="nk-input" disabled={!canEdit} value={draft.codigo} onChange={update('codigo')} placeholder="OS-2026-001"/></label><label className="nk-field"><span className="nk-label">Estado</span><select className="nk-select" disabled={!canEdit} value={draft.estado} onChange={update('estado')}><option value="activo">Activo</option><option value="pendiente">Pendiente</option><option value="en_revision">En revisión</option><option value="cerrado">Cerrado</option><option value="cancelado">Cancelado</option></select></label><label className="nk-field nk-orders-wide"><span className="nk-label">Nombre o código de la orden</span><input className="nk-input" required disabled={!canEdit} value={draft.nombre} onChange={update('nombre')} placeholder="Mantención preventiva julio"/></label><label className="nk-field"><span className="nk-label">Cliente</span><select className="nk-select" required disabled={!canEdit} value={draft.minaId} onChange={e=>setDraft(current=>({...current,minaId:e.target.value,contratoId:current.contratoId&&contracts.some(c=>String(c.id)===String(current.contratoId)&&String(c.minaId)===String(e.target.value))?current.contratoId:''}))}><option value="">Seleccionar cliente…</option>{clients.map(client=><option key={client.id} value={client.id}>{client.nombre}</option>)}</select></label><label className="nk-field"><span className="nk-label">Contrato</span><select className="nk-select" disabled={!canEdit||!draft.minaId} value={draft.contratoId} onChange={update('contratoId')}><option value="">Sin contrato asociado</option>{availableContracts.map(contract=><option key={contract.id} value={contract.id}>{contract.numero||contract.nombre}</option>)}</select></label><label className="nk-field"><span className="nk-label">Inicio</span><input className="nk-input" type="date" disabled={!canEdit} value={draft.inicio} onChange={update('inicio')}/></label><label className="nk-field"><span className="nk-label">Término</span><input className="nk-input" type="date" disabled={!canEdit} value={draft.termino} onChange={update('termino')}/></label><label className="nk-field nk-orders-wide"><span className="nk-label">Responsable</span><input className="nk-input" disabled={!canEdit} value={draft.responsable} onChange={update('responsable')} placeholder="Persona o equipo responsable"/></label><label className="nk-field nk-orders-wide"><span className="nk-label">Trabajo y alcance</span><textarea className="nk-textarea" rows="4" disabled={!canEdit} value={draft.descripcion} onChange={update('descripcion')} placeholder="Indica el trabajo que se realizará y su alcance."/></label></div>
        {!creating&&selected&&<section className="nk-orders-relations"><div><strong>Relaciones comerciales</strong><span>Cliente y contrato asociados a esta orden.</span><div className="nk-orders-links"><button type="button" className="nk-link" onClick={()=>navigate(`/app/clientes/${encodeURIComponent(selected.minaId)}`)}>{clientById.get(String(selected.minaId))?.nombre||'Cliente no disponible'}</button>{selected.contratoId&&<button type="button" className="nk-link" onClick={()=>navigate(`/app/contratos/${encodeURIComponent(selected.contratoId)}`)}>{contractById.get(String(selected.contratoId))?.numero||contractById.get(String(selected.contratoId))?.nombre||'Contrato asociado'}</button>}</div></div><div><strong><IconUsers size={16}/> Personas asignadas</strong><span>{assignedWorkers.length?assignedWorkers.map(x=>x.nombre).join(', '):'Sin personas asignadas todavía.'}</span><small>Las asignaciones se conservan en la fuente funcional asignaciones mediante mantId.</small></div></section>}
      </form>
    </div>
  </section>
}
