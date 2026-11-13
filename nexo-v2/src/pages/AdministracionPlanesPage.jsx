import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { useSubscription } from '../services/subscription.jsx'
import { ActionButton } from '../components/ui/ActionButton.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import SubscriptionGovernancePanel from '../components/ui/SubscriptionGovernancePanel.jsx'
import { useConfirmation } from '../services/useConfirmation.js'
import { CapacityMeter, currentOffers, Feedback, invalidPackageSelection, PackageFields, SubscriptionAuditHistory, SubscriptionStatus } from '../components/ui/SubscriptionComponents.jsx'
import { count, dateTime, errorMessage, money, packageSelectionTotals, planPrice, requestKey, requestStates, requestTypes, requestPlanCode, requestPlanName, selectedPackages } from '../services/subscriptions.js'
import '../styles/subscriptions.css'

const prefix = '/subscriptions/admin'
const companyName = company => company.name || company.companyName || company.company_name || 'Empresa'
const blankDocument = () => ({ number: '', fileId: '', netAmount: '', issuedAt: '', status: '', responsible: '', observations: '' })
const blankDocuments = () => ({ quote: { ...blankDocument(), acceptedAt: '', validUntil: '' }, purchaseOrder: blankDocument(), invoice: blankDocument() })
const localDateTime = value => { if (!value || Number.isNaN(Date.parse(value))) return ''; const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
const fileIdOf = document => document.fileId || /\/files\/([\w-]+)/.exec(document.url || '')?.[1] || ''

function CatalogEditor({ catalog, onSaved, canManage }) {
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failure, setFailure] = useState(''), [errors, setErrors] = useState({})
  const confirmation = useConfirmation()
  const records = [...(catalog?.plans || []).map(item => ({ ...item, kind: 'plan' })), ...(catalog?.packages || []).map(item => ({ ...item, kind: 'package' }))]
  const choose = record => { if (!canManage) return; setForm({ ...record, name: record.name || '', description: record.description || '', featuresText: (record.publicFeatures || []).join('\n'), ctaText: record.ctaText || (record.code === 'FREE' ? 'Comenzar gratis' : 'Solicitar plan'), active: record.active !== false, displayOrder: record.displayOrder ?? 0, trialMonths: record.trialMonths ?? (record.code === 'FREE' ? 6 : 0), monthlyPrice: planPrice(record), taxPercent: Number(record.taxRate ?? .19) <= 1 ? Number(record.taxRate ?? .19) * 100 : Number(record.taxRate), publicVisible: record.publicVisible !== false, recommended: Boolean(record.recommended), repeatable: Boolean(record.repeatable), stackable: record.stackable !== false, maxQuantity: record.maxQuantity || 1, graceDays: record.graceDays ?? (record.code === 'FREE' ? 0 : 30), warningPercent: record.warningPercent ?? 80, criticalPercent: record.criticalPercent ?? 90 }); setMessage(''); setFailure(''); setErrors({}) }
  const update = (name, value) => { setForm(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })) }
  const save = async action => {
    if (!canManage) return
    setBusy(true); setFailure(''); setMessage('')
    try { const values = { kind: form.kind, code: form.code, versionId: form.versionId, name: form.name.trim(), monthlyPrice: Number(form.monthlyPrice), taxRate: Number(form.taxPercent) / 100, displayOrder: Number(form.displayOrder), active: form.active, action }
      if (form.kind === 'plan') Object.assign(values, { workerLimit: Number(form.workerLimit), publicVisible: form.publicVisible, recommended: form.recommended, graceDays: Number(form.graceDays), warningPercent: Number(form.warningPercent), criticalPercent: Number(form.criticalPercent), description: form.description.trim(), publicFeatures: form.featuresText.split('\n').map(item => item.trim()).filter(Boolean), ctaText: form.ctaText.trim(), trialMonths: form.code === 'FREE' ? Number(form.trialMonths) : 0, allowedUpgradeTargets: form.allowedUpgradeTargets || [] })
      else Object.assign(values, { workersQuantity: Number(form.workersQuantity), maxQuantity: form.repeatable ? Number(form.maxQuantity) : 1, repeatable: form.repeatable, stackable: form.stackable })
      await api.post(`${prefix}/catalog`, values, { feedback: false }); await onSaved(); setForm(null); setMessage(action === 'publish' ? 'Nueva versión publicada. Las ofertas vigentes se actualizan; los contratos aceptados conservan sus condiciones.' : 'Borrador guardado. No está disponible para contratación pública.')
    } catch (error) { setFailure(errorMessage(error)) } finally { setBusy(false) }
  }
  const submit = (event, action) => {
    event.preventDefault(); if (!canManage) return; const next = {}
    const integer = (field, min, max, label) => { const value = Number(form[field]); if (String(form[field]).trim() === '' || !Number.isSafeInteger(value) || value < min || value > max) next[field] = `${label}: ingresa un entero entre ${count(min)} y ${count(max)}.` }
    if (!form.name.trim() || form.name.trim().length > 100) next.name = 'Ingresa un nombre de hasta 100 caracteres.'
    integer('monthlyPrice', 0, 1000000000, 'Precio mensual'); integer(form.kind === 'plan' ? 'workerLimit' : 'workersQuantity', 1, 1000000, 'Capacidad'); integer('displayOrder', 0, 10000, 'Orden de presentación')
    if (form.taxPercent === '' || !Number.isFinite(Number(form.taxPercent)) || Number(form.taxPercent) < 0 || Number(form.taxPercent) > 100) next.taxPercent = 'Ingresa un IVA entre 0 y 100%.'
    if (form.kind === 'plan') {
      if (form.code === 'FREE' && Number(form.monthlyPrice) !== 0) next.monthlyPrice = 'El plan Free debe conservar precio cero.'
      if (form.description.trim().length > 2000) next.description = 'Usa hasta 2.000 caracteres en la descripción.'
      const features = form.featuresText.split('\n').map(item => item.trim()).filter(Boolean)
      if (features.length > 30 || features.some(item => item.length > 240)) next.featuresText = 'Usa hasta 30 beneficios, uno por línea, de hasta 240 caracteres cada uno.'
      if (!form.ctaText.trim() || form.ctaText.trim().length > 80) next.ctaText = 'Ingresa un texto de botón de hasta 80 caracteres.'
      if (form.code === 'FREE') integer('trialMonths', 1, 120, 'Duración gratuita')
      integer('graceDays', 0, 365, 'Días de gracia'); integer('warningPercent', 0, 98, 'Advertencia'); integer('criticalPercent', 1, 99, 'Alerta crítica')
      if (Number(form.criticalPercent) <= Number(form.warningPercent)) next.criticalPercent = 'La alerta crítica debe ser mayor que la advertencia.'
    } else if (form.repeatable) integer('maxQuantity', 1, 1000, 'Máximo de unidades')
    setErrors(next); if (Object.keys(next).length) { document.getElementById(`catalog-${Object.keys(next)[0]}`)?.focus(); return }
    if (action === 'publish') confirmation.ask({ title: 'Publicar versión de catálogo', description: form.active ? `Se publicará ${form.name} por ${money(form.monthlyPrice)} netos mensuales + IVA. Los contratos actuales conservarán su precio, capacidad y vigencia.` : `Se retirará ${form.name} de las nuevas ofertas. Los contratos aceptados conservarán sus condiciones.`, confirmLabel: 'Publicar versión', onConfirm: () => save(action) }); else save(action)
  }
  const field = (name, label, options = {}) => <div className="nk-field"><label className="nk-label" htmlFor={`catalog-${name}`}>{label}</label><input id={`catalog-${name}`} className="nk-input" value={form[name]} onChange={event => update(name, event.target.value)} disabled={busy} aria-invalid={Boolean(errors[name])} aria-describedby={[options.help ? `catalog-${name}-help` : '', errors[name] ? `catalog-${name}-error` : ''].filter(Boolean).join(' ') || undefined} {...Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'help'))} />{options.help && <small id={`catalog-${name}-help`}>{options.help}</small>}{errors[name] && <p className="nk-field-error" role="alert" id={`catalog-${name}-error`}>{errors[name]}</p>}</div>
  const text = (name, label, help, maxLength) => <div className="nk-field nk-catalog-wide"><label className="nk-label" htmlFor={`catalog-${name}`}>{label}</label><textarea id={`catalog-${name}`} className="nk-textarea" rows="3" maxLength={maxLength} value={form[name]} onChange={event => update(name, event.target.value)} disabled={busy} aria-invalid={Boolean(errors[name])} aria-describedby={`catalog-${name}-help${errors[name] ? ` catalog-${name}-error` : ''}`} /><small id={`catalog-${name}-help`}>{help}</small>{errors[name] && <p className="nk-field-error" role="alert" id={`catalog-${name}-error`}>{errors[name]}</p>}</div>
  const checkbox = (name, label) => <label className="nk-plan-consent"><input type="checkbox" checked={form[name]} onChange={event => update(name, event.target.checked)} disabled={busy} />{label}</label>
  return <section className="nk-module-card"><h2>Catálogo de planes y paquetes</h2><p>Edita una nueva versión sin reescribir contratos aceptados. Todos los importes son CLP netos + IVA. Los códigos se mantienen; su capacidad se configura en cada versión.</p><div className="nk-table-wrapper"><table className="nk-table"><caption className="nk-sr-only">Versiones del catálogo comercial</caption><thead><tr><th>Nombre</th><th>Capacidad</th><th>Mensual neto</th><th>Versión y oferta</th><th>Acción</th></tr></thead><tbody>{records.map((item, index) => <tr key={`${item.kind}-${item.versionId || item.code}-${index}`}><td><strong>{item.name}</strong><small>{item.code} · Orden {item.displayOrder ?? 0}</small></td><td>{count(item.workerLimit ?? item.workersQuantity)} trabajadores</td><td>{money(planPrice(item), item.currency)}</td><td>{(item.state || item.status) === 'DRAFT' ? 'Borrador' : (item.state || item.status) === 'RETIRED' ? 'Retirado' : 'Publicado'}<small>{item.active === false ? 'Inactiva para nuevas ofertas' : item.publicVisible === false ? 'Oculta en la página pública' : 'Oferta activa'}</small></td><td><button type="button" className="nk-button nk-button-secondary nk-button-sm" disabled={!canManage} title={!canManage ? 'Tu perfil puede consultar el catálogo; su edición requiere administración global.' : undefined} onClick={() => choose(item)}>Editar {item.name}</button></td></tr>)}</tbody></table></div><Feedback>{message}</Feedback><Feedback error>{failure}</Feedback>{form && <form className="nk-subscription-editor" noValidate onSubmit={event => submit(event, event.nativeEvent.submitter?.value || 'draft')} aria-busy={busy}><h3>Nueva versión de {form.name}</h3><p>El precio, capacidad, duración y textos nuevos se aplican a nuevas contrataciones. Publicar una oferta inactiva la retira del catálogo sin suspender contratos existentes.</p><div className="nk-subscription-form-grid">
    {field('name', 'Nombre público', { required: true, maxLength: 100 })}{field('monthlyPrice', 'Precio mensual neto CLP', { required: true, type: 'number', min: 0, max: 1e9, step: 1 })}{field(form.kind === 'plan' ? 'workerLimit' : 'workersQuantity', form.kind === 'plan' ? 'Capacidad base' : 'Trabajadores por paquete', { required: true, type: 'number', min: 1, max: 1e6, step: 1, help: form.kind === 'package' ? 'La capacidad real no se deduce del código del paquete.' : undefined })}{field('taxPercent', 'IVA (%)', { required: true, type: 'number', min: 0, max: 100, step: '.01' })}{field('displayOrder', 'Orden de presentación', { required: true, type: 'number', min: 0, max: 10000, step: 1, help: 'Un número menor se muestra primero. No cambia la secuencia de mejoras permitidas.' })}
    {form.kind === 'plan' && <>{field('ctaText', 'Texto del botón de solicitud', { required: true, maxLength: 80 })}{text('description', 'Descripción pública', 'Descripción del plan, hasta 2.000 caracteres.', 2000)}{text('featuresText', 'Beneficios públicos', 'Un beneficio por línea; máximo 30, de hasta 240 caracteres cada uno. Estos textos no conceden permisos ni habilitan módulos.', 7230)}{form.code === 'FREE' && field('trialMonths', 'Duración gratuita (meses calendario)', { required: true, type: 'number', min: 1, max: 120, step: 1, help: 'Sólo para nuevos contratos Free. Las empresas existentes conservan su fecha de término.' })}{field('graceDays', 'Días de gracia', { required: true, type: 'number', min: 0, max: 365, step: 1, disabled: busy || form.code === 'FREE' })}{field('warningPercent', 'Advertencia desde (%)', { required: true, type: 'number', min: 0, max: 98, step: 1 })}{field('criticalPercent', 'Alerta crítica desde (%)', { required: true, type: 'number', min: 1, max: 99, step: 1 })}<fieldset className="nk-catalog-wide"><legend>Mejoras de plan permitidas</legend><p>Permite saltos directos sólo cuando estén autorizados comercialmente.</p>{['FREE', 'LA_UNION', 'PURRANQUE', 'FRUTILLAR', 'PUERTO_OCTAY'].filter((code, index, codes) => index > codes.indexOf(form.code)).map(code => <label className="nk-plan-consent" key={code}><input type="checkbox" disabled={busy} checked={(form.allowedUpgradeTargets || []).includes(code)} onChange={event => update('allowedUpgradeTargets', event.target.checked ? [...(form.allowedUpgradeTargets || []), code] : (form.allowedUpgradeTargets || []).filter(item => item !== code))} />{records.find(item => item.code === code)?.name || code}</label>)}</fieldset></>}
    {form.kind === 'package' && <>{field('maxQuantity', 'Máximo de unidades del mismo paquete', { type: 'number', min: 1, max: 1000, step: 1, required: true, disabled: busy || !form.repeatable })}{checkbox('repeatable', 'Permitir repetir el mismo paquete')}{checkbox('stackable', 'Permitir acumular paquetes')}</>}{checkbox('active', 'Activa para nuevas ofertas')}{form.kind === 'plan' && <>{checkbox('publicVisible', 'Visible en Planes y precios')}{checkbox('recommended', 'Mostrar como recomendado')}</>}</div><div className="nk-plan-actions"><ActionButton className="nk-button nk-button-secondary" name="action" value="draft" disabled={busy} disabledReason="Se está guardando la versión.">Guardar borrador</ActionButton><ActionButton className="nk-button nk-button-primary" name="action" value="publish" disabled={busy} disabledReason="Se está guardando la versión.">Publicar versión</ActionButton><button className="nk-button nk-button-quiet" type="button" disabled={busy} onClick={() => setForm(null)}>Cerrar edición</button></div></form>}<ConfirmDialog {...confirmation.dialogProps} /></section>
}

