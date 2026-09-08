import { useEffect, useMemo, useState } from 'react'
import { IconBuilding, IconCheck, IconFileText, IconLoader2, IconMail, IconMapPin, IconPhone, IconPlus, IconRefresh, IconTrash, IconUser } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

const emptyClient = () => ({ nombre:'', mandante:'', rut:'', region:'', comuna:'', telefonoMandante:'', emailMandante:'', observacion:'', estado:'activo', contactos:[], requisitos:[] })
const newId = () => globalThis.crypto?.randomUUID?.() || `cliente-${Date.now()}-${Math.random().toString(16).slice(2)}`
const rows = value => Array.isArray(value) ? value : []
const summary = (label, value) => <div className="nk-client-summary-field"><span>{label}</span><b>{value || 'Sin registrar'}</b></div>

function ContactForm({ onAdd, disabled }) {
  const [contact, setContact] = useState({ nombre:'', cargo:'', telefono:'', email:'' })
  const change = key => event => setContact(current => ({ ...current, [key]:event.target.value }))
  const submit = () => {
    if (contact.nombre.trim().length < 3) return
    onAdd({ ...contact, id:newId(), nombre:contact.nombre.trim(), cargo:contact.cargo.trim(), telefono:contact.telefono.trim(), email:contact.email.trim(), tipo:'operativo' })
    setContact({ nombre:'', cargo:'', telefono:'', email:'' })
  }
  return <div className="nk-client-contact-form">
    <label>Nombre<input required disabled={disabled} value={contact.nombre} onChange={change('nombre')} placeholder="Nombre y apellido" /></label>
    <label>Cargo<input disabled={disabled} value={contact.cargo} onChange={change('cargo')} placeholder="Operaciones, compras..." /></label>
    <label>Teléfono<input disabled={disabled} value={contact.telefono} onChange={change('telefono')} placeholder="+56 9..." /></label>
    <label>Correo<input type="email" disabled={disabled} value={contact.email} onChange={change('email')} placeholder="contacto@empresa.cl" /></label>
    <button type="button" className="nk-button nk-button-secondary" disabled={disabled} onClick={submit}><IconPlus size={15}/>Agregar contacto</button>
  </div>
}

