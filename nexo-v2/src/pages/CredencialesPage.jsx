import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconCheck, IconId, IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/credenciales.css'

const rows=value=>Array.isArray(value)?value:[]
const normalize=value=>String(value||'').trim().toLowerCase()
const newId=()=>globalThis.crypto?.randomUUID?.()||`credencial-${Date.now()}-${Math.random().toString(16).slice(2)}`
const editors=new Set(['domian_admin','client_admin','rrhh','acreditacion'])
const emptyDraft=()=>({trabId:'',minaId:'',tipo:'digital',numero:'',emision:'',vence:'',zona:'',campamento:'no',estado:'pendiente',observacion:'',evidenceFiles:[]})

function dateState(value){
 if(!value)return'falta'
 const today=new Date();today.setHours(0,0,0,0)
 const date=new Date(`${value}T00:00:00`)
 if(Number.isNaN(date.getTime()))return'falta'
 const days=Math.ceil((date-today)/86400000)
 if(days<0)return'vencido'
 if(days<=30)return'proximo'
 return'vigente'
}
const stateLabel=value=>({vigente:'Vigente',proximo:'Por vencer',vencido:'Vencida',falta:'Sin vencimiento'}[value]||value)

export default function CredencialesPage(){
 const {session}=useAuth();const canEdit=editors.has(session?.user?.role)
 const [response,setResponse]=useState(null);const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false)
 const [selectedId,setSelectedId]=useState(null);const [creating,setCreating]=useState(false);const [draft,setDraft]=useState(emptyDraft)
 const [search,setSearch]=useState('');const [clientFilter,setClientFilter]=useState('');const [stateFilter,setStateFilter]=useState('')
 const [message,setMessage]=useState('');const [messageTone,setMessageTone]=useState('')
 async function load(){setLoading(true);setMessage('');try{setResponse(await api.get('/state'))}catch{setMessage('No fue posible cargar las credenciales.');setMessageTone('error')}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const state=response?.state||response||{}
 const credentials=useMemo(()=>rows(state.credenciales),[state.credenciales])
 const workers=useMemo(()=>rows(state.trabajadores),[state.trabajadores])
 const clients=useMemo(()=>{const canonical=rows(state.minas);return canonical.length||state.minas?canonical:rows(state.clientes)},[state.minas,state.clientes])
 const workerById=useMemo(()=>new Map(workers.map(x=>[String(x.id),x])),[workers])
 const clientById=useMemo(()=>new Map(clients.map(x=>[String(x.id),x])),[clients])
 const visible=useMemo(()=>{const term=normalize(search);return credentials.filter(item=>{if(clientFilter&&String(item.minaId)!==String(clientFilter))return false;const currentState=dateState(item.vence);if(stateFilter&&currentState!==stateFilter)return false;if(!term)return true;const worker=workerById.get(String(item.trabId));const client=clientById.get(String(item.minaId));return[worker?.nombre,worker?.rut,client?.nombre,item.tipo,item.numero,item.zona].filter(Boolean).some(v=>normalize(v).includes(term))})},[credentials,search,clientFilter,stateFilter,workerById,clientById])
 const selected=credentials.find(x=>String(x.id)===String(selectedId))||null
 const vigente=credentials.filter(x=>dateState(x.vence)==='vigente').length
 const proximo=credentials.filter(x=>dateState(x.vence)==='proximo').length
 const noHabilitadas=credentials.filter(x=>['vencido','falta'].includes(dateState(x.vence))).length
 const update=key=>event=>setDraft(current=>({...current,[key]:event.target.value}))
 const openItem=item=>{setCreating(false);setSelectedId(item.id);setDraft({...emptyDraft(),...item,evidenceFiles:rows(item.evidenceFiles)});setMessage('');setMessageTone('')}
 const startCreate=()=>{setCreating(true);setSelectedId(null);setDraft({...emptyDraft(),id:newId(),emision:new Date().toISOString().slice(0,10)});setMessage('');setMessageTone('')}
 const closeDetail=()=>{setCreating(false);setSelectedId(null);setDraft(emptyDraft())}
 async function save(event){
  event.preventDefault();if(!canEdit)return
  if(!draft.trabId||!draft.minaId){setMessage('Selecciona persona y cliente/faena.');setMessageTone('error');return}
  if(draft.numero&&credentials.some(x=>String(x.id)!==String(selectedId)&&String(x.minaId)===String(draft.minaId)&&normalize(x.numero)===normalize(draft.numero))){setMessage('Ya existe una credencial con ese número para el cliente seleccionado.');setMessageTone('error');return}
  if(draft.emision&&draft.vence&&draft.emision>draft.vence){setMessage('El vencimiento no puede ser anterior a la emisión.');setMessageTone('error');return}
  setSaving(true);setMessage('')
  try{
   const id=creating?(draft.id||newId()):selectedId;const now=new Date().toISOString()
   const saved={...draft,id,numero:draft.numero.trim(),zona:draft.zona.trim(),observacion:draft.observacion.trim(),estado:dateState(draft.vence),evidenceFiles:rows(draft.evidenceFiles),updatedAt:now,...(creating?{createdAt:draft.createdAt||now}:{})}
   const next=creating?[...credentials,saved]:credentials.map(x=>String(x.id)===String(id)?saved:x)
   const result=await api.put('/state/modules',{reason:creating?'Credencial creada':'Credencial actualizada',changes:{credenciales:{version:Number(response?.moduleVersions?.credenciales||0),data:next}}})
   setResponse(current=>({...(current||{}),state:{...(current?.state||current||{}),credenciales:next},moduleVersions:{...(current?.moduleVersions||{}),...result.moduleVersions}}))
   setSelectedId(id);setCreating(false);setDraft(saved);setMessage(creating?'Credencial registrada.':'Cambios guardados con trazabilidad.');setMessageTone('ok')
  }catch(error){setMessage(error.message||'No fue posible guardar la credencial.');setMessageTone('error')}finally{setSaving(false)}
 }
 const selectedWorker=workerById.get(String(draft.trabId||''));const selectedClient=clientById.get(String(draft.minaId||''))
 return <section className="nk-credentials-page">
  <header className="nk-credentials-header"><div><h1>Credenciales y pases de acceso</h1><p>Controla pases por persona, cliente/faena, zona autorizada y vigencia.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button>{canEdit&&<button className="nk-button nk-button-primary" type="button" onClick={startCreate}><IconPlus size={16}/>Nueva credencial</button>}</div></header>
  {message&&<div className={`nk-credentials-feedback ${messageTone}`}>{message}</div>}
  <section className="nk-credentials-filters nk-card"><label className="nk-search"><IconSearch size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Persona, pase, QR o zona..."/></label><select className="nk-select" value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="">Todos los clientes/faenas</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre||c.mandante||c.id}</option>)}</select><select className="nk-select" value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="">Todos los estados</option><option value="vigente">Vigente</option><option value="proximo">Por vencer</option><option value="vencido">Vencida</option><option value="falta">Sin vencimiento</option></select></section>
  <section className="nk-credentials-summary"><article><IconId size={18}/><b>{credentials.length}</b><span>Pases</span></article><article><b>{vigente}</b><span>Vigentes</span></article><article><b>{proximo}</b><span>Por vencer en 30 días</span></article><article><b>{noHabilitadas}</b><span>No habilitadas</span></article></section>
  <section className="nk-card nk-credentials-table-card"><div className="nk-credentials-section-head"><div><strong>Credenciales registradas</strong><small>{visible.length} de {credentials.length} registros</small></div></div><div className="nk-table-wrapper"><table className="nk-table nk-credentials-table"><thead><tr><th>Persona</th><th>Cliente / faena</th><th>Pase / zona</th><th>Emisión</th><th>Vencimiento</th><th>Campamento</th><th>Estado</th><th>Respaldo</th><th/></tr></thead><tbody>{loading?<tr><td colSpan="9">Cargando…</td></tr>:!visible.length?<tr><td colSpan="9">Sin credenciales para mostrar.</td></tr>:visible.map(item=>{const worker=workerById.get(String(item.trabId));const client=clientById.get(String(item.minaId));const currentState=dateState(item.vence);return <tr key={item.id}><td>{worker?<Link className="nk-context-link" to={`/app/trabajadores/${encodeURIComponent(worker.id)}`}>{worker.nombre||worker.rut||worker.id}</Link>:item.trabId||'—'}</td><td>{client?<Link className="nk-context-link" to={`/app/clientes/${encodeURIComponent(client.id)}`}>{client.nombre||client.id}</Link>:item.minaId||'—'}</td><td><strong>{item.tipo||'Pase'} · {item.numero||'—'}</strong><small>{item.zona||'Sin zona definida'}</small></td><td>{item.emision||'—'}</td><td>{item.vence||'—'}</td><td>{item.campamento==='si'?'Sí':'No'}</td><td><span className={`nk-credential-state ${currentState}`}>{stateLabel(currentState)}</span></td><td>{rows(item.evidenceFiles).length?<span className="nk-badge nk-badge-none">{rows(item.evidenceFiles).length} archivo(s)</span>:<span className="nk-credentials-muted">Sin respaldo</span>}</td><td><button className="nk-button nk-button-secondary nk-button-sm" type="button" onClick={()=>openItem(item)}>Abrir ficha</button></td></tr>})}</tbody></table></div></section>
  {(creating||selected)&&<form className="nk-card nk-credentials-workspace" onSubmit={save}><div className="nk-credentials-workspace-head"><div><p className="nk-credentials-kicker">{creating?'Nueva credencial':'Ficha'}</p><h2>{creating?'Registrar credencial':`${selectedWorker?.nombre||'Persona'} · ${draft.numero||draft.tipo||'Credencial'}`}</h2></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={closeDetail}>Cerrar</button>{canEdit&&<button className="nk-button nk-button-primary" type="submit" disabled={saving}><IconCheck size={16}/>{saving?'Guardando…':'Guardar cambios'}</button>}</div></div><div className="nk-credentials-form-grid"><label className="nk-field"><span className="nk-label">Persona</span><select className="nk-select" disabled={!canEdit} value={draft.trabId} onChange={update('trabId')}><option value="">Seleccionar persona</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre||w.rut||w.id}</option>)}</select></label><label className="nk-field"><span className="nk-label">Cliente / faena</span><select className="nk-select" disabled={!canEdit} value={draft.minaId} onChange={update('minaId')}><option value="">Seleccionar cliente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre||c.mandante||c.id}</option>)}</select></label><label className="nk-field"><span className="nk-label">Tipo</span><select className="nk-select" disabled={!canEdit} value={draft.tipo} onChange={update('tipo')}><option value="fisico">Físico</option><option value="digital">Digital</option><option value="QR">QR</option><option value="temporal">Temporal</option></select></label><label className="nk-field"><span className="nk-label">Número / QR</span><input className="nk-input" disabled={!canEdit} value={draft.numero} onChange={update('numero')}/></label><label className="nk-field"><span className="nk-label">Emisión</span><input className="nk-input" type="date" disabled={!canEdit} value={draft.emision} onChange={update('emision')}/></label><label className="nk-field"><span className="nk-label">Vencimiento</span><input className="nk-input" type="date" disabled={!canEdit} value={draft.vence} onChange={update('vence')}/></label><label className="nk-field nk-credentials-wide"><span className="nk-label">Zona autorizada</span><input className="nk-input" disabled={!canEdit} value={draft.zona} onChange={update('zona')} placeholder="Portería, planta, casino..."/></label><label className="nk-field"><span className="nk-label">Acceso campamento</span><select className="nk-select" disabled={!canEdit} value={draft.campamento} onChange={update('campamento')}><option value="no">No</option><option value="si">Sí</option></select></label><label className="nk-field"><span className="nk-label">Estado calculado</span><div className="nk-credentials-readonly">{stateLabel(dateState(draft.vence))}</div></label><label className="nk-field nk-credentials-wide"><span className="nk-label">Observación</span><textarea className="nk-textarea" rows="3" disabled={!canEdit} value={draft.observacion} onChange={update('observacion')}/></label></div><section className="nk-credentials-context"><strong>Contexto operacional</strong><span>Persona: {selectedWorker?<Link className="nk-context-link" to={`/app/trabajadores/${encodeURIComponent(selectedWorker.id)}`}>{selectedWorker.nombre||selectedWorker.id}</Link>:'Sin selección'}</span><span>Cliente/faena: {selectedClient?<Link className="nk-context-link" to={`/app/clientes/${encodeURIComponent(selectedClient.id)}`}>{selectedClient.nombre||selectedClient.id}</Link>:'Sin selección'}</span><span>Respaldo actual: {rows(draft.evidenceFiles).length} archivo(s)</span></section></form>}
 </section>
}
