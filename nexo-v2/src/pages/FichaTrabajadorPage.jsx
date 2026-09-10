import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconAlertTriangle, IconArrowLeft, IconBook, IconBrandWhatsapp,
  IconCheck, IconDeviceFloppy, IconDownload, IconFileText, IconHistory,
  IconLoader2, IconPaperclip, IconPlus, IconShield, IconUser, IconX,
} from '@tabler/icons-react'
import { api, getCsrf } from '../services/api.js'
import { StatusBadge } from '../components/ui/StatusBadge.jsx'
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
  { type: 'contrato', name: 'Anexo asociado al servicio' },
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
  const expectedName = req.name.toLowerCase().split('/')[0].trim()
  const isCvRequirement = req.type === 'documento' && expectedName.startsWith('cv')
  const typeMatches = item.type === req.type || (isCvRequirement && item.type === 'cv')
  return typeMatches && item.name?.toLowerCase().includes(expectedName)
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
  return <StatusBadge value={value} />
}

function Field({ label, children }) {
  return <div className="nk-field"><label className="nk-label">{label}</label>{children}</div>
}

function CardSection({ title, subtitle, action, children }) {
  return (
    <section className="nk-card nk-person-card">
      <header className="nk-person-card-head"><div><h3 className="nk-person-card-title">{title}</h3>{subtitle && <p className="nk-person-card-subtitle">{subtitle}</p>}</div>{action}</header>
      <div className="nk-person-card-body">{children}</div>
    </section>
  )
}

function SaveButton({ saving, onClick }) {
  return <button className="nk-button nk-button-primary" type="button" onClick={onClick} disabled={saving}>{saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconDeviceFloppy size={15} strokeWidth={1.7} />}{saving ? 'Guardando…' : 'Guardar cambios'}</button>
}

