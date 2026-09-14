import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconAlertTriangle, IconClipboardList, IconPlus, IconRefresh, IconShieldCheck, IconUserQuestion, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/privacy-data.css'

const REQUEST_LABELS = {
  acceso: 'Acceso', rectificacion: 'Rectificación', supresion: 'Supresión', oposicion: 'Oposición', bloqueo: 'Bloqueo', portabilidad: 'Portabilidad',
}

const STATUS_LABELS = {
  recibida: 'Recibida', verificacion: 'Verificación', en_proceso: 'En proceso', respondida: 'Respondida', rechazada: 'Rechazada', cerrada: 'Cerrada',
  abierto: 'Abierto', contenido: 'Contenido', investigacion: 'Investigación', notificado: 'Notificado', cerrado: 'Cerrado',
  otorgado: 'Otorgado', revocado: 'Revocado',
}

const EMPTY = { activities: [], requests: [], consents: [], incidents: [] }

function dateText(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-CL')
}

function listValue(value) {
  if (Array.isArray(value)) return value.join(', ')
  return ''
}

function toList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
}

function StatusBadge({ value, danger = false }) {
  const safe = String(value || '').toLowerCase()
  const tone = danger || ['alta', 'critica', 'abierto'].includes(safe)
    ? 'danger'
    : ['medio', 'media', 'recibida', 'verificacion', 'en_proceso', 'investigacion', 'notificado'].includes(safe)
      ? 'warning'
      : ['otorgado', 'respondida', 'cerrada', 'cerrado', 'contenido', 'bajo', 'baja'].includes(safe)
        ? 'success'
        : 'neutral'
  return <span className={`nk-privacy-badge ${tone}`}>{STATUS_LABELS[safe] || safe || '—'}</span>
}

function Dialog({ title, subtitle, children, onClose }) {
  return (
    <div className="nk-privacy-dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="nk-privacy-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="nk-privacy-dialog-close" type="button" onClick={onClose} aria-label="Cerrar"><IconX size={17}/></button>
        </header>
        {children}
      </section>
    </div>
  )
}

