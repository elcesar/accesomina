import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { useSubscription } from '../services/subscription.jsx'
import { CapacityMeter, Feedback, PackageFields, SubscriptionStatus, TrialProgress } from '../components/ui/SubscriptionComponents.jsx'
import { ActionButton } from '../components/ui/ActionButton.jsx'
import { count, dateTime, errorMessage, isCompanyAdministrator, money, packageSelectionTotals, planPrice, requestKey, requestStates, requestTypes, requestPlanName, selectedPackages } from '../services/subscriptions.js'
import '../styles/subscriptions.css'

export default function MiPlanPage() {
  const { session } = useAuth()
  const { summary, loading, error, refresh } = useSubscription()
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const [type, setType] = useState('UPGRADE')
  const [planCode, setPlanCode] = useState('')
  const [packageValues, setPackageValues] = useState({})
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState('')
  const [fields, setFields] = useState({})
  const [needed, setNeeded] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [recommendError, setRecommendError] = useState('')
  const [recommending, setRecommending] = useState(false)
  const key = useRef(requestKey())
  const canManage = isCompanyAdministrator(session)
  const contract = summary?.contract
  const allPlans = catalog?.plans || []
  const currentRank = allPlans.findIndex(item => item.code === contract?.planCode)
  const plans = allPlans.filter((item, index) => item.code !== 'FREE' && (summary?.legacy || !contract || currentRank < 0 || (type === 'UPGRADE' ? index > currentRank && (allPlans.find(plan => plan.code === contract.planCode)?.allowedUpgradeTargets || [allPlans[currentRank + 1]?.code]).includes(item.code) : type === 'DOWNGRADE' ? index < currentRank : item.code === contract.planCode)))
  const selected = plans.find(item => item.code === planCode)
  const packages = planCode === 'PUERTO_OCTAY' ? catalog?.packages || [] : []
  const extra = packageSelectionTotals(packageValues, packages)
  const capacity = Number(selected?.workerLimit || 0) + extra.workers
  const price = selected ? planPrice(selected) + extra.price : 0
  const loadCatalog = () => api.get('/plans').then(data => { setCatalog(data); setCatalogError('') }).catch(fault => setCatalogError(errorMessage(fault)))
  useEffect(() => { loadCatalog() }, [])
  useEffect(() => { if (!catalog) return; setPlanCode(current => plans.some(item => item.code === current) ? current : plans[0]?.code || ''); if (!plans.length && type === 'UPGRADE' && contract?.planCode === 'PUERTO_OCTAY') setType('PACKAGES') }, [catalog, contract?.planCode, type, summary?.legacy])
  const loadNotifications = () => api.get('/subscription/notifications').then(data => { setNotifications(data.notifications || []); setNotificationError('') }).catch(fault => setNotificationError(errorMessage(fault)))
  useEffect(() => { if (canManage) loadNotifications() }, [canManage])
  useEffect(() => { if (contract?.planCode === 'PUERTO_OCTAY') { setType('PACKAGES'); setPackageValues(Object.fromEntries((summary?.packages || []).map(item => [item.code || item.packageCode, item.quantity || 1]))) } }, [contract?.id])
  const changeType = value => {
    setType(value); setFields({}); setFailure(''); key.current = requestKey()
    if (value === 'RENEWAL' || value === 'PACKAGES') {
      setPlanCode(contract?.planCode || '')
      setPackageValues(Object.fromEntries((summary?.packages || []).map(item => [item.code || item.packageCode, item.quantity || 1])))
    }
  }
  const recommend = async event => {
    event.preventDefault(); setRecommendError(''); setRecommendation(null)
    if (!Number.isSafeInteger(Number(needed)) || Number(needed) < 1 || Number(needed) > 1000000) { setRecommendError('Ingresa una cantidad entera entre 1 y 1.000.000.'); document.getElementById('my-plan-workers')?.focus(); return }
    setRecommending(true)
    try { setRecommendation(await api.post('/subscription/recommend', { workers: Number(needed) }, { feedback: false })) }
    catch (fault) { setRecommendError(errorMessage(fault)) }
    finally { setRecommending(false) }
  }
  const recommendationRank = allPlans.findIndex(item => item.code === recommendation?.planCode)
  const recommendationType = !contract || recommendationRank > currentRank ? 'UPGRADE' : recommendationRank < currentRank ? 'DOWNGRADE' : contract.planCode === 'PUERTO_OCTAY' ? 'PACKAGES' : 'RENEWAL'
  const recommendationAllowed = !contract || recommendationType !== 'UPGRADE' || (allPlans.find(item => item.code === contract.planCode)?.allowedUpgradeTargets || [allPlans[currentRank + 1]?.code]).includes(recommendation?.planCode)
  const chooseRecommendation = () => {
    setType(recommendationType)
    setPlanCode(recommendation.planCode); setPackageValues(Object.fromEntries((recommendation.packages || []).map(item => [item.code, item.quantity]))); key.current = requestKey()
    document.getElementById('subscription-request-reason')?.focus()
  }
  const submit = async event => {
    event.preventDefault(); const errors = {}
    if (!selected) errors.plan = 'Selecciona el plan solicitado.'
    if (reason.trim().length < 3) errors.reason = 'Explica el motivo de tu solicitud.'
    if (selected && capacity < Number(summary?.capacity?.used || 0)) errors.plan = `La capacidad solicitada (${count(capacity)}) es menor que tu dotación (${count(summary.capacity.used)}). Ajusta la selección.`
    setFields(errors)
    if (Object.keys(errors).length) { document.getElementById(`subscription-request-${Object.keys(errors)[0]}`)?.focus(); return }
    setBusy(true); setFailure(''); setMessage('')
    try {
      await api.post('/subscription/requests', { type, planCode, versionId: selected.versionId, packages: selectedPackages(packageValues, packages), reason: reason.trim(), idempotencyKey: key.current }, { feedback: false })
      setMessage('Solicitud registrada. Nexo Klar revisará la capacidad y las condiciones antes de ejecutar el cambio. Tu contrato actual se mantiene hasta la fecha autorizada.'); setReason(''); key.current = requestKey(); await refresh()
    } catch (fault) { setFailure(errorMessage(fault)) }
    finally { setBusy(false) }
  }

  return <section className="nk-module-page nk-subscription-page"><header className="nk-module-header"><div><h1>Mi plan Nexo Klar</h1><p>Consulta tu capacidad, vigencia y solicitudes de contratación o renovación.</p></div><ActionButton className="nk-button nk-button-secondary" onClick={refresh} disabled={loading} disabledReason="Se está actualizando la información.">{loading ? 'Actualizando…' : 'Actualizar'}</ActionButton></header><Feedback error>{error}</Feedback>
    {loading && !summary ? <p role="status">Cargando tu plan…</p> : summary && <>
      <section className="nk-module-card nk-subscription-overview"><header><div><h2>{summary.legacy ? 'Condiciones actuales' : contract?.planName || 'Pendiente de activación'}</h2><p>{summary.legacy ? 'Tu empresa conserva sus condiciones vigentes. No se ha asignado automáticamente un nuevo contrato ni un período Free.' : 'La información corresponde a la versión de tu contrato aceptado.'}</p></div><SubscriptionStatus status={contract?.status} /></header>{contract && <><dl className="nk-subscription-facts"><div><dt>Precio mensual contratado</dt><dd>{money(contract.monthlyNetPrice, contract.currency)} netos + IVA</dd></div><div><dt>Inicio</dt><dd>{dateTime(contract.startsAt)}</dd></div><div><dt>{contract.planCode === 'FREE' ? 'Fin de gratuidad' : 'Vencimiento'}</dt><dd>{dateTime(contract.endsAt)}</dd></div>{contract.graceEndsAt && <div><dt>Fin del período de gracia</dt><dd>{dateTime(contract.graceEndsAt)}</dd></div>}</dl><CapacityMeter capacity={summary.capacity} /><TrialProgress summary={summary} /><dl className="nk-subscription-facts"><div><dt>Capacidad base</dt><dd>{count(summary.capacity?.base)}</dd></div><div><dt>Capacidad adicional</dt><dd>{count(summary.capacity?.additional)}</dd></div><div><dt>Modalidad</dt><dd>{contract.planCode === 'FREE' ? 'Seis meses calendario, sin renovación automática' : 'Mensual, renovación manual'}</dd></div>{summary.daysRemaining != null && contract.planCode === 'FREE' && <div><dt>Días gratuitos restantes</dt><dd>{count(summary.daysRemaining)}</dd></div>}</dl>{summary.packages?.length > 0 && <div><h3>Composición de capacidad adicional</h3><ul>{summary.packages.map((item, index) => <li key={item.id || `${item.code}-${index}`}>{item.name || item.code || item.packageCode}: {count(item.quantity || 1)} × {count(item.workersQuantity)} trabajadores · {dateTime(item.endsAt || contract.endsAt)}</li>)}</ul></div>}</>}{summary.canOperate === false && <Feedback error>{canManage ? 'El período de operación terminó o está pendiente de activación. Conservamos tus registros; gestiona aquí la contratación o renovación.' : 'La operación del plan no está disponible. Contacta al administrador de tu empresa para gestionar su contratación o renovación.'}</Feedback>}<Link className="nk-button nk-button-secondary" to="/planes">Comparar planes vigentes</Link></section>
      <section className="nk-module-card"><h2>Servicios independientes</h2><p>Libro de Obra y Gestor de Oportunidades se contratan por separado y conservan sus propias condiciones.</p><div className="nk-subscription-services">{[['libroObra', 'Libro de Obra', '/app/libro-obra'], ['oportunidades', 'Gestor de Oportunidades', '/app/oportunidades']].map(([code, name, path]) => { const service = summary.separateServices?.[code]; const enabled = service?.enabled && (!service.endsAt || Date.parse(service.endsAt) > Date.now()); return <article key={code}><h3>{name}</h3><p>{summary.legacy ? 'Se mantienen las condiciones vigentes de tu empresa.' : enabled ? `Habilitado${service.endsAt ? ` hasta ${dateTime(service.endsAt)}` : ''}` : 'Sin contratación activa'}</p>{enabled && <Link className="nk-button nk-button-secondary" to={path}>Abrir {name}</Link>}</article> })}</div></section>
      {canManage && <section className="nk-module-card nk-plan-recommender"><h2>Calcular la capacidad que necesito</h2><p>El cálculo considera los paquetes vigentes de tu empresa y las reglas del catálogo.</p><form onSubmit={recommend} noValidate><label className="nk-label" htmlFor="my-plan-workers">Trabajadores que necesitas gestionar</label><div className="nk-plan-actions"><input id="my-plan-workers" className="nk-input" type="number" min="1" max="1000000" step="1" value={needed} onChange={event => { setNeeded(event.target.value); setRecommendError('') }} aria-invalid={Boolean(recommendError)} aria-describedby={recommendError ? 'my-plan-workers-error' : undefined} /><ActionButton className="nk-button nk-button-secondary" disabled={recommending} disabledReason="Se está calculando la recomendación.">{recommending ? 'Calculando…' : 'Calcular recomendación'}</ActionButton></div>{recommendError && <p id="my-plan-workers-error" className="nk-field-error" role="alert">{recommendError}</p>}</form>{recommendation && <div className="nk-plan-recommendation" role="status">{recommendation.requiresQuote || !recommendation.planCode ? <p>La dotación requiere una cotización personalizada. Contacta a Nexo Klar para revisar alternativas.</p> : <><h3>{recommendation.plan?.name || allPlans.find(item => item.code === recommendation.planCode)?.name}</h3><p>{count(recommendation.totalCapacity)} cupos, {count(recommendation.available)} disponibles. {money(recommendation.monthlyNetPrice, recommendation.currency)} netos / mes + IVA.</p>{recommendation.additionalPackages?.length > 0 && <p>Paquetes a agregar: {recommendation.additionalPackages.map(item => `${item.quantity} × ${item.name}`).join(', ')}.</p>}{recommendation.planCode !== 'FREE' && <ActionButton className="nk-button nk-button-primary" type="button" onClick={chooseRecommendation} disabled={!recommendationAllowed} disabledReason="Este salto de plan requiere habilitación del equipo comercial de Nexo Klar.">Preparar solicitud con esta selección</ActionButton>}</>}</div>}</section>}
      {canManage && <section className="nk-module-card"><h2>{summary.legacy ? 'Solicitar un nuevo plan' : 'Gestionar mi plan'}</h2><p>Enviar una solicitud no cambia por sí solo el precio, la capacidad ni la fecha de tu contrato.</p><Feedback error>{catalogError}</Feedback>{catalogError && <button className="nk-button nk-button-secondary" onClick={loadCatalog}>Reintentar catálogo</button>}<form className="nk-subscription-request-form" onSubmit={submit} noValidate aria-busy={busy}><div className="nk-subscription-form-grid"><label className="nk-field"><span className="nk-label">Tipo de solicitud</span><select className="nk-select" value={type} onChange={event => changeType(event.target.value)} disabled={busy}><option value="UPGRADE">{summary.legacy ? 'Contratar plan' : 'Mejorar plan'}</option>{contract?.planCode !== 'FREE' && contract && <><option value="DOWNGRADE">Solicitar reducción</option><option value="RENEWAL">Renovar plan</option></>}{contract?.planCode === 'PUERTO_OCTAY' && <option value="PACKAGES">Cambiar paquetes adicionales</option>}</select></label><div className="nk-field"><label className="nk-label" htmlFor="subscription-request-plan">Plan solicitado</label><select className="nk-select" id="subscription-request-plan" value={planCode} onChange={event => { setPlanCode(event.target.value); setPackageValues({}); setFields(current => ({ ...current, plan: '' })); key.current = requestKey() }} disabled={busy || ['RENEWAL', 'PACKAGES'].includes(type)} aria-invalid={Boolean(fields.plan)} aria-describedby={fields.plan ? 'subscription-request-plan-error' : undefined}><option value="">Selecciona un plan</option>{plans.map(item => <option value={item.code} key={item.code}>{item.name} · {count(item.workerLimit)} trabajadores</option>)}</select>{fields.plan && <p className="nk-field-error" id="subscription-request-plan-error" role="alert">{fields.plan}</p>}</div></div>{packages.length > 0 && <PackageFields packages={packages} values={packageValues} disabled={busy} onChange={(code, quantity) => { setPackageValues(current => ({ ...current, [code]: quantity })); key.current = requestKey() }} />}{selected && <p className="nk-plan-total"><strong>{count(capacity)} cupos · {money(price, selected.currency)} netos / mes + IVA</strong></p>}<div className="nk-field"><label className="nk-label" htmlFor="subscription-request-reason">Motivo de la solicitud *</label><textarea className="nk-textarea" id="subscription-request-reason" required maxLength="2000" rows="3" value={reason} onChange={event => { setReason(event.target.value); setFields(current => ({ ...current, reason: '' })) }} disabled={busy} aria-invalid={Boolean(fields.reason)} aria-describedby={fields.reason ? 'subscription-request-reason-error' : undefined} />{fields.reason && <p className="nk-field-error" id="subscription-request-reason-error" role="alert">{fields.reason}</p>}</div><Feedback error>{failure}</Feedback><Feedback>{message}</Feedback><ActionButton className="nk-button nk-button-primary" disabled={busy || !catalog} disabledReason="Espera a que el catálogo esté disponible y termine la operación.">{busy ? 'Enviando…' : 'Enviar solicitud'}</ActionButton></form></section>}
      {canManage && <section className="nk-module-card"><h2>Avisos de mi plan</h2><Feedback error>{notificationError}</Feedback>{notificationError && <button className="nk-button nk-button-secondary" onClick={loadNotifications}>Reintentar avisos</button>}{notifications.length ? <div className="nk-subscription-request-list">{notifications.map(item => <article key={item.id}><div><strong>{item.subject || item.title || 'Vencimiento de tu plan'}</strong><p>{item.message || item.body}</p><small>{dateTime(item.scheduledAt || item.createdAt || item.scheduled_at)}</small></div>{item.threshold != null && <span className="nk-subscription-status">{count(item.threshold)} días antes del vencimiento</span>}</article>)}</div> : !notificationError && <p>No hay avisos de vencimiento para este período.</p>}</section>}
      <section className="nk-module-card"><h2>Mis solicitudes</h2>{summary.requests?.length ? <div className="nk-subscription-request-list">{summary.requests.map(item => <article key={item.id}><div><strong>{requestTypes[item.type] || item.type}</strong><p>{requestPlanName(item)}</p><small>Solicitada {dateTime(item.createdAt)}{item.effectiveAt ? ` · Fecha efectiva ${dateTime(item.effectiveAt)}` : ''}</small></div><div><span className="nk-subscription-status">{requestStates[item.status] || item.status}</span>{item.reason && <p>{item.reason}</p>}</div></article>)}</div> : <p>No hay solicitudes registradas.</p>}</section>
    </>}
  </section>
}
