import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../services/api.js'
import { isValidRut } from '../../../services/rut.js'
import { normalizeEmail, validateEmail } from '../../../services/email-validation.js'
import { isValidChilePhone } from '../../../services/chile-phone.js'
import { RutInput } from '../../ui/RutInput.jsx'
import { EmailInput } from '../../ui/EmailInput.jsx'
import { PhoneInput } from '../../ui/PhoneInput.jsx'
import { ActionButton } from '../../ui/ActionButton.jsx'
import { InformationDialog } from '../PublicDialogs.jsx'
import { Feedback, PackageFields } from '../../ui/SubscriptionComponents.jsx'
import { count, errorMessage, money, packageSelectionTotals, planPrice, requestKey, selectedPackages } from '../../../services/subscriptions.js'
import '../../../styles/subscriptions.css'

const emptyForm = { companyName: '', rut: '', tradeName: '', region: '', commune: '', contactName: '', contactLastName: '', position: '', email: '', phone: '', workers: '', comments: '', acceptedTerms: false }
const moduleGroups = [
  ['Centro de Control', 'Panel, alertas, gestión de trabajadores y Centro Operativo.'],
  ['Capital Humano', 'Personas, turnos, EPP, formación, exámenes, salud y no habilitados.'],
  ['Gestión Operacional', 'Comunicaciones, flota, alojamientos y credenciales.'],
  ['Terceros', 'Subcontratos, convenios, personal colaborador, habilitaciones y evaluación.'],
  ['Relación Comercial', 'Clientes, contratos y órdenes de servicio.'],
  ['Cumplimiento', 'Documentación de empresa, habilitación por cliente, incidentes y auditoría.'],
  ['Activos e inventario', 'Maquinaria, equipos, herramientas, EPP, materiales, insumos, bodegas, movimientos, mantenimiento y préstamos.'],
  ['Reportes y administración', 'Reportes, importación/exportación, configuración, usuarios, bitácora y privacidad.'],
]