export default function PrivacidadDatosPage() {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [dialog, setDialog] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setMessage('')
    try {
      const result = await api.get('/privacy')
      setData({ ...EMPTY, ...(result || {}) })
    } catch (error) {
      setMessage(error?.status === 403 ? 'Solo los administradores de la empresa pueden gestionar privacidad y datos.' : (error?.message || 'No fue posible cargar la gobernanza de datos.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = useMemo(() => ({
    activities: data.activities.length,
    requests: data.requests.filter(item => !['respondida', 'rechazada', 'cerrada'].includes(item.status)).length,
    consents: data.consents.filter(item => item.status === 'otorgado').length,
    incidents: data.incidents.filter(item => item.status !== 'cerrado').length,
  }), [data])

  const submitActivity = async event => {
    event.preventDefault(); const f = new FormData(event.currentTarget); setSaving(true); setMessage('')
    try {
      await api.post('/privacy/activities', {
        name: f.get('name'), purpose: f.get('purpose'), legalBasis: f.get('legalBasis'), dataCategories: toList(f.get('dataCategories')),
        subjectCategories: toList(f.get('subjectCategories')), recipients: toList(f.get('recipients')), sensitiveData: f.get('sensitiveData') === 'on',
        internationalTransfer: f.get('internationalTransfer') === 'on', retentionDays: Number(f.get('retentionDays') || 1825), securityMeasures: f.get('securityMeasures'), riskLevel: f.get('riskLevel'),
      })
      setDialog(null); setMessage('Actividad de tratamiento registrada.'); await load()
    } catch (error) { setMessage(error?.message || 'No fue posible registrar la actividad.') } finally { setSaving(false) }
  }

  const submitRequest = async event => {
    event.preventDefault(); const f = new FormData(event.currentTarget); setSaving(true); setMessage('')
    try {
      const dueAt = f.get('dueAt') ? new Date(`${f.get('dueAt')}T23:59:59`).toISOString() : undefined
      await api.post('/privacy/requests', { requestType: f.get('requestType'), subjectName: f.get('subjectName'), subjectEmail: f.get('subjectEmail'), subjectRut: f.get('subjectRut'), details: f.get('details'), ...(dueAt ? { dueAt } : {}) })
      setDialog(null); setMessage('Solicitud de titular registrada.'); await load()
    } catch (error) { setMessage(error?.message || 'No fue posible registrar la solicitud.') } finally { setSaving(false) }
  }

  const submitConsent = async event => {
    event.preventDefault(); const f = new FormData(event.currentTarget); setSaving(true); setMessage('')
    try {
      await api.post('/privacy/consents', { subjectRef: f.get('subjectRef'), subjectName: f.get('subjectName'), purpose: f.get('purpose'), noticeVersion: f.get('noticeVersion'), status: f.get('status'), source: f.get('source'), evidence: {} })
      setDialog(null); setMessage('Consentimiento registrado.'); await load()
    } catch (error) { setMessage(error?.message || 'No fue posible registrar el consentimiento.') } finally { setSaving(false) }
  }

  const submitIncident = async event => {
    event.preventDefault(); const f = new FormData(event.currentTarget); setSaving(true); setMessage('')
    try {
      await api.post('/privacy/incidents', { title: f.get('title'), severity: f.get('severity'), description: f.get('description'), detectedAt: new Date(f.get('detectedAt')).toISOString(), affectedSubjects: Number(f.get('affectedSubjects') || 0), dataCategories: toList(f.get('dataCategories')), containmentActions: f.get('containmentActions') })
      setDialog(null); setMessage('Incidente de privacidad registrado.'); await load()
    } catch (error) { setMessage(error?.message || 'No fue posible registrar el incidente.') } finally { setSaving(false) }
  }

  const updateRequest = async (item, status) => {
    if (status === item.status) return
    try { await api.patch(`/privacy/requests/${item.id}`, { status, responseNotes: item.response_notes || '' }); await load() }
    catch (error) { setMessage(error?.message || 'No fue posible actualizar la solicitud.') }
  }

  const updateIncident = async (item, status) => {
    if (status === item.status) return
    try { await api.patch(`/privacy/incidents/${item.id}`, { status, containmentActions: item.containment_actions || '', agencyNotifiedAt: item.agency_notified_at || null, subjectsNotifiedAt: item.subjects_notified_at || null }); await load() }
    catch (error) { setMessage(error?.message || 'No fue posible actualizar el incidente.') }
  }

  return (
    <section className="nk-module-page nk-privacy-page">
      <header className="nk-module-header nk-privacy-header">
        <div><h1>Privacidad y datos</h1><p>Tratamientos, derechos, consentimientos e incidentes de privacidad</p></div>
        <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <div className="nk-privacy-kpis">
        <article className="nk-dashboard-metric"><IconClipboardList size={22}/><div><b>{kpis.activities}</b><span>Actividades de tratamiento</span></div></article>
        <article className="nk-dashboard-metric amber"><IconUserQuestion size={22}/><div><b>{kpis.requests}</b><span>Solicitudes pendientes</span></div></article>
        <article className="nk-dashboard-metric teal"><IconShieldCheck size={22}/><div><b>{kpis.consents}</b><span>Consentimientos vigentes</span></div></article>
        <article className="nk-dashboard-metric"><IconAlertTriangle size={22}/><div><b>{kpis.incidents}</b><span>Incidentes abiertos</span></div></article>
      </div>

      <section className="nk-privacy-block">
        <div className="nk-privacy-section-head"><h2>Registro de actividades de tratamiento</h2><button className="nk-button nk-button-primary" type="button" onClick={() => setDialog('activity')}><IconPlus size={16}/> Actividad</button></div>
        <div className="nk-module-card nk-privacy-card"><div className="nk-privacy-table-wrap"><table className="nk-table nk-privacy-table"><thead><tr><th>Actividad</th><th>Finalidad</th><th>Base legal</th><th>Conservación</th><th>Riesgo</th></tr></thead><tbody>{data.activities.length ? data.activities.map(item => <tr key={item.id}><td><strong>{item.name}</strong><small>{listValue(item.data_categories) || 'Sin categorías informadas'}</small></td><td>{item.purpose}</td><td>{item.legal_basis}</td><td>{item.retention_days ? `${item.retention_days} días` : '—'}</td><td><StatusBadge value={item.risk_level}/></td></tr>) : <tr><td colSpan="5" className="nk-privacy-empty">Sin actividades registradas.</td></tr>}</tbody></table></div></div>
      </section>

      <section className="nk-privacy-block">
        <div className="nk-privacy-section-head"><h2>Solicitudes de titulares</h2><button className="nk-button nk-button-primary" type="button" onClick={() => setDialog('request')}><IconPlus size={16}/> Solicitud</button></div>
        <div className="nk-module-card nk-privacy-card"><div className="nk-privacy-table-wrap"><table className="nk-table nk-privacy-table"><thead><tr><th>Titular</th><th>Solicitud</th><th>Ingreso</th><th>Vencimiento</th><th>Estado</th></tr></thead><tbody>{data.requests.length ? data.requests.map(item => <tr key={item.id}><td><strong>{item.subject_name}</strong><small>{item.subject_email}</small></td><td>{REQUEST_LABELS[item.request_type] || item.request_type}</td><td>{dateText(item.created_at)}</td><td>{dateText(item.due_at)}</td><td><select className="nk-input nk-privacy-status-select" value={item.status || 'recibida'} onChange={event => updateRequest(item, event.target.value)}><option value="recibida">Recibida</option><option value="verificacion">Verificación</option><option value="en_proceso">En proceso</option><option value="respondida">Respondida</option><option value="rechazada">Rechazada</option><option value="cerrada">Cerrada</option></select></td></tr>) : <tr><td colSpan="5" className="nk-privacy-empty">Sin solicitudes registradas.</td></tr>}</tbody></table></div></div>
      </section>

      <section className="nk-privacy-block">
        <div className="nk-privacy-section-head"><h2>Consentimientos e incidentes</h2><div className="nk-privacy-actions"><button className="nk-button nk-button-secondary" type="button" onClick={() => setDialog('consent')}><IconPlus size={16}/> Consentimiento</button><button className="nk-button nk-button-danger" type="button" onClick={() => setDialog('incident')}><IconPlus size={16}/> Incidente</button></div></div>
        <div className="nk-privacy-dual">
          <div className="nk-module-card nk-privacy-card"><div className="nk-privacy-subhead"><h3>Consentimientos</h3><span>{data.consents.length} registros</span></div><div className="nk-privacy-table-wrap"><table className="nk-table nk-privacy-table compact"><thead><tr><th>Titular</th><th>Finalidad</th><th>Estado</th></tr></thead><tbody>{data.consents.length ? data.consents.map(item => <tr key={item.id}><td><strong>{item.subject_name}</strong><small>{item.subject_ref}</small></td><td>{item.purpose}</td><td><StatusBadge value={item.status}/></td></tr>) : <tr><td colSpan="3" className="nk-privacy-empty">Sin consentimientos registrados.</td></tr>}</tbody></table></div></div>
          <div className="nk-module-card nk-privacy-card"><div className="nk-privacy-subhead"><h3>Incidentes</h3><span>{data.incidents.length} registros</span></div><div className="nk-privacy-table-wrap"><table className="nk-table nk-privacy-table compact"><thead><tr><th>Incidente</th><th>Severidad</th><th>Estado</th></tr></thead><tbody>{data.incidents.length ? data.incidents.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{dateText(item.detected_at)} · {item.affected_subjects || 0} afectados</small></td><td><StatusBadge value={item.severity} danger={['alta','critica'].includes(item.severity)}/></td><td><select className="nk-input nk-privacy-status-select" value={item.status || 'abierto'} onChange={event => updateIncident(item, event.target.value)}><option value="abierto">Abierto</option><option value="contenido">Contenido</option><option value="investigacion">Investigación</option><option value="notificado">Notificado</option><option value="cerrado">Cerrado</option></select></td></tr>) : <tr><td colSpan="3" className="nk-privacy-empty">Sin incidentes registrados.</td></tr>}</tbody></table></div></div>
        </div>
      </section>

      {dialog === 'activity' && <Dialog title="Nueva actividad de tratamiento" subtitle="Registra cómo y para qué se tratan datos personales." onClose={() => setDialog(null)}><form className="nk-privacy-form" onSubmit={submitActivity}><label><span>Actividad</span><input className="nk-input" name="name" required minLength="3"/></label><label><span>Base legal</span><input className="nk-input" name="legalBasis" required/></label><label className="full"><span>Finalidad</span><textarea className="nk-input" name="purpose" required/></label><label><span>Categorías de datos</span><input className="nk-input" name="dataCategories" placeholder="Identificación, contacto, laboral"/></label><label><span>Categorías de titulares</span><input className="nk-input" name="subjectCategories" placeholder="Trabajadores, clientes"/></label><label><span>Destinatarios</span><input className="nk-input" name="recipients" placeholder="Mandante, autoridad"/></label><label><span>Conservación (días)</span><input className="nk-input" name="retentionDays" type="number" min="1" defaultValue="1825" required/></label><label><span>Nivel de riesgo</span><select className="nk-input" name="riskLevel" defaultValue="medio"><option value="bajo">Bajo</option><option value="medio">Medio</option><option value="alto">Alto</option></select></label><label className="full"><span>Medidas de seguridad</span><textarea className="nk-input" name="securityMeasures"/></label><label className="nk-privacy-check"><input type="checkbox" name="sensitiveData"/> Incluye datos sensibles</label><label className="nk-privacy-check"><input type="checkbox" name="internationalTransfer"/> Transferencia internacional</label><div className="nk-privacy-form-actions full"><button className="nk-button nk-button-secondary" type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar actividad'}</button></div></form></Dialog>}

      {dialog === 'request' && <Dialog title="Nueva solicitud de titular" subtitle="Registra una solicitud relacionada con derechos sobre datos personales." onClose={() => setDialog(null)}><form className="nk-privacy-form" onSubmit={submitRequest}><label><span>Tipo</span><select className="nk-input" name="requestType"><option value="acceso">Acceso</option><option value="rectificacion">Rectificación</option><option value="supresion">Supresión</option><option value="oposicion">Oposición</option><option value="bloqueo">Bloqueo</option><option value="portabilidad">Portabilidad</option></select></label><label><span>Fecha límite</span><input className="nk-input" name="dueAt" type="date"/></label><label><span>Nombre del titular</span><input className="nk-input" name="subjectName" required/></label><label><span>Correo</span><input className="nk-input" name="subjectEmail" type="email" required/></label><label><span>RUT</span><input className="nk-input" name="subjectRut"/></label><label className="full"><span>Detalle</span><textarea className="nk-input" name="details"/></label><div className="nk-privacy-form-actions full"><button className="nk-button nk-button-secondary" type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar solicitud'}</button></div></form></Dialog>}

      {dialog === 'consent' && <Dialog title="Nuevo consentimiento" subtitle="Registra el estado y finalidad del consentimiento." onClose={() => setDialog(null)}><form className="nk-privacy-form" onSubmit={submitConsent}><label><span>Referencia del titular</span><input className="nk-input" name="subjectRef" required/></label><label><span>Nombre del titular</span><input className="nk-input" name="subjectName" required/></label><label className="full"><span>Finalidad</span><textarea className="nk-input" name="purpose" required/></label><label><span>Versión del aviso</span><input className="nk-input" name="noticeVersion" defaultValue="1.0" required/></label><label><span>Estado</span><select className="nk-input" name="status"><option value="otorgado">Otorgado</option><option value="revocado">Revocado</option></select></label><label><span>Origen</span><input className="nk-input" name="source" defaultValue="digital"/></label><div className="nk-privacy-form-actions full"><button className="nk-button nk-button-secondary" type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar consentimiento'}</button></div></form></Dialog>}

      {dialog === 'incident' && <Dialog title="Nuevo incidente de privacidad" subtitle="Registra un incidente y su contención inicial." onClose={() => setDialog(null)}><form className="nk-privacy-form" onSubmit={submitIncident}><label className="full"><span>Título</span><input className="nk-input" name="title" required/></label><label><span>Severidad</span><select className="nk-input" name="severity"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label><label><span>Detectado</span><input className="nk-input" name="detectedAt" type="datetime-local" required/></label><label><span>Personas afectadas</span><input className="nk-input" name="affectedSubjects" type="number" min="0" defaultValue="0"/></label><label><span>Categorías de datos</span><input className="nk-input" name="dataCategories" placeholder="Identificación, contacto"/></label><label className="full"><span>Descripción</span><textarea className="nk-input" name="description" required/></label><label className="full"><span>Acciones de contención</span><textarea className="nk-input" name="containmentActions"/></label><div className="nk-privacy-form-actions full"><button className="nk-button nk-button-secondary" type="button" onClick={() => setDialog(null)}>Cancelar</button><button className="nk-button nk-button-danger" disabled={saving}>{saving ? 'Guardando…' : 'Registrar incidente'}</button></div></form></Dialog>}
    </section>
  )
}
