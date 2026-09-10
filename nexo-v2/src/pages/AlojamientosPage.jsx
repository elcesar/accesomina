import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBed, IconCheck, IconPlus, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/alojamientos.css'

const rows = value => Array.isArray(value) ? value : []
const newId = prefix => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const hotelEditors = new Set(['domian_admin', 'client_admin'])
const assignmentEditors = new Set(['domian_admin', 'client_admin', 'rrhh'])
const emptyHotel = () => ({ nombre: '', ciudad: '', direccion: '', contacto: '', telefono: '', minaIds: [], rooms: [] })
const emptyStay = () => ({ hotelId: '', mantId: '', trabId: '', pieza: '', turno: 'día', checkin: '', checkout: '', status: 'confirmada', observacion: '' })
const today = () => new Date().toISOString().slice(0, 10)
const statusLabel = value => ({ confirmada: 'Confirmada', activa: 'Activa', finalizada: 'Finalizada', cancelada: 'Cancelada', reasignada: 'Reasignada' }[normalize(value)] || value || 'Confirmada')
const stayState = stay => {
  const current = today()
  if (['cancelada', 'reasignada'].includes(normalize(stay.status))) return normalize(stay.status)
  if (stay.checkout && stay.checkout < current) return 'finalizada'
  if (stay.checkin && stay.checkin > current) return 'futura'
  return 'ocupada'
}