function DataTab({ worker, clientes, proyectos, contratos, asignaciones, saving, onChange, onSave, onAsignar, onRetirar }) {
  const [contratoId, setContratoId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [turno, setTurno] = useState('día')
  const activeAssignments = asignaciones.filter(a => a.trabId === worker.id)
  const proyectosFiltrados = contratoId ? proyectos.filter(p => p.contratoId === contratoId) : []
  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const contractName = id => { const p = proyectos.find(current => current.id === id); return contratos.find(c => c.id === p?.contratoId)?.nombre || '—' }
  const clientName = id => { const p = proyectos.find(current => current.id === id); return clientes.find(c => c.id === p?.minaId)?.nombre || '—' }

  return <>
    <CardSection title="Asignación operacional" subtitle="Relaciona la persona con contrato, proyecto/servicio y turno sin perder su documentación.">
      <div className="nk-person-assignment-form">
        <Field label="Contrato"><select className="nk-select" value={contratoId} onChange={e => { setContratoId(e.target.value); setProyectoId('') }}><option value="">Seleccionar contrato</option>{contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
        <Field label="Proyecto / servicio"><select className="nk-select" value={proyectoId} onChange={e => setProyectoId(e.target.value)} disabled={!contratoId}><option value="">Seleccionar proyecto</option>{proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
        <Field label="Turno"><select className="nk-select" value={turno} onChange={e => setTurno(e.target.value)}><option value="día">Día</option><option value="noche">Noche</option><option value="ambos">Ambos</option></select></Field>
        <button className="nk-button nk-button-action" type="button" disabled={!proyectoId} onClick={() => onAsignar(proyectoId, turno)}><IconPlus size={15} strokeWidth={1.7} /> Asignar</button>
      </div>
      {activeAssignments.length === 0 ? <p className="nk-person-text-sub">Sin asignaciones activas.</p> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Cliente</th><th>Contrato</th><th>Proyecto</th><th>Turno</th><th /></tr></thead><tbody>{activeAssignments.map((a, i) => <tr key={a.id || i}><td>{clientName(a.mantId)}</td><td className="nk-person-text-muted">{contractName(a.mantId)}</td><td className="nk-person-text-strong">{projectName(a.mantId)}</td><td>{a.turno || '—'}</td><td><button className="nk-button nk-button-quiet" type="button" onClick={() => onRetirar(a.mantId)}>Retirar</button></td></tr>)}</tbody></table></div>}
    </CardSection>

    <CardSection title="Datos personales" subtitle="Identificación, contacto y previsión."><div className="nk-person-grid">
      <Field label="Teléfono"><input className="nk-input" value={worker.tel || ''} onChange={e => onChange('tel', e.target.value)} /></Field>
      <Field label="Correo electrónico"><input className="nk-input" type="email" value={worker.email || ''} onChange={e => onChange('email', e.target.value)} /></Field>
      <Field label="Ciudad / comuna"><input className="nk-input" value={worker.ciudad || ''} onChange={e => onChange('ciudad', e.target.value)} /></Field>
      <Field label="Región"><input className="nk-input" value={worker.region || ''} onChange={e => onChange('region', e.target.value)} /></Field>
      <Field label="Fecha de nacimiento"><input className="nk-input" type="date" value={worker.nacimiento || ''} onChange={e => onChange('nacimiento', e.target.value)} /></Field>
      <Field label="AFP"><input className="nk-input" value={worker.afp || ''} onChange={e => onChange('afp', e.target.value)} /></Field>
      <Field label="Previsión de salud"><input className="nk-input" value={worker.salud || ''} onChange={e => onChange('salud', e.target.value)} /></Field>
      <Field label="Mutual de seguridad"><input className="nk-input" value={worker.mutual || ''} onChange={e => onChange('mutual', e.target.value)} /></Field>
    </div></CardSection>

    <CardSection title="Perfil operacional" subtitle="Cargo, especialidad, disponibilidad y contexto habilitado."><div className="nk-person-grid">
      <Field label="Cargo"><input className="nk-input" value={worker.cargo || ''} onChange={e => onChange('cargo', e.target.value)} /></Field>
      <Field label="Rol operacional"><input className="nk-input" value={worker.rol || ''} onChange={e => onChange('rol', e.target.value)} /></Field>
      <Field label="Especialidad"><select className="nk-select" value={worker.especialidad || ''} onChange={e => onChange('especialidad', e.target.value)}><option value="">Seleccionar</option>{ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}</select></Field>
      <Field label="Disponibilidad"><select className="nk-select" value={worker.disponibilidad || 'disponible'} onChange={e => onChange('disponibilidad', e.target.value)}><option value="disponible">Disponible</option><option value="asignado">Asignado</option><option value="vacaciones">Vacaciones</option><option value="bloqueado">Restringido</option></select></Field>
      <Field label="Tipo de vínculo"><select className="nk-select" value={worker.tipo || 'permanente'} onChange={e => onChange('tipo', e.target.value)}><option value="permanente">Permanente</option><option value="esporadico">Por proyecto</option></select></Field>
      <Field label="Jornada habitual"><select className="nk-select" value={worker.regimen || '5x2'} onChange={e => onChange('regimen', e.target.value)}>{['5x2', '4x3', '7x7', '6x1', 'turno_especial'].map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
      <div className="nk-person-grid-wide"><Field label="Clientes habilitados"><div className="nk-person-chip-list">{clientes.length === 0 ? <span className="nk-person-text-sub">Sin clientes configurados.</span> : clientes.map(c => { const active = (worker.mineras || []).includes(c.id); return <label key={c.id} className={`nk-person-choice ${active ? 'active' : ''}`}><input type="checkbox" checked={active} onChange={e => { const current = worker.mineras || []; onChange('mineras', e.target.checked ? [...current, c.id] : current.filter(id => id !== c.id)) }} />{c.nombre}</label> })}</div></Field></div>
    </div><div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div></CardSection>

    <CardSection title="Alojamiento" subtitle="Estadías activas vinculadas a la operación.">{(worker._hotelAsig || []).length === 0 ? <p className="nk-person-text-sub">Sin alojamiento asignado actualmente.</p> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Hotel</th><th>Proyecto</th><th>Pieza</th><th>Turno</th><th>Check-in</th><th>Check-out</th></tr></thead><tbody>{worker._hotelAsig.map((h, i) => <tr key={h.id || i}><td>{h.hotelNombre || h.hotelId || '—'}</td><td>{h.mantNombre || h.mantId || '—'}</td><td>{h.pieza || '—'}</td><td>{h.turno || '—'}</td><td>{h.checkin || '—'}</td><td>{h.checkout || '—'}</td></tr>)}</tbody></table></div>}</CardSection>
  </>
}

async function uploadWorkerFile(workerId, file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entityType', 'worker_document')
  formData.append('entityId', workerId)
  const headers = {}
  const csrf = getCsrf()
  if (csrf) headers['x-csrf-token'] = csrf
  const response = await fetch('/api/files', { method: 'POST', credentials: 'same-origin', headers, body: formData })
  if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.message || err.error || 'No fue posible almacenar el archivo') }
  return response.json()
}

function DocsTab({ worker, tabKey, onPersistItems, onError }) {
  const fileRef = useRef(null)
  const checklistFileRef = useRef(null)
  const tipos = TIPOS_POR_TAB[tabKey]
  const [form, setForm] = useState({ type: tipos[0].value, name: '', vence: '', notes: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [pendingRequirement, setPendingRequirement] = useState(null)

  const docs = (worker.workerItems || []).filter(d => tabKey === 'cursos' ? ['curso', 'certificacion'].includes(d.type) : !['curso'].includes(d.type))
  const reqs = getRequiredItems(worker)
  const reqsFiltrados = tabKey === 'cursos' ? reqs.filter(r => ['curso', 'certificacion'].includes(r.type)) : reqs.filter(r => !['curso'].includes(r.type))

  async function guardar() {
    if (!form.name.trim() || uploading) return
    setUploading(true)
    try {
      let fileMeta = {}
      if (selectedFile) {
        const uploaded = await uploadWorkerFile(worker.id, selectedFile)
        fileMeta = { fileId: uploaded.id, fileName: uploaded.original_name || selectedFile.name, fileType: uploaded.content_type, fileSize: uploaded.byte_size }
      }
      const item = { ...form, ...fileMeta, id: `d_${Date.now()}`, cargado: new Date().toISOString().split('T')[0] }
      await onPersistItems([...(worker.workerItems || []), item], `Documento agregado: ${form.name}`)
      setForm({ type: tipos[0].value, name: '', vence: '', notes: '' }); setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) { onError(e.message || 'Error al cargar el archivo') } finally { setUploading(false) }
  }

  function chooseRequirementFile(req) {
    if (uploading) return
    setPendingRequirement(req)
    if (checklistFileRef.current) { checklistFileRef.current.value = ''; checklistFileRef.current.click() }
  }

  async function uploadRequirement(event) {
    const file = event.target.files?.[0]
    const req = pendingRequirement
    event.target.value = ''
    if (!file || !req || uploading) return
    setUploading(true)
    try {
      const uploaded = await uploadWorkerFile(worker.id, file)
      const item = {
        id: `d_${Date.now()}`,
        type: req.type,
        name: req.name,
        vence: '',
        notes: 'Carga directa desde checklist de ingreso',
        cargado: new Date().toISOString().split('T')[0],
        fileId: uploaded.id,
        fileName: uploaded.original_name || file.name,
        fileType: uploaded.content_type,
        fileSize: uploaded.byte_size,
      }
      await onPersistItems([...(worker.workerItems || []), item], `Requisito cargado desde checklist: ${req.name}`)
    } catch (e) {
      onError(e.message || 'Error al cargar el requisito')
    } finally {
      setUploading(false)
      setPendingRequirement(null)
    }
  }

  async function eliminar(doc) {
    const next = (worker.workerItems || []).filter(item => item.id !== doc.id)
    await onPersistItems(next, `Documento eliminado: ${doc.name}`)
  }

  return <>
    <CardSection title={tabKey === 'cursos' ? 'Registrar formación o certificación' : 'Cargar documentación'} subtitle="El archivo queda almacenado de forma privada y asociado a la persona. Máximo 25 MB." action={<button className="nk-button nk-button-primary" type="button" onClick={guardar} disabled={!form.name.trim() || uploading}>{uploading ? <IconLoader2 size={15} className="animate-spin" /> : <IconPaperclip size={15} strokeWidth={1.7} />}{uploading ? 'Cargando…' : 'Guardar registro'}</button>}>
      <div className="nk-person-grid">
        <Field label="Tipo"><select className="nk-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <Field label="Nombre / referencia"><input className="nk-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} list={`sugg-${tabKey}`} /><datalist id={`sugg-${tabKey}`}>{reqs.map(r => <option key={r.name} value={r.name} />)}</datalist></Field>
        <Field label="Fecha de vencimiento"><input className="nk-input" type="date" value={form.vence} onChange={e => setForm(f => ({ ...f, vence: e.target.value }))} /></Field>
        <Field label="Archivo"><input ref={fileRef} className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />{selectedFile && <span className="nk-person-file"><IconPaperclip size={13} />{selectedFile.name}</span>}</Field>
        <div className="nk-person-grid-wide"><Field label="Notas"><input className="nk-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field></div>
      </div>
    </CardSection>

    <CardSection title="Checklist de ingreso" subtitle="Requisitos base y por especialidad. Los faltantes pueden cargarse directamente desde esta tabla.">
      <input ref={checklistFileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={uploadRequirement} />
      <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Requisito</th><th>Tipo</th><th>Estado</th><th>Fuente</th><th /></tr></thead><tbody>
        {reqsFiltrados.map((req, i) => { const st = reqStatus(worker, req); const isUploading = uploading && pendingRequirement?.type === req.type && pendingRequirement?.name === req.name; return <tr key={`${req.type}-${req.name}-${i}`}><td className="nk-person-text-strong">{req.name}</td><td>{ITEM_TYPES[req.type] || req.type}</td><td><span className={`nk-badge ${st.ok ? 'nk-badge-ok' : 'nk-badge-error'}`}>{st.ok ? 'Vigente' : 'No habilitado'}</span></td><td className="nk-person-text-muted">{st.src}</td><td>{!st.ok && <button className="nk-button nk-button-quiet" type="button" disabled={uploading} onClick={() => chooseRequirementFile(req)}>{isUploading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPaperclip size={14} />}{isUploading ? 'Cargando…' : 'Cargar'}</button>}</td></tr> })}
      </tbody></table></div>
    </CardSection>

    <CardSection title={tabKey === 'cursos' ? `Formación registrada (${docs.length})` : `Documentos cargados (${docs.length})`} subtitle="Los archivos nuevos pueden descargarse directamente desde la ficha.">
      {docs.length === 0 ? <div className="nk-empty"><IconFileText size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin registros cargados</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Tipo</th><th>Nombre</th><th>Vence</th><th>Estado</th><th>Archivo</th><th /></tr></thead><tbody>{docs.map((d, i) => { const days = diasHasta(d.vence); const cls = days === null ? 'nk-badge-none' : days < 0 ? 'nk-badge-error' : days <= 30 ? 'nk-badge-warn' : 'nk-badge-ok'; const label = days === null ? 'Sin información' : days < 0 ? 'No habilitado' : days <= 30 ? 'Por vencer' : 'Vigente'; return <tr key={d.id || i}><td><span className="nk-badge nk-badge-none">{ITEM_TYPES[d.type] || d.type}</span></td><td><strong>{d.name}</strong>{d.notes && <div className="nk-person-text-sub">{d.notes}</div>}</td><td>{d.vence || '—'}</td><td><span className={`nk-badge ${cls}`}>{label}</span></td><td>{d.fileId ? <a className="nk-button nk-button-quiet" href={`/api/files/${d.fileId}`}><IconDownload size={14} strokeWidth={1.7} />{d.fileName || 'Descargar'}</a> : d.fileName ? <span className="nk-person-text-muted" title="Registro antiguo: el archivo físico no fue almacenado">{d.fileName} · no disponible</span> : <span className="nk-person-text-sub">Sin archivo</span>}</td><td><button className="nk-button nk-button-quiet" type="button" onClick={() => eliminar(d)}>Eliminar</button></td></tr> })}</tbody></table></div>}
    </CardSection>
  </>
}

function EppTab({ worker, saving, onChange, onSave, deliveries }) {
  const epp = worker.epp || {}
  const fields = [['ropa', 'Ropa / Polera'], ['pantalon', 'Pantalón'], ['calzado', 'Calzado'], ['guante', 'Guante'], ['casco', 'Casco'], ['arnes', 'Arnés'], ['respirador', 'Respirador / fit test']]
  const rows = deliveries.filter(d => d.workerId === worker.id).sort((a, b) => String(b.deliveredAt).localeCompare(String(a.deliveredAt)))
  return <>
    <CardSection title="Tallas y medidas" subtitle="Datos para gestionar la entrega de protección personal."><div className="nk-person-grid">{fields.map(([key, label]) => <Field key={key} label={label}><input className="nk-input" value={epp[key] || ''} onChange={e => onChange('epp', { ...epp, [key]: e.target.value })} /></Field>)}</div><div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div></CardSection>
    <CardSection title="Historial de entregas EPP" subtitle="Entregas, certificación y fecha de reposición.">{rows.length === 0 ? <div className="nk-empty"><IconShield size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin entregas registradas</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Fecha</th><th>EPP</th><th>Talla</th><th>Marca / certificación</th><th>Reposición</th></tr></thead><tbody>{rows.map((d, i) => <tr key={d.id || i}><td>{d.deliveredAt || '—'}</td><td className="nk-person-text-strong">{d.itemName || '—'}</td><td>{d.size || '—'}</td><td>{d.brandModel || '—'}<div className="nk-person-text-sub">{d.certification || 'Sin certificado'}</div></td><td>{d.replaceAt || 'Según inspección'}</td></tr>)}</tbody></table></div>}</CardSection>
  </>
}

function HistoryTab({ worker, proyectos, clientes }) {
  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const clientName = id => { const p = proyectos.find(current => current.id === id); return clientes.find(c => c.id === p?.minaId)?.nombre || '—' }
  const rows = worker._asignaciones || []
  return <CardSection title="Historial operacional" subtitle="Proyectos y servicios asociados a la persona.">{rows.length === 0 ? <div className="nk-empty"><IconHistory size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin proyectos en el historial</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Proyecto / servicio</th><th>Cliente</th><th>Turno</th><th>Estado</th></tr></thead><tbody>{rows.map((a, i) => <tr key={a.id || i}><td className="nk-person-text-strong">{projectName(a.mantId)}</td><td>{clientName(a.mantId)}</td><td>{a.turno || '—'}</td><td><span className="nk-badge nk-badge-none">{a.estado || 'activo'}</span></td></tr>)}</tbody></table></div>}</CardSection>
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

  useEffect(() => { api.get('/state').then(r => {
    const s = r?.state || r; setStateData(s); const found = (s?.trabajadores || []).find(w => w.id === id); if (!found) return
    const workerAssignments = (s?.asignaciones || []).filter(a => a.trabId === id)
    const hotelAssignments = (s?.hotelAsig || []).filter(h => h.trabId === id).map(h => ({ ...h, hotelNombre: (s?.hoteles || []).find(ho => ho.id === h.hotelId)?.nombre, mantNombre: (s?.mantenciones || []).find(m => m.id === h.mantId)?.nombre }))
    setWorker({ ...found, _asignaciones: workerAssignments, _hotelAsig: hotelAssignments }); setAssignments(s?.asignaciones || [])
  }).catch(e => setError(e.message || 'Error al cargar la ficha')) }, [id])

  function onChange(field, value) { setWorker(current => ({ ...current, [field]: value })) }
  async function persistWorker(nextWorker, reason) { const r = await api.get('/state'); const s = r?.state || r; const version = r?.moduleVersions?.trabajadores ?? 0; const { _asignaciones, _hotelAsig, ...clean } = nextWorker; const list = (s?.trabajadores || []).map(item => item.id === id ? clean : item); await api.put('/state/modules', { reason, changes: { trabajadores: { version, data: list } } }); setWorker(nextWorker) }
  async function handleSave() { setSaving(true); setError(null); setOk(null); try { await persistWorker(worker, `Actualización ficha ${worker.nombre}`); setOk('Cambios guardados correctamente'); setTimeout(() => setOk(null), 2500) } catch (e) { setError(e.message || 'Error al guardar') } finally { setSaving(false) } }
  async function persistItems(items, reason) { try { const next = { ...worker, workerItems: items }; await persistWorker(next, reason); setOk('Documentación actualizada'); setTimeout(() => setOk(null), 2500) } catch (e) { setError(e.message || 'Error al guardar documentación'); throw e } }
  async function persistAssignments(nextAssignments, nextAvailability, reason) { const r = await api.get('/state'); const s = r?.state || r; const versionA = r?.moduleVersions?.asignaciones ?? 0; const versionT = r?.moduleVersions?.trabajadores ?? 0; const { _asignaciones, _hotelAsig, ...cleanWorker } = worker; cleanWorker.disponibilidad = nextAvailability; const workers = (s?.trabajadores || []).map(item => item.id === id ? cleanWorker : item); await api.put('/state/modules', { reason, changes: { asignaciones: { version: versionA, data: nextAssignments }, trabajadores: { version: versionT, data: workers } } }); setAssignments(nextAssignments); setWorker(current => ({ ...current, disponibilidad: nextAvailability, _asignaciones: nextAssignments.filter(a => a.trabId === id) })) }
  async function handleAsignar(mantId, turno) { if (!mantId || assignments.some(a => a.trabId === id && a.mantId === mantId)) { if (mantId) setError('La persona ya está asignada a ese proyecto'); return } try { const next = [...assignments, { id: `asig_${Date.now()}`, mantId, trabId: id, turno, estado: 'confirmado' }]; await persistAssignments(next, 'asignado', `Asignación operacional de ${worker.nombre}`); setOk('Asignación guardada') } catch (e) { setError(e.message || 'Error al guardar asignación') } }
  async function handleRetirar(mantId) { try { const next = assignments.filter(a => !(a.trabId === id && a.mantId === mantId)); const availability = next.some(a => a.trabId === id) ? 'asignado' : 'disponible'; await persistAssignments(next, availability, `Retiro de asignación de ${worker.nombre}`); setOk('Asignación actualizada') } catch (e) { setError(e.message || 'Error al retirar asignación') } }

  if (!stateData) return <div className="nk-person-state"><IconLoader2 size={28} className="animate-spin" /><span>Cargando ficha…</span></div>
  if (!worker) return <div className="nk-person-state">Persona no encontrada.</div>
  const pct = acreditacionPct(worker); const clientes = stateData?.minas || []; const proyectos = stateData?.mantenciones || []; const contratos = stateData?.contratos || []; const deliveries = stateData?.eppDeliveries || []

  return <div className="nk-person-page">
    <header className="nk-person-header"><div className="nk-person-header-top"><div className="nk-person-identity"><button className="nk-person-back" type="button" onClick={() => navigate('/app/trabajadores')}><IconArrowLeft size={15} strokeWidth={1.7} /> Personas</button><span className="nk-person-divider">/</span><div className="nk-person-avatar">{initials(worker.nombre)}</div><div><h1>{worker.nombre}</h1><p>{worker.rut} · {worker.cargo || worker.especialidad || 'Sin cargo'}</p></div></div><div className="nk-person-header-actions"><BadgeDisp value={worker.disponibilidad} /><span className={`nk-badge nk-badge-${statusClass(pct)}`}>{pct}% habilitado</span>{worker.tel && <a className="nk-button nk-button-secondary" href={`https://wa.me/${worker.tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><IconBrandWhatsapp size={15} /> WhatsApp</a>}</div></div><div className="nk-person-progress"><div className={`nk-person-progress-fill ${statusClass(pct)}`} style={{ width: `${pct}%` }} /></div><div className="nk-tabs nk-person-tabs">{TABS.map(({ key, label, icon: Icon }) => <button key={key} className={`nk-tab ${tab === key ? 'active' : ''}`} type="button" onClick={() => setTab(key)}><Icon size={14} strokeWidth={1.7} /> {label}</button>)}</div></header>
    {(error || ok) && <div className={`nk-person-feedback ${error ? 'error' : 'ok'}`}>{error ? <IconAlertTriangle size={15} /> : <IconCheck size={15} />}<span>{error || ok}</span><button type="button" onClick={() => { setError(null); setOk(null) }} aria-label="Cerrar"><IconX size={14} /></button></div>}
    <main className="nk-person-content">{tab === 'datos' && <DataTab worker={worker} clientes={clientes} proyectos={proyectos} contratos={contratos} asignaciones={assignments} saving={saving} onChange={onChange} onSave={handleSave} onAsignar={handleAsignar} onRetirar={handleRetirar} />}{tab === 'docs' && <DocsTab worker={worker} tabKey="docs" onPersistItems={persistItems} onError={setError} />}{tab === 'cursos' && <DocsTab worker={worker} tabKey="cursos" onPersistItems={persistItems} onError={setError} />}{tab === 'epp' && <EppTab worker={worker} saving={saving} onChange={onChange} onSave={handleSave} deliveries={deliveries} />}{tab === 'historial' && <HistoryTab worker={worker} proyectos={proyectos} clientes={clientes} />}</main>
  </div>
}
