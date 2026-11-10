import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { ActionButton } from '../components/ui/ActionButton.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { useConfirmation } from '../services/useConfirmation.js'
import { CapacityMeter, Feedback, PackageFields, SubscriptionStatus } from '../components/ui/SubscriptionComponents.jsx'
import { count, dateTime, errorMessage, money, packageSelectionTotals, planPrice, requestKey, requestStates, requestTypes, requestPlanCode, requestPlanName, selectedPackages } from '../services/subscriptions.js'
import '../styles/subscriptions.css'

const prefix = '/subscriptions/admin'
const companyName = company => company.name || company.companyName || company.company_name || 'Empresa'
const blankDocuments = () => ({ quote: { number: '', fileId: '', acceptedAt: '' }, purchaseOrder: { number: '', fileId: '' }, invoice: { number: '', fileId: '' } })
const localDateTime = value => { if (!value || Number.isNaN(Date.parse(value))) return ''; const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
const fileIdOf = document => document.fileId || /\/files\/([\w-]+)/.exec(document.url || '')?.[1] || ''

function CatalogEditor({ catalog, onSaved }) {
  const [selection, setSelection] = useState('')
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const confirmation = useConfirmation()
  const records = [...(catalog?.plans || []).map(item => ({ ...item, kind: 'plan' })), ...(catalog?.packages || []).map(item => ({ ...item, kind: 'package' }))]
  const choose = value => {
    setSelection(value); const record = records.find(item => `${item.kind}:${item.versionId || item.code}` === value)
    setForm(record ? { ...record, monthlyPrice: planPrice(record), taxPercent: Number(record.taxRate ?? .19) <= 1 ? Number(record.taxRate ?? .19) * 100 : Number(record.taxRate), publicVisible: record.publicVisible !== false, recommended: Boolean(record.recommended), repeatable: Boolean(record.repeatable), stackable: record.stackable !== false, maxQuantity: record.maxQuantity || 1, graceDays: record.graceDays ?? (record.code === 'FREE' ? 0 : 30), warningPercent: record.warningPercent ?? 80, criticalPercent: record.criticalPercent ?? 90 } : null); setMessage(''); setFailure('')
  }
  const save = async action => {
    setBusy(true); setFailure(''); setMessage('')
    try {
      const values = { kind: form.kind, code: form.code, versionId: form.versionId, name: form.name.trim(), monthlyPrice: Number(form.monthlyPrice), taxRate: Number(form.taxPercent) / 100, action }
      if (form.kind === 'plan') Object.assign(values, { workerLimit: Number(form.workerLimit), publicVisible: form.publicVisible, recommended: form.recommended, graceDays: Number(form.graceDays), warningPercent: Number(form.warningPercent), criticalPercent: Number(form.criticalPercent), description: form.description || '', allowedUpgradeTargets: form.allowedUpgradeTargets || [] })
      else Object.assign(values, { workersQuantity: Number(form.workersQuantity), maxQuantity: form.repeatable ? Number(form.maxQuantity) : 1, repeatable: form.repeatable, stackable: form.stackable })
      await api.post(`${prefix}/catalog`, values, { feedback: false })
      setMessage(action === 'publish' ? 'Nueva versión publicada. Las ofertas vigentes se actualizan; los contratos aceptados conservan sus condiciones.' : 'Borrador guardado. No está disponible para contratación pública.'); await onSaved(); setForm(null); setSelection('')
    }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const submit = (event, action) => { event.preventDefault(); if (!event.currentTarget.reportValidity()) return; if (action === 'publish') confirmation.ask({ title: 'Publicar versión de catálogo', description: `Se publicará ${form.name} por ${money(form.monthlyPrice)} netos mensuales + IVA. Los contratos actuales conservarán su precio y capacidad.`, confirmLabel: 'Publicar versión', onConfirm: () => save(action) }); else save(action) }
  const update = (name, value) => setForm(current => ({ ...current, [name]: value }))
  return <section className="nk-module-card"><h2>Catálogo de planes y paquetes</h2><p>Edita una nueva versión sin reescribir contratos aceptados. Todos los importes son CLP netos + IVA.</p><div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Nombre</th><th>Capacidad</th><th>Mensual neto</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{records.map((item, index) => <tr key={`${item.kind}-${item.versionId || item.code}-${index}`}><td><strong>{item.name}</strong><small>{item.code}</small></td><td>{count(item.workerLimit ?? item.workersQuantity)} trabajadores</td><td>{money(planPrice(item), item.currency)}</td><td>{(item.state || item.status) === 'DRAFT' || (item.state || item.status) === 'BORRADOR' ? 'Borrador' : (item.state || item.status) === 'RETIRED' ? 'Retirado' : 'Publicado'}</td><td><button type="button" className="nk-button nk-button-secondary nk-button-sm" onClick={() => choose(`${item.kind}:${item.versionId || item.code}`)}>Editar {item.name}</button></td></tr>)}</tbody></table></div><Feedback>{message}</Feedback><Feedback error>{failure}</Feedback>{form && <form className="nk-subscription-editor" onSubmit={event => submit(event, event.nativeEvent.submitter?.value || 'draft')}><h3>Nueva versión de {form.name}</h3><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Nombre público</span><input className="nk-input" required maxLength="100" value={form.name} onChange={event => update('name', event.target.value)} disabled={busy} /></label><label className="nk-field"><span className="nk-label">Precio mensual neto CLP</span><input className="nk-input" required type="number" min="0" step="1" value={form.monthlyPrice} onChange={event => update('monthlyPrice', event.target.value)} disabled={busy} /></label><label className="nk-field"><span className="nk-label">{form.kind === 'plan' ? 'Capacidad base' : 'Trabajadores por paquete'}</span><input className="nk-input" required type="number" min="1" step="1" value={form.kind === 'plan' ? form.workerLimit : form.workersQuantity} onChange={event => update(form.kind === 'plan' ? 'workerLimit' : 'workersQuantity', event.target.value)} disabled={busy} /></label><label className="nk-field"><span className="nk-label">IVA (%)</span><input className="nk-input" required type="number" min="0" max="100" step=".01" value={form.taxPercent} onChange={event => update('taxPercent', event.target.value)} disabled={busy} /></label>{form.kind === 'plan' && <><label className="nk-field"><span className="nk-label">Días de gracia</span><input className="nk-input" type="number" min="0" max="365" step="1" required value={form.graceDays} disabled={busy || form.code === 'FREE'} onChange={event => update('graceDays', event.target.value)} /></label><label className="nk-field"><span className="nk-label">Advertencia desde (%)</span><input className="nk-input" type="number" min="0" max="98" step="1" required value={form.warningPercent} disabled={busy} onChange={event => update('warningPercent', event.target.value)} /></label><label className="nk-field"><span className="nk-label">Alerta crítica desde (%)</span><input className="nk-input" type="number" min={Number(form.warningPercent) + 1} max="99" step="1" required value={form.criticalPercent} disabled={busy} onChange={event => update('criticalPercent', event.target.value)} /></label></>}{form.kind === 'plan' && <fieldset><legend>Mejoras de plan permitidas</legend><p>Permite saltos directos sólo cuando estén autorizados comercialmente.</p>{['FREE', 'LA_UNION', 'PURRANQUE', 'FRUTILLAR', 'PUERTO_OCTAY'].filter((code, index, codes) => index > codes.indexOf(form.code)).map(code => <label className="nk-plan-consent" key={code}><input type="checkbox" disabled={busy} checked={(form.allowedUpgradeTargets || []).includes(code)} onChange={event => update('allowedUpgradeTargets', event.target.checked ? [...(form.allowedUpgradeTargets || []), code] : (form.allowedUpgradeTargets || []).filter(item => item !== code))} />{records.find(item => item.code === code)?.name || code}</label>)}</fieldset>}{form.kind === 'package' && <><label className="nk-field"><span className="nk-label">Máximo de unidades del mismo paquete</span><input className="nk-input" type="number" min="1" max="100" required value={form.maxQuantity} onChange={event => update('maxQuantity', event.target.value)} disabled={busy || !form.repeatable} /></label><label className="nk-plan-consent"><input type="checkbox" checked={form.repeatable} onChange={event => update('repeatable', event.target.checked)} disabled={busy} />Permitir repetir el mismo paquete</label><label className="nk-plan-consent"><input type="checkbox" checked={form.stackable} onChange={event => update('stackable', event.target.checked)} disabled={busy} />Permitir acumular paquetes</label></>}{form.kind === 'plan' && <><label className="nk-plan-consent"><input type="checkbox" checked={form.publicVisible} onChange={event => update('publicVisible', event.target.checked)} disabled={busy} />Visible en Planes y precios</label><label className="nk-plan-consent"><input type="checkbox" checked={form.recommended} onChange={event => update('recommended', event.target.checked)} disabled={busy} />Mostrar como recomendado</label></>}</div><div className="nk-plan-actions"><ActionButton className="nk-button nk-button-secondary" name="action" value="draft" disabled={busy} disabledReason="Se está guardando la versión.">Guardar borrador</ActionButton><ActionButton className="nk-button nk-button-primary" name="action" value="publish" disabled={busy} disabledReason="Se está guardando la versión.">Publicar versión</ActionButton><button className="nk-button nk-button-quiet" type="button" disabled={busy} onClick={() => { setSelection(''); setForm(null) }}>Cerrar edición</button></div></form>}<ConfirmDialog {...confirmation.dialogProps} /></section>
}

function RequestEditor({ request, tenantId, currentContract, onSaved }) {
  const [documents, setDocuments] = useState(blankDocuments)
  const [action, setAction] = useState('review')
  const [reason, setReason] = useState('')
  const [effectiveAt, setEffectiveAt] = useState('')
  const [immediateChangeTerms, setImmediateChangeTerms] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState('')
  const [failure, setFailure] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const key = useRef(requestKey())
  const confirmation = useConfirmation()
  useEffect(() => { const source = request.documents || request.payload?.documents || {}; setDocuments(Object.fromEntries(Object.entries(blankDocuments()).map(([kind, initial]) => [kind, { ...initial, ...(source[kind] || {}), fileId: fileIdOf(source[kind] || {}), acceptedAt: localDateTime(source[kind]?.acceptedAt) }]))); setEffectiveAt(localDateTime(request.effectiveAt)); setImmediateChangeTerms(request.documents?.immediateChangeTerms || ''); setReason(''); setFailure(''); setFieldErrors({}); setAction(({ REQUESTED: 'review', UNDER_REVIEW: 'approve', APPROVED: 'schedule', SCHEDULED: 'execute', EXECUTION_FAILED: 'execute' })[request.status] || 'review'); key.current = requestKey() }, [request.id, request.status])
  const actions = ({ REQUESTED: ['review', 'documents', 'reject', 'cancel'], UNDER_REVIEW: ['approve', 'documents', 'reject', 'cancel'], APPROVED: ['schedule', 'documents', 'cancel'], SCHEDULED: ['execute', 'cancel'], EXECUTION_FAILED: ['execute', 'cancel'] })[request.status] || []
  const actionNames = { review: 'Iniciar revisión', documents: 'Guardar documentación', approve: 'Aprobar', reject: 'Rechazar', schedule: 'Programar', execute: 'Ejecutar cambio', cancel: 'Cancelar solicitud' }
  const upload = async (kind, file) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setFailure('El archivo supera el máximo de 25 MB.'); return }
    setUploading(kind); setFailure('')
    try { const result = await api.upload(`${prefix}/companies/${tenantId}/documents`, file, { entityType: 'subscription_document', entityId: request.id }, { feedback: false }); setDocuments(current => ({ ...current, [kind]: { ...current[kind], fileId: result.id, fileName: result.original_name || file.name } })); setFieldErrors(current => ({ ...current, [`${kind}-file`]: '' })) }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setUploading('') }
  }
  const execute = async () => {
    setBusy(true); setFailure('')
    try {
      const attached = Object.fromEntries(Object.entries(documents).filter(([, document]) => document.number.trim() && document.fileId).map(([kind, document]) => [kind, { number: document.number.trim(), fileId: document.fileId, acceptedAt: document.acceptedAt ? new Date(document.acceptedAt).toISOString() : undefined }]))
      const values = { action, reason: reason.trim(), effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined, immediateChangeTerms: immediateChangeTerms.trim() || undefined, idempotencyKey: key.current }
      if (Object.keys(attached).length && !['cancel', 'reject', 'execute'].includes(action)) values.documents = attached
      await api.patch(`${prefix}/companies/${tenantId}/requests/${request.id}`, values, { feedback: false }); key.current = requestKey(); await onSaved()
    }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const submit = event => {
    event.preventDefault(); const errors = {}
    if (reason.trim().length < 3) errors.reason = 'Registra el motivo de esta decisión.'
    const paid = requestPlanCode(request) !== 'FREE'
    if (['review', 'approve', 'documents'].includes(action)) {
      for (const kind of ['quote', 'purchaseOrder', 'invoice']) {
        if (documents[kind].number || documents[kind].fileId || documents[kind].acceptedAt) {
          if (!documents[kind].number.trim()) errors[`${kind}-number`] = 'Ingresa el número del documento.'
          if (!documents[kind].fileId) errors[`${kind}-file`] = 'Adjunta el documento antes de guardarlo.'
        }
      }
    }
    if (['schedule', 'execute'].includes(action) && paid) {
      for (const kind of ['quote', 'purchaseOrder', 'invoice']) { if (!documents[kind].number.trim()) errors[`${kind}-number`] = 'Ingresa el número del documento.'; if (!documents[kind].fileId) errors[`${kind}-file`] = 'Adjunta el documento privado de esta empresa.' }
      if (!documents.quote.acceptedAt) errors['quote-acceptedAt'] = 'Registra cuándo se aceptó la cotización.'
    }
    if (action === 'schedule' && !effectiveAt) errors.effectiveAt = 'Define la fecha y hora efectivas.'
    if (action === 'schedule' && currentContract && effectiveAt && new Date(effectiveAt) < new Date(currentContract.endsAt)) {
      if (request.type === 'DOWNGRADE' || Number(request.proposal?.totalCapacity) < Number(currentContract.snapshot?.totalCapacity)) errors.effectiveAt = 'La reducción comienza al terminar el período contratado.'
      else if (request.type !== 'RENEWAL' && immediateChangeTerms.trim().length < 10) errors.immediateChangeTerms = 'Documenta las condiciones aceptadas del cambio inmediato (mínimo 10 caracteres).'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) { document.getElementById(`request-${request.id}-${Object.keys(errors)[0]}`)?.focus(); return }
    confirmation.ask({ title: actionNames[action], description: `Solicitud de ${requestTypes[request.type] || request.type}: ${requestPlanName(request)}. ${action === 'execute' ? 'Se aplicarán las condiciones autorizadas, conservando los registros de la empresa.' : 'La decisión quedará registrada en la auditoría.'}`, confirmLabel: actionNames[action], variant: ['reject', 'cancel'].includes(action) ? 'danger' : undefined, onConfirm: execute })
  }
  const error = field => fieldErrors[field] && <p id={`request-${request.id}-${field}-error`} className="nk-field-error" role="alert">{fieldErrors[field]}</p>
  return <section className="nk-subscription-editor"><h3>{requestTypes[request.type] || request.type} · {requestPlanName(request)}</h3><p>Estado: <strong>{requestStates[request.status] || request.status}</strong> · Solicitud {dateTime(request.createdAt)}</p>{request.reason && <p>Motivo original: {request.reason}</p>}{actions.length ? <form noValidate onSubmit={submit} aria-busy={busy}><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Acción autorizada</span><select className="nk-select" value={action} onChange={event => { setAction(event.target.value); setFieldErrors({}); key.current = requestKey() }} disabled={busy}>{actions.map(value => <option value={value} key={value}>{actionNames[value]}</option>)}</select></label><div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-effectiveAt`}>Fecha y hora efectivas</label><input className="nk-input" id={`request-${request.id}-effectiveAt`} type="datetime-local" value={effectiveAt} onChange={event => setEffectiveAt(event.target.value)} disabled={busy} aria-invalid={Boolean(fieldErrors.effectiveAt)} aria-describedby={fieldErrors.effectiveAt ? `request-${request.id}-effectiveAt-error` : undefined} />{error('effectiveAt')}</div></div>{action === 'schedule' && currentContract && request.type !== 'RENEWAL' && effectiveAt && new Date(effectiveAt) < new Date(currentContract.endsAt) && <div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-immediateChangeTerms`}>Condiciones aceptadas del cambio inmediato *</label><textarea className="nk-textarea" id={`request-${request.id}-immediateChangeTerms`} value={immediateChangeTerms} onChange={event => setImmediateChangeTerms(event.target.value)} rows="3" maxLength="2000" disabled={busy} aria-invalid={Boolean(fieldErrors.immediateChangeTerms)} aria-describedby={fieldErrors.immediateChangeTerms ? `request-${request.id}-immediateChangeTerms-error` : undefined} /><small>Registra el tratamiento del período y la facturación ya aceptado por la empresa. No se aplica prorrateo automático.</small>{error('immediateChangeTerms')}</div>}<div className="nk-commercial-documents">{[['quote', 'Cotización'], ['purchaseOrder', 'Orden de compra'], ['invoice', 'Factura']].map(([kind, name]) => <fieldset key={kind} disabled={busy || ['execute', 'cancel', 'reject'].includes(action)}><legend>{name}</legend><div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-${kind}-number`}>Número de {name.toLowerCase()}</label><input className="nk-input" id={`request-${request.id}-${kind}-number`} maxLength="100" value={documents[kind].number} onChange={event => setDocuments(current => ({ ...current, [kind]: { ...current[kind], number: event.target.value } }))} disabled={busy} aria-invalid={Boolean(fieldErrors[`${kind}-number`])} aria-describedby={fieldErrors[`${kind}-number`] ? `request-${request.id}-${kind}-number-error` : undefined} />{error(`${kind}-number`)}</div>{kind === 'quote' && <div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-quote-acceptedAt`}>Aceptación de la cotización</label><input className="nk-input" id={`request-${request.id}-quote-acceptedAt`} type="datetime-local" value={documents.quote.acceptedAt} onChange={event => setDocuments(current => ({ ...current, quote: { ...current.quote, acceptedAt: event.target.value } }))} disabled={busy} aria-invalid={Boolean(fieldErrors['quote-acceptedAt'])} />{error('quote-acceptedAt')}</div>}<label className="nk-field" htmlFor={`request-${request.id}-${kind}-file`}><span className="nk-label">Adjuntar {name.toLowerCase()}</span><input id={`request-${request.id}-${kind}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" disabled={busy || Boolean(uploading)} aria-invalid={Boolean(fieldErrors[`${kind}-file`])} aria-describedby={fieldErrors[`${kind}-file`] ? `request-${request.id}-${kind}-file-error` : undefined} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; upload(kind, file) }} /><small>Archivo privado de la empresa · máximo 25 MB.</small></label>{error(`${kind}-file`)}{uploading === kind && <p role="status">Cargando documento…</p>}{documents[kind].fileId && <a className="nk-button nk-button-quiet" href={`/api${prefix}/companies/${tenantId}/documents/${documents[kind].fileId}`} target="_blank" rel="noreferrer">Ver {documents[kind].fileName || name.toLowerCase()}</a>}</fieldset>)}</div><div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-reason`}>Motivo de la decisión *</label><textarea className="nk-textarea" id={`request-${request.id}-reason`} rows="2" maxLength="2000" value={reason} onChange={event => { setReason(event.target.value); setFieldErrors(current => ({ ...current, reason: '' })) }} disabled={busy} aria-invalid={Boolean(fieldErrors.reason)} aria-describedby={fieldErrors.reason ? `request-${request.id}-reason-error` : undefined} />{error('reason')}</div><Feedback error>{failure}</Feedback><ActionButton className="nk-button nk-button-primary" disabled={busy || Boolean(uploading)} disabledReason="Espera a que termine la carga o la decisión.">{busy ? 'Procesando…' : actionNames[action]}</ActionButton></form> : <p>Esta solicitud ya no admite cambios.</p>}<ConfirmDialog {...confirmation.dialogProps} /></section>
}