export default function PlansSection() {
  const [catalog, setCatalog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [registration, setRegistration] = useState(null)
  const [needed, setNeeded] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [recommendError, setRecommendError] = useState('')
  const [recommending, setRecommending] = useState(false)
  const [selected, setSelected] = useState('')
  const [packageValues, setPackageValues] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const formRef = useRef(null)
  const key = useRef(requestKey())
  const plans = catalog?.plans || []
  const plan = plans.find(item => item.code === selected)
  const packages = selected === 'PUERTO_OCTAY' ? catalog?.packages || [] : []
  const extras = packageSelectionTotals(packageValues, packages)
  const total = plan ? planPrice(plan) + extras.price : 0
  const capacity = Number(plan?.workerLimit || 0) + extras.workers

  const load = async () => {
    setLoading(true); setError('')
    try { setCatalog(await api.get('/plans')) } catch (failure) { setError(errorMessage(failure)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load(); api.get('/auth/config').then(setRegistration).catch(() => setRegistration({ registrationEnabled: false })) }, [])
  const update = (name, value) => { setForm(current => ({ ...current, [name]: value })); setErrors(current => ({ ...current, [name]: '' })); setSuccess('') }
  const choose = (code, selection = {}) => {
    setSelected(code); setPackageValues(selection); setSuccess(''); key.current = requestKey()
    window.setTimeout(() => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); document.getElementById('commercial-companyName')?.focus({ preventScroll: true }) }, 0)
  }
  const recommend = async event => {
    event.preventDefault(); setRecommendError(''); setRecommendation(null)
    if (!Number.isSafeInteger(Number(needed)) || Number(needed) <= 0 || Number(needed) > 1000000) { setRecommendError('Ingresa una cantidad entera de trabajadores mayor que cero.'); document.getElementById('plans-workers')?.focus(); return }
    setRecommending(true)
    try { setRecommendation(await api.post('/plans/recommend', { workers: Number(needed) }, { feedback: false })) }
    catch (failure) { setRecommendError(errorMessage(failure)) }
    finally { setRecommending(false) }
  }
  const submit = async event => {
    event.preventDefault()
    const next = {}
    if (form.companyName.trim().length < 3) next.companyName = 'Ingresa la razón social.'
    if (!isValidRut(form.rut)) next.rut = 'Ingresa un RUT de empresa válido.'
    if (form.contactName.trim().length < 2) next.contactName = 'Ingresa tu nombre.'
    if (form.contactLastName.trim().length < 2) next.contactLastName = 'Ingresa tu apellido.'
    const emailError = validateEmail(form.email, { required: true }); if (emailError) next.email = emailError
    if (!form.phone || !isValidChilePhone(form.phone)) next.phone = 'Ingresa un teléfono chileno válido.'
    if (!Number.isSafeInteger(Number(form.workers)) || Number(form.workers) <= 0 || Number(form.workers) > 1000000) next.workers = 'Ingresa una cantidad entera mayor que cero.'
    else if (Number(form.workers) > capacity) next.workers = `La selección admite ${count(capacity)} trabajadores. Elige un plan o paquetes con mayor capacidad.`
    if (!plan || plan.isFree || plan.code === 'FREE') next.planCode = 'Selecciona un plan mensual.'
    if (!form.acceptedTerms) next.acceptedTerms = 'Acepta los términos y la política de privacidad para continuar.'
    setErrors(next)
    if (Object.keys(next).length) { document.getElementById(`commercial-${Object.keys(next)[0]}`)?.focus(); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      await api.post('/commercial-requests', { ...form, email: normalizeEmail(form.email), workers: Number(form.workers), planCode: plan.code, packages: selectedPackages(packageValues, packages).map(item => ({ ...item, versionId: packages.find(pack => pack.code === item.code)?.versionId })), versionId: plan.versionId, displayedMonthlyNetPrice: total, acceptedTerms: true, termsVersion: registration?.registrationTermsVersion || '2026-11-05', idempotencyKey: key.current }, { feedback: false })
      setSuccess('Hemos recibido tu solicitud. Nuestro equipo revisará la información y se pondrá en contacto contigo para continuar con la cotización.'); setForm(emptyForm); key.current = requestKey()
    } catch (failure) {
      if (['SUBSCRIPTION_OFFER_CHANGED', 'PLAN_VERSION_CHANGED', 'CATALOG_VERSION_CONFLICT', 'PRICE_VERSION_CONFLICT'].includes(failure.code)) { await load(); setError('La oferta cambió. Revisa los importes actualizados y pulsa nuevamente Enviar solicitud para confirmar.'); key.current = requestKey() }
      else { const field = ({ INVALID_COMPANY_RUT: 'rut', INVALID_EMAIL: 'email', INVALID_PHONE: 'phone', INVALID_WORKERS_QUANTITY: 'workers' })[failure.code]; if (field) { setErrors({ [field]: errorMessage(failure) }); document.getElementById(`commercial-${field}`)?.focus() } setError(errorMessage(failure)) }
    } finally { setSaving(false) }
  }
  const input = (name, label, options = {}) => <div className="nk-field"><label className="nk-label" htmlFor={`commercial-${name}`}>{label}{options.required ? ' *' : ''}</label><input id={`commercial-${name}`} name={name} className="nk-input" value={form[name]} onChange={event => update(name, event.target.value)} disabled={saving} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `commercial-${name}-error` : undefined} {...options} />{errors[name] && <p className="nk-field-error" id={`commercial-${name}-error`} role="alert">{errors[name]}</p>}</div>

  return <section className="nk-public-section nk-plans-section">
    <header className="nk-plans-hero"><p className="nk-eyebrow">Planes y precios</p><h1>Un plan para cada etapa de tu empresa</h1><p className="nk-lead">Gestiona a tus trabajadores de forma simple y centralizada. Comienza gratis y aumenta tu capacidad a medida que tu empresa crece.</p><div className="nk-plan-actions"><Link className="nk-button nk-button-primary" to="/crear-empresa">Comenzar gratis</Link><a className="nk-button nk-button-secondary" href="#comparar-planes">Comparar planes</a></div><p>Precios mensuales en pesos chilenos, netos + IVA. Renovación manual, sin tarjeta ni cobro automático.</p>{registration && !registration.registrationEnabled && <p className="nk-field-help">El registro de nuevas empresas requiere una invitación y aprobación de Nexo Klar. Solicítala desde Crear empresa.</p>}</header>
    {loading && <p role="status">Cargando planes vigentes…</p>}
    {error && !catalog && <><Feedback error>{error}</Feedback><button className="nk-button nk-button-secondary" onClick={load}>Reintentar</button></>}
    <div className="nk-plan-grid" id="comparar-planes">{plans.map(item => <article className={`nk-plan-tile${item.recommended ? ' is-recommended' : ''}`} key={item.code} data-plan-code={item.code}>{item.recommended && <span className="nk-subscription-status">Recomendado</span>}<h2>{item.name}</h2><p className="nk-plan-price">{money(planPrice(item), item.currency)}<small>{item.isFree || item.code === 'FREE' ? 'sin costo' : 'netos / mes + IVA'}</small></p><p><strong>Hasta {count(item.workerLimit)} trabajadores</strong></p><ul><li>{item.isFree || item.code === 'FREE' ? `${item.trialMonths} meses calendario gratis` : 'Renovación mensual manual'}</li><li>Módulos de gestión de la empresa</li><li>Acceso según los permisos de cada usuario</li><li>{item.code === 'PUERTO_OCTAY' ? 'Capacidad ampliable con paquetes' : 'Cambia de plan mediante solicitud'}</li></ul>{item.isFree || item.code === 'FREE' ? <Link className="nk-button nk-button-primary" to="/crear-empresa">Comenzar gratis</Link> : <button type="button" className="nk-button nk-button-primary" onClick={() => choose(item.code)}>Solicitar {item.name}</button>}</article>)}</div>
    <section className="nk-plan-comparison"><h2>Compara lo que incluye cada plan</h2><p>Los cinco planes comparten los módulos de gestión. La diferencia es la capacidad de trabajadores. Las funciones disponibles para cada persona respetan su rol, la configuración de su empresa y sus integraciones autorizadas.</p><div className="nk-plan-module-grid">{moduleGroups.map(([name, description]) => <details key={name}><summary>{name}</summary><p>{description}</p></details>)}</div><p>Invitación, acceso, MFA, recuperación y gestión documental acompañan los módulos habilitados. Los servicios de terceros requieren disponibilidad y autorización propia.</p><aside className="nk-plan-separate"><h3>Servicios contratados por separado</h3><p><strong>Libro de Obra y Gestor de Oportunidades</strong> tienen contratación independiente. Sus precios y condiciones se cotizan por separado; no están incluidos en los planes ni en los paquetes de trabajadores.</p><Link className="nk-button nk-button-secondary" to="/contacto">Consultar estos servicios</Link></aside></section>
    <section className="nk-plan-recommender"><h2>Encuentra el plan adecuado para tu empresa</h2><form onSubmit={recommend} noValidate><label className="nk-label" htmlFor="plans-workers">¿Cuántos trabajadores necesitas gestionar?</label><div className="nk-plan-actions"><input id="plans-workers" className="nk-input" type="number" min="1" step="1" value={needed} onChange={event => { setNeeded(event.target.value); setRecommendError('') }} aria-invalid={Boolean(recommendError)} aria-describedby={recommendError ? 'plans-workers-error' : undefined} /><ActionButton className="nk-button nk-button-primary" disabled={recommending || !catalog} disabledReason="Espera a que los planes estén disponibles.">{recommending ? 'Buscando…' : 'Recomendar plan'}</ActionButton></div>{recommendError && <p id="plans-workers-error" className="nk-field-error" role="alert">{recommendError}</p>}</form>{recommendation && <div className="nk-plan-recommendation" role="status"><h3>{plans.find(item => item.code === recommendation.planCode)?.name || 'Cotización personalizada'}</h3>{recommendation.planCode ? <p>{count(recommendation.totalCapacity)} cupos · {count(recommendation.available)} disponibles después de registrar tu dotación.</p> : <p>Tu dotación requiere una evaluación comercial. Te ayudaremos a definir una capacidad válida sin asignar cupos ni precios no disponibles.</p>}{recommendation.packages?.length > 0 && <ul>{recommendation.packages.map(item => <li key={item.code}>{count(item.quantity)} × {catalog?.packages?.find(pack => pack.code === item.code)?.name || `+${count(item.workersQuantity)} trabajadores`}</li>)}</ul>}{recommendation.planCode && <p>{recommendation.planCode === 'FREE' ? 'Sin costo durante el período gratuito.' : `${money(recommendation.monthlyNetPrice, recommendation.currency)} netos / mes + IVA.`} Recomendación sujeta a validación comercial.</p>}{recommendation.planCode === 'FREE' ? <Link className="nk-button nk-button-primary" to="/crear-empresa">Comenzar gratis</Link> : recommendation.planCode ? <button className="nk-button nk-button-primary" onClick={() => { setForm(current => ({ ...current, workers: needed })); choose(recommendation.planCode, Object.fromEntries((recommendation.packages || []).map(item => [item.code, item.quantity]))) }}>Solicitar esta selección</button> : <Link className="nk-button nk-button-primary" to="/contacto">Solicitar cotización</Link>}</div>}</section>
    {selected && plan && <section className="nk-plan-request" ref={formRef} aria-labelledby="plan-request-title"><h2 id="plan-request-title">Solicitar plan {plan.name}</h2><p>Una solicitud inicia la cotización. La activación requiere aceptación, orden de compra, factura y autorización de Nexo Klar.</p><form noValidate onSubmit={submit} aria-busy={saving}><div className="nk-subscription-form-grid">{input('companyName', 'Razón social', { required: true, autoComplete: 'organization', maxLength: 160 })}<div className="nk-field"><label className="nk-label" htmlFor="commercial-rut">RUT empresa *</label><RutInput id="commercial-rut" value={form.rut} onChange={value => update('rut', value)} error={errors.rut} required disabled={saving} /></div>{input('tradeName', 'Nombre de fantasía', { maxLength: 160 })}{input('workers', 'Cantidad de trabajadores', { required: true, type: 'number', min: 1, step: 1 })}{input('region', 'Región', { maxLength: 100 })}{input('commune', 'Comuna', { maxLength: 100 })}{input('contactName', 'Nombre', { required: true, autoComplete: 'given-name', maxLength: 100 })}{input('contactLastName', 'Apellido', { required: true, autoComplete: 'family-name', maxLength: 100 })}{input('position', 'Cargo', { maxLength: 100 })}<div className="nk-field"><label className="nk-label" htmlFor="commercial-email">Correo electrónico *</label><EmailInput id="commercial-email" value={form.email} onChange={value => update('email', value)} error={errors.email} required disabled={saving} /></div><div className="nk-field"><label className="nk-label" htmlFor="commercial-phone">Teléfono *</label><PhoneInput id="commercial-phone" value={form.phone} onChange={value => update('phone', value)} error={errors.phone} required disabled={saving} /></div><div className="nk-field"><label className="nk-label" htmlFor="commercial-planCode">Plan solicitado *</label><select id="commercial-planCode" className="nk-select" value={selected} onChange={event => { setSelected(event.target.value); setPackageValues({}); key.current = requestKey() }} disabled={saving}>{plans.filter(item => item.code !== 'FREE').map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div></div>{packages.length > 0 && <PackageFields packages={packages} values={packageValues} onChange={(code, quantity) => setPackageValues(current => ({ ...current, [code]: quantity }))} disabled={saving} />}<p className="nk-plan-total"><strong>{count(capacity)} trabajadores · {money(total, plan.currency)} netos / mes + IVA</strong></p><label className="nk-field" htmlFor="commercial-comments"><span className="nk-label">Comentarios</span><textarea id="commercial-comments" className="nk-textarea" rows="3" maxLength="2000" value={form.comments} onChange={event => update('comments', event.target.value)} disabled={saving} /></label><button type="button" className="nk-button nk-button-quiet" onClick={() => setShowTerms(true)}>Leer términos y privacidad</button><details className="nk-plan-terms"><summary>Condiciones de la solicitud y privacidad</summary><p>Usaremos estos datos para revisar tu solicitud y contactarte sobre la cotización. Enviar esta solicitud no activa un contrato ni genera cobros. Los derechos de acceso, tratamiento y privacidad se detallan en <Link to="/implementacion">Implementación y privacidad</Link>. Las condiciones de contratación se entregan en la cotización para su aceptación.</p></details><label className="nk-plan-consent"><input id="commercial-acceptedTerms" type="checkbox" checked={form.acceptedTerms} onChange={event => update('acceptedTerms', event.target.checked)} disabled={saving} aria-invalid={Boolean(errors.acceptedTerms)} aria-describedby={errors.acceptedTerms ? 'commercial-acceptedTerms-error' : undefined} /><span>He leído y acepto las condiciones de la solicitud y la política de privacidad.</span></label>{errors.acceptedTerms && <p id="commercial-acceptedTerms-error" className="nk-field-error" role="alert">{errors.acceptedTerms}</p>}<Feedback error>{error}</Feedback><Feedback>{success}</Feedback><ActionButton className="nk-button nk-button-primary" disabled={saving} disabledReason="La solicitud se está enviando.">{saving ? 'Enviando…' : 'Enviar solicitud'}</ActionButton></form></section>}
    <section className="nk-plan-faq"><h2>Preguntas frecuentes</h2>{[
      ['¿Puedo comenzar gratis?', `Free permite hasta ${count(catalog?.plans?.find(item => item.code === 'FREE')?.workerLimit)} trabajadores durante ${catalog?.plans?.find(item => item.code === 'FREE')?.trialMonths || 'el período indicado'} meses calendario, sin tarjeta. El alta sigue el proceso de invitación y aprobación vigente. El beneficio no se reinicia al cambiar de usuario o plan.`],
      ['¿Qué ocurre al terminar Free?', 'Se suspende la operación del plan y puedes solicitar un plan mensual. La transición no elimina tus registros.'],
      ['¿Pierdo información al cambiar de plan?', 'No. El cambio conserva personas, documentos, relaciones e historial.'],
      ['¿Puedo bajar de plan?', 'Puedes solicitarlo. Nexo Klar valida la dotación, revisa las condiciones y ejecuta el cambio autorizado.'],
      ['¿Qué pasa si alcanzo mi límite?', 'Puedes seguir corrigiendo tus registros; para registrar nuevos trabajadores necesitas un plan con mayor capacidad o paquetes de Puerto Octay.'],
      ['¿Cómo amplío Puerto Octay?', 'Solicita paquetes acumulables del catálogo. Se registran con su vigencia y composición.'],
      ['¿Cómo contrato y renuevo?', 'Mediante solicitud, cotización, aceptación, orden de compra, factura y activación autorizada. La renovación mensual es manual.'],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    {showTerms && <InformationDialog kind="terms" onClose={() => setShowTerms(false)} />}
  </section>
}