function RequestEditor({ request, tenantId, company, currentContract, onSaved, capabilities }) {
  const { session } = useAuth()
  const selfApproval = request.requestedBy === session?.user?.id
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
  useEffect(() => { const source = request.documents || request.payload?.documents || {}; setDocuments(Object.fromEntries(Object.entries(blankDocuments()).map(([kind, initial]) => [kind, { ...initial, ...(source[kind] || {}), fileId: fileIdOf(source[kind] || {}), acceptedAt: localDateTime(source[kind]?.acceptedAt), validUntil: localDateTime(source[kind]?.validUntil) }]))); setEffectiveAt(localDateTime(request.effectiveAt)); setImmediateChangeTerms(request.documents?.immediateChangeTerms || ''); setReason(''); setFailure(''); setFieldErrors({}); setAction(({ REQUESTED: 'review', UNDER_REVIEW: 'approve', APPROVED: 'schedule', SCHEDULED: 'execute', EXECUTION_FAILED: 'execute' })[request.status] || 'review'); key.current = requestKey() }, [request.id, request.status])
  const actions = (({ REQUESTED: ['review', 'documents', 'reject', 'cancel'], UNDER_REVIEW: ['approve', 'documents', 'reject', 'cancel'], APPROVED: ['schedule', 'documents', 'cancel'], SCHEDULED: ['execute', 'cancel'], EXECUTION_FAILED: ['execute', 'cancel'] })[request.status] || []).filter(value => capabilities.includes(`requests.${value}`) && !(value === 'approve' && selfApproval))
  useEffect(() => { if (!actions.includes(action)) setAction(actions[0] || '') }, [request.id, request.status, selfApproval, capabilities.join(',')])
  const actionNames = { review: 'Iniciar revisión', documents: 'Guardar documentación', approve: 'Aprobar', reject: 'Rechazar', schedule: 'Programar', execute: 'Ejecutar cambio', cancel: 'Cancelar solicitud' }
  const upload = async (kind, file) => {
    if (!file || !capabilities.includes('requests.documents')) return
    if (file.size > 25 * 1024 * 1024) { setFailure('El archivo supera el máximo de 25 MB.'); return }
    setUploading(kind); setFailure('')
    try { const result = await api.upload(`${prefix}/companies/${tenantId}/documents`, file, { entityType: 'subscription_document', entityId: request.id }, { feedback: false }); setDocuments(current => ({ ...current, [kind]: { ...current[kind], fileId: result.id, fileName: result.original_name || file.name } })); setFieldErrors(current => ({ ...current, [`${kind}-file`]: '' })) }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setUploading('') }
  }
  const execute = async () => {
    if (!capabilities.includes(`requests.${action}`) || (action === 'approve' && selfApproval)) return
    setBusy(true); setFailure('')
    try {
      const attached = Object.fromEntries(Object.entries(documents).filter(([, document]) => document.number.trim() && document.fileId).map(([kind, document]) => [kind, { number: document.number.trim(), fileId: document.fileId, ...(document.netAmount !== '' ? { netAmount: Number(document.netAmount), observations: document.observations.trim() } : {}), ...(document.issuedAt ? { issuedAt: document.issuedAt } : {}), ...(document.status ? { status: document.status } : {}), ...(document.responsible ? { responsible: document.responsible.trim() } : {}), ...(document.validUntil ? { validUntil: new Date(document.validUntil).toISOString() } : {}), acceptedAt: document.acceptedAt ? new Date(document.acceptedAt).toISOString() : undefined }]))
      const values = { action, reason: reason.trim(), effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined, immediateChangeTerms: immediateChangeTerms.trim() || undefined, idempotencyKey: key.current }
      if (Object.keys(attached).length && !['cancel', 'reject', 'execute'].includes(action)) values.documents = attached
      await api.patch(`${prefix}/companies/${tenantId}/requests/${request.id}`, values, { feedback: false }); key.current = requestKey(); await onSaved()
    }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const submit = event => {
    event.preventDefault(); if (!actions.includes(action)) return; const errors = {}
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
    if (!['execute', 'cancel', 'reject'].includes(action)) {
      const previous = request.documents || request.payload?.documents || {}
      for (const kind of ['quote', 'purchaseOrder', 'invoice']) {
        const doc = documents[kind], old = previous[kind] || {}
        const changed = doc.number !== (old.number || '') || doc.fileId !== fileIdOf(old)
        const metadata = doc.netAmount !== '' || doc.issuedAt || doc.status || doc.responsible || doc.observations
        if ((doc.number || doc.fileId) && (changed || metadata)) {
          if (doc.netAmount === '' || !Number.isSafeInteger(Number(doc.netAmount)) || Number(doc.netAmount) < 0 || Number(doc.netAmount) > 1e12) errors[`${kind}-netAmount`] = 'Ingresa el monto neto en CLP, sin decimales, entre 0 y 1.000.000.000.000.'
          if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.issuedAt) || Number.isNaN(Date.parse(doc.issuedAt))) errors[`${kind}-issuedAt`] = 'Registra la fecha de emisión del documento.'
          if (!['DRAFT', 'ISSUED', 'ACCEPTED', 'PAID', 'CANCELLED'].includes(doc.status)) errors[`${kind}-status`] = 'Selecciona el estado documental.'
          if (doc.responsible.trim().length < 2 || doc.responsible.trim().length > 160) errors[`${kind}-responsible`] = 'Registra un responsable de entre 2 y 160 caracteres.'
          if (doc.observations.length > 2000) errors[`${kind}-observations`] = 'Usa hasta 2.000 caracteres en observaciones.'
          if (action === 'schedule' && ['DRAFT', 'CANCELLED'].includes(doc.status)) errors[`${kind}-status`] = 'Un documento borrador o anulado no permite programar la contratación.'
          if (kind === 'quote' && (doc.status === 'ACCEPTED' || action === 'schedule')) {
            if (action === 'schedule' && doc.status !== 'ACCEPTED') errors['quote-status'] = 'La cotización debe estar aceptada antes de programar.'
            if (!doc.acceptedAt) errors['quote-acceptedAt'] = 'Registra la fecha de aceptación de la cotización.'
          }
        }
      }
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
  const updateDocument = (kind, name, value) => { setDocuments(current => ({ ...current, [kind]: { ...current[kind], [name]: value } })); setFieldErrors(current => ({ ...current, [`${kind}-${name}`]: '' })) }
  const documentField = (kind, field, label, options = {}) => <div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-${kind}-${field}`}>{label}</label><input className="nk-input" id={`request-${request.id}-${kind}-${field}`} value={documents[kind][field] ?? ''} onChange={event => updateDocument(kind, field, event.target.value)} aria-invalid={Boolean(fieldErrors[`${kind}-${field}`])} aria-describedby={fieldErrors[`${kind}-${field}`] ? `request-${request.id}-${kind}-${field}-error` : undefined} {...options} />{error(`${kind}-${field}`)}</div>
  const canEditDocuments = capabilities.includes('requests.documents') && !['execute', 'cancel', 'reject'].includes(action)
  return <section className="nk-subscription-editor"><h3>{requestTypes[request.type] || request.type} · {requestPlanName(request)}</h3><dl className="nk-subscription-facts"><div><dt>Empresa</dt><dd>{companyName(company || {})}</dd></div><div><dt>RUT empresa</dt><dd>{company?.rut || 'No disponible'}</dd></div><div><dt>Plan de la solicitud</dt><dd>{requestPlanName(request)}</dd></div><div><dt>Trabajadores al solicitar</dt><dd>{request.workersAtRequest == null && request.proposal?.workers == null ? 'Sin registro histórico' : count(request.workersAtRequest ?? request.proposal?.workers)}</dd></div></dl><p>Estado: <strong>{requestStates[request.status] || request.status}</strong> · Solicitud {dateTime(request.createdAt)}{request.approvedAt ? ` · Aprobada ${dateTime(request.approvedAt)}` : ''}</p>{request.reason && <p>Motivo original: {request.reason}</p>}{selfApproval && request.status === 'UNDER_REVIEW' && <p role="status">La aprobación requiere otra persona autorizada. Quien creó esta solicitud no puede aprobarla.</p>}<form noValidate onSubmit={submit} aria-busy={busy}>
    {actions.length > 0 && <div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Acción autorizada</span><select className="nk-select" value={action} onChange={event => { setAction(event.target.value); setFieldErrors({}); key.current = requestKey() }} disabled={busy}>{actions.map(value => <option value={value} key={value}>{actionNames[value]}</option>)}</select></label><div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-effectiveAt`}>Fecha y hora efectivas</label><input className="nk-input" id={`request-${request.id}-effectiveAt`} type="datetime-local" value={effectiveAt} onChange={event => setEffectiveAt(event.target.value)} disabled={busy} aria-invalid={Boolean(fieldErrors.effectiveAt)} aria-describedby={fieldErrors.effectiveAt ? `request-${request.id}-effectiveAt-error` : undefined} />{error('effectiveAt')}</div></div>}
    {action === 'schedule' && currentContract && request.type !== 'RENEWAL' && effectiveAt && new Date(effectiveAt) < new Date(currentContract.endsAt) && <div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-immediateChangeTerms`}>Condiciones aceptadas del cambio inmediato *</label><textarea className="nk-textarea" id={`request-${request.id}-immediateChangeTerms`} value={immediateChangeTerms} onChange={event => setImmediateChangeTerms(event.target.value)} rows="3" maxLength="2000" disabled={busy} aria-invalid={Boolean(fieldErrors.immediateChangeTerms)} aria-describedby={fieldErrors.immediateChangeTerms ? `request-${request.id}-immediateChangeTerms-error` : undefined} /><small>Registra el tratamiento del período y la facturación ya aceptado por la empresa. No se aplica prorrateo automático.</small>{error('immediateChangeTerms')}</div>}
    <div className="nk-commercial-documents">{[['quote', 'Cotización'], ['purchaseOrder', 'Orden de compra'], ['invoice', 'Factura']].map(([kind, name]) => <fieldset key={kind} disabled={busy || !canEditDocuments}><legend>{name}</legend>{documentField(kind, 'number', `Número de ${name.toLowerCase()}`, { maxLength: 100 })}{documentField(kind, 'netAmount', 'Monto neto CLP', { type: 'number', min: 0, max: 1e12, step: 1 })}{documentField(kind, 'issuedAt', 'Fecha de emisión', { type: 'date' })}<div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-${kind}-status`}>Estado documental</label><select id={`request-${request.id}-${kind}-status`} className="nk-select" value={documents[kind].status} onChange={event => updateDocument(kind, 'status', event.target.value)} aria-invalid={Boolean(fieldErrors[`${kind}-status`])} aria-describedby={fieldErrors[`${kind}-status`] ? `request-${request.id}-${kind}-status-error` : undefined}><option value="">Selecciona un estado</option>{[['DRAFT', 'Borrador'], ['ISSUED', 'Emitido'], ['ACCEPTED', 'Aceptado'], ['PAID', 'Pagado'], ['CANCELLED', 'Anulado']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error(`${kind}-status`)}</div>{documentField(kind, 'responsible', 'Responsable', { maxLength: 160 })}<div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-${kind}-observations`}>Observaciones</label><textarea className="nk-textarea" id={`request-${request.id}-${kind}-observations`} rows="3" maxLength="2000" value={documents[kind].observations} onChange={event => updateDocument(kind, 'observations', event.target.value)} aria-invalid={Boolean(fieldErrors[`${kind}-observations`])} aria-describedby={fieldErrors[`${kind}-observations`] ? `request-${request.id}-${kind}-observations-error` : undefined} />{error(`${kind}-observations`)}</div>{kind === 'quote' && <>{documentField('quote', 'acceptedAt', 'Aceptación de la cotización', { type: 'datetime-local' })}{documentField('quote', 'validUntil', 'Vigencia de la cotización hasta (opcional)', { type: 'datetime-local' })}</>}<label className="nk-field" htmlFor={`request-${request.id}-${kind}-file`}><span className="nk-label">Adjuntar {name.toLowerCase()}</span><input id={`request-${request.id}-${kind}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" disabled={busy || Boolean(uploading)} aria-invalid={Boolean(fieldErrors[`${kind}-file`])} aria-describedby={fieldErrors[`${kind}-file`] ? `request-${request.id}-${kind}-file-error` : undefined} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; upload(kind, file) }} /><small>Archivo privado de la empresa · máximo 25 MB.</small></label>{error(`${kind}-file`)}{uploading === kind && <p role="status">Cargando documento…</p>}{documents[kind].fileId && <a className="nk-button nk-button-quiet" href={`/api${prefix}/companies/${tenantId}/documents/${documents[kind].fileId}`} target="_blank" rel="noreferrer">Ver {documents[kind].fileName || name.toLowerCase()}</a>}</fieldset>)}</div>
    {actions.length > 0 ? <><div className="nk-field"><label className="nk-label" htmlFor={`request-${request.id}-reason`}>Motivo de la decisión *</label><textarea className="nk-textarea" id={`request-${request.id}-reason`} rows="2" maxLength="2000" value={reason} onChange={event => { setReason(event.target.value); setFieldErrors(current => ({ ...current, reason: '' })) }} disabled={busy} aria-invalid={Boolean(fieldErrors.reason)} aria-describedby={fieldErrors.reason ? `request-${request.id}-reason-error` : undefined} />{error('reason')}</div><Feedback error>{failure}</Feedback><ActionButton className="nk-button nk-button-primary" disabled={busy || Boolean(uploading)} disabledReason="Espera a que termine la carga o la decisión.">{busy ? 'Procesando…' : actionNames[action]}</ActionButton></> : <p>No hay acciones de modificación disponibles para tu perfil y el estado de esta solicitud.</p>}
  </form><ConfirmDialog {...confirmation.dialogProps} /></section>
}

