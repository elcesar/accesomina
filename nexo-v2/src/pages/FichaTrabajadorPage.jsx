import { ActionButton } from '../components/ui/ActionButton.jsx'
import { formatChileDate } from '../services/chile-format.js'
import { documentStatus, requirementStatus, requirementSummary } from '../services/worker-document-status.js'
import { localDate } from '../services/calendar-date.js'
import { Children, cloneElement, isValidElement, useEffect, useId, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconAlertTriangle, IconArrowLeft, IconBook, IconBrandWhatsapp,
  IconBan, IconCheck, IconDeviceFloppy, IconDownload, IconFileText, IconHistory,
  IconLoader2, IconPaperclip, IconPlus, IconShield, IconUser, IconUserCheck, IconX,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import { PhoneInput } from '../components/ui/PhoneInput.jsx'
import { BirthDateInput } from '../components/ui/BirthDateInput.jsx'
import { EmailInput } from '../components/ui/EmailInput.jsx'
import { AFP_CHILE, PREVISION_SALUD_CHILE } from '../services/chile-social-security.js'
import { EMAIL_ERROR, normalizeEmail, validateEmail } from '../services/email-validation.js'
import {
  assignmentIsOperational,
  employmentRelationship,
  hasActiveRestriction,
  operationalStatus,
  projectCanAcceptAssignment,
  workerOperationalAssignments,
} from '../services/worker-segments.js'
import { StatusBadge } from '../components/ui/StatusBadge.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { comunasDeRegion, regionesChile } from '../config/chile-geography.js'
import { WORKER_ASSIGNMENT_SHIFTS, WORKER_REGIMENS, WORKER_SPECIALTIES, isCanonicalWorkerRegimen, workerRegimenLabel } from '../config/worker-catalogs.js'
import { PPE_SIZE_FIELDS, normalizeWorkerEpp, updateWorkerEpp } from '../config/ppe-catalog.js'
import {
  DOCUMENT_TYPE_OPTIONS,
  documentRule,
  workerItemType,
} from '../services/worker-document-rules.js'
import { removeUploadedFiles, uploadDocumentFiles } from '../services/worker-document-upload.js'
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
  { type: 'documento', documentType: 'IDENTITY_CARD', name: 'Cédula de identidad' },
  { type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', name: 'Contrato de trabajo' },
  { type: 'contrato', documentType: 'SERVICE_ANNEX', name: 'Anexo asociado al servicio' },
  { type: 'documento', documentType: 'AFP_CERTIFICATE', name: 'Certificado AFP' },
  { type: 'documento', documentType: 'AFC_CERTIFICATE', name: 'Certificado AFC' },
  { type: 'documento', documentType: 'HEALTH_INSURANCE_CERTIFICATE', name: 'Certificado Fonasa/Isapre' },
  { type: 'examen', documentType: 'MEDICAL_EXAM', name: 'Examen preocupacional' },
  { type: 'curso', documentType: 'ODI_ACKNOWLEDGMENT', name: 'ODI / Derecho a Saber' },
  { type: 'curso', documentType: 'INTERNAL_REGULATION_ACKNOWLEDGMENT', name: 'Reglamento Interno' },
  { type: 'documento', documentType: 'CV', name: 'CV actualizado' },
]

const REQUIRED_BY_SPECIALTY = {
  Eléctrico: [{ type: 'curso', name: 'Arc Flash' }, { type: 'certificacion', name: 'Certificación eléctrica' }],
  Instrumentista: [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Mecánico Industrial': [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Soldador 6G': [{ type: 'curso', name: 'Trabajos en caliente' }, { type: 'certificacion', name: 'Calificación soldador 6G' }],
  Rigger: [{ type: 'certificacion', name: 'Certificación Rigger' }, { type: 'curso', name: 'Izaje de cargas' }],
  'Maestro Andamios': [{ type: 'curso', name: 'Trabajo en altura física' }],
}

const TABS = [
  { key: 'datos', label: 'Resumen', icon: IconUser },
  { key: 'docs', label: 'Documentos y aptitudes', icon: IconFileText },
  { key: 'cursos', label: 'Formación y certificaciones', icon: IconBook },
  { key: 'epp', label: 'Operación y EPP', icon: IconShield },
  { key: 'historial', label: 'Historial', icon: IconHistory },
]

const COURSE_DOCUMENT_TYPES = new Set(['ODI_ACKNOWLEDGMENT', 'INTERNAL_REGULATION_ACKNOWLEDGMENT', 'CERTIFICATION', 'TRAINING'])
const documentOptionsForTab = tabKey => DOCUMENT_TYPE_OPTIONS.filter(option => tabKey === 'cursos' ? COURSE_DOCUMENT_TYPES.has(option.value) : !COURSE_DOCUMENT_TYPES.has(option.value))

function initials(name) {
  const parts = (name || '').trim().split(' ')
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

function matchItem(item, req) {
  if (req.documentType && item.documentType) return req.documentType === item.documentType
  const expectedName = req.name.toLowerCase().split('/')[0].trim()
  const isCvRequirement = req.type === 'documento' && expectedName.startsWith('cv')
  const typeMatches = item.type === req.type || (isCvRequirement && item.type === 'cv')
  return typeMatches && item.name?.toLowerCase().includes(expectedName)
}

function getRequiredItems(worker) {
  return [...REQUIRED_ITEMS, ...(REQUIRED_BY_SPECIALTY[worker.especialidad] || [])]
}

function reqStatus(worker, req) {
  return requirementStatus((worker.workerItems || []).filter(current => matchItem(current, req)))
}

function acreditacionPct(worker) {
  const reqs = getRequiredItems(worker)
  return requirementSummary(reqs.map(req => (worker.workerItems || []).filter(current => matchItem(current, req)))).percentage
}

function statusClass(pct) {
  if (pct >= 85) return 'ok'
  if (pct >= 60) return 'warn'
  return 'error'
}

function BadgeDisp({ value }) {
  return <StatusBadge value={value} />
}

function Field({ label, hint, htmlFor, children }) {
  const generatedId=useId()
  const list=Children.toArray(children)
  const index=list.findIndex(child=>isValidElement(child)&&(['input','select','textarea'].includes(child.type)||[PhoneInput,EmailInput,BirthDateInput].includes(child.type)))
  const inputId=htmlFor||list[index]?.props?.id||generatedId
  const controls=list.map((child,i)=>i===index?cloneElement(child,{id:inputId}):child)
  return <div className="nk-field"><label className="nk-label" htmlFor={inputId}>{label}</label>{controls}{hint && <p className="nk-person-field-hint">{hint}</p>}</div>
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
  return <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-primary" type="button" onClick={onClick} disabled={saving}>{saving ? <IconLoader2 size={15} className="animate-spin" /> : <IconDeviceFloppy size={15} strokeWidth={1.7} />}{saving ? 'Guardando…' : 'Guardar cambios'}</ActionButton>
}

function DataTab({ worker, emailError, clientes, proyectos, contratos, asignaciones, restrictions, saving, onChange, onSave, onAsignar, onRetirar, isRestricted, onMakeFixed, onMakeAvailable, onRestrict, onLiftRestriction }) {
  const [contratoId, setContratoId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [turno, setTurno] = useState('día')
  const assignmentGroups = workerOperationalAssignments(worker, asignaciones, proyectos)
  const activeAssignments = assignmentGroups.current
  const scheduledAssignments = assignmentGroups.scheduled
  const proyectosFiltrados = contratoId ? proyectos.filter(p => p.contratoId === contratoId) : []
  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const contractName = id => { const p = proyectos.find(current => current.id === id); return contratos.find(c => c.id === p?.contratoId)?.nombre || '—' }
  const clientName = id => { const p = proyectos.find(current => current.id === id); return clientes.find(c => c.id === p?.minaId)?.nombre || '—' }
  const comunas = comunasDeRegion(worker.region)
  const updateRegion = event => { onChange('region', event.target.value); onChange('ciudad', '') }
  const relationship = employmentRelationship(worker)
  const availability = operationalStatus(worker, asignaciones, restrictions, proyectos)
  const relationshipLabel = relationship === 'fijo' ? 'Trabajador fijo' : relationship === 'proyecto' ? 'Trabajador por proyecto' : 'Sin vínculo laboral definido'
  const availabilityLabel = availability === 'asignado' ? 'Asignado' : availability === 'restringido' ? 'No habilitado' : availability === 'vacaciones' ? 'Vacaciones' : availability === 'regularizacion' ? 'Requiere regularización' : 'Disponible'

  return <>
    <CardSection title="Estado de la persona" subtitle="La relación laboral y la situación operacional se administran por separado.">
      <div className="nk-actions">
        {isRestricted ? <>
          <span className={`nk-badge ${relationship === 'fijo' ? 'nk-badge-none' : 'nk-badge-warn'}`}>Relación laboral: {relationshipLabel}</span>
          <span className="nk-badge nk-badge-error">Disponibilidad: No habilitado</span>
          <button className="nk-button nk-button-secondary" type="button" onClick={onLiftRestriction}><IconUserCheck size={15} /> Habilitar</button>
        </> : <>
          <span className={`nk-badge ${relationship === 'fijo' ? 'nk-badge-none' : relationship === 'proyecto' ? 'nk-badge-warn' : 'nk-badge-ok'}`}>Relación laboral: {relationshipLabel}</span>
          <span className={`nk-badge ${['asignado', 'vacaciones', 'regularizacion'].includes(availability) ? 'nk-badge-warn' : 'nk-badge-ok'}`}>Disponibilidad: {availabilityLabel}</span>
          <ActionButton disabledReason="La persona ya se encuentra disponible." className="nk-button nk-button-secondary" type="button" onClick={onMakeAvailable} disabled={availability === 'disponible'}>Dejar disponible</ActionButton>
          <button className="nk-button nk-button-secondary" type="button" onClick={onMakeFixed}>Convertir en fijo</button>
          <button className="nk-button nk-button-quiet" type="button" onClick={onRestrict}><IconBan size={15} /> No habilitar</button>
        </>}
      </div>
      {!isRestricted && activeAssignments.length > 0 && <p className="nk-person-text-sub">La asignación modifica la disponibilidad, no la relación laboral. Para devolver la persona al pool se retiran sus asignaciones operacionales y quedan registradas en el historial.</p>}
    </CardSection>

    <CardSection title="Asignación operacional" subtitle="Relaciona la persona con contrato, proyecto/servicio y turno sin perder su documentación.">
      <div className="nk-person-assignment-form">
        <Field label="Contrato"><select className="nk-select" value={contratoId} onChange={e => { setContratoId(e.target.value); setProyectoId('') }}><option value="">Seleccionar contrato</option>{contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
        <Field label="Proyecto / servicio"><select className="nk-select" value={proyectoId} onChange={e => setProyectoId(e.target.value)} disabled={!contratoId}><option value="">Seleccionar proyecto</option>{proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Field>
        <Field label="Turno"><select className="nk-select" value={turno} onChange={e => setTurno(e.target.value)}>{WORKER_ASSIGNMENT_SHIFTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
        <ActionButton disabledReason="Selecciona un proyecto y verifica que la persona no tenga restricciones activas." className="nk-button nk-button-action" type="button" disabled={!proyectoId || isRestricted} onClick={() => onAsignar(proyectoId, turno)}><IconPlus size={15} strokeWidth={1.7} /> Asignar</ActionButton>
      </div>
      {isRestricted && <p className="nk-person-text-sub">No se pueden crear asignaciones mientras la persona esté no habilitada.</p>}
      {activeAssignments.length === 0 ? <p className="nk-person-text-sub">Sin asignaciones operacionales vigentes.</p> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Cliente</th><th>Contrato</th><th>Proyecto</th><th>Turno</th><th /></tr></thead><tbody>{activeAssignments.map((a, i) => <tr key={a.id || i}><td>{clientName(a.mantId)}</td><td className="nk-person-text-muted">{contractName(a.mantId)}</td><td className="nk-person-text-strong">{projectName(a.mantId)}</td><td>{a.turno || '—'}</td><td><button className="nk-button nk-button-quiet" type="button" onClick={() => onRetirar(a.mantId)}>Retirar</button></td></tr>)}</tbody></table></div>}
      {scheduledAssignments.length > 0 && <p className="nk-person-text-sub">Programación futura: {scheduledAssignments.map(item => projectName(item.mantId)).join(' · ')}.</p>}
      {assignmentGroups.inconsistent.length > 0 && <p className="nk-person-text-sub">Hay asignaciones con una orden inexistente o con estado no reconocido. Regularízalas antes de operar.</p>}
    </CardSection>

    <CardSection title="Datos personales" subtitle="Identificación, contacto y previsión."><div className="nk-person-grid">
      <Field label="Teléfono"><PhoneInput value={worker.tel || ''} onChange={value => onChange('tel', value)} /></Field>
      <Field label="Correo electrónico" htmlFor="worker-email"><EmailInput id="worker-email" value={worker.email} error={emailError} onChange={value => onChange('email', value)} /></Field>
      <Field label="Región"><select className="nk-select" value={worker.region || ''} onChange={updateRegion}><option value="">Seleccionar región</option>{regionesChile.map(region => <option key={region} value={region}>{region}</option>)}</select></Field>
      <Field label="Ciudad / comuna"><select className="nk-select" value={worker.ciudad || ''} disabled={!worker.region} onChange={e => onChange('ciudad', e.target.value)}><option value="">{worker.region ? 'Seleccionar comuna o ciudad' : 'Primero selecciona una región'}</option>{worker.ciudad && !comunas.includes(worker.ciudad) && <option value={worker.ciudad}>{worker.ciudad}</option>}{comunas.map(comuna => <option key={comuna} value={comuna}>{comuna}</option>)}</select></Field>
      <Field label="Fecha de nacimiento"><BirthDateInput value={worker.nacimiento || ''} onChange={value => onChange('nacimiento', value)} /></Field>
      <Field label="AFP"><select className="nk-select" value={worker.afp || ''} onChange={e => onChange('afp', e.target.value)}><option value="">Seleccionar AFP</option>{worker.afp && !AFP_CHILE.includes(worker.afp) && <option value={worker.afp}>{worker.afp}</option>}{AFP_CHILE.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
      <Field label="Previsión de salud"><select className="nk-select" value={worker.salud || ''} onChange={e => onChange('salud', e.target.value)}><option value="">Seleccionar previsión de salud</option>{worker.salud && !PREVISION_SALUD_CHILE.includes(worker.salud) && <option value={worker.salud}>{worker.salud}</option>}{PREVISION_SALUD_CHILE.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
    </div></CardSection>

    <CardSection title="Perfil operacional" subtitle="El cargo contractual, la función en faena y la especialidad cumplen propósitos distintos."><div className="nk-person-grid">
      <Field label="Cargo contractual" hint="Puesto indicado en el contrato de trabajo."><input className="nk-input" value={worker.cargo || ''} onChange={e => onChange('cargo', e.target.value)} /></Field>
      <Field label="Función en faena" hint="Responsabilidad operacional opcional."><input className="nk-input" value={worker.rol || ''} onChange={e => onChange('rol', e.target.value)} /></Field>
      <Field label="Especialidad" hint="Se utiliza para dotación, requisitos y cobertura."><select className="nk-select" value={worker.especialidad || ''} onChange={e => onChange('especialidad', e.target.value)}><option value="">Seleccionar</option>{worker.especialidad && !WORKER_SPECIALTIES.some(item => item.value === worker.especialidad) && <option value={worker.especialidad}>{worker.especialidad}</option>}{WORKER_SPECIALTIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="Evaluación de desempeño" hint="Se registra después del alta de la persona."><select className="nk-select" value={worker.calificacion || ''} onChange={e => onChange('calificacion', e.target.value)}><option value="">Sin evaluación</option><option value="insuficiente">Insuficiente</option><option value="en_desarrollo">En desarrollo</option><option value="suficiente">Suficiente</option><option value="bueno">Bueno</option><option value="destacado">Destacado</option>{worker.calificacion && !['insuficiente','en_desarrollo','suficiente','bueno','destacado'].includes(String(worker.calificacion)) && <option value={worker.calificacion}>Histórica: {worker.calificacion}</option>}</select></Field>
      <Field label="Jornada habitual"><select className="nk-select" value={worker.regimen || '5x2'} onChange={e => onChange('regimen', e.target.value)}>{worker.regimen && !isCanonicalWorkerRegimen(worker.regimen) && <option value={worker.regimen}>{workerRegimenLabel(worker.regimen)} (valor histórico)</option>}{WORKER_REGIMENS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <div className="nk-person-grid-wide"><Field label="Clientes habilitados"><div className="nk-person-chip-list">{clientes.length === 0 ? <span className="nk-person-text-sub">Sin clientes configurados.</span> : clientes.map(c => { const active = (worker.mineras || []).includes(c.id); return <label key={c.id} className={`nk-person-choice ${active ? 'active' : ''}`}><input type="checkbox" checked={active} onChange={e => { const current = worker.mineras || []; onChange('mineras', e.target.checked ? [...current, c.id] : current.filter(id => id !== c.id)) }} />{c.nombre}</label> })}</div></Field></div>
    </div><div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div></CardSection>

    <CardSection title="Alojamiento y estadías" subtitle="Estadías activas vinculadas a la operación.">{(worker._hotelAsig || []).length === 0 ? <p className="nk-person-text-sub">Sin alojamiento asignado actualmente.</p> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Hotel</th><th>Proyecto</th><th>Pieza</th><th>Turno</th><th>Check-in</th><th>Check-out</th></tr></thead><tbody>{worker._hotelAsig.map((h, i) => <tr key={h.id || i}><td>{h.hotelNombre || h.hotelId || '—'}</td><td>{h.mantNombre || h.mantId || '—'}</td><td>{h.pieza || '—'}</td><td>{h.turno || '—'}</td><td>{h.checkin || '—'}</td><td>{h.checkout || '—'}</td></tr>)}</tbody></table></div>}</CardSection>
  </>
}

async function uploadWorkerFile(workerId, file) {
  return api.upload('/files', file, { entityType:'worker_document', entityId:workerId })
}

async function removeWorkerFile(fileId) {
  return api.delete(`/files/${encodeURIComponent(fileId)}`)
}

function DocsTab({ worker, tabKey, onAppendItem, onRemoveItem, onError }) {
  const fileRef = useRef(null)
  const checklistFileRef = useRef(null)
  const documentTypes = documentOptionsForTab(tabKey)
  const [form, setForm] = useState({ documentType: documentTypes[0]?.value || 'OTHER', name: '', vence: '', notes: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [frontFile, setFrontFile] = useState(null)
  const [backFile, setBackFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [pendingRequirement, setPendingRequirement] = useState(null)
  const [documentToRemove, setDocumentToRemove] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const docs = (worker.workerItems || []).filter(d => tabKey === 'cursos' ? ['curso', 'certificacion'].includes(d.type) : !['curso'].includes(d.type))
  const reqs = getRequiredItems(worker)
  const reqsFiltrados = tabKey === 'cursos' ? reqs.filter(r => ['curso', 'certificacion'].includes(r.type)) : reqs.filter(r => !['curso'].includes(r.type))
  const rule = documentRule(form.documentType, form.name)
  const evidenceMissing = rule.twoSided ? (!frontFile || !backFile || !form.vence) : !selectedFile
  const evidenceHint = rule.twoSided ? 'Adjunta anverso y reverso e ingresa el vencimiento antes de guardar.' : 'Adjunta el archivo del documento antes de guardar.'

  async function guardar() {
    if (!form.name.trim() || uploading || evidenceMissing) return
    setUploading(true)
    let uploadedFiles = []
    try {
      let fileMeta = {}
      if (rule.twoSided) {
        uploadedFiles = await uploadDocumentFiles({ workerId: worker.id, files: [{ side: 'front', file: frontFile }, { side: 'back', file: backFile }], uploadFile: uploadWorkerFile, removeFile: removeWorkerFile })
        fileMeta = { files: uploadedFiles.map(({deduplicated,...file})=>file), fileId: uploadedFiles[0].fileId, fileName: uploadedFiles[0].fileName, fileType: uploadedFiles[0].fileType, fileSize: uploadedFiles[0].fileSize }
      } else if (selectedFile) {
        const uploaded = await uploadWorkerFile(worker.id, selectedFile)
        uploadedFiles = [{ fileId: uploaded.id, deduplicated: uploaded.deduplicated === true }]
        fileMeta = { fileId: uploaded.id, fileName: uploaded.original_name || selectedFile.name, fileType: uploaded.content_type, fileSize: uploaded.byte_size }
      }
      const item = { ...form, type: workerItemType(rule.code, form.name), documentType: rule.code, vence: rule.expiration === 'never' ? '' : form.vence, ...fileMeta, id: `d_${Date.now()}`, cargado: localDate() }
      await onAppendItem(item, `Documento agregado: ${form.name}`)
      uploadedFiles = []
      setForm({ documentType: documentTypes[0]?.value || 'OTHER', name: '', vence: '', notes: '' }); setSelectedFile(null); setFrontFile(null); setBackFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) { await removeUploadedFiles(uploadedFiles, removeWorkerFile); onError(e.message || 'Error al cargar el archivo') } finally { setUploading(false) }
  }

  function chooseRequirementFile(req) {
    if (uploading) return
    const requirementRule = documentRule(req.type, req.name, req.documentType)
    if (requirementRule.twoSided) {
      setForm({ documentType: documentRule(req.type, req.name, req.documentType).code, name: req.name, vence: '', notes: 'Carga desde requisito de acreditación' })
      onError(`${req.name} requiere anverso, reverso y fecha de vencimiento. Completa los tres campos del formulario superior.`)
      return
    }
    setPendingRequirement(req)
    if (checklistFileRef.current) { checklistFileRef.current.value = ''; checklistFileRef.current.click() }
  }

  async function uploadRequirement(event) {
    const file = event.target.files?.[0]
    const req = pendingRequirement
    event.target.value = ''
    if (!file || !req || uploading) return
    setUploading(true)
    let uploadedFileId = null
    try {
      const uploaded = await uploadWorkerFile(worker.id, file)
      uploadedFileId = uploaded.deduplicated ? null : uploaded.id
      const item = {
        id: `d_${Date.now()}`,
        type: req.type,
        documentType: documentRule(req.type, req.name, req.documentType).code,
        name: req.name,
        vence: '',
        notes: 'Carga directa desde checklist de ingreso',
        cargado: localDate(),
        fileId: uploaded.id,
        fileName: uploaded.original_name || file.name,
        fileType: uploaded.content_type,
        fileSize: uploaded.byte_size,
      }
      await onAppendItem(item, `Requisito cargado desde checklist: ${req.name}`)
    } catch (e) {
      if (uploadedFileId) await removeWorkerFile(uploadedFileId).catch(() => {})
      onError(e.message || 'Error al cargar el requisito')
    } finally {
      setUploading(false)
      setPendingRequirement(null)
    }
  }

  function solicitarEliminacion(doc) {
    if (uploading) return
    setDeleteError(null)
    setDocumentToRemove(doc)
  }

  function cancelarEliminacion() {
    if (uploading) return
    setDocumentToRemove(null)
    setDeleteError(null)
  }

  async function eliminarConfirmado() {
    if (!documentToRemove || uploading) return
    setDeleteError(null)
    setUploading(true)
    try {
      await onRemoveItem(documentToRemove)
      setDocumentToRemove(null)
    } catch (e) {
      const message = e.message || 'Error al eliminar el documento'
      setDeleteError(message)
      onError(message)
    } finally {
      setUploading(false)
    }
  }

  return <>
    <CardSection title={tabKey === 'cursos' ? 'Agregar formación o certificación' : 'Agregar documento, examen o aptitud'} subtitle={rule.twoSided ? 'La cédula y la licencia requieren anverso, reverso y fecha de vencimiento. Máximo 25 MB por archivo.' : rule.expiration === 'never' ? 'Este antecedente no requiere fecha de vencimiento. Máximo 25 MB.' : 'El archivo queda almacenado de forma privada y asociado a la persona. Máximo 25 MB.'} action={<ActionButton disabledReason="Completa los datos obligatorios y revisa las selecciones de este formulario para continuar." className="nk-button nk-button-primary" type="button" onClick={guardar} aria-describedby={evidenceMissing ? "worker-document-evidence-hint" : undefined} disabled={!form.name.trim() || uploading || evidenceMissing}>{uploading ? <IconLoader2 size={15} className="animate-spin" /> : <IconPaperclip size={15} strokeWidth={1.7} />}{uploading ? 'Cargando…' : 'Guardar registro'}</ActionButton>}>
      {evidenceMissing && <p id="worker-document-evidence-hint" className="nk-field-help">{evidenceHint}</p>}
      <div className="nk-person-grid">
        <Field label="Tipo" htmlFor="worker-document-type"><select id="worker-document-type" className="nk-select" value={form.documentType} onChange={e => setForm(f => { const documentType = e.target.value; const selected = DOCUMENT_TYPE_OPTIONS.find(option => option.value === documentType); const previous = DOCUMENT_TYPE_OPTIONS.find(option => option.value === f.documentType); const useSuggestedName = !f.name.trim() || f.name === previous?.label; const name = useSuggestedName ? (selected?.label || '') : f.name; return { ...f, documentType, name, vence: documentRule(documentType, name).expiration === 'never' ? '' : f.vence } })}>{documentTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <Field label="Nombre / referencia" htmlFor="worker-document-name"><input id="worker-document-name" className="nk-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, vence: documentRule(f.documentType, e.target.value).expiration === 'never' ? '' : f.vence }))} list={`sugg-${tabKey}`} /><datalist id={`sugg-${tabKey}`}>{reqs.map(r => <option key={r.name} value={r.name} />)}</datalist></Field>
        {rule.expiration !== 'never' && <Field label={rule.expiration === 'required' ? 'Fecha de vencimiento obligatoria' : 'Fecha de vencimiento'} htmlFor="worker-document-expiry"><input id="worker-document-expiry" className="nk-input" type="date" required={rule.expiration === 'required'} value={form.vence} onChange={e => setForm(f => ({ ...f, vence: e.target.value }))} /></Field>}
        {rule.twoSided ? <><Field label="Archivo anverso" htmlFor="worker-document-front"><input id="worker-document-front" className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFrontFile(e.target.files?.[0] || null)} />{frontFile && <span className="nk-person-file"><IconPaperclip size={13} />{frontFile.name}</span>}</Field><Field label="Archivo reverso" htmlFor="worker-document-back"><input id="worker-document-back" className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setBackFile(e.target.files?.[0] || null)} />{backFile && <span className="nk-person-file"><IconPaperclip size={13} />{backFile.name}</span>}</Field></> : <Field label="Archivo" htmlFor="worker-document-file"><input id="worker-document-file" ref={fileRef} className="nk-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />{selectedFile && <span className="nk-person-file"><IconPaperclip size={13} />{selectedFile.name}</span>}</Field>}
        <div className="nk-person-grid-wide"><Field label="Notas"><input className="nk-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Field></div>
      </div>
    </CardSection>

    <CardSection title="Requisitos de documentos y aptitudes" subtitle="Requisitos base y por especialidad. Los faltantes pueden cargarse directamente desde esta tabla.">
      <input ref={checklistFileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={uploadRequirement} />
      <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Requisito</th><th>Tipo</th><th>Estado</th><th>Fuente</th><th /></tr></thead><tbody>
        {reqsFiltrados.map((req, i) => { const st = reqStatus(worker, req); const isUploading = uploading && pendingRequirement?.type === req.type && pendingRequirement?.name === req.name; const evidenceRule = documentRule(req.type, req.name, req.documentType); return <tr key={`${req.type}-${req.name}-${i}`}><td className="nk-person-text-strong">{req.name}</td><td>{ITEM_TYPES[req.type] || req.type}</td><td><span className={`nk-badge ${st.className}`}>{st.label}</span></td><td className="nk-person-text-muted">{st.source}</td><td>{!st.ok && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-quiet" type="button" disabled={uploading} onClick={() => chooseRequirementFile(req)}>{isUploading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPaperclip size={14} />}{isUploading ? 'Cargando…' : evidenceRule.twoSided ? 'Completar' : 'Cargar'}</ActionButton>}</td></tr> })}
      </tbody></table></div>
    </CardSection>

    <CardSection title={tabKey === 'cursos' ? `Formación registrada (${docs.length})` : `Documentos cargados (${docs.length})`} subtitle="Los archivos nuevos pueden descargarse directamente desde la ficha.">
      {docs.length === 0 ? <div className="nk-empty"><IconFileText size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin registros cargados</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Tipo</th><th>Nombre</th><th>Vence</th><th>Estado</th><th>Archivo</th><th /></tr></thead><tbody>{docs.map((d, i) => { const status = documentStatus(d); const files = Array.isArray(d.files) ? d.files : []; return <tr key={d.id || i}><td><span className="nk-badge nk-badge-none">{ITEM_TYPES[d.type] || d.type}</span></td><td><strong>{d.name}</strong>{d.notes && <div className="nk-person-text-sub">{d.notes}</div>}</td><td>{formatChileDate(d.vence || '—')}</td><td><span className={`nk-badge ${status.className}`}>{status.label}</span></td><td>{files.length ? <div className="nk-actions">{files.map(file => <a key={file.fileId} className="nk-button nk-button-quiet" href={`/api/files/${file.fileId}`}><IconDownload size={14} strokeWidth={1.7} />{file.side === 'front' ? 'Anverso' : 'Reverso'}</a>)}</div> : d.fileId ? <a className="nk-button nk-button-quiet" href={`/api/files/${d.fileId}`}><IconDownload size={14} strokeWidth={1.7} />{d.fileName || 'Descargar'}</a> : d.fileName ? <span className="nk-person-text-muted" title="Registro antiguo: el archivo físico no fue almacenado">{d.fileName} · no disponible</span> : <span className="nk-person-text-sub">Sin archivo</span>}</td><td><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-quiet" type="button" disabled={uploading} onClick={() => eliminar(d)}>Eliminar</ActionButton></td></tr> })}</tbody></table></div>}
      {docs.length === 0 ? <div className="nk-empty"><IconFileText size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin registros cargados</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Tipo</th><th>Nombre</th><th>Vence</th><th>Estado</th><th>Archivo</th><th /></tr></thead><tbody>{docs.map((d, i) => { const status = documentStatus(d); const files = Array.isArray(d.files) ? d.files : []; return <tr key={d.id || i}><td><span className="nk-badge nk-badge-none">{ITEM_TYPES[d.type] || d.type}</span></td><td><strong>{d.name}</strong>{d.notes && <div className="nk-person-text-sub">{d.notes}</div>}</td><td>{d.vence || '—'}</td><td><span className={`nk-badge ${status.className}`}>{status.label}</span></td><td>{files.length ? <div className="nk-actions">{files.map(file => <a key={file.fileId} className="nk-button nk-button-quiet" href={`/api/files/${file.fileId}`}><IconDownload size={14} strokeWidth={1.7} />{file.side === 'front' ? 'Anverso' : 'Reverso'}</a>)}</div> : d.fileId ? <a className="nk-button nk-button-quiet" href={`/api/files/${d.fileId}`}><IconDownload size={14} strokeWidth={1.7} />{d.fileName || 'Descargar'}</a> : d.fileName ? <span className="nk-person-text-muted" title="Registro antiguo: el archivo físico no fue almacenado">{d.fileName} · no disponible</span> : <span className="nk-person-text-sub">Sin archivo</span>}</td><td><button className="nk-button nk-button-quiet" type="button" disabled={uploading} onClick={() => solicitarEliminacion(d)}>Eliminar</button></td></tr> })}</tbody></table></div>}
    </CardSection>

    <ConfirmDialog
      open={Boolean(documentToRemove)}
      title="Eliminar documento"
      description={`Se eliminará “${documentToRemove?.name || 'este documento'}” de la ficha de la persona. Esta acción no se puede deshacer desde esta pantalla.`}
      confirmLabel="Eliminar documento"
      variant="danger"
      loading={uploading}
      error={deleteError}
      onCancel={cancelarEliminacion}
      onConfirm={eliminarConfirmado}
    />
  </>
}

function EppTab({ worker, saving, onChange, onSave, deliveries }) {
  const epp = normalizeWorkerEpp(worker.epp)
  const rows = deliveries.filter(d => d.workerId === worker.id).sort((a, b) => String(b.deliveredAt).localeCompare(String(a.deliveredAt)))
  return <>
    <CardSection title="Tallas y medidas" subtitle="Datos para gestionar la entrega de protección personal."><div className="nk-person-grid">{PPE_SIZE_FIELDS.map(field => {
      const value = epp[field.key] ?? ''
      const isHistorical = value && !field.sizes.includes(value)
      return <Field key={field.key} label={field.label}><select className="nk-select" value={value} disabled={field.fixed} onChange={event => onChange('epp', updateWorkerEpp(worker.epp, field.key, event.target.value))}>
        {!field.fixed && <option value="">Seleccionar talla</option>}
        {isHistorical && <option value={value}>{value} (valor histórico)</option>}
        {field.sizes.map(size => <option key={size} value={size}>{size}</option>)}
      </select></Field>
    })}</div><div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div></CardSection>
    <CardSection title="Fit Test" subtitle="Verificación de ajuste de protección respiratoria."><label><input type="checkbox" checked={Boolean(epp.fitTest)} onChange={event => onChange('epp', updateWorkerEpp(worker.epp, 'fitTest', event.target.checked))} /> Fit Test aprobado</label><div className="nk-person-save-bar"><SaveButton saving={saving} onClick={onSave} /></div></CardSection>
    <CardSection title="Historial de entregas EPP" subtitle="Entregas, certificación y fecha de reposición.">{rows.length === 0 ? <div className="nk-empty"><IconShield size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin entregas registradas</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Fecha</th><th>EPP</th><th>Talla</th><th>Marca / certificación</th><th>Reposición</th></tr></thead><tbody>{rows.map((d, i) => <tr key={d.id || i}><td>{formatChileDate(d.deliveredAt || '—')}</td><td className="nk-person-text-strong">{d.itemName || '—'}</td><td>{d.size || '—'}</td><td>{d.brandModel || '—'}<div className="nk-person-text-sub">{d.certification || 'Sin certificado'}</div></td><td>{formatChileDate(d.replaceAt || 'Según inspección')}</td></tr>)}</tbody></table></div>}</CardSection>
  </>
}

function HistoryTab({ worker, proyectos, clientes }) {
  const projectName = id => proyectos.find(p => p.id === id)?.nombre || id
  const clientName = id => { const p = proyectos.find(current => current.id === id); return clientes.find(c => c.id === p?.minaId)?.nombre || '—' }
  const rows = worker._asignaciones || []
  return <CardSection title="Historial de la persona" subtitle="Asignaciones operacionales de proyectos y servicios.">{rows.length === 0 ? <div className="nk-empty"><IconHistory size={30} strokeWidth={1.3} /><p className="nk-empty-title">Sin proyectos en el historial</p></div> : <div className="nk-table-wrapper nk-person-table"><table className="nk-table"><thead><tr><th>Proyecto / servicio</th><th>Cliente</th><th>Turno</th><th>Estado</th></tr></thead><tbody>{rows.map((a, i) => <tr key={a.id || i}><td className="nk-person-text-strong">{projectName(a.mantId)}</td><td>{clientName(a.mantId)}</td><td>{a.turno || '—'}</td><td><span className="nk-badge nk-badge-none">{a.estado || 'activo'}</span></td></tr>)}</tbody></table></div>}</CardSection>
}

export default function FichaTrabajadorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stateData, setStateData] = useState(null)
  const [worker, setWorker] = useState(null)
  const [workerRevision, setWorkerRevision] = useState(null)
  const originalProfileRef = useRef(null)
  const [assignments, setAssignments] = useState([])
  const [tab, setTab] = useState('datos')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [emailError, setEmailError] = useState(null)
  const [ok, setOk] = useState(null)
  const [restricting, setRestricting] = useState(false)
  const [restrictionReason, setRestrictionReason] = useState('')

  useEffect(() => {
    // Feedback belongs to the tab/context where the operation occurred.
    // Clear it when navigating to another section of the worker record.
    setError(null)
    setOk(null)
  }, [tab])

  useEffect(() => {
    let active = true
    setWorkerRevision(null)
    originalProfileRef.current = null
    setWorker(null)
    Promise.all([
      api.get('/state?modules=minas,contratos,mantenciones,asignaciones,hotelAsig,hoteles,restricted,eppDeliveries'),
      api.get(`/state/records/trabajadores/${encodeURIComponent(id)}`),
    ]).then(([r, profile]) => {
    if (!active) return
    setWorkerRevision(profile.revision)
    const s = r?.state || r; setStateData(s); const found = profile.record; if (!found) return
    originalProfileRef.current = found
    const workerAssignments = (s?.asignaciones || []).filter(a => a.trabId === id)
    const hotelAssignments = (s?.hotelAsig || []).filter(h => h.trabId === id).map(h => ({ ...h, hotelNombre: (s?.hoteles || []).find(ho => ho.id === h.hotelId)?.nombre, mantNombre: (s?.mantenciones || []).find(m => m.id === h.mantId)?.nombre }))
    setWorker({ ...found, _asignaciones: workerAssignments, _hotelAsig: hotelAssignments }); setAssignments(s?.asignaciones || [])
  }).catch(e => { if (active) setError(e.message || 'Error al cargar la ficha') })
    return () => { active = false }
  }, [id])

  function onChange(field, value) {
    if (field === 'email') setEmailError(null)
    setWorker(current => ({ ...current, [field]: value }))
  }
  function showEmailError(message) {
    setEmailError(message)
    setTab('datos')
    requestAnimationFrame(() => document.getElementById('worker-email')?.focus())
  }
  async function persistWorker(nextWorker, reason) {
    if (!workerRevision || !originalProfileRef.current) throw new Error('La ficha aún no está lista para guardar. Recárgala e inténtalo nuevamente.')
    const fields = ['nombre', 'rut', 'nacimiento', 'tel', 'email', 'region', 'ciudad', 'cargo', 'rol', 'especialidad', 'afp', 'salud', 'epp']
    const original = originalProfileRef.current
    const patch = Object.fromEntries(fields
      .filter(key => nextWorker[key] !== undefined && JSON.stringify(nextWorker[key]) !== JSON.stringify(original[key]))
      .map(key => [key, nextWorker[key]]))
    if (!Object.keys(patch).length) return
    const result = await api.patch(`/state/records/trabajadores/${encodeURIComponent(id)}`, { patch, revision: workerRevision, reason })
    setWorkerRevision(result.revision)
    originalProfileRef.current = result.record
    setWorker(current => ({ ...current, ...result.record, _asignaciones: current?._asignaciones, _hotelAsig: current?._hotelAsig }))
  }
  async function handleSave() {
    setError(null)
    setOk(null)
    const validationError = validateEmail(worker.email)
    if (validationError) {
      showEmailError(validationError)
      return
    }
    setEmailError(null)
    setSaving(true)
    try {
      const nextWorker = { ...worker, ...(typeof worker.email === 'string' ? { email: normalizeEmail(worker.email) } : {}) }
      await persistWorker(nextWorker, `Actualización ficha ${worker.nombre}`)
      setOk('Cambios guardados correctamente')
      setTimeout(() => setOk(null), 2500)
    } catch (e) {
      if (e.code === 'INVALID_WORKER_EMAIL') showEmailError(EMAIL_ERROR)
      else setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }
  async function appendDocument(item, reason) {
    try {
      const result = await api.post(`/state/workers/${encodeURIComponent(id)}/documents`, { item, reason })
      setWorker(current => ({ ...current, workerItems: [...(current.workerItems || []), result.item || item] }))
      setOk('Documentación actualizada')
      setTimeout(() => setOk(null), 2500)
    } catch (e) {
      setError(e.message || 'Error al guardar documentación')
      throw e
    }
  }
  async function removeDocument(item) {
    try {
      await api.delete(`/state/workers/${encodeURIComponent(id)}/documents/${encodeURIComponent(item.id)}`)
      setWorker(current => ({ ...current, workerItems: (current.workerItems || []).filter(document => document.id !== item.id) }))
      setOk('Documento eliminado')
      setTimeout(() => setOk(null), 2500)
    } catch (e) {
      setError(e.message || 'Error al eliminar documentación')
      throw e
    }
  }
  // An assignment changes operational availability, never the person's employment link.
  async function persistAssignments(nextAssignments, nextAvailability, reason) { const r = await api.get('/state'); const s = r?.state || r; const versionA = r?.moduleVersions?.asignaciones ?? 0; const versionT = r?.moduleVersions?.trabajadores ?? 0; const { _asignaciones, _hotelAsig, ...cleanWorker } = worker; cleanWorker.disponibilidad = nextAvailability; const workers = (s?.trabajadores || []).map(item => item.id === id ? cleanWorker : item); await api.put('/state/modules', { reason, changes: { asignaciones: { version: versionA, data: nextAssignments }, trabajadores: { version: versionT, data: workers } } }); setAssignments(nextAssignments); setWorker(current => ({ ...current, disponibilidad: nextAvailability, _asignaciones: nextAssignments.filter(a => a.trabId === id) })) }
  async function handleAsignar(mantId, turno) {
    const projects = stateData?.mantenciones || []
    const restrictions = stateData?.restricted || []
    const project = projects.find(item => String(item.id) === String(mantId))
    if (operationalStatus(worker, assignments, restrictions, projects) === 'restringido') {
      setError('No se puede asignar una persona no habilitada. Habilítala antes de continuar.')
      return
    }
    if (!projectCanAcceptAssignment(project)) {
      setError('La orden seleccionada no está vigente para recibir asignaciones.')
      return
    }
    if (!mantId || assignments.some(a => a.trabId === id && a.mantId === mantId)) {
      if (mantId) setError('La persona ya está asignada a ese proyecto')
      return
    }
    try {
      const next = [...assignments, { id: `asig_${Date.now()}`, mantId, trabId: id, turno, estado: 'confirmado' }]
      const availability = operationalStatus(worker, next, restrictions, projects)
      await persistAssignments(next, availability, `Asignación operacional de ${worker.nombre}`)
      setOk('Asignación guardada')
    } catch (e) { setError(e.message || 'Error al guardar asignación') }
  }
  async function handleRetirar(mantId) {
    try {
      const next = assignments.map(a => a.trabId === id && a.mantId === mantId && assignmentIsOperational(a) ? { ...a, estado: 'retirado', retiradoAt: new Date().toISOString() } : a)
      const availability = operationalStatus(worker, next, stateData?.restricted || [], stateData?.mantenciones || [])
      await persistAssignments(next, availability, `Retiro de asignación de ${worker.nombre}`)
      setOk('Asignación actualizada')
    } catch (e) { setError(e.message || 'Error al retirar asignación') }
  }

  async function persistLifecycle({ reason, workerPatch, assignmentsMapper, restrictionsMapper }) {
    setSaving(true); setError(null); setOk(null)
    try {
      const response = await api.get('/state')
      const state = response?.state || response || {}
      const versionWorkers = response?.moduleVersions?.trabajadores ?? 0
      const versionAssignments = response?.moduleVersions?.asignaciones ?? 0
      const versionRestrictions = response?.moduleVersions?.restricted ?? 0
      const currentWorker = (state.trabajadores || []).find(item => item.id === id)
      if (!currentWorker) throw new Error('La persona ya no está disponible.')
      const nextAssignments = assignmentsMapper ? assignmentsMapper(state.asignaciones || []) : state.asignaciones || []
      const nextRestrictions = restrictionsMapper ? restrictionsMapper(state.restricted || []) : state.restricted || []
      const nextWorker = { ...currentWorker, ...workerPatch }
      const changes = { trabajadores: { version: versionWorkers, data: (state.trabajadores || []).map(item => item.id === id ? nextWorker : item) } }
      if (assignmentsMapper) changes.asignaciones = { version: versionAssignments, data: nextAssignments }
      if (restrictionsMapper) changes.restricted = { version: versionRestrictions, data: nextRestrictions }
      await api.put('/state/modules', { reason, changes })
      setWorker(current => ({ ...current, ...workerPatch, _asignaciones: nextAssignments.filter(item => item.trabId === id) }))
      setAssignments(nextAssignments)
      setStateData(current => ({ ...current, restricted: nextRestrictions }))
      setOk('Estado de la persona actualizado')
      setTimeout(() => setOk(null), 2500)
    } catch (cause) { setError(cause.message || 'No fue posible actualizar el estado') } finally { setSaving(false) }
  }

  function handleMakeAvailable() {
    persistLifecycle({
      reason: `Persona liberada al pool disponible: ${worker.nombre}`,
      workerPatch: { disponibilidad: 'disponible', bloqueado: false },
      assignmentsMapper: list => list.map(item => item.trabId === id && assignmentIsOperational(item) ? { ...item, estado: 'retirado', retiradoAt: new Date().toISOString() } : item),
    })
  }

  function handleMakeFixed() {
    persistLifecycle({ reason: `Persona convertida a trabajador fijo: ${worker.nombre}`, workerPatch: { tipo: 'permanente', employmentProfile: 'permanente', disponibilidad: 'disponible', bloqueado: false } })
  }

  function handleRestrict() {
    if (!restrictionReason.trim()) { setError('Indica el motivo de la restricción.'); return }
    const today = localDate()
    persistLifecycle({
      reason: `Restricción registrada para ${worker.nombre}: ${restrictionReason.trim()}`,
      workerPatch: { bloqueado: true, disponibilidad: 'bloqueado' },
      assignmentsMapper: list => list.map(item => item.trabId === id && assignmentIsOperational(item) ? { ...item, estado: 'suspendido_por_restriccion', suspendedAt: new Date().toISOString() } : item),
      restrictionsMapper: list => [...list, { id: `res_${Date.now()}`, workerId: id, persona: worker.nombre, motivo: restrictionReason.trim(), desde: today, alcance: 'operacional', estado: 'vigente', activa: true, createdAt: new Date().toISOString() }],
    })
    setRestrictionReason(''); setRestricting(false)
  }

  function handleLiftRestriction() {
    persistLifecycle({
      reason: `Restricción levantada para ${worker.nombre}`,
      workerPatch: { bloqueado: false, disponibilidad: 'disponible' },
      restrictionsMapper: list => list.map(item => String(item.workerId || item.trabId || item.personaId) === String(id) && hasActiveRestriction(worker, [item]) ? { ...item, activa: false, estado: 'levantada', levantadaAt: new Date().toISOString() } : item),
    })
  }

  if (!stateData) return <div className="nk-person-state"><IconLoader2 size={28} className="animate-spin" /><span>Cargando ficha…</span></div>
  if (!worker) return <div className="nk-person-state">Persona no encontrada.</div>
  const pct = acreditacionPct(worker); const clientes = stateData?.minas || []; const proyectos = stateData?.mantenciones || []; const contratos = stateData?.contratos || []; const deliveries = stateData?.eppDeliveries || []
  const restrictions = stateData?.restricted || []
  const isRestricted = operationalStatus(worker, assignments, restrictions, proyectos) === 'restringido'
  const availability = operationalStatus(worker, assignments, restrictions, proyectos)

  return <div className="nk-person-page">
    <header className="nk-person-header"><div className="nk-person-header-top"><div className="nk-person-identity"><button className="nk-person-back" type="button" onClick={() => navigate('/app/trabajadores')}><IconArrowLeft size={15} strokeWidth={1.7} /> Personas</button><span className="nk-person-divider">/</span><div className="nk-person-avatar">{initials(worker.nombre)}</div><div><h1>{worker.nombre}</h1><p>{worker.rut} · {worker.cargo || worker.especialidad || 'Sin cargo'}</p></div></div><div className="nk-person-header-actions"><BadgeDisp value={availability} /><span className={`nk-badge nk-badge-${statusClass(pct)}`}>{pct}% habilitado</span>{worker.tel && <a className="nk-button nk-button-secondary" href={`https://wa.me/${worker.tel.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><IconBrandWhatsapp size={15} /> WhatsApp</a>}</div></div><div className="nk-person-progress"><div className={`nk-person-progress-fill ${statusClass(pct)}`} style={{ width: `${pct}%` }} /></div><div className="nk-tabs nk-person-tabs">{TABS.map(({ key, label, icon: Icon }) => <button key={key} className={`nk-tab ${tab === key ? 'active' : ''}`} type="button" onClick={() => setTab(key)}><Icon size={14} strokeWidth={1.7} /> {label}</button>)}</div></header>
    {(error || ok) && <div className={`nk-person-feedback ${error ? 'error' : 'ok'}`}>{error ? <IconAlertTriangle size={15} /> : <IconCheck size={15} />}<span>{error || ok}</span><button type="button" onClick={() => { setError(null); setOk(null) }} aria-label="Cerrar"><IconX size={14} /></button></div>}
    <main className="nk-person-content">
      {tab === 'datos' && <>
        <DataTab worker={worker} emailError={emailError} clientes={clientes} proyectos={proyectos} contratos={contratos} asignaciones={assignments} restrictions={restrictions} saving={saving} onChange={onChange} onSave={handleSave} onAsignar={handleAsignar} onRetirar={handleRetirar} isRestricted={isRestricted} onMakeFixed={handleMakeFixed} onMakeAvailable={handleMakeAvailable} onRestrict={() => setRestricting(true)} onLiftRestriction={handleLiftRestriction} />
        {restricting && <CardSection title="No habilitar persona" subtitle="La no habilitación suspende asignaciones operacionales y exige un motivo."><div className="nk-person-grid"><Field label="Motivo"><input className="nk-input" value={restrictionReason} onChange={event => setRestrictionReason(event.target.value)} placeholder="Motivo operacional, documental o preventivo" /></Field></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={() => { setRestricting(false); setRestrictionReason('') }}>Cancelar</button><ActionButton disabledReason="Ingresa un motivo antes de registrar la no habilitación." className="nk-button nk-button-primary" type="button" onClick={handleRestrict} disabled={saving || !restrictionReason.trim()}><IconBan size={15} /> Registrar no habilitación</ActionButton></div></CardSection>}
      </>}
      {tab === 'docs' && <DocsTab worker={worker} tabKey="docs" onAppendItem={appendDocument} onRemoveItem={removeDocument} onError={setError} />}
      {tab === 'cursos' && <DocsTab worker={worker} tabKey="cursos" onAppendItem={appendDocument} onRemoveItem={removeDocument} onError={setError} />}
      {tab === 'epp' && <EppTab worker={worker} saving={saving} onChange={onChange} onSave={handleSave} deliveries={deliveries} />}
      {tab === 'historial' && <HistoryTab worker={worker} proyectos={proyectos} clientes={clientes} />}
    </main>
  </div>
}
