import { useEffect, useMemo, useState } from 'react'
import { IconBook, IconFileDescription, IconPlus, IconRefresh, IconSearch, IconSignature as IconFileSignature, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/libro-obra.css'

const list = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)
const emptyForm = () => ({ mineRef:'', contractRef:'', projectRef:'', bookType:'maestro', bookTitle:'Libro de obra', entryType:'avance', occurredAt:`${today()}T12:00:00.000Z`, subject:'', body:'', responsible:'', dueAt:'', status:'borrador' })
const openStatus = status => !['cerrado', 'firmado'].includes(status)
const normalize = value => String(value || '').toLowerCase()

function relationName(rows, id) {
  const item = rows.find(row => String(row.id) === String(id || ''))
  return item?.nombre || item?.title || item?.codigo || item?.numero || item?.razon || item?.name || id || '—'
}

export default function LibroObraPage() {
  const [entries, setEntries] = useState([])
  const [state, setState] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [signature, setSignature] = useState({ signerName:'', signerEmail:'', signerPhone:'', channel:'email', message:'' })
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState('todos')
  const [filters, setFilters] = useState({ q:'', mine:'', project:'', status:'', year:'', month:'' })

  const load = async () => {
    setLoading(true)
    try {
      const [book, appState] = await Promise.all([api.get('/work-books/entries'), api.get('/state')])
      setEntries(list(book))
      setState(appState?.state || appState || {})
    } catch (error) {
      setNotice(error.message || 'No fue posible cargar el Libro de obra.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const clients = list(state.minas).length ? list(state.minas) : list(state.clientes)
  const contracts = list(state.contratos)
  const orders = list(state.mantenciones).length ? list(state.mantenciones) : list(state.proyectos)
  const scopedContracts = contracts.filter(row => !form.mineRef || String(row.minaId || row.clientId || '') === String(form.mineRef))
  const scopedOrders = orders.filter(row => !form.mineRef || String(row.minaId || row.clientId || '') === String(form.mineRef))

  const summary = useMemo(() => {
    const overdue = entries.filter(row => row.due_at && String(row.due_at).slice(0, 10) < today() && openStatus(row.status)).length
    return {
      total: entries.length,
      open: entries.filter(row => openStatus(row.status)).length,
      pending: entries.filter(row => row.signature_state === 'pendiente' || row.status === 'pendiente_firma').length,
      overdue,
    }
  }, [entries])

  const years = useMemo(() => [...new Set(entries.map(row => String(row.occurred_at || row.occurredAt || '').slice(0, 4)).filter(Boolean))].sort().reverse(), [entries])

  const filteredEntries = useMemo(() => entries.filter(row => {
    const occurred = String(row.occurred_at || row.occurredAt || '')
    const evidence = list(row.evidence_files || row.evidenceFiles)
    const due = row.due_at || row.dueAt
    const open = openStatus(row.status)
    const searchable = [row.folio, row.entry_number, row.subject, row.body, relationName(clients, row.mine_ref || row.mineRef), relationName(orders, row.project_ref || row.projectRef)].join(' ').toLowerCase()
    const matchesQuick = quickFilter === 'todos'
      || (quickFilter === 'evidencia' && evidence.length > 0)
      || (quickFilter === 'compromisos' && open && Boolean(due))
      || (quickFilter === 'firmas' && (row.signature_state === 'pendiente' || row.status === 'pendiente_firma'))
    return matchesQuick
      && (!filters.q || searchable.includes(filters.q.toLowerCase()))
      && (!filters.mine || String(row.mine_ref || row.mineRef || '') === String(filters.mine))
      && (!filters.project || String(row.project_ref || row.projectRef || '') === String(filters.project))
      && (!filters.status || String(row.status || '') === filters.status)
      && (!filters.year || occurred.slice(0, 4) === filters.year)
      && (!filters.month || occurred.slice(5, 7) === filters.month)
  }), [entries, clients, orders, filters, quickFilter])

  const submit = async event => {
    event.preventDefault()
    setNotice('')
    try {
      await api.post('/work-books/entries', { ...form, dueAt: form.dueAt || null })
      setNotice('Anotación registrada con folio correlativo.')
      setForm(emptyForm())
      setShowForm(false)
      await load()
    } catch (error) {
      setNotice(error.message || 'No fue posible registrar la anotación.')
    }
  }

  const openEntry = async row => {
    try {
      const detail = await api.get(`/work-books/entries/${row.id}`)
      setSelected(detail)
      setSignature(current => ({ ...current, message:`Solicitamos revisar y firmar la anotación ${row.entry_number} del ${row.folio}.` }))
    } catch (error) {
      setNotice(error.message || 'No fue posible abrir la anotación.')
    }
  }

  const requestSignature = async event => {
    event.preventDefault()
    if (!selected) return
    try {
      const result = await api.post(`/work-books/entries/${selected.id}/signature-requests`, signature)
      setNotice(result.delivery_status === 'pendiente_configuracion' ? 'La solicitud quedó registrada. Configure el proveedor de firma, correo o WhatsApp para enviarla.' : 'Solicitud de firma enviada.')
      setSelected(await api.get(`/work-books/entries/${selected.id}`))
    } catch (error) {
      setNotice(error.message || 'No fue posible solicitar la firma.')
    }
  }

  const updateFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))

  return (
    <section className="nk-book-page">
      <header className="nk-book-page-header">
        <div>
          <p className="nk-book-kicker">Gestión de proyectos y negocios</p>
          <h1>Libro de obra</h1>
          <p>Registro formal, correlativo y trazable por cliente, contrato y servicio.</p>
        </div>
        <div className="nk-book-header-actions">
          <button className="nk-button nk-button-secondary" type="button" onClick={load}><IconRefresh size={16}/>Actualizar</button>
          <button className="nk-button nk-button-primary" type="button" onClick={() => setShowForm(true)}><IconPlus size={16}/>Nueva anotación</button>
        </div>
      </header>

      <div className="nk-book-note">
        <IconBook size={18}/>
        <span>Use esta vista para registrar instrucciones, acuerdos, avances, consultas, respuestas e incidentes. Las anotaciones firmadas o cerradas conservan su historial.</span>
      </div>

      <section className="nk-book-control-card">
        <div className="nk-book-card-heading">
          <div>
            <h2>Control formal del Libro de obra</h2>
            <p>Cada anotación se vincula con cliente, contrato y orden de servicio para mantener contexto, evidencia y trazabilidad.</p>
          </div>
        </div>
        <div className="nk-book-quick-grid">
          {[
            ['todos', 'Folio correlativo', 'Ver libro y anotaciones'],
            ['evidencia', 'Evidencia', 'Ver adjuntos e historial'],
            ['compromisos', 'Compromisos', 'Ver responsable y plazo'],
            ['firmas', 'Firma', 'Ver solicitudes pendientes'],
          ].map(([key, title, detail]) => (
            <button key={key} type="button" className={`nk-book-quick-card ${quickFilter === key ? 'active' : ''}`} aria-pressed={quickFilter === key} onClick={() => setQuickFilter(key)}>
              <strong>{title}</strong><span>{detail}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="nk-book-summary-grid">
        <article><b>{summary.total}</b><span>Anotaciones</span></article>
        <article><b>{summary.open}</b><span>Abiertas</span></article>
        <article><b>{summary.pending}</b><span>Pendientes de firma</span></article>
        <article className={summary.overdue ? 'is-alert' : ''}><b>{summary.overdue}</b><span>Compromisos vencidos</span></article>
      </div>

      {notice && <p className="nk-book-message">{notice}</p>}

      <section className="nk-book-filters" aria-label="Filtros del Libro de obra">
        <label className="nk-book-search"><IconSearch size={15}/><input value={filters.q} onChange={event => updateFilter('q', event.target.value)} placeholder="Buscar folio, asunto o contenido..." /></label>
        <select value={filters.mine} onChange={event => updateFilter('mine', event.target.value)}><option value="">Todos los clientes</option>{clients.map(row => <option value={row.id} key={row.id}>{row.nombre || row.razon || row.name || row.id}</option>)}</select>
        <select value={filters.project} onChange={event => updateFilter('project', event.target.value)}><option value="">Todas las órdenes</option>{orders.map(row => <option value={row.id} key={row.id}>{row.nombre || row.title || row.codigo || row.id}</option>)}</select>
        <select value={filters.status} onChange={event => updateFilter('status', event.target.value)}><option value="">Todos los estados</option><option value="borrador">Borrador</option><option value="pendiente_firma">Pendiente de firma</option><option value="firmado">Firmado</option><option value="cerrado">Cerrado</option></select>
        <select value={filters.year} onChange={event => updateFilter('year', event.target.value)}><option value="">Todos los años</option>{years.map(year => <option key={year}>{year}</option>)}</select>
        <select value={filters.month} onChange={event => updateFilter('month', event.target.value)}><option value="">Todos los meses</option>{Array.from({ length:12 }, (_, index) => String(index + 1).padStart(2, '0')).map(month => <option key={month} value={month}>{month}</option>)}</select>
      </section>

      <section className="nk-book-register">
        <header><div><h2>Registro formal</h2><p>{filteredEntries.length} de {entries.length} anotaciones visibles</p></div></header>
        {loading ? <p className="nk-book-empty">Cargando anotaciones…</p> : filteredEntries.length ? (
          <div className="nk-book-table-wrap">
            <table className="nk-book-table">
              <thead><tr><th>Folio</th><th>Anotación</th><th>Fecha</th><th>Cliente / orden</th><th>Asunto</th><th>Responsable</th><th>Estado</th></tr></thead>
              <tbody>{filteredEntries.map(row => (
                <tr key={row.id} onClick={() => openEntry(row)}>
                  <td><strong>{row.folio || '—'}</strong></td>
                  <td>{row.entry_number || '—'}</td>
                  <td>{String(row.occurred_at || row.occurredAt || '').slice(0, 10) || '—'}</td>
                  <td><strong>{relationName(clients, row.mine_ref || row.mineRef)}</strong><small>{relationName(orders, row.project_ref || row.projectRef)}</small></td>
                  <td><strong>{row.subject || 'Sin asunto'}</strong><small>{(row.book_title || row.bookTitle || 'Libro de obra')} · {String(row.entry_type || row.entryType || '').replaceAll('_', ' ')}</small></td>
                  <td>{row.responsible || 'Sin asignar'}</td>
                  <td><span className={`nk-book-status ${normalize(row.status)}`}>{String(row.status || 'borrador').replaceAll('_', ' ')}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="nk-book-empty">No hay anotaciones que coincidan con los filtros seleccionados.</p>}
      </section>

      {showForm && <div className="nk-book-modal" onMouseDown={() => setShowForm(false)}><form onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <header><div><h2>Nueva anotación</h2><p>El sistema creará o reutilizará el libro asociado al cliente, contrato y orden.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar"><IconX size={18}/></button></header>
        <div className="nk-book-form">
          {[['mineRef','Cliente'],['contractRef','Contrato'],['projectRef','Orden de servicio']].map(([key,label]) => <label key={key}><span>{label}</span><select required={key !== 'contractRef'} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]:event.target.value }))}><option value="">Selecciona</option>{(key === 'mineRef' ? clients : key === 'contractRef' ? scopedContracts : scopedOrders).map(row => <option value={row.id} key={row.id}>{row.nombre || row.razon || row.title || row.codigo || row.id}</option>)}</select></label>)}
          <label><span>Tipo de libro</span><select value={form.bookType} onChange={event => setForm(current => ({ ...current, bookType:event.target.value }))}>{[['maestro','Maestro'],['seguridad_hsec','Seguridad y salud'],['calidad','Calidad'],['terreno_avance','Terreno y avance'],['comunicaciones','Comunicaciones']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Tipo de anotación</span><select value={form.entryType} onChange={event => setForm(current => ({ ...current, entryType:event.target.value }))}>{['instruccion','consulta','respuesta','avance','incidente','acuerdo','observacion','recepcion','otro'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label><span>Responsable</span><input value={form.responsible} onChange={event => setForm(current => ({ ...current, responsible:event.target.value }))}/></label>
          <label className="wide"><span>Asunto</span><input required minLength="3" value={form.subject} onChange={event => setForm(current => ({ ...current, subject:event.target.value }))}/></label>
          <label className="wide"><span>Detalle</span><textarea required minLength="3" rows="4" value={form.body} onChange={event => setForm(current => ({ ...current, body:event.target.value }))}/></label>
          <label><span>Fecha de compromiso</span><input type="date" value={form.dueAt} onChange={event => setForm(current => ({ ...current, dueAt:event.target.value }))}/></label>
          <label><span>Estado inicial</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status:event.target.value }))}><option value="borrador">Borrador</option><option value="pendiente_firma">Pendiente de firma</option></select></label>
        </div>
        <footer><button type="button" className="nk-button nk-button-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button className="nk-button nk-button-primary">Registrar anotación</button></footer>
      </form></div>}

      {selected && <div className="nk-book-modal" onMouseDown={() => setSelected(null)}><div className="nk-book-detail" onMouseDown={event => event.stopPropagation()}>
        <header><div><h2>{selected.folio} · Anotación {selected.entry_number}</h2><p>{selected.subject}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Cerrar"><IconX size={18}/></button></header>
        <div className="nk-book-detail-body">
          <div className="nk-book-detail-copy"><IconFileDescription size={18}/><p>{selected.body}</p></div>
          <dl><div><dt>Responsable</dt><dd>{selected.responsible || 'Sin asignar'}</dd></div><div><dt>Compromiso</dt><dd>{selected.due_at || 'Sin fecha'}</dd></div><div><dt>Estado</dt><dd>{String(selected.status || '').replaceAll('_', ' ')}</dd></div></dl>
          <section><h3><IconFileSignature size={17}/>Solicitar firma</h3><form className="nk-book-signature" onSubmit={requestSignature}><input required placeholder="Nombre de quien firma" value={signature.signerName} onChange={event => setSignature(current => ({ ...current, signerName:event.target.value }))}/><input placeholder="Correo autorizado" type="email" value={signature.signerEmail} onChange={event => setSignature(current => ({ ...current, signerEmail:event.target.value }))}/><input placeholder="Teléfono con código país" value={signature.signerPhone} onChange={event => setSignature(current => ({ ...current, signerPhone:event.target.value }))}/><select value={signature.channel} onChange={event => setSignature(current => ({ ...current, channel:event.target.value }))}><option value="email">Correo</option><option value="whatsapp">WhatsApp</option><option value="ambos">Correo y WhatsApp</option></select><button className="nk-button nk-button-primary">Enviar solicitud</button></form>{list(selected.signature_requests).length > 0 && <p className="nk-book-history">Solicitudes: {selected.signature_requests.map(item => `${item.signer_name} (${item.status})`).join(' · ')}</p>}</section>
        </div>
      </div></div>}
    </section>
  )
}