export default function AlojamientosPage() {
  const { session } = useAuth()
  const canManageHotels = hotelEditors.has(session?.user?.role)
  const canAssign = assignmentEditors.has(session?.user?.role)
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [hotelDraft, setHotelDraft] = useState(emptyHotel)
  const [stayDraft, setStayDraft] = useState(emptyStay)
  const [creatingHotel, setCreatingHotel] = useState(false)
  const [showHotelForm, setShowHotelForm] = useState(false)
  const [showStayForm, setShowStayForm] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('')

  async function load() {
    setLoading(true); setMessage('')
    try { setResponse(await api.get('/state')) }
    catch { setMessage('No fue posible cargar alojamientos y estadías.'); setMessageTone('error') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const hotels = useMemo(() => rows(state.hoteles), [state.hoteles])
  const stays = useMemo(() => rows(state.hotelAsig), [state.hotelAsig])
  const workers = useMemo(() => rows(state.trabajadores), [state.trabajadores])
  const assignments = useMemo(() => rows(state.asignaciones), [state.asignaciones])
  const clients = useMemo(() => { const canonical = rows(state.minas); return canonical.length || state.minas ? canonical : rows(state.clientes) }, [state.minas, state.clientes])
  const orders = useMemo(() => { const canonical = rows(state.mantenciones); return canonical.length || state.mantenciones ? canonical : rows(state.proyectos) }, [state.mantenciones, state.proyectos])
  const workerById = useMemo(() => new Map(workers.map(x => [String(x.id), x])), [workers])
  const clientById = useMemo(() => new Map(clients.map(x => [String(x.id), x])), [clients])
  const orderById = useMemo(() => new Map(orders.map(x => [String(x.id), x])), [orders])
  const hotelById = useMemo(() => new Map(hotels.map(x => [String(x.id), x])), [hotels])

  const visibleHotels = useMemo(() => {
    const term = normalize(search)
    if (!term) return hotels
    return hotels.filter(hotel => [hotel.nombre, hotel.ciudad, hotel.direccion, hotel.contacto, ...rows(hotel.minaIds).map(id => clientById.get(String(id))?.nombre)].filter(Boolean).some(value => normalize(value).includes(term)))
  }, [hotels, search, clientById])

  const selectedHotel = hotelById.get(String(selectedHotelId || '')) || null
  const selectedOrder = orderById.get(String(stayDraft.mantId || ''))
  const selectedWorker = workerById.get(String(stayDraft.trabId || ''))
  const stayHotel = hotelById.get(String(stayDraft.hotelId || ''))
  const selectedClient = selectedOrder ? clientById.get(String(selectedOrder.minaId || '')) : null
  const eligibleWorkers = useMemo(() => {
    if (!stayDraft.mantId) return []
    const ids = new Set(assignments.filter(a => String(a.mantId) === String(stayDraft.mantId)).map(a => String(a.trabId)))
    return workers.filter(worker => ids.has(String(worker.id)))
  }, [assignments, workers, stayDraft.mantId])

  const updateHotel = key => event => setHotelDraft(current => ({ ...current, [key]: event.target.value }))
  const updateStay = key => event => setStayDraft(current => ({ ...current, [key]: event.target.value }))
  const updateHotelClients = event => setHotelDraft(current => ({ ...current, minaIds: Array.from(event.target.selectedOptions).map(option => option.value) }))
  const hotelActiveStays = hotelId => stays.filter(stay => String(stay.hotelId) === String(hotelId) && stayState(stay) === 'ocupada')

  function openHotel(hotel) {
    setCreatingHotel(false)
    setSelectedHotelId(hotel.id)
    setHotelDraft({ ...emptyHotel(), ...hotel, minaIds: rows(hotel.minaIds), rooms: rows(hotel.rooms) })
    setShowHotelForm(true)
    setShowStayForm(false)
    setMessage('')
  }
  function createHotel() {
    setCreatingHotel(true); setSelectedHotelId(''); setHotelDraft({ ...emptyHotel(), id: newId('hotel') }); setShowHotelForm(true); setShowStayForm(false); setMessage('')
  }
  function openStayForm() {
    setStayDraft(emptyStay()); setShowStayForm(true); setShowHotelForm(false); setMessage('')
  }
  function updateRoom(index, key, value) { setHotelDraft(current => ({ ...current, rooms: rows(current.rooms).map((room, i) => i === index ? { ...room, [key]: value } : room) })) }
  function addRoom(beds = 1) { setHotelDraft(current => ({ ...current, rooms: [...rows(current.rooms), { id: newId('room'), number: '', beds, rate: 0, active: true }] })) }
  function removeRoom(index) { setHotelDraft(current => ({ ...current, rooms: rows(current.rooms).filter((_, i) => i !== index) })) }

  async function saveHotel(event) {
    event.preventDefault()
    if (!canManageHotels) return
    if (!hotelDraft.nombre.trim() || !hotelDraft.ciudad.trim()) { setMessage('Indica nombre y ciudad del alojamiento.'); setMessageTone('error'); return }
    const duplicate = hotels.find(item => String(item.id) !== String(selectedHotelId) && normalize(item.nombre) === normalize(hotelDraft.nombre) && normalize(item.ciudad) === normalize(hotelDraft.ciudad))
    if (duplicate) { setMessage('Ya existe un alojamiento con el mismo nombre y ciudad.'); setMessageTone('error'); return }
    const roomNumbers = rows(hotelDraft.rooms).map(room => normalize(room.number)).filter(Boolean)
    if (new Set(roomNumbers).size !== roomNumbers.length) { setMessage('No puede haber habitaciones con el mismo número.'); setMessageTone('error'); return }
    if (rows(hotelDraft.rooms).some(room => !String(room.number || '').trim() || Number(room.beds) < 1 || Number(room.rate) < 0)) { setMessage('Revisa número, camas y tarifa de las habitaciones.'); setMessageTone('error'); return }
    setSaving(true); setMessage('')
    try {
      const id = creatingHotel ? (hotelDraft.id || newId('hotel')) : selectedHotelId
      const now = new Date().toISOString()
      const saved = { ...hotelDraft, id, nombre: hotelDraft.nombre.trim(), ciudad: hotelDraft.ciudad.trim(), direccion: hotelDraft.direccion.trim(), contacto: hotelDraft.contacto.trim(), telefono: hotelDraft.telefono.trim(), minaIds: rows(hotelDraft.minaIds), rooms: rows(hotelDraft.rooms).map(room => ({ ...room, number: String(room.number || '').trim(), beds: Number(room.beds || 1), rate: Number(room.rate || 0), active: room.active !== false })), updatedAt: now, ...(creatingHotel ? { createdAt: hotelDraft.createdAt || now } : {}) }
      const next = creatingHotel ? [...hotels, saved] : hotels.map(item => String(item.id) === String(id) ? saved : item)
      const result = await api.put('/state/modules', { reason: creatingHotel ? 'Alojamiento creado' : 'Alojamiento actualizado', changes: { hoteles: { version: Number(response?.moduleVersions?.hoteles || 0), data: next } } })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || current || {}), hoteles: next }, moduleVersions: { ...(current?.moduleVersions || {}), ...result.moduleVersions } }))
      setSelectedHotelId(id); setCreatingHotel(false); setHotelDraft(saved); setMessage(creatingHotel ? 'Alojamiento registrado.' : 'Cambios guardados con trazabilidad.'); setMessageTone('ok')
    } catch (error) { setMessage(error.message || 'No fue posible guardar el alojamiento.'); setMessageTone('error') }
    finally { setSaving(false) }
  }

  async function saveStay(event) {
    event.preventDefault()
    if (!canAssign) return
    if (!stayDraft.hotelId || !stayDraft.mantId || !stayDraft.trabId || !stayDraft.checkin || !stayDraft.checkout) { setMessage('Selecciona alojamiento, orden, persona y fechas de estadía.'); setMessageTone('error'); return }
    if (stayDraft.checkin > stayDraft.checkout) { setMessage('La fecha de check-out no puede ser anterior al check-in.'); setMessageTone('error'); return }
    if (!eligibleWorkers.some(worker => String(worker.id) === String(stayDraft.trabId))) { setMessage('La persona debe estar asignada a la orden antes de registrar su estadía.'); setMessageTone('error'); return }
    if (stayDraft.pieza && !rows(stayHotel?.rooms).some(room => String(room.number) === String(stayDraft.pieza))) { setMessage('La habitación seleccionada no pertenece al alojamiento.'); setMessageTone('error'); return }
    setSaving(true); setMessage('')
    try {
      const now = new Date().toISOString()
      const saved = { ...stayDraft, id: newId('stay'), observacion: stayDraft.observacion.trim(), createdAt: now, updatedAt: now }
      const next = [...stays, saved]
      const result = await api.put('/state/modules', { reason: `Estadía asignada a ${selectedWorker?.nombre || stayDraft.trabId}`, changes: { hotelAsig: { version: Number(response?.moduleVersions?.hotelAsig || 0), data: next } } })
      setResponse(current => ({ ...(current || {}), state: { ...(current?.state || current || {}), hotelAsig: next }, moduleVersions: { ...(current?.moduleVersions || {}), ...result.moduleVersions } }))
      setStayDraft(emptyStay()); setShowStayForm(false); setMessage('Estadía registrada con trazabilidad.'); setMessageTone('ok')
    } catch (error) { setMessage(error.message || 'No fue posible registrar la estadía.'); setMessageTone('error') }
    finally { setSaving(false) }
  }

  return <section className="nk-lodging-page">
    <header className="nk-lodging-header">
      <div><h1>Alojamientos y estadías</h1><p>Controla capacidad, ocupación y estadías vinculadas a la operación.</p></div>
      <div className="nk-actions">
        <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button>
        {canManageHotels && <button className="nk-button nk-button-secondary" type="button" onClick={createHotel}><IconPlus size={16}/>Nuevo alojamiento</button>}
        {canAssign && <button className="nk-button nk-button-primary" type="button" onClick={openStayForm}><IconPlus size={16}/>Asignar persona</button>}
      </div>
    </header>

    {message && <div className={`nk-lodging-feedback ${messageTone}`}>{message}</div>}

    <section className="nk-lodging-catalog">
      <div className="nk-lodging-catalog-head">
        <div><strong>Alojamientos</strong><span>Disponibilidad y capacidad actual</span></div>
        <label className="nk-search"><IconSearch size={16}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar alojamiento..." aria-label="Buscar alojamientos"/></label>
      </div>
      <div className="nk-lodging-cards">
        {loading ? <div className="nk-card nk-lodging-empty">Cargando…</div> : !visibleHotels.length ? <div className="nk-card nk-lodging-empty">No hay alojamientos para mostrar.</div> : visibleHotels.map(hotel => {
          const rooms = rows(hotel.rooms).filter(room => room.active !== false)
          const beds = rooms.reduce((sum, room) => sum + Number(room.beds || 0), 0)
          const active = hotelActiveStays(hotel.id)
          const occupied = active.length
          const free = Math.max(0, beds - occupied)
          const pct = beds ? Math.min(100, Math.round((occupied / beds) * 100)) : 0
          const simple = rooms.filter(room => Number(room.beds || 1) === 1).length
          const double = rooms.filter(room => Number(room.beds || 1) === 2).length
          return <article className="nk-card nk-lodging-hotel-card" key={hotel.id}>
            <div className="nk-lodging-hotel-title"><IconBed size={18}/><div><strong>{hotel.nombre}</strong><span>{hotel.direccion || hotel.ciudad || 'Sin dirección'}</span></div></div>
            <div className="nk-lodging-hotel-badges"><span className="nk-badge nk-badge-none">{simple} simples</span><span className="nk-badge nk-badge-none">{double} dobles</span><span className="nk-badge nk-badge-ok">{free} camas libres hoy</span></div>
            <div className="nk-lodging-progress"><span style={{ width: `${pct}%` }}/></div>
            <div className="nk-lodging-hotel-foot"><small>{occupied}/{beds || 0} camas ocupadas</small><button type="button" className="nk-button nk-button-secondary" onClick={() => openHotel(hotel)}>Abrir ficha</button></div>
          </article>
        })}
      </div>
    </section>

    {showHotelForm && <form className="nk-card nk-lodging-panel" onSubmit={saveHotel}>
      <div className="nk-lodging-workspace-head"><div><p className="nk-lodging-kicker">{creatingHotel ? 'Nuevo alojamiento' : 'Ficha del alojamiento'}</p><h2>{creatingHotel ? 'Registrar alojamiento' : selectedHotel?.nombre || hotelDraft.nombre}</h2></div><div className="nk-actions">{canManageHotels && <button className="nk-button nk-button-primary" type="submit" disabled={saving}><IconCheck size={16}/>{saving ? 'Guardando…' : 'Guardar cambios'}</button>}<button className="nk-icon-button" type="button" aria-label="Cerrar ficha" onClick={() => setShowHotelForm(false)}><IconX size={16}/></button></div></div>
      <div className="nk-lodging-form-grid">
        <label className="nk-field"><span className="nk-label">Nombre</span><input className="nk-input" disabled={!canManageHotels} value={hotelDraft.nombre} onChange={updateHotel('nombre')}/></label>
        <label className="nk-field"><span className="nk-label">Ciudad</span><input className="nk-input" disabled={!canManageHotels} value={hotelDraft.ciudad} onChange={updateHotel('ciudad')}/></label>
        <label className="nk-field nk-lodging-wide"><span className="nk-label">Dirección</span><input className="nk-input" disabled={!canManageHotels} value={hotelDraft.direccion} onChange={updateHotel('direccion')}/></label>
        <label className="nk-field"><span className="nk-label">Contacto</span><input className="nk-input" disabled={!canManageHotels} value={hotelDraft.contacto} onChange={updateHotel('contacto')}/></label>
        <label className="nk-field"><span className="nk-label">Teléfono</span><input className="nk-input" disabled={!canManageHotels} value={hotelDraft.telefono} onChange={updateHotel('telefono')}/></label>
        <label className="nk-field nk-lodging-wide"><span className="nk-label">Clientes / faenas habilitadas</span><select className="nk-select nk-lodging-multi" multiple disabled={!canManageHotels} value={rows(hotelDraft.minaIds)} onChange={updateHotelClients}>{clients.map(client => <option key={client.id} value={client.id}>{client.nombre || client.mandante || client.id}</option>)}</select></label>
      </div>
      <section className="nk-lodging-rooms"><div className="nk-lodging-section-head"><div><strong>Habitaciones y capacidad</strong><small>Gestiona disponibilidad y tarifa por habitación.</small></div>{canManageHotels && <div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={() => addRoom(1)}><IconPlus size={15}/>1 cama</button><button className="nk-button nk-button-secondary" type="button" onClick={() => addRoom(2)}><IconPlus size={15}/>2 camas</button></div>}</div>
        {!rows(hotelDraft.rooms).length ? <div className="nk-lodging-empty">Sin habitaciones configuradas.</div> : <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Habitación</th><th>Tipo</th><th>Camas</th><th>Precio noche</th><th>Estado</th><th/></tr></thead><tbody>{rows(hotelDraft.rooms).map((room, index) => <tr key={room.id || index}><td><input className="nk-input" disabled={!canManageHotels} value={room.number || ''} onChange={event => updateRoom(index, 'number', event.target.value)}/></td><td>{Number(room.beds || 1) === 1 ? 'Simple' : Number(room.beds) === 2 ? 'Doble' : 'Múltiple'}</td><td><input className="nk-input" type="number" min="1" disabled={!canManageHotels} value={room.beds ?? 1} onChange={event => updateRoom(index, 'beds', event.target.value)}/></td><td><input className="nk-input" type="number" min="0" disabled={!canManageHotels} value={room.rate ?? 0} onChange={event => updateRoom(index, 'rate', event.target.value)}/></td><td><select className="nk-select" disabled={!canManageHotels} value={room.active === false ? 'false' : 'true'} onChange={event => updateRoom(index, 'active', event.target.value === 'true')}><option value="true">Disponible</option><option value="false">Fuera de servicio</option></select></td><td>{canManageHotels && <button className="nk-button nk-button-quiet" type="button" onClick={() => removeRoom(index)}>Quitar</button>}</td></tr>)}</tbody></table></div>}
      </section>
    </form>}

    {showStayForm && <form className="nk-card nk-lodging-panel" onSubmit={saveStay}>
      <div className="nk-lodging-workspace-head"><div><p className="nk-lodging-kicker">Asignación operacional</p><h2>Asignar alojamiento</h2><p>La persona debe estar previamente asignada a la orden de servicio.</p></div><button className="nk-icon-button" type="button" aria-label="Cerrar asignación" onClick={() => setShowStayForm(false)}><IconX size={16}/></button></div>
      <div className="nk-lodging-form-grid">
        <label className="nk-field"><span className="nk-label">Orden de servicio</span><select className="nk-select" disabled={!canAssign} value={stayDraft.mantId} onChange={event => setStayDraft(current => ({ ...current, mantId: event.target.value, trabId: '' }))}><option value="">Seleccionar orden</option>{orders.map(order => <option key={order.id} value={order.id}>{order.codigo ? `${order.codigo} · ` : ''}{order.nombre || order.id}</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Persona</span><select className="nk-select" disabled={!canAssign || !stayDraft.mantId} value={stayDraft.trabId} onChange={updateStay('trabId')}><option value="">Seleccionar persona asignada</option>{eligibleWorkers.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre || worker.rut || worker.id}</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Alojamiento</span><select className="nk-select" disabled={!canAssign} value={stayDraft.hotelId} onChange={event => setStayDraft(current => ({ ...current, hotelId: event.target.value, pieza: '' }))}><option value="">Seleccionar alojamiento</option>{hotels.map(hotel => <option key={hotel.id} value={hotel.id}>{hotel.nombre} · {hotel.ciudad}</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Habitación</span><select className="nk-select" disabled={!canAssign || !stayDraft.hotelId} value={stayDraft.pieza} onChange={updateStay('pieza')}><option value="">Sin habitación definida</option>{rows(stayHotel?.rooms).filter(room => room.active !== false).map(room => <option key={room.id || room.number} value={room.number}>{room.number} · {room.beds || 1} cama(s)</option>)}</select></label>
        <label className="nk-field"><span className="nk-label">Check-in</span><input className="nk-input" type="date" disabled={!canAssign} value={stayDraft.checkin} onChange={updateStay('checkin')}/></label>
        <label className="nk-field"><span className="nk-label">Check-out</span><input className="nk-input" type="date" disabled={!canAssign} value={stayDraft.checkout} onChange={updateStay('checkout')}/></label>
        <label className="nk-field"><span className="nk-label">Turno</span><select className="nk-select" disabled={!canAssign} value={stayDraft.turno} onChange={updateStay('turno')}><option value="día">Día</option><option value="noche">Noche</option><option value="ambos">Ambos</option></select></label>
        <label className="nk-field"><span className="nk-label">Estado</span><select className="nk-select" disabled={!canAssign} value={stayDraft.status} onChange={updateStay('status')}><option value="confirmada">Confirmada</option><option value="activa">Activa</option><option value="finalizada">Finalizada</option></select></label>
        <label className="nk-field nk-lodging-wide"><span className="nk-label">Observación</span><textarea className="nk-textarea" rows="2" disabled={!canAssign} value={stayDraft.observacion} onChange={updateStay('observacion')}/></label>
      </div>
      <div className="nk-lodging-panel-actions">{selectedWorker && <span>Persona: <Link className="nk-context-link" to={`/app/trabajadores/${encodeURIComponent(selectedWorker.id)}`}>{selectedWorker.nombre}</Link></span>}{selectedOrder && <span>OS: <Link className="nk-context-link" to={`/app/servicios/${encodeURIComponent(selectedOrder.id)}`}>{selectedOrder.codigo || selectedOrder.nombre}</Link></span>}{selectedClient && <span>Cliente: <Link className="nk-context-link" to={`/app/clientes/${encodeURIComponent(selectedClient.id)}`}>{selectedClient.nombre}</Link></span>}<button className="nk-button nk-button-primary" type="submit" disabled={saving}><IconPlus size={16}/>{saving ? 'Guardando…' : 'Asignar estadía'}</button></div>
    </form>}

    <section className="nk-card nk-lodging-stays">
      <div className="nk-lodging-section-head"><div><strong>Asignaciones de alojamiento</strong><small>Trazabilidad global por persona, cliente, orden y hotel.</small></div><span className="nk-badge nk-badge-none">{stays.length}</span></div>
      {!stays.length ? <div className="nk-lodging-empty">Sin alojamientos asignados.</div> : <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>Cliente</th><th>Orden de servicio</th><th>Alojamiento / habitación</th><th>Estadía</th><th>Turno</th><th>Estado</th></tr></thead><tbody>{stays.slice().sort((a, b) => String(b.checkin || '').localeCompare(String(a.checkin || ''))).map(stay => {
        const worker = workerById.get(String(stay.trabId)); const order = orderById.get(String(stay.mantId)); const hotel = hotelById.get(String(stay.hotelId)); const client = order ? clientById.get(String(order.minaId || '')) : null; const stateLabel = stayState(stay)
        return <tr key={stay.id}><td>{worker ? <Link className="nk-context-link" to={`/app/trabajadores/${encodeURIComponent(worker.id)}`}>{worker.nombre || worker.id}</Link> : stay.trabId}</td><td>{client ? <Link className="nk-context-link" to={`/app/clientes/${encodeURIComponent(client.id)}`}>{client.nombre || client.id}</Link> : '—'}</td><td>{order ? <Link className="nk-context-link" to={`/app/servicios/${encodeURIComponent(order.id)}`}>{order.codigo || order.nombre || order.id}</Link> : stay.mantId}</td><td>{hotel?.nombre || stay.hotelId} {stay.pieza ? `· #${stay.pieza}` : ''}</td><td>{stay.checkin || '—'} → {stay.checkout || '—'}</td><td>{stay.turno || '—'}</td><td><span className={`nk-badge ${stateLabel === 'ocupada' ? 'nk-badge-ok' : stateLabel === 'futura' ? 'nk-badge-info' : 'nk-badge-none'}`}>{stateLabel === 'ocupada' ? 'Ocupada' : stateLabel === 'futura' ? 'Futura' : statusLabel(stateLabel)}</span></td></tr>
      })}</tbody></table></div>}
    </section>
  </section>
}