function CompanySubscription({ company, summary, catalog, onSaved, capabilities }) {
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
  const plan = currentOffers(catalog?.plans).find(item => item.code === planCode)
  const availablePackages = planCode === 'PUERTO_OCTAY' ? currentOffers(catalog?.packages) : []
  const extras = packageSelectionTotals(packages, availablePackages)
  const create = async event => {
    event.preventDefault(); if (!capabilities.includes('requests.create')) return
    const invalidPackage = invalidPackageSelection(packages, availablePackages)
    if (invalidPackage) { setFailure('Revisa la cantidad de paquetes.'); document.getElementById(`subscription-package-${invalidPackage.code}`)?.focus(); return }
    setBusy(true); setMessage(''); setFailure('')
    try { await api.post(`${prefix}/companies/${company.id}/requests`, { type, planCode, versionId: plan?.versionId, packages: selectedPackages(packages, availablePackages).map(item => ({ ...item, versionId: availablePackages.find(pack => pack.code === item.code)?.versionId })), reason: reason.trim(), idempotencyKey: key.current }, { feedback: false }); key.current = requestKey(); setReason(''); setMessage('Solicitud creada. Revisa y completa su documentación antes de aprobar, programar y ejecutar.'); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const saveServices = async event => {
    event.preventDefault(); if (!capabilities.includes('services.manage')) return; setBusy(true); setFailure(''); setMessage('')
    try { const payload = Object.fromEntries(['libroObra', 'oportunidades'].map(code => [code, { enabled: Boolean(services[code]?.enabled), reference: services[code]?.reference || '', endsAt: services[code]?.endsAt ? new Date(services[code].endsAt).toISOString() : null }])); await api.patch(`${prefix}/companies/${company.id}/services`, { services: payload, reason: serviceReason.trim() }, { feedback: false }); setServiceReason(''); setMessage('Contrataciones independientes actualizadas y auditadas.'); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const updateService = (code, name, value) => setServices(current => ({ ...current, [code]: { ...current[code], [name]: value } }))
  return <section className="nk-module-card"><header className="nk-subscription-company-header"><div><h2>{companyName(company)}</h2><p>{company.rut} · {summary.legacy ? 'Condiciones actuales, sin asignación automática' : summary.contract?.planName || 'Pendiente de activación'}</p></div><SubscriptionStatus status={summary.contract?.status} /></header>{summary.contract && <><dl className="nk-subscription-facts"><div><dt>Mensual neto contratado</dt><dd>{money(summary.contract.monthlyNetPrice, summary.contract.currency)}</dd></div><div><dt>Inicio</dt><dd>{dateTime(summary.contract.startsAt)}</dd></div><div><dt>Vencimiento</dt><dd>{dateTime(summary.contract.endsAt)}</dd></div><div><dt>Fin de gracia</dt><dd>{dateTime(summary.contract.graceEndsAt)}</dd></div></dl><CapacityMeter capacity={summary.capacity} /></>}<Feedback>{message}</Feedback><Feedback error>{failure}</Feedback>{capabilities.includes('requests.create') && <details className="nk-subscription-details"><summary>Crear solicitud de contratación o cambio</summary><form onSubmit={create} className="nk-subscription-editor"><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Tipo de solicitud</span><select className="nk-select" value={type} onChange={event => setType(event.target.value)} disabled={busy}>{!summary.contract && <option value="INITIAL">Contratación inicial</option>}{summary.contract && <><option value="UPGRADE">Mejorar plan</option><option value="DOWNGRADE">Reducir plan</option><option value="RENEWAL">Renovar</option><option value="PACKAGES">Modificar paquetes</option></>}</select></label><label className="nk-field"><span className="nk-label">Plan</span><select className="nk-select" value={planCode} required disabled={busy} onChange={event => { setPlanCode(event.target.value); setPackages({}); key.current = requestKey() }}><option value="">Selecciona un plan</option>{currentOffers(catalog?.plans).filter(item => item.code !== 'FREE').map(item => <option value={item.code} key={item.versionId || item.code}>{item.name} · {count(item.workerLimit)} trabajadores</option>)}</select></label></div>{availablePackages.length > 0 && <PackageFields packages={availablePackages} values={packages} onChange={(code, quantity) => setPackages(current => ({ ...current, [code]: quantity }))} disabled={busy} />}{plan && <p>{count(Number(plan.workerLimit) + extras.workers)} cupos · {money(planPrice(plan) + extras.price, plan.currency)} netos / mes + IVA</p>}<label className="nk-field"><span className="nk-label">Motivo *</span><textarea className="nk-textarea" required maxLength="2000" rows="2" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label><ActionButton className="nk-button nk-button-primary" disabled={busy} disabledReason="Se está creando la solicitud.">Crear solicitud para revisión</ActionButton></form></details>}<h3>Solicitudes de esta empresa</h3>{summary.requests?.length ? summary.requests.map(request => <RequestEditor key={request.id} request={request} tenantId={company.id} company={company} currentContract={summary.contract} onSaved={onSaved} capabilities={capabilities} />) : <p>No hay solicitudes registradas.</p>}{!summary.legacy && capabilities.includes('services.manage') && <details className="nk-subscription-details"><summary>Contrataciones independientes</summary><form onSubmit={saveServices} className="nk-subscription-editor"><p>Libro de Obra y Gestor de Oportunidades se autorizan mediante su propia contratación; no cambian los cupos del plan principal.</p>{[['libroObra', 'Libro de Obra'], ['oportunidades', 'Gestor de Oportunidades']].map(([code, name]) => <fieldset className="nk-subscription-service-editor" key={code}><legend>{name}</legend><label className="nk-plan-consent"><input type="checkbox" checked={Boolean(services[code]?.enabled)} onChange={event => updateService(code, 'enabled', event.target.checked)} disabled={busy} />Contratación habilitada</label><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Referencia del acuerdo</span><input className="nk-input" value={services[code]?.reference || ''} maxLength="200" required={Boolean(services[code]?.enabled)} onChange={event => updateService(code, 'reference', event.target.value)} disabled={busy} /></label><label className="nk-field"><span className="nk-label">Vigencia hasta (opcional)</span><input className="nk-input" type="datetime-local" value={localDateTime(services[code]?.endsAt)} onChange={event => updateService(code, 'endsAt', event.target.value)} disabled={busy} /></label></div></fieldset>)}<label className="nk-field"><span className="nk-label">Motivo del cambio *</span><textarea className="nk-textarea" value={serviceReason} onChange={event => setServiceReason(event.target.value)} required maxLength="2000" rows="2" disabled={busy} /></label><ActionButton className="nk-button nk-button-primary" disabled={busy} disabledReason="Se están guardando las contrataciones.">Guardar contrataciones independientes</ActionButton></form></details>}<details className="nk-subscription-details"><summary>Historial de auditoría</summary><SubscriptionAuditHistory tenantId={company.id} revision={summary} /></details></section>
}

function CommercialLead({ lead, companies, onSaved, capabilities }) {
  const [tenantId, setTenantId] = useState(lead.tenantId || '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const submit = async (event, status) => {
    event.preventDefault(); if (!capabilities.includes(status === 'REJECTED' ? 'requests.reject' : 'requests.review') || !event.currentTarget.reportValidity()) return; setBusy(true); setFailure('')
    try { await api.patch(`${prefix}/commercial-requests/${lead.id}`, { tenantId: tenantId || undefined, status, reason }, { feedback: false }); await onSaved() }
    catch (error) { setFailure(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <article className="nk-subscription-lead"><header><h3>{lead.companyName || lead.company_name}</h3><span className="nk-subscription-status">{requestStates[lead.status] || (lead.status === 'LINKED' ? 'Vinculada a empresa' : lead.status)}</span></header><p>{lead.rut} · {lead.planName || lead.planCode || lead.requestedPlanCode} · {count(lead.workers || lead.workersQuantity)} trabajadores</p><p>{lead.contactName} {lead.contactLastName} · {lead.email || lead.contactEmail} · {lead.phone}</p>{lead.comments && <p>{lead.comments}</p>}{!['LINKED', 'REJECTED'].includes(lead.status) && capabilities.includes('requests.review') && <form onSubmit={event => submit(event, event.nativeEvent.submitter?.value || 'UNDER_REVIEW')}><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Empresa para tramitar la contratación</span><select className="nk-select" value={tenantId} onChange={event => setTenantId(event.target.value)} disabled={busy}><option value="">Selecciona una empresa existente</option>{companies.map(company => <option value={company.id} key={company.id}>{companyName(company)} · {company.rut}</option>)}</select></label><label className="nk-field"><span className="nk-label">Motivo y observaciones *</span><textarea className="nk-textarea" required maxLength="2000" rows="2" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label></div><p>{capabilities.includes('catalog.manage') ? <>Si la empresa aún no existe, registra y valida su cuenta desde <Link to="/app/administracion-clientes">Administración de clientes</Link>.</> : 'Pide a administración global registrar y validar la empresa.'} Vincular crea una solicitud para revisar; no activa el plan.</p><Feedback error>{failure}</Feedback><div className="nk-plan-actions"><ActionButton className="nk-button nk-button-secondary" value="UNDER_REVIEW" disabled={busy} disabledReason="Espera mientras se procesa la decisión.">Marcar en revisión</ActionButton><ActionButton className="nk-button nk-button-primary" value="LINKED" disabled={busy || !tenantId} disabledReason="Selecciona la empresa validada para vincular la solicitud.">Vincular y tramitar</ActionButton><ActionButton className="nk-button nk-button-danger" value="REJECTED" disabled={busy} disabledReason="Espera mientras se procesa la decisión.">Rechazar solicitud</ActionButton></div></form>}</article>
}

export default function AdministracionPlanesPage() {
  const { administration, administrationLoading, administrationError, refreshAdministration } = useSubscription()
  const capabilities = administration?.capabilities || []
  const [searchParams, setSearchParams] = useSearchParams()
  const [companies, setCompanies] = useState([])
  const [catalog, setCatalog] = useState(null)
  const [inbox, setInbox] = useState(null)
  const [summary, setSummary] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [error, setError] = useState('')
  const companyRequest = useRef(0)
  const selectedCompany = useRef('')
  const [summaryCompanyId, setSummaryCompanyId] = useState('')
  const companyId = searchParams.get('empresa') || ''
  selectedCompany.current = companyId
  const tab = searchParams.get('vista') || 'empresas'
  const company = companies.find(item => item.id === companyId)
  const isAdmin = capabilities.includes('read')
  const canGovern = capabilities.includes('operators.manage') || capabilities.includes('policies.manage')
  const load = async () => {
    setLoading(true); setError('')
    try { const [companyData, catalogData, requestData] = await Promise.all([api.get(`${prefix}/companies`), api.get(`${prefix}/catalog`), api.get(`${prefix}/requests`)]); setCompanies(companyData.companies || []); setCatalog(catalogData); setInbox(requestData) }
    catch (failure) { setError(errorMessage(failure)) }
    finally { setLoading(false) }
  }
  const loadCompany = async () => {
    const generation = ++companyRequest.current, requestedCompany = companyId
    if (summaryCompanyId !== requestedCompany) { setSummary(null); setSummaryCompanyId('') }
    setError('')
    if (!requestedCompany) { setLoadingCompany(false); return }
    setLoadingCompany(true)
    try { const result = await api.get(`${prefix}/companies/${requestedCompany}`); if (generation !== companyRequest.current || selectedCompany.current !== requestedCompany) return; setSummary(result); setSummaryCompanyId(requestedCompany) }
    catch (failure) { if (generation === companyRequest.current && selectedCompany.current === requestedCompany) setError(errorMessage(failure)) }
    finally { if (generation === companyRequest.current && selectedCompany.current === requestedCompany) setLoadingCompany(false) }
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])
  useEffect(() => { if (isAdmin) loadCompany(); else { setSummary(null); setSummaryCompanyId(''); setLoadingCompany(false) } return () => { companyRequest.current++ } }, [isAdmin, companyId])
  const refresh = async () => { await Promise.all([load(), loadCompany()]); window.dispatchEvent(new Event('nexo:subscription-changed')) }
  const navigate = (name, id = '') => {
    if (tab === name && companyId === id) return
    if (companyId !== id) { companyRequest.current++; selectedCompany.current = id; setSummary(null); setSummaryCompanyId('') }
    setSearchParams({ vista: name, ...(id ? { empresa: id } : {}) })
  }
  const filtered = companies.filter(item => `${companyName(item)} ${item.rut || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
  if (administrationLoading && !administration) return <p role="status">Validando permisos comerciales…</p>
  if (!isAdmin) return <section className="nk-module-page"><h1>Acceso reservado a Nexo Klar</h1><p>Esta administración requiere un permiso global.</p><Feedback error>{administrationError}</Feedback>{administrationError && <button type="button" className="nk-button nk-button-secondary" onClick={refreshAdministration}>Reintentar permisos</button>}<Link to="/app" className="nk-button nk-button-primary">Ir al panel</Link></section>
  return <section className="nk-module-page nk-subscription-admin"><header className="nk-module-header"><div><h1>Planes y suscripciones</h1><p>Administra catálogo, contratación, capacidad y solicitudes con trazabilidad.</p></div><ActionButton className="nk-button nk-button-secondary" onClick={refresh} disabled={loading || loadingCompany} disabledReason="Se está actualizando la información.">Actualizar</ActionButton></header><nav className="nk-subscription-tabs" aria-label="Administración comercial">{[['empresas', 'Empresas y suscripciones'], ['catalogo', 'Catálogo de planes'], ['solicitudes', 'Solicitudes comerciales'], ...(canGovern ? [['gobierno', 'Permisos y políticas']] : [])].map(([name, label]) => <button className={`nk-button ${tab === name ? 'nk-button-primary' : 'nk-button-secondary'}`} aria-current={tab === name ? 'page' : undefined} key={name} onClick={() => navigate(name)}>{label}</button>)}</nav><Feedback error>{error}</Feedback>{tab === 'gobierno' && canGovern && <SubscriptionGovernancePanel access={administration} onAccessChanged={refreshAdministration} />}{loading && !catalog && <p role="status">Cargando administración comercial…</p>}{tab === 'catalogo' && catalog && <CatalogEditor catalog={catalog} onSaved={refresh} canManage={capabilities.includes('catalog.manage')} />}{tab === 'solicitudes' && <section className="nk-module-card"><h2>Solicitudes recibidas desde Planes y precios</h2>{inbox?.commercialRequests?.length ? inbox.commercialRequests.map(lead => <CommercialLead lead={lead} key={lead.id} companies={companies} onSaved={refresh} capabilities={capabilities} />) : <p>No hay solicitudes públicas registradas.</p>}<h2>Solicitudes de cambio pendientes</h2><div className="nk-subscription-request-list">{(inbox?.requests || []).filter(item => !['EXECUTED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(item.status)).map(item => <article key={item.id}><div><strong>{item.companyName || item.tenantName || 'Empresa'}</strong><p>{requestTypes[item.type] || item.type} · {requestPlanName(item)}</p><span>{requestStates[item.status] || item.status}</span></div><button className="nk-button nk-button-secondary" onClick={() => navigate('empresas', item.tenantId || item.companyId)}>Revisar solicitud</button></article>)}</div></section>}{tab === 'empresas' && <><section className="nk-module-card"><h2>Seleccionar empresa</h2><label className="nk-field"><span className="nk-label">Buscar por nombre o RUT</span><input className="nk-input" type="search" value={search} onChange={event => setSearch(event.target.value)} /></label><div className="nk-subscription-company-list">{filtered.map(item => <button key={item.id} className={`nk-subscription-company${companyId === item.id ? ' is-selected' : ''}`} onClick={() => navigate('empresas', item.id)}><strong>{companyName(item)}</strong><span>{item.rut} · {item.managed || item.subscriptionManaged ? 'Suscripción parametrizada' : 'Condiciones actuales'}</span></button>)}{!loading && !filtered.length && <p>No se encontraron empresas.</p>}</div></section>{loadingCompany && <p role="status">Cargando la suscripción de la empresa…</p>}{company && summary && summaryCompanyId === companyId && <CompanySubscription company={company} summary={summary} catalog={catalog} onSaved={refresh} capabilities={capabilities} />}</>}</section>
}
