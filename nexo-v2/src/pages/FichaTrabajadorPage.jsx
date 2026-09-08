import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconAlertTriangle, IconArrowLeft, IconBook, IconBrandWhatsapp,
  IconCheck, IconDeviceFloppy, IconFileText, IconHistory,
  IconLoader2, IconPaperclip, IconPlus, IconShield, IconUser, IconX,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/ficha-trabajador.css'

const ITEM_TYPES = {
  documento: 'Documento trabajador',
  examen: 'Examen médico',
  curso: 'Curso / capacitación',
  certificacion: 'Certificación técnica',
  contrato: 'Contrato / anexo',
  cv: 'Currículum / antecedentes',
}

const REQUIRED_ITEMS = [
  { type: 'documento', name: 'Cédula de identidad' },
  { type: 'contrato', name: 'Contrato de trabajo' },
  { type: 'contrato', name: 'Anexo de faena' },
  { type: 'documento', name: 'Certificado AFP' },
  { type: 'documento', name: 'Certificado AFC' },
  { type: 'documento', name: 'Certificado Fonasa/Isapre' },
  { type: 'examen', name: 'Examen preocupacional' },
  { type: 'curso', name: 'ODI / Derecho a Saber' },
  { type: 'curso', name: 'Reglamento Interno' },
  { type: 'documento', name: 'CV actualizado' },
]

