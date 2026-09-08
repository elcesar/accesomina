import { useEffect, useMemo, useState } from 'react'
import {
  IconBuilding, IconCheck, IconFileText, IconLoader2, IconMail,
  IconMapPin, IconPhone, IconPlus, IconRefresh, IconSearch, IconTrash, IconUser,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/clientes.css'

const emptyClient = () => ({
  nombre: '',
  mandante: '',
  rut: '',
  region: '',
  comuna: '',
  telefonoMandante: '',
  emailMandante: '',
  observacion: '',
  estado: 'activo',
  contactos: [],
  requisitos: [],
})

const newId = () => globalThis.crypto?.randomUUID?.() || `cliente-${Date.now()}-${Math.random().toString(16).slice(2)}`
const rows = value => Array.isArray(value) ? value : []

function SummaryField({ label, value }) {
  return (
    <div className="nk-client-summary-field">
      <span>{label}</span>
      <strong>{value ?? 'Sin registrar'}</strong>
    </div>
  )
}

function ContactForm({ onAdd, disabled }) {
  const [contact, setContact] = useState({ nombre: '', cargo: '', telefono: '', email: '' })
  const change = key => event => setContact(current => ({ ...current, [key]: event.target.value }))

  function submit() {
    if (contact.nombre.trim().length < 3) return
    onAdd({
      ...contact,
      id: newId(),
      nombre: contact.nombre.trim(),
      cargo: contact.cargo.trim(),
      telefono: contact.telefono.trim(),
      email: contact.email.trim(),
      tipo: 'operativo',
    })
    setContact({ nombre: '', cargo: '', telefono: '', email: '' })
  }

  return (
    <div className="nk-client-contact-form">
      <div className="nk-field">
        <label className="nk-label" htmlFor="client-contact-name">Nombre</label>
        <input id="client-contact-name" className="nk-input" disabled={disabled} value={contact.nombre} onChange={change('nombre')} placeholder="Nombre y apellido" />
      </div>
      <div className="nk-field">
        <label className="nk-label" htmlFor="client-contact-role">Cargo</label>
        <input id="client-contact-role" className="nk-input" disabled={disabled} value={contact.cargo} onChange={change('cargo')} placeholder="Operaciones, compras..." />
      </div>
      <div className="nk-field">
        <label className="nk-label" htmlFor="client-contact-phone">Teléfono</label>
        <input id="client-contact-phone" className="nk-input" disabled={disabled} value={contact.telefono} onChange={change('telefono')} placeholder="+56 9..." />
      </div>
      <div className="nk-field">
        <label className="nk-label" htmlFor="client-contact-email">Correo</label>
        <input id="client-contact-email" className="nk-input" type="email" disabled={disabled} value={contact.email} onChange={change('email')} placeholder="contacto@empresa.cl" />
      </div>
      <button type="button" className="nk-button nk-button-secondary nk-client-contact-add" disabled={disabled || contact.nombre.trim().length < 3} onClick={submit}>
        <IconPlus size={15} />Agregar contacto
      </button>
    </div>
  )
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
  const [messageTone, setMessageTone] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  async function load() {
    setLoading(true)
    setMessage('')
    setMessageTone('')
    try {
      setResponse(await api.get('/state'))
    } catch {
      setMessage('No fue posible cargar los clientes. Revisa tu conexión e inténtalo nuevamente.')
      setMessageTone('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const clients = useMemo(() => {
    const canonical = rows(state.minas)
    return canonical.length || state.minas ? canonical : rows(state.clientes)
  }, [state.minas, state.clientes])
  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase()
    return clients.filter(client => {
      const matchesStatus = !statusFilter || (client.estado || 'activo') === statusFilter
      if (!matchesStatus) return false
      if (!term) return true
      return [client.nombre, client.mandante, client.rut, client.region, client.comuna]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(term))
    })
  }, [clients, search, statusFilter])
  const selected = clients.find(client => String(client.id) === String(selectedId)) || null
  const contracts = useMemo(() => rows(state.contratos), [state.contratos])
  const orders = useMemo(() => rows(state.mantenciones || state.proyectos), [state.mantenciones, state.proyectos])

  useEffect(() => {
    if (!clients.length) {
      setSelectedId(null)
      if (!creating) setDraft(emptyClient())
      return
    }
    const current = clients.find(client => String(client.id) === String(selectedId)) || clients[0]
    if (String(current.id) !== String(selectedId)) setSelectedId(current.id)
    if (!creating) {
      setDraft({ ...emptyClient(), ...current, contactos: rows(current.contactos), requisitos: rows(current.requisitos) })
    }
  }, [clients, selectedId, creating])

  const relatedContracts = selected ? contracts.filter(item => String(item.minaId) === String(selected.id)) : []
  const relatedOrders = selected ? orders.filter(item => String(item.minaId) === String(selected.id)) : []
  const update = key => event => setDraft(current => ({ ...current, [key]: event.target.value }))

  async function save(event) {
    event.preventDefault()
    if (!canEdit || draft.nombre.trim().length < 2) {
      setMessage('Indica el nombre o razón social del cliente.')
      setMessageTone('error')
      return
    }

    const duplicate = clients.find(item =>
      String(item.id) !== String(selectedId) &&
      item.nombre?.trim().toLowerCase() === draft.nombre.trim().toLowerCase() &&
      (item.mandante || '').trim().toLowerCase() === draft.mandante.trim().toLowerCase()
    )
    if (duplicate) {
      setMessage('Ya existe un cliente con el mismo nombre y organización relacionada.')
      setMessageTone('error')
      return
    }

    setSaving(true)
    setMessage('')
    setMessageTone('')
    try {
      const id = creating ? newId() : selectedId
      const saved = {
        ...draft,
        id,
        nombre: draft.nombre.trim(),
        mandante: draft.mandante.trim(),
        rut: draft.rut.trim(),
        region: draft.region.trim(),
        comuna: draft.comuna.trim(),
        telefonoMandante: draft.telefonoMandante.trim(),
        emailMandante: draft.emailMandante.trim(),
        observacion: draft.observacion.trim(),
        contactos: rows(draft.contactos),
        requisitos: rows(draft.requisitos),
        updatedAt: new Date().toISOString(),
        ...(creating ? { createdAt: new Date().toISOString() } : {}),
      }
      const next = creating ? [...clients, saved] : clients.map(item => String(item.id) === String(id) ? saved : item)
      const result = await api.put('/state/modules', {
        changes: { minas: { version: Number(response?.moduleVersions?.minas || 0), data: next } },
        reason: creating ? 'Cliente creado desde ficha comercial' : 'Ficha comercial del cliente actualizada',
      })
      setResponse(current => ({
        ...(current || {}),
        state: { ...(current?.state || current || {}), minas: next },
        moduleVersions: { ...(current?.moduleVersions || {}), ...result.moduleVersions },
      }))
      setSelectedId(id)
      setCreating(false)
      setDraft(saved)
      setMessage(creating ? 'Cliente creado y disponible para contratos y órdenes de servicio.' : 'Cambios guardados con trazabilidad.')
      setMessageTone('ok')
    } catch (error) {
      setMessage(error.message || 'No fue posible guardar. Actualiza la información e inténtalo nuevamente.')
      setMessageTone('error')
    } finally {
      setSaving(false)
    }
  }

  const addContact = contact => setDraft(current => ({ ...current, contactos: [...rows(current.contactos), contact] }))
  const removeContact = contact => {
    if (!window.confirm(`¿Eliminar el contacto ${contact.nombre}?`)) return
    setDraft(current => ({ ...current, contactos: rows(current.contactos).filter(item => item.id !== contact.id) }))
  }

  function addRequirement() {
    const name = newRequirement.trim()
    if (!name || rows(draft.requisitos).some(item => item.nombre?.toLowerCase() === name.toLowerCase())) return
    setDraft(current => ({
      ...current,
      requisitos: [...rows(current.requisitos), { id: newId(), nombre: name, estado: 'pendiente' }],
    }))
    setNewRequirement('')
  }

  const removeRequirement = requirement => {
    if (!window.confirm(`¿Quitar el requisito “${requirement.nombre}”?`)) return
    setDraft(current => ({ ...current, requisitos: rows(current.requisitos).filter(item => item.id !== requirement.id) }))
  }

  return (
    <section className="nk-client-page">
      <header className="nk-client-header">
        <div>
          <p className="nk-client-kicker">Relación comercial</p>
          <h1>Clientes</h1>
          <p>Centraliza la ficha comercial, contactos, requisitos y el historial operativo de cada cliente.</p>
        </div>
        <div className="nk-actions nk-client-header-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}>
            <IconRefresh size={16} />Actualizar
          </button>
          {canEdit && (
            <button className="nk-button nk-button-primary" type="button" onClick={() => {
              setCreating(true)
              setSelectedId(null)
              setDraft(emptyClient())
              setMessage('')
              setMessageTone('')
            }}>
              <IconPlus size={16} />Nuevo cliente
            </button>
          )}
        </div>
      </header>

      {message && <div className={`nk-client-feedback ${messageTone}`}><span>{message}</span></div>}

      <div className="nk-client-layout">
        <aside className="nk-client-list nk-card">
          <div className="nk-client-list-head">
            <strong>Clientes registrados</strong>
            <span className="nk-badge nk-badge-none">{visibleClients.length}/{clients.length}</span>
          </div>
          <div className="nk-client-list-filters">
            <div className="nk-search nk-client-search">
              <IconSearch size={16} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar cliente..." aria-label="Buscar cliente" />
            </div>
            <select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar clientes por estado">
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="prospecto">Prospectos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
          {loading ? (
            <div className="nk-client-list-empty">Cargando clientes…</div>
          ) : clients.length === 0 ? (
            <div className="nk-client-list-empty">Aún no hay clientes. Crea el primero para iniciar contratos y órdenes de servicio.</div>
          ) : visibleClients.length === 0 ? (
            <div className="nk-client-list-empty">No hay clientes que coincidan con la búsqueda o filtro actual.</div>
          ) : visibleClients.map(client => (
            <button
              type="button"
              key={client.id}
              className={`nk-client-list-item ${String(client.id) === String(selectedId) && !creating ? 'active' : ''}`}
              onClick={() => { setCreating(false); setSelectedId(client.id); setMessage(''); setMessageTone('') }}
            >
              <IconBuilding size={17} />
              <span>
                <strong>{client.nombre}</strong>
                <small>{client.mandante || client.region || 'Sin organización relacionada'}</small>
              </span>
            </button>
          ))}
        </aside>

        <form className="nk-client-workspace nk-card" onSubmit={save}>
          <div className="nk-client-workspace-head">
            <div>
              <p className="nk-client-kicker">{creating ? 'Nuevo cliente' : 'Ficha del cliente'}</p>
              <h2>{creating ? 'Registra la relación comercial' : draft.nombre || 'Cliente sin nombre'}</h2>
              <p>{creating ? 'Completa lo esencial; podrás ampliar la ficha después.' : 'Los cambios se conservan con historial dentro de la empresa.'}</p>
            </div>
            {canEdit && (
              <button className="nk-button nk-button-primary" disabled={saving}>
                {saving ? <IconLoader2 className="nk-client-spin" size={16} /> : <IconCheck size={16} />}
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            )}
          </div>

          <div className="nk-client-form-grid">
            <div className="nk-field"><label className="nk-label">Nombre o razón social</label><input className="nk-input" required disabled={!canEdit} value={draft.nombre} onChange={update('nombre')} placeholder="Empresa de servicios SpA" /></div>
            <div className="nk-field"><label className="nk-label">Organización relacionada</label><input className="nk-input" disabled={!canEdit} value={draft.mandante} onChange={update('mandante')} placeholder="Grupo, matriz o cliente principal" /></div>
            <div className="nk-field"><label className="nk-label">RUT</label><input className="nk-input" disabled={!canEdit} value={draft.rut} onChange={update('rut')} placeholder="76.123.456-7" /></div>
            <div className="nk-field"><label className="nk-label">Estado</label><select className="nk-select" disabled={!canEdit} value={draft.estado} onChange={update('estado')}><option value="activo">Activo</option><option value="prospecto">Prospecto</option><option value="inactivo">Inactivo</option></select></div>
            <div className="nk-field"><label className="nk-label">Región</label><input className="nk-input" disabled={!canEdit} value={draft.region} onChange={update('region')} placeholder="Región" /></div>
            <div className="nk-field"><label className="nk-label">Comuna o ciudad</label><input className="nk-input" disabled={!canEdit} value={draft.comuna} onChange={update('comuna')} placeholder="Comuna o ciudad" /></div>
            <div className="nk-field"><label className="nk-label"><IconPhone size={14} /> Teléfono central</label><input className="nk-input" disabled={!canEdit} value={draft.telefonoMandante} onChange={update('telefonoMandante')} placeholder="+56 9..." /></div>
            <div className="nk-field"><label className="nk-label"><IconMail size={14} /> Correo central</label><input className="nk-input" type="email" disabled={!canEdit} value={draft.emailMandante} onChange={update('emailMandante')} placeholder="contacto@empresa.cl" /></div>
            <div className="nk-field nk-client-wide"><label className="nk-label">Condiciones y observaciones</label><textarea className="nk-textarea" disabled={!canEdit} value={draft.observacion} onChange={update('observacion')} rows="3" placeholder="Condiciones comerciales, forma de trabajo, restricciones o antecedentes relevantes." /></div>
          </div>

          {!creating && (
            <section className="nk-client-summary">
              <SummaryField label="Contratos vinculados" value={relatedContracts.length} />
              <SummaryField label="Órdenes de servicio" value={relatedOrders.length} />
              <SummaryField label="Contactos registrados" value={rows(draft.contactos).length} />
              <SummaryField label="Requisitos configurados" value={rows(draft.requisitos).length} />
            </section>
          )}

          <section className="nk-client-section">
            <header>
              <div><h3><IconUser size={17} />Contactos y responsables</h3><p>Personas que participan en la relación comercial u operativa.</p></div>
            </header>
            <ContactForm disabled={!canEdit} onAdd={addContact} />
            <div className="nk-client-contact-list">
              {rows(draft.contactos).length ? rows(draft.contactos).map(contact => (
                <article key={contact.id}>
                  <div><strong>{contact.nombre}</strong><span>{[contact.cargo, contact.telefono, contact.email].filter(Boolean).join(' · ') || 'Sin información complementaria'}</span></div>
                  {canEdit && <button type="button" className="nk-icon-button" onClick={() => removeContact(contact)} aria-label={`Eliminar a ${contact.nombre}`}><IconTrash size={16} /></button>}
                </article>
              )) : <p className="nk-client-empty-copy">Agrega contactos para asignar responsables y comunicarte desde la operación.</p>}
            </div>
          </section>

          <section className="nk-client-section">
            <header>
              <div><h3><IconFileText size={17} />Requisitos del cliente</h3><p>Documentos, condiciones o validaciones que se aplican a sus contratos y órdenes.</p></div>
            </header>
            <div className="nk-client-requirement-add">
              <input className="nk-input" disabled={!canEdit} value={newRequirement} onChange={event => setNewRequirement(event.target.value)} placeholder="Ej.: Certificado de seguro vigente" />
              <button type="button" className="nk-button nk-button-secondary" disabled={!canEdit || !newRequirement.trim()} onClick={addRequirement}><IconPlus size={15} />Agregar</button>
            </div>
            <div className="nk-client-tags">
              {rows(draft.requisitos).map(item => (
                <span key={item.id} className="nk-badge nk-badge-none">{item.nombre}{canEdit && <button type="button" onClick={() => removeRequirement(item)} aria-label={`Quitar ${item.nombre}`}>×</button>}</span>
              ))}
              {!rows(draft.requisitos).length && <p className="nk-client-empty-copy">Sin requisitos adicionales configurados.</p>}
            </div>
          </section>

          {!creating && (
            <section className="nk-client-section">
              <header>
                <div><h3><IconMapPin size={17} />Relación operativa</h3><p>Vínculos que alimentan la ejecución, el cumplimiento y los reportes.</p></div>
              </header>
              <div className="nk-client-relations">
                <article><strong>Contratos</strong>{relatedContracts.length ? relatedContracts.slice(0, 4).map(item => <span key={item.id}>{item.numero || item.nombre || 'Contrato sin nombre'}</span>) : <span>Sin contratos vinculados.</span>}</article>
                <article><strong>Órdenes de servicio</strong>{relatedOrders.length ? relatedOrders.slice(0, 4).map(item => <span key={item.id}>{item.nombre || item.codigo || 'Orden sin nombre'}</span>) : <span>Sin órdenes de servicio vinculadas.</span>}</article>
              </div>
            </section>
          )}
        </form>
      </div>
    </section>
  )
}