export default function ClientesPage() {
  const { session } = useAuth()
  const canEdit = session?.user?.role !== 'consulta'
  const [response, setResponse] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(emptyClient)
  const [newRequirement, setNewRequirement] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true); setMessage('')
    try { setResponse(await api.get('/state')) }
    catch { setMessage('No fue posible cargar los clientes. Revisa tu conexión e inténtalo nuevamente.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const clients = useMemo(() => rows(state.minas || state.clientes), [state])
  const selected = clients.find(client => String(client.id) === String(selectedId)) || null
  const contracts = useMemo(() => rows(state.contratos), [state])
  const orders = useMemo(() => rows(state.mantenciones || state.proyectos), [state])

  useEffect(() => {
    if (!clients.length) { setSelectedId(null); if (!creating) setDraft(emptyClient()); return }
    const current = clients.find(client => String(client.id) === String(selectedId)) || clients[0]
    if (String(current.id) !== String(selectedId)) setSelectedId(current.id)
    if (!creating) setDraft({ ...emptyClient(), ...current, contactos:rows(current.contactos), requisitos:rows(current.requisitos) })
  }, [clients, selectedId, creating])

  const relatedContracts = selected ? contracts.filter(item => String(item.minaId) === String(selected.id)) : []
  const relatedOrders = selected ? orders.filter(item => String(item.minaId) === String(selected.id)) : []
  const update = key => event => setDraft(current => ({ ...current, [key]:event.target.value }))
  const save = async event => {
    event.preventDefault()
    if (!canEdit || draft.nombre.trim().length < 2) return setMessage('Indica el nombre o razón social del cliente.')
    const duplicate = clients.find(item => String(item.id) !== String(selectedId) && item.nombre?.trim().toLowerCase() === draft.nombre.trim().toLowerCase() && (item.mandante || '').trim().toLowerCase() === draft.mandante.trim().toLowerCase())
    if (duplicate) return setMessage('Ya existe un cliente con el mismo nombre y organización relacionada.')
    setSaving(true); setMessage('')
    try {
      const id = creating ? newId() : selectedId
      const saved = { ...draft, id, nombre:draft.nombre.trim(), mandante:draft.mandante.trim(), rut:draft.rut.trim(), region:draft.region.trim(), comuna:draft.comuna.trim(), telefonoMandante:draft.telefonoMandante.trim(), emailMandante:draft.emailMandante.trim(), observacion:draft.observacion.trim(), contactos:rows(draft.contactos), requisitos:rows(draft.requisitos), updatedAt:new Date().toISOString(), ...(creating ? { createdAt:new Date().toISOString() } : {}) }
      const next = creating ? [...clients, saved] : clients.map(item => String(item.id) === String(id) ? saved : item)
      const result = await api.put('/state/modules', { changes:{ minas:{ version:Number(response?.moduleVersions?.minas || 0), data:next } }, reason:creating ? 'Cliente creado desde ficha comercial' : 'Ficha comercial del cliente actualizada' })
      setResponse(current => ({ ...(current || {}), state:{ ...(current?.state || current || {}), minas:next }, moduleVersions:{ ...(current?.moduleVersions || {}), ...result.moduleVersions } }))
      setSelectedId(id); setCreating(false); setDraft(saved); setMessage(creating ? 'Cliente creado y disponible para contratos y órdenes de servicio.' : 'Cambios guardados con trazabilidad.')
    } catch (error) { setMessage(error.message || 'No fue posible guardar. Actualiza la información e inténtalo nuevamente.') }
    finally { setSaving(false) }
  }
  const addContact = contact => setDraft(current => ({ ...current, contactos:[...rows(current.contactos), contact] }))
  const removeContact = id => setDraft(current => ({ ...current, contactos:rows(current.contactos).filter(contact => contact.id !== id) }))
  const addRequirement = () => {
    const name = newRequirement.trim()
    if (!name || rows(draft.requisitos).some(item => item.nombre?.toLowerCase() === name.toLowerCase())) return
    setDraft(current => ({ ...current, requisitos:[...rows(current.requisitos), { id:newId(), nombre:name, estado:'pendiente' }] })); setNewRequirement('')
  }
  const removeRequirement = id => setDraft(current => ({ ...current, requisitos:rows(current.requisitos).filter(item => item.id !== id) }))

  return <section className="nk-client-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Relación comercial</p><h1>Clientes</h1><p>Centraliza la ficha comercial, contactos, requisitos y el historial operativo de cada cliente.</p></div><div className="nk-module-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load}><IconRefresh size={16}/>Actualizar</button>{canEdit && <button className="nk-button nk-button-primary" type="button" onClick={() => { setCreating(true); setSelectedId(null); setDraft(emptyClient()); setMessage('') }}><IconPlus size={16}/>Nuevo cliente</button>}</div></header>
    {message && <p className={`nk-client-message ${message.includes('No fue') || message.includes('Indica') || message.includes('Ya existe') ? 'error' : ''}`}>{message}</p>}
    <div className="nk-client-layout">
      <aside className="nk-client-list"><div className="nk-client-list-head"><b>Clientes registrados</b><span>{clients.length}</span></div>{loading ? <p>Cargando clientes...</p> : clients.length === 0 ? <p>Aún no hay clientes. Crea el primero para iniciar contratos y órdenes de servicio.</p> : clients.map(client => <button type="button" key={client.id} className={String(client.id) === String(selectedId) && !creating ? 'active' : ''} onClick={() => { setCreating(false); setSelectedId(client.id); setMessage('') }}><IconBuilding size={17}/><span><b>{client.nombre}</b><small>{client.mandante || client.region || 'Sin organización relacionada'}</small></span></button>)}</aside>
      <form className="nk-client-workspace" onSubmit={save}>
        <div className="nk-client-workspace-head"><div><p className="nk-module-kicker">{creating ? 'Nuevo cliente' : 'Ficha del cliente'}</p><h2>{creating ? 'Registra la relación comercial' : draft.nombre || 'Cliente sin nombre'}</h2><p>{creating ? 'Completa lo esencial; podrás ampliar la ficha después.' : 'Los cambios se conservan con historial dentro de la empresa.'}</p></div>{canEdit && <button className="nk-button nk-button-primary" disabled={saving}>{saving ? <IconLoader2 className="nk-spin" size={16}/> : <IconCheck size={16}/>} {saving ? 'Guardando...' : 'Guardar cambios'}</button>}</div>
        <div className="nk-client-form-grid">
          <label>Nombre o razón social<input required disabled={!canEdit} value={draft.nombre} onChange={update('nombre')} placeholder="Empresa de servicios SpA" /></label><label>Organización relacionada<input disabled={!canEdit} value={draft.mandante} onChange={update('mandante')} placeholder="Grupo, matriz o cliente principal" /></label><label>RUT<input disabled={!canEdit} value={draft.rut} onChange={update('rut')} placeholder="76.123.456-7" /></label><label>Estado<select disabled={!canEdit} value={draft.estado} onChange={update('estado')}><option value="activo">Activo</option><option value="prospecto">Prospecto</option><option value="inactivo">Inactivo</option></select></label><label>Región<input disabled={!canEdit} value={draft.region} onChange={update('region')} placeholder="Región" /></label><label>Comuna o ciudad<input disabled={!canEdit} value={draft.comuna} onChange={update('comuna')} placeholder="Comuna o ciudad" /></label><label><IconPhone size={14}/> Teléfono central<input disabled={!canEdit} value={draft.telefonoMandante} onChange={update('telefonoMandante')} placeholder="+56 9..." /></label><label><IconMail size={14}/> Correo central<input type="email" disabled={!canEdit} value={draft.emailMandante} onChange={update('emailMandante')} placeholder="contacto@empresa.cl" /></label><label className="wide">Condiciones y observaciones<textarea disabled={!canEdit} value={draft.observacion} onChange={update('observacion')} rows="3" placeholder="Condiciones comerciales, forma de trabajo, restricciones o antecedentes relevantes." /></label>
        </div>
        {!creating && <section className="nk-client-summary"><div>{summary('Contratos vinculados', relatedContracts.length)}{summary('Órdenes de servicio', relatedOrders.length)}</div><div>{summary('Contactos registrados', rows(draft.contactos).length)}{summary('Requisitos configurados', rows(draft.requisitos).length)}</div></section>}
        <section className="nk-client-section"><header><div><h3><IconUser size={17}/>Contactos y responsables</h3><p>Personas que participan en la relación comercial u operativa.</p></div></header><ContactForm disabled={!canEdit} onAdd={addContact}/><div className="nk-client-contact-list">{rows(draft.contactos).length ? rows(draft.contactos).map(contact => <article key={contact.id}><div><b>{contact.nombre}</b><span>{[contact.cargo, contact.telefono, contact.email].filter(Boolean).join(' · ') || 'Sin información complementaria'}</span></div>{canEdit && <button type="button" className="nk-icon-button" onClick={() => removeContact(contact.id)} aria-label={`Eliminar a ${contact.nombre}`}><IconTrash size={16}/></button>}</article>) : <p>Agrega contactos para asignar responsables y comunicarte desde la operación.</p>}</div></section>
        <section className="nk-client-section"><header><div><h3><IconFileText size={17}/>Requisitos del cliente</h3><p>Documentos, condiciones o validaciones que se aplican a sus contratos y órdenes.</p></div></header><div className="nk-client-requirement-add"><input disabled={!canEdit} value={newRequirement} onChange={event => setNewRequirement(event.target.value)} placeholder="Ej.: Certificado de seguro vigente" /><button type="button" className="nk-button nk-button-secondary" disabled={!canEdit} onClick={addRequirement}><IconPlus size={15}/>Agregar</button></div><div className="nk-client-tags">{rows(draft.requisitos).map(item => <span key={item.id}>{item.nombre}{canEdit && <button type="button" onClick={() => removeRequirement(item.id)} aria-label={`Quitar ${item.nombre}`}>×</button>}</span>)}{!rows(draft.requisitos).length && <p>Sin requisitos adicionales configurados.</p>}</div></section>
        {!creating && <section className="nk-client-section"><header><div><h3><IconMapPin size={17}/>Relación operativa</h3><p>Vínculos que alimentan la ejecución, el cumplimiento y los reportes.</p></div></header><div className="nk-client-relations"><article><b>Contratos</b>{relatedContracts.length ? relatedContracts.slice(0,4).map(item => <span key={item.id}>{item.numero || item.nombre || 'Contrato sin nombre'}</span>) : <span>Sin contratos vinculados.</span>}</article><article><b>Órdenes de servicio</b>{relatedOrders.length ? relatedOrders.slice(0,4).map(item => <span key={item.id}>{item.nombre || item.codigo || 'Orden sin nombre'}</span>) : <span>Sin órdenes de servicio vinculadas.</span>}</article></div></section>}
      </form>
    </div>
  </section>
}