const REQUIRED_BY_SPECIALTY = {
  Eléctrico: [{ type: 'curso', name: 'Arc Flash' }, { type: 'certificacion', name: 'Certificación eléctrica' }],
  Instrumentista: [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Mecánico Industrial': [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Soldador 6G': [{ type: 'curso', name: 'Trabajos en caliente' }, { type: 'certificacion', name: 'Calificación soldador 6G' }],
  Rigger: [{ type: 'certificacion', name: 'Certificación Rigger' }, { type: 'curso', name: 'Izaje de cargas' }],
  'Maestro Andamios': [{ type: 'curso', name: 'Trabajo en altura física' }],
}

const ESPECIALIDADES = [
  'Mecánico Industrial', 'Soldador 6G', 'Eléctrico', 'Instrumentista',
  'Rigger', 'Calderero', 'Maestro Andamios', 'Operador de equipos',
  'Prevencionista', 'Supervisor', 'Técnico electrónico', 'Pintor industrial',
  'Operadora', 'Enfermero/a', 'Paramédico', 'Conductor', 'Administrativo', 'Otro',
]

const TABS = [
  { key: 'datos', label: 'Perfil y asignación', icon: IconUser },
  { key: 'docs', label: 'Documentación', icon: IconFileText },
  { key: 'cursos', label: 'Formación y aptitudes', icon: IconBook },
  { key: 'epp', label: 'EPP y recursos', icon: IconShield },
  { key: 'historial', label: 'Historial', icon: IconHistory },
]

const TIPOS_POR_TAB = {
  docs: [
    { value: 'documento', label: 'Documento trabajador' },
    { value: 'contrato', label: 'Contrato / anexo' },
    { value: 'examen', label: 'Examen médico' },
    { value: 'certificacion', label: 'Certificación técnica' },
    { value: 'cv', label: 'Currículum / antecedentes' },
  ],
  cursos: [
    { value: 'curso', label: 'Curso / capacitación' },
    { value: 'certificacion', label: 'Certificación técnica' },
  ],
}

function initials(name) {
  const parts = (name || '').trim().split(' ')
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

function diasHasta(date) {
  if (!date) return null
  return Math.floor((new Date(date) - new Date()) / 86400000)
}

function itemValid(item) {
  if (!item || item.estado === 'rechazado') return false
  return !(item.vence && diasHasta(item.vence) < 0)
}

function matchItem(item, req) {
  return item.type === req.type &&
    item.name?.toLowerCase().includes(req.name.toLowerCase().split('/')[0].trim())
}

function getRequiredItems(worker) {
  return [...REQUIRED_ITEMS, ...(REQUIRED_BY_SPECIALTY[worker.especialidad] || [])]
}

function reqStatus(worker, req) {
  const item = (worker.workerItems || []).find(current => matchItem(current, req))
  if (!item) return { ok: false, src: 'faltante' }
  return itemValid(item)
    ? { ok: true, src: 'cargado' }
    : { ok: false, src: 'vencido/rechazado' }
}

function acreditacionPct(worker) {
  const reqs = getRequiredItems(worker)
  if (!reqs.length) return 0
  return Math.round(reqs.filter(req => reqStatus(worker, req).ok).length / reqs.length * 100)
}

function statusClass(pct) {
  if (pct >= 85) return 'ok'
  if (pct >= 60) return 'warn'
  return 'error'
}

function BadgeDisp({ value }) {
  const map = {
    disponible: ['Disponible', 'nk-badge-ok'],
    asignado: ['Asignado', 'nk-badge-none'],
    vacaciones: ['Vacaciones', 'nk-badge-warn'],
    bloqueado: ['Restringido', 'nk-badge-error'],
  }
  const [label, cls] = map[value] || [value || 'Sin información', 'nk-badge-none']
  return <span className={`nk-badge ${cls}`}>{label}</span>
}

function Field({ label, children }) {
  return (
    <div className="nk-field">
      <label className="nk-label">{label}</label>
      {children}
    </div>
  )
}

function CardSection({ title, subtitle, action, children }) {
  return (
    <section className="nk-card nk-person-card">
      <header className="nk-person-card-head">
        <div>
          <h3 className="nk-person-card-title">{title}</h3>
          {subtitle && <p className="nk-person-card-subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="nk-person-card-body">{children}</div>
    </section>
  )
}

function SaveButton({ saving, onClick }) {
  return (
    <button className="nk-button nk-button-primary" type="button" onClick={onClick} disabled={saving}>
      {saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconDeviceFloppy size={15} strokeWidth={1.7} />}
      {saving ? 'Guardando…' : 'Guardar cambios'}
    </button>
  )
}

function DataTab({ worker, clientes, proyectos, contratos, asignaciones, saving, onChange, onSave, onAsignar, onRetirar }) {
  const [contratoId, setContratoId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [turno, setTurno] = useState('día')
  const activeAssignments = asignaciones.filter(a => a.trabId === worker.id)
  const proyectosFiltrados = contratoId ? proyectos.filter(p => p.contratoId === contratoId) : []

  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const contractName = id => {
    const p = proyectos.find(current => current.id === id)
    return contratos.find(c => c.id === p?.contratoId)?.nombre || '—'
  }
  const clientName = id => {
    const p = proyectos.find(current => current.id === id)
    return clientes.find(c => c.id === p?.minaId)?.nombre || '—'
  }

  return (
    <>
      <CardSection
        title="Asignación operacional"
        subtitle="Relaciona la persona con contrato, proyecto/servicio y turno sin perder su documentación."
      >
        <div className="nk-person-assignment-form">
          <Field label="Contrato">
            <select className="nk-select" value={contratoId} onChange={e => { setContratoId(e.target.value); setProyectoId('') }}>
              <option value="">Seleccionar contrato</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Proyecto / servicio">
            <select className="nk-select" value={proyectoId} onChange={e => setProyectoId(e.target.value)} disabled={!contratoId}>
              <option value="">Seleccionar proyecto</option>
              {proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Turno">
            <select className="nk-select" value={turno} onChange={e => setTurno(e.target.value)}>
              <option value="día">Día</option>
              <option value="noche">Noche</option>
              <option value="ambos">Ambos</option>
            </select>
          </Field>
          <button className="nk-button nk-button-action" type="button" disabled={!proyectoId} onClick={() => onAsignar(proyectoId, turno)}>
            <IconPlus size={15} strokeWidth={1.7} /> Asignar
          </button>
        </div>

        {activeAssignments.length === 0 ? (
          <p className="nk-person-text-sub">Sin asignaciones activas.</p>
        ) : (
          <div className="nk-table-wrapper nk-person-table">
            <table className="nk-table">
              <thead><tr><th>Cliente</th><th>Contrato</th><th>Proyecto</th><th>Turno</th><th /></tr></thead>
              <tbody>
                {activeAssignments.map((a, i) => (
                  <tr key={a.id || i}>
                    <td>{clientName(a.mantId)}</td>
                    <td className="nk-person-text-muted">{contractName(a.mantId)}</td>
                    <td className="nk-person-text-strong">{projectName(a.mantId)}</td>
                    <td>{a.turno || '—'}</td>
                    <td><button className="nk-button nk-button-quiet" type="button" onClick={() => onRetirar(a.mantId)}>Retirar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardSection>

      <CardSection title="Datos personales" subtitle="Identificación, contacto y previsión.">
        <div className="nk-person-grid">
          <Field label="Teléfono"><input className="nk-input" value={worker.tel || ''} onChange={e => onChange('tel', e.target.value)} /></Field>
          <Field label="Correo electrónico"><input className="nk-input" type="email" value={worker.email || ''} onChange={e => onChange('email', e.target.value)} /></Field>
          <Field label="Ciudad / comuna"><input className="nk-input" value={worker.ciudad || ''} onChange={e => onChange('ciudad', e.target.value)} /></Field>
          <Field label="Región"><input className="nk-input" value={worker.region || ''} onChange={e => onChange('region', e.target.value)} /></Field>
          <Field label="Fecha de nacimiento"><input className="nk-input" type="date" value={worker.nacimiento || ''} onChange={e => onChange('nacimiento', e.target.value)} /></Field>
          <Field label="AFP"><input className="nk-input" value={worker.afp || ''} onChange={e => onChange('afp', e.target.value)} /></Field>
          <Field label="Previsión de salud"><input className="nk-input" value={worker.salud || ''} onChange={e => onChange('salud', e.target.value)} /></Field>
          <Field label="Mutual de seguridad"><input className="nk-input" value={worker.mutual || ''} onChange={e => onChange('mutual', e.target.value)} /></Field>
        </div>
      </CardSection>

      <CardSection title="Perfil operacional" subtitle="Cargo, especialidad, disponibilidad y contexto habilitado.">
        <div className="nk-person-grid">
          <Field label="Cargo"><input className="nk-input" value={worker.cargo || ''} onChange={e => onChange('cargo', e.target.value)} /></Field>
          <Field label="Rol operacional"><input className="nk-input" value={worker.rol || ''} onChange={e => onChange('rol', e.target.value)} /></Field>
          <Field label="Especialidad">
            <select className="nk-select" value={worker.especialidad || ''} onChange={e => onChange('especialidad', e.target.value)}>
              <option value="">Seleccionar</option>
              {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Disponibilidad">
            <select className="nk-select" value={worker.disponibilidad || 'disponible'} onChange={e => onChange('disponibilidad', e.target.value)}>
              <option value="disponible">Disponible</option><option value="asignado">Asignado</option><option value="vacaciones">Vacaciones</option><option value="bloqueado">Restringido</option>
            </select>
          </Field>
          <Field label="Tipo de vínculo">
            <select className="nk-select" value={worker.tipo || 'permanente'} onChange={e => onChange('tipo', e.target.value)}>
              <option value="permanente">Permanente</option><option value="esporadico">Por proyecto</option>
            </select>
          </Field>
          <Field label="Jornada habitual">
            <select className="nk-select" value={worker.regimen || '5x2'} onChange={e => onChange('regimen', e.target.value)}>
              {['5x2', '4x3', '7x7', '6x1', 'turno_especial'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <div className="nk-person-grid-wide">
            <Field label="Clientes habilitados">
              <div className="nk-person-chip-list">
                {clientes.length === 0 ? <span className="nk-person-text-sub">Sin clientes configurados.</span> : clientes.map(c => {
                  const active = (worker.mineras || []).includes(c.id)
                  return (
                    <label key={c.id} className={`nk-person-choice ${active ? 'active' : ''}`}>
                      <input type="checkbox" checked={active} onChange={e => {
                        const current = worker.mineras || []
                        onChange('mineras', e.target.checked ? [...current, c.id] : current.filter(id => id !== c.id))
                      }} />
                      {c.nombre}
                    </label>
                  )
                })}
              </div>
            </Field>
          </div>
        </div>
        <div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div>
      </CardSection>

      <CardSection title="Alojamiento" subtitle="Estadías activas vinculadas a la operación.">
        {(worker._hotelAsig || []).length === 0 ? <p className="nk-person-text-sub">Sin alojamiento asignado actualmente.</p> : (
          <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Hotel</th><th>Proyecto</th><th>Pieza</th><th>Turno</th><th>Check-in</th><th>Check-out</th></tr></thead><tbody>
            {(worker._hotelAsig || []).map((h, i) => <tr key={h.id || i}><td>{h.hotelNombre || h.hotelId || '—'}</td><td>{h.mantNombre || h.mantId || '—'}</td><td>{h.pieza || '—'}</td><td>{h.turno || '—'}</td><td>{h.checkin || '—'}</td><td>{h.checkout || '—'}</td></tr>)}
          </tbody></table></div>
        )}
      </CardSection>
    </>
  )
}

function DocumentsTab({ worker, tabKey, onAddDoc, onDelDoc, saving }) {
  const fileRef = useRef()
  const tipos = TIPOS_POR_TAB[tabKey]
  const [form, setForm] = useState({ type: tipos[0].value, name: '', vence: '', notes: '', fileName: '' })
  const docs = (worker.workerItems || []).filter(d => tabKey === 'cursos' ? ['curso', 'certificacion'].includes(d.type) : !['curso'].includes(d.type))
  const reqs = getRequiredItems(worker)
  const requirements = tabKey === 'cursos' ? reqs.filter(r => ['curso', 'certificacion'].includes(r.type)) : reqs.filter(r => !['curso'].includes(r.type))

  async function add() {
    if (!form.name.trim()) return
    await onAddDoc({ ...form, id: `d_${Date.now()}`, cargado: new Date().toISOString().split('T')[0] })
    setForm({ type: tipos[0].value, name: '', vence: '', notes: '', fileName: '' })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <CardSection title={tabKey === 'cursos' ? 'Registrar formación o certificación' : 'Cargar documentación'} subtitle="El estado documental se calcula con la vigencia de los requisitos aplicables." action={<button className="nk-button nk-button-primary" type="button" disabled={saving || !form.name.trim()} onClick={add}>{saving ? 'Guardando…' : 'Guardar registro'}</button>}>
        <div className="nk-person-grid">
          <Field label="Tipo"><select className="nk-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
          <Field label="Nombre / referencia"><input className="nk-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} list={`sugg-${tabKey}`} /><datalist id={`sugg-${tabKey}`}>{requirements.map(r => <option key={r.name} value={r.name} />)}</datalist></Field>
          <Field label="Fecha de vencimiento"><input className="nk-input" type="date" value={form.vence} onChange={e => setForm(f => ({ ...f, vence: e.target.value }))} /></Field>
          <Field label="Archivo"><input ref={fileRef} className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const file = e.target.files?.[0]; setForm(f => ({ ...f, fileName: file?.name || '' })) }} />{form.fileName && <span className="nk-person-file-name"><IconPaperclip size={12} />{form.fileName}</span>}</Field>
          <div className="nk-person-grid-wide"><Field label="Notas"><input className="nk-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field></div>
        </div>
      </CardSection>

      <CardSection title="Checklist de habilitación" subtitle="Requisitos base y por especialidad.">
        <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Requisito</th><th>Tipo</th><th>Estado</th><th>Fuente</th></tr></thead><tbody>
          {requirements.map((req, i) => { const status = reqStatus(worker, req); return <tr key={`${req.type}-${req.name}-${i}`}><td className="nk-person-text-strong">{req.name}</td><td>{ITEM_TYPES[req.type] || req.type}</td><td><span className={`nk-badge ${status.ok ? 'nk-badge-ok' : 'nk-badge-error'}`}>{status.ok ? 'Vigente' : 'No habilitado'}</span></td><td className="nk-person-text-sub">{status.src}</td></tr> })}
        </tbody></table></div>
      </CardSection>

      <CardSection title={tabKey === 'cursos' ? `Formación registrada (${docs.length})` : `Documentos cargados (${docs.length})`} subtitle="Los registros pueden reemplazarse cuando cambie su vigencia o contenido.">
        {docs.length === 0 ? <div className="nk-person-empty-compact"><IconFileText size={28} strokeWidth={1.3} />Sin registros cargados.</div> : (
          <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Tipo</th><th>Nombre</th><th>Vence</th><th>Estado</th><th>Archivo</th><th /></tr></thead><tbody>
            {docs.map((d, i) => {
              const days = diasHasta(d.vence)
              const badgeClass = days === null ? 'nk-badge-none' : days < 0 ? 'nk-badge-error' : days <= 30 ? 'nk-badge-warn' : 'nk-badge-ok'
              const badgeLabel = days === null ? 'Sin información' : days < 0 ? 'No habilitado' : days <= 30 ? 'Por vencer' : 'Vigente'
              const idx = (worker.workerItems || []).findIndex(x => x.id === d.id)
              return <tr key={d.id || i}><td><span className="nk-badge nk-badge-none">{ITEM_TYPES[d.type] || d.type}</span></td><td><span className="nk-person-text-strong">{d.name}</span>{d.notes && <div className="nk-person-text-sub">{d.notes}</div>}</td><td>{d.vence || '—'}</td><td><span className={`nk-badge ${badgeClass}`}>{badgeLabel}</span></td><td>{d.fileName ? <span className="nk-person-file-name"><IconPaperclip size={12} />{d.fileName}</span> : '—'}</td><td><button className="nk-button nk-button-quiet" type="button" onClick={() => onDelDoc(idx)}>Eliminar</button></td></tr>
            })}
          </tbody></table></div>
        )}
      </CardSection>
    </>
  )
}

function EppTab({ worker, saving, onChange, onSave, deliveries }) {
  const epp = worker.epp || {}
  const fields = [
    ['ropa', 'Ropa / Polera', 'XS a 5XL'], ['pantalon', 'Pantalón', 'Talla o número'],
    ['calzado', 'Calzado', 'Número'], ['guante', 'Guante / contorno mano', 'Talla o cm'],
    ['casco', 'Casco / contorno cabeza', 'Talla o cm'], ['arnes', 'Arnés / estatura / peso', 'Talla, cm y kg'],
    ['respirador', 'Respirador / fit test', 'Talla y fecha'],
  ]
  const personDeliveries = deliveries.filter(d => d.workerId === worker.id).sort((a, b) => String(b.deliveredAt).localeCompare(String(a.deliveredAt)))

  return (
    <>
      <CardSection title="Tallas y medidas" subtitle="Información para asignación segura de protección personal." action={<SaveButton saving={saving} onClick={onSave} />}>
        <div className="nk-person-grid">{fields.map(([key, label, ph]) => <Field key={key} label={label}><input className="nk-input" value={epp[key] || ''} placeholder={ph} onChange={e => onChange('epp', { ...epp, [key]: e.target.value })} /></Field>)}</div>
      </CardSection>
      <CardSection title="Historial de entregas EPP" subtitle="Marca, certificación, talla y reposición de recursos entregados.">
        {personDeliveries.length === 0 ? <div className="nk-person-empty-compact"><IconShield size={28} strokeWidth={1.3} />Sin entregas registradas.</div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Fecha</th><th>EPP</th><th>Talla</th><th>Marca / certificación</th><th>Reposición</th></tr></thead><tbody>{personDeliveries.map((d, i) => <tr key={d.id || i}><td>{d.deliveredAt || '—'}</td><td className="nk-person-text-strong">{d.itemName || '—'}</td><td>{d.size || '—'}</td><td>{d.brandModel || '—'}<div className="nk-person-text-sub">{d.certification || 'Sin certificado registrado'}</div></td><td>{d.replaceAt || 'Según inspección'}</td></tr>)}</tbody></table></div>}
      </CardSection>
    </>
  )
}

function HistoryTab({ worker, proyectos, clientes }) {
  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const clientName = id => { const p = proyectos.find(current => current.id === id); return clientes.find(c => c.id === p?.minaId)?.nombre || '—' }
  const rows = worker._asignaciones || []
  return <CardSection title="Historial operativo" subtitle="Proyectos y servicios asociados a la persona.">{rows.length === 0 ? <div className="nk-person-empty-compact"><IconHistory size={28} strokeWidth={1.3} />Sin proyectos en el historial.</div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Proyecto / servicio</th><th>Cliente</th><th>Turno</th><th>Estado</th></tr></thead><tbody>{rows.map((a, i) => <tr key={a.id || i}><td className="nk-person-text-strong">{projectName(a.mantId)}</td><td>{clientName(a.mantId)}</td><td>{a.turno || '—'}</td><td><span className={`nk-badge ${a.estado === 'confirmado' ? 'nk-badge-ok' : a.estado === 'preasignado' ? 'nk-badge-warn' : 'nk-badge-none'}`}>{a.estado || 'activo'}</span></td></tr>)}</tbody></table></div>}</CardSection>
}

export default function FichaTrabajadorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stateData, setStateData] = useState(null)
  const [worker, setWorker] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [tab, setTab] = useState('datos')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  useEffect(() => {
    api.get('/state').then(r => {
      const state = r?.state || r
      setStateData(state)
      const found = (state?.trabajadores || []).find(person => person.id === id)
      if (!found) return
      const personAssignments = (state?.asignaciones || []).filter(a => a.trabId === id)
      const hotelAssignments = (state?.hotelAsig || []).filter(h => h.trabId === id).map(h => ({
        ...h,
        hotelNombre: (state?.hoteles || []).find(current => current.id === h.hotelId)?.nombre,
        mantNombre: (state?.mantenciones || []).find(current => current.id === h.mantId)?.nombre,
      }))
      setWorker({ ...found, _asignaciones: personAssignments, _hotelAsig: hotelAssignments })
      setAssignments(state?.asignaciones || [])
    }).catch(() => setError('No fue posible cargar la ficha.'))
  }, [id])

  function onChange(field, value) {
    setWorker(current => ({ ...current, [field]: value }))
  }

  async function persistWorker(nextWorker, reason) {
    setSaving(true); setError(null); setOk(null)
    try {
      const r = await api.get('/state')
      const state = r?.state || r
      const version = r?.moduleVersions?.trabajadores ?? 0
      const { _asignaciones, _hotelAsig, ...clean } = nextWorker
      const list = (state?.trabajadores || []).map(person => person.id === id ? clean : person)
      await api.put('/state/modules', { reason, changes: { trabajadores: { version, data: list } } })
      setWorker(nextWorker)
      setOk('Cambios guardados correctamente')
      setTimeout(() => setOk(null), 2500)
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    await persistWorker(worker, `Actualización ficha ${worker.nombre}`)
  }

  async function handleAddDoc(doc) {
    const next = { ...worker, workerItems: [...(worker.workerItems || []), doc] }
    await persistWorker(next, `Documento agregado a ${worker.nombre}`)
  }

  async function handleDelDoc(idx) {
    const next = { ...worker, workerItems: (worker.workerItems || []).filter((_, i) => i !== idx) }
    await persistWorker(next, `Documento eliminado de ${worker.nombre}`)
  }

  async function persistAssignments(nextAssignments, nextWorker, reason) {
    setSaving(true); setError(null); setOk(null)
    try {
      const r = await api.get('/state')
      const state = r?.state || r
      const versionA = r?.moduleVersions?.asignaciones ?? 0
      const versionT = r?.moduleVersions?.trabajadores ?? 0
      const { _asignaciones, _hotelAsig, ...clean } = nextWorker
      const workers = (state?.trabajadores || []).map(person => person.id === id ? clean : person)
      await api.put('/state/modules', {
        reason,
        changes: {
          asignaciones: { version: versionA, data: nextAssignments },
          trabajadores: { version: versionT, data: workers },
        },
      })
      setAssignments(nextAssignments)
      setWorker(nextWorker)
      setOk('Asignación actualizada')
      setTimeout(() => setOk(null), 2500)
    } catch (e) {
      setError(e.message || 'Error al actualizar asignación')
    } finally {
      setSaving(false)
    }
  }

  async function handleAsignar(mantId, turno) {
    if (assignments.some(a => a.trabId === id && a.mantId === mantId)) {
      setError('La persona ya está asignada a ese proyecto.')
      return
    }
    const nextAssignments = [...assignments, { id: `asig_${Date.now()}`, mantId, trabId: id, turno, estado: 'confirmado' }]
    const nextWorker = { ...worker, _asignaciones: nextAssignments.filter(a => a.trabId === id), disponibilidad: 'asignado' }
    await persistAssignments(nextAssignments, nextWorker, `Asignación actualizada para ${worker.nombre}`)
  }

  async function handleRetirar(mantId) {
    const nextAssignments = assignments.filter(a => !(a.trabId === id && a.mantId === mantId))
    const availability = nextAssignments.some(a => a.trabId === id) ? 'asignado' : 'disponible'
    const nextWorker = { ...worker, _asignaciones: nextAssignments.filter(a => a.trabId === id), disponibilidad: availability }
    await persistAssignments(nextAssignments, nextWorker, `Asignación retirada para ${worker.nombre}`)
  }

  if (!stateData) return <div className="nk-person-loading"><div><div className="nk-person-spinner" /><p>Cargando ficha…</p></div></div>
  if (!worker) return <div className="nk-person-loading"><p>Persona no encontrada.</p></div>

  const pct = acreditacionPct(worker)
  const stateClass = statusClass(pct)
  const clientes = stateData?.minas || []
  const proyectos = stateData?.mantenciones || []
  const contratos = stateData?.contratos || []
  const deliveries = stateData?.eppDeliveries || []

  return (
    <div className="nk-person-detail">
      <header className="nk-person-detail-header">
        <div className="nk-person-detail-top">
          <div className="nk-person-identity">
            <button className="nk-person-back" type="button" onClick={() => navigate('/app/trabajadores')}><IconArrowLeft size={15} strokeWidth={1.7} /> Personas</button>
            <span className="nk-person-separator">/</span>
            <div className="nk-person-avatar">{initials(worker.nombre)}</div>
            <div><h1 className="nk-person-title">{worker.nombre}</h1><p className="nk-person-meta">{worker.rut} · {worker.cargo || worker.especialidad || 'Sin cargo'}</p></div>
          </div>
          <div className="nk-person-header-actions">
            <BadgeDisp value={worker.disponibilidad} />
            <span className={`nk-badge ${pct >= 85 ? 'nk-badge-ok' : pct >= 60 ? 'nk-badge-warn' : 'nk-badge-error'}`}>{pct}% habilitación</span>
            {worker.tel && <a className="nk-person-whatsapp" href={`https://wa.me/${String(worker.tel).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${worker.nombre.split(' ')[0]}, le contacta el equipo de operaciones.`)}`} target="_blank" rel="noopener noreferrer"><IconBrandWhatsapp size={14} strokeWidth={1.7} /> WhatsApp</a>}
          </div>
        </div>
        <div className="nk-person-compliance"><div className="nk-person-progress-track"><div className={`nk-person-progress-bar ${stateClass}`} style={{ width: `${pct}%` }} /></div><span className={`nk-person-progress-value ${stateClass}`}>{pct}%</span></div>
        <div className="nk-person-tabs"><div className="nk-tabs">{TABS.map(({ key, label, icon: Icon }) => <button key={key} className={`nk-tab ${tab === key ? 'active' : ''}`} type="button" onClick={() => setTab(key)}><Icon size={14} strokeWidth={1.7} /> {label}</button>)}</div></div>
      </header>

      {(error || ok) && <div className={`nk-person-feedback ${error ? 'error' : 'success'}`}>{error ? <IconAlertTriangle size={15} /> : <IconCheck size={15} />}<span>{error || ok}</span><button className="nk-person-feedback-close" type="button" onClick={() => { setError(null); setOk(null) }} aria-label="Cerrar mensaje"><IconX size={15} /></button></div>}

      <main className="nk-person-detail-content"><div className="nk-person-detail-inner">
        {tab === 'datos' && <DataTab worker={worker} clientes={clientes} proyectos={proyectos} contratos={contratos} asignaciones={assignments} saving={saving} onChange={onChange} onSave={handleSave} onAsignar={handleAsignar} onRetirar={handleRetirar} />}
        {tab === 'docs' && <DocumentsTab worker={worker} tabKey="docs" onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} saving={saving} />}
        {tab === 'cursos' && <DocumentsTab worker={worker} tabKey="cursos" onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} saving={saving} />}
        {tab === 'epp' && <EppTab worker={worker} saving={saving} onChange={onChange} onSave={handleSave} deliveries={deliveries} />}
        {tab === 'historial' && <HistoryTab worker={worker} proyectos={proyectos} clientes={clientes} />}
      </div></main>
    </div>
  )
}