function CompanySubscription({ company, summary, catalog, onSaved }) {
  const [planCode, setPlanCode] = useState('')
  const [type, setType] = useState('INITIAL')
  const [packages, setPackages] = useState({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [services, setServices] = useState({})
  const [serviceReason, setServiceReason] = useState('')
  const key = useRef(requestKey())
  useEffect(() => { setServices(summary.separateServices || {}); setPlanCode(summary.contract?.planCode || ''); setType(summary.contract ? 'UPGRADE' : 'INITIAL'); setPackages(Object.fromEntries((summary.packages || []).map(item => [item.code || item.packageCode, item.quantity || 1]))) }, [company.id, summary])
  const plan = catalog?.plans?.find(item => item.code === planCode)
  const availablePackages = planCode === 'PUERTO_OCTAY' ? catalog?.packages || [] : []
  const extras = packageSelectionTotals(packages, availablePackages)
  const create = async event => {
    event.preventDefault(); setBusy(true); setMessage(''); setFailure('')
    try { await api.post(`${prefix}/companies/${company.id}/requests`, { type, planCode, versionId: plan?.versionId, packages: selectedPackages(packages, availablePackages), reason: reason.trim(), idempotencyKey: key.current }, { feedback: false }); key.current = requestKey(); setReason(''); setMessage('Solicitud creada. Revisa y completa su documentación antes de aprobar, programar y ejecutar.'); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const saveServices = async event => {
    event.preventDefault(); setBusy(true); setFailure(''); setMessage('')
    try { const payload = Object.fromEntries(['libroObra', 'oportunidades'].map(code => [code, { enabled: Boolean(services[code]?.enabled), reference: services[code]?.reference || '', endsAt: services[code]?.endsAt ? new Date(services[code].endsAt).toISOString() : null }])); await api.patch(`${prefix}/companies/${company.id}/services`, { services: payload, reason: serviceReason.trim() }, { feedback: false }); setServiceReason(''); setMessage('Contrataciones independientes actualizadas y auditadas.'); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const updateService = (code, name, value) => setServices(current => ({ ...current, [code]: { ...current[code], [name]: value } }))
  return <section className="nk-module-card"><header className="nk-subscription-company-header"><div><h2>{companyName(company)}</h2><p>{company.rut} · {summary.legacy ? 'Condiciones actuales, sin asignación automática' : summary.contract?.planName || 'Pendiente de activación'}</p></div><SubscriptionStatus status={summary.contract?.status} /></header>{summary.contract && <><dl className="nk-subscription-facts"><div><dt>Mensual neto contratado</dt><dd>{money(summary.contract.monthlyNetPrice, summary.contract.currency)}</dd></div><div><dt>Inicio</dt><dd>{dateTime(summary.contract.startsAt)}</dd></div><div><dt>Vencimiento</dt><dd>{dateTime(summary.contract.endsAt)}</dd></div><div><dt>Fin de gracia</dt><dd>{dateTime(summary.contract.graceEndsAt)}</dd></div></dl><CapacityMeter capacity={summary.capacity} /></>}<Feedback>{message}</Feedback><Feedback error>{failure}</Feedback><details className="nk-subscription-details"><summary>Crear solicitud de contratación o cambio</summary><form onSubmit={create} className="nk-subscription-editor"><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Tipo de solicitud</span><select className="nk-select" value={type} onChange={event => setType(event.target.value)} disabled={busy}>{!summary.contract && <option value="INITIAL">Contratación inicial</option>}{summary.contract && <><option value="UPGRADE">Mejorar plan</option><option value="DOWNGRADE">Reducir plan</option><option value="RENEWAL">Renovar</option><option value="PACKAGES">Modificar paquetes</option></>}</select></label><label className="nk-field"><span className="nk-label">Plan</span><select className="nk-select" value={planCode} required disabled={busy} onChange={event => { setPlanCode(event.target.value); setPackages({}); key.current = requestKey() }}><option value="">Selecciona un plan</option>{(catalog?.plans || []).filter(item => item.code !== 'FREE' && !['DRAFT', 'BORRADOR', 'RETIRED'].includes(item.state || item.status)).map(item => <option value={item.code} key={item.versionId || item.code}>{item.name} · {count(item.workerLimit)} trabajadores</option>)}</select></label></div>{availablePackages.length > 0 && <PackageFields packages={availablePackages} values={packages} onChange={(code, quantity) => setPackages(current => ({ ...current, [code]: quantity }))} disabled={busy} />}{plan && <p>{count(Number(plan.workerLimit) + extras.workers)} cupos · {money(planPrice(plan) + extras.price, plan.currency)} netos / mes + IVA</p>}<label className="nk-field"><span className="nk-label">Motivo *</span><textarea className="nk-textarea" required maxLength="2000" rows="2" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label><ActionButton className="nk-button nk-button-primary" disabled={busy} disabledReason="Se está creando la solicitud.">Crear solicitud para revisión</ActionButton></form></details><h3>Solicitudes de esta empresa</h3>{summary.requests?.length ? summary.requests.map(request => <RequestEditor key={request.id} request={request} tenantId={company.id} currentContract={summary.contract} onSaved={onSaved} />) : <p>No hay solicitudes registradas.</p>}{!summary.legacy && <details className="nk-subscription-details"><summary>Contrataciones independientes</summary><form onSubmit={saveServices} className="nk-subscription-editor"><p>Libro de Obra y Gestor de Oportunidades se autorizan mediante su propia contratación; no cambian los cupos del plan principal.</p>{[['libroObra', 'Libro de Obra'], ['oportunidades', 'Gestor de Oportunidades']].map(([code, name]) => <fieldset className="nk-subscription-service-editor" key={code}><legend>{name}</legend><label className="nk-plan-consent"><input type="checkbox" checked={Boolean(services[code]?.enabled)} onChange={event => updateService(code, 'enabled', event.target.checked)} disabled={busy} />Contratación habilitada</label><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Referencia del acuerdo</span><input className="nk-input" value={services[code]?.reference || ''} maxLength="200" required={Boolean(services[code]?.enabled)} onChange={event => updateService(code, 'reference', event.target.value)} disabled={busy} /></label><label className="nk-field"><span className="nk-label">Vigencia hasta (opcional)</span><input className="nk-input" type="datetime-local" value={localDateTime(services[code]?.endsAt)} onChange={event => updateService(code, 'endsAt', event.target.value)} disabled={busy} /></label></div></fieldset>)}<label className="nk-field"><span className="nk-label">Motivo del cambio *</span><textarea className="nk-textarea" value={serviceReason} onChange={event => setServiceReason(event.target.value)} required maxLength="2000" rows="2" disabled={busy} /></label><ActionButton className="nk-button nk-button-primary" disabled={busy} disabledReason="Se están guardando las contrataciones.">Guardar contrataciones independientes</ActionButton></form></details>}{summary.audit?.length > 0 && <details className="nk-subscription-details"><summary>Historial de auditoría</summary><ol>{summary.audit.map(item => <li key={item.id}>{dateTime(item.createdAt || item.timestamp)} · {item.action} · {item.reason}</li>)}</ol></details>}</section>
}

function CommercialLead({ lead, companies, onSaved }) {
  const [tenantId, setTenantId] = useState(lead.tenantId || '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const submit = async (event, status) => {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return; setBusy(true); setFailure('')
    try { await api.patch(`${prefix}/commercial-requests/${lead.id}`, { tenantId: tenantId || undefined, status, reason }, { feedback: false }); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <article className="nk-subscription-lead"><header><h3>{lead.companyName || lead.company_name}</h3><span className="nk-subscription-status">{requestStates[lead.status] || (lead.status === 'LINKED' ? 'Vinculada a empresa' : lead.status)}</span></header><p>{lead.rut} · {lead.planName || lead.planCode || lead.requestedPlanCode} · {count(lead.workers || lead.workersQuantity)} trabajadores</p><p>{lead.contactName} {lead.contactLastName} · {lead.email || lead.contactEmail} · {lead.phone}</p>{lead.comments && <p>{lead.comments}</p>}{!['LINKED', 'REJECTED'].includes(lead.status) && <form onSubmit={event => submit(event, event.nativeEvent.submitter?.value || 'UNDER_REVIEW')}><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Empresa para tramitar la contratación</span><select className="nk-select" value={tenantId} onChange={event => setTenantId(event.target.value)} disabled={busy}><option value="">Selecciona una empresa existente</option>{companies.map(company => <option value={company.id} key={company.id}>{companyName(company)} · {company.rut}</option>)}</select></label><label className="nk-field"><span className="nk-label">Motivo y observaciones *</span><textarea className="nk-textarea" required maxLength="2000" rows="2" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label></div><p>Si la empresa aún no existe, registra y valida su cuenta desde <Link to="/app/administracion-clientes">Administración de clientes</Link>. Vincular crea una solicitud para revisar; no activa el plan.</p><Feedback error>{failure}</Feedback><div className="nk-plan-actions"><ActionButton className="nk-button nk-button-secondary" value="UNDER_REVIEW" disabled={busy} disabledReason="Espera mientras se procesa la decisión.">Marcar en revisión</ActionButton><ActionButton className="nk-button nk-button-primary" value="LINKED" disabled={busy || !tenantId} disabledReason="Selecciona la empresa validada para vincular la solicitud.">Vincular y tramitar</ActionButton><ActionButton className="nk-button nk-button-danger" value="REJECTED" disabled={busy} disabledReason="Espera mientras se procesa la decisión.">Rechazar solicitud</ActionButton></div></form>}</article>
}

export default function AdministracionPlanesPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [companies, setCompanies] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [inbox, setInbox] = useState(null)
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [error, setError] = useState('')
  const companyId = searchParams.get('empresa') || ''
  const tab = searchParams.get('vista') || 'empresas'
  const company = companies.find(item => item.id === companyId)
  const isAdmin = session?.user?.role === 'domian_admin'
  const load = async () => {
    setLoading(true); setError('')
    try { const [companyData, catalogData, requestData] = await Promise.all([api.get(`${prefix}/companies`), api.get(`${prefix}/catalog`), api.get(`${prefix}/requests`)]); setCompanies(companyData.companies || []); setCatalog(catalogData); setInbox(requestData) }
    catch (failure) { setError(errorMessage(failure)) }
    finally { setLoading(false) }
  }
  const loadCompany = async () => {
    if (!companyId) { setSummary(null); return }
    setLoadingCompany(true)
    try { setSummary(await api.get(`${prefix}/companies/${companyId}`)) }
    catch (failure) { setSummary(null); setError(errorMessage(failure)) }
    finally { setLoadingCompany(false) }
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])
  useEffect(() => { if (isAdmin) { setSummary(null); loadCompany() } }, [isAdmin, companyId])
  const refresh = async () => { await Promise.all([load(), loadCompany()]); window.dispatchEvent(new Event('nexo:subscription-changed')) }
  const navigate = (name, id = '') => setSearchParams({ vista: name, ...(id ? { empresa: id } : {}) })
  const filtered = companies.filter(item => `${companyName(item)} ${item.rut || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  if (!isAdmin) return <section className="nk-module-page"><h1>Acceso reservado a Nexo Klar</h1><p>Esta administración requiere un permiso global.</p><Link to="/app" className="nk-button nk-button-primary">Ir al panel</Link></section>
  return <section className="nk-module-page nk-subscription-admin"><header className="nk-module-header"><div><h1>Planes y suscripciones</h1><p>Administra catálogo, contratación, capacidad y solicitudes con trazabilidad.</p></div><ActionButton className="nk-button nk-button-secondary" onClick={refresh} disabled={loading || loadingCompany} disabledReason="Se está actualizando la información.">Actualizar</ActionButton></header><nav className="nk-subscription-tabs" aria-label="Administración comercial">{[['empresas', 'Empresas y suscripciones'], ['catalogo', 'Catálogo de planes'], ['solicitudes', 'Solicitudes comerciales']].map(([name, label]) => <button className={`nk-button ${tab === name ? 'nk-button-primary' : 'nk-button-secondary'}`} aria-current={tab === name ? 'page' : undefined} key={name} onClick={() => navigate(name)}>{label}</button>)}</nav><Feedback error>{error}</Feedback>{loading && !catalog && <p role="status">Cargando administración comercial…</p>}{tab === 'catalogo' && catalog && <CatalogEditor catalog={catalog} onSaved={refresh} />}{tab === 'solicitudes' && <section className="nk-module-card"><h2>Solicitudes recibidas desde Planes y precios</h2>{inbox?.commercialRequests?.length ? inbox.commercialRequests.map(lead => <CommercialLead lead={lead} key={lead.id} companies={companies} onSaved={refresh} />) : <p>No hay solicitudes públicas registradas.</p>}<h2>Solicitudes de cambio pendientes</h2><div className="nk-subscription-request-list">{(inbox?.requests || []).filter(item => !['EXECUTED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(item.status)).map(item => <article key={item.id}><div><strong>{item.companyName || item.tenantName || 'Empresa'}</strong><p>{requestTypes[item.type] || item.type} · {requestPlanName(item)}</p><span>{requestStates[item.status] || item.status}</span></div><button className="nk-button nk-button-secondary" onClick={() => navigate('empresas', item.tenantId || item.companyId)}>Revisar solicitud</button></article>)}</div></section>}{tab === 'empresas' && <><section className="nk-module-card"><h2>Seleccionar empresa</h2><label className="nk-field"><span className="nk-label">Buscar por nombre o RUT</span><input className="nk-input" type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="nk-subscription-company-list">{filtered.map(item => <button key={item.id} className={`nk-subscription-company${companyId === item.id ? ' is-selected' : ''}`} onClick={() => navigate('empresas', item.id)}><strong>{companyName(item)}</strong><span>{item.rut} · {item.managed || item.subscriptionManaged ? 'Suscripción parametrizada' : 'Condiciones actuales'}</span></button>)}{!loading && !filtered.length && <p>No se encontraron empresas.</p>}</div></section>{loadingCompany && <p role="status">Cargando la suscripción de la empresa…</p>}{company && summary && <CompanySubscription company={company} summary={summary} catalog={catalog} onSaved={refresh} />}</>}</section>
}
