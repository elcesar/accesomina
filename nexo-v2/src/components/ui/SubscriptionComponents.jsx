import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../services/auth.jsx'
import { useSubscription } from '../../services/subscription.jsx'
import { api } from '../../services/api.js'
import { capacityLevel, count, dateTime, errorMessage, isCompanyAdministrator, money, planPrice, requestStates, requestTypes, subscriptionStates } from '../../services/subscriptions.js'
import '../../styles/subscriptions.css'

// The upgrade sequence stays fixed even when the presentation order changes.
export const planSequence = ['FREE', 'LA_UNION', 'PURRANQUE', 'FRUTILLAR', 'PUERTO_OCTAY']
export const planRank = code => planSequence.indexOf(code)
export const currentOffers = items => [...(items || [])].filter(item => item.active !== false && !['DRAFT', 'RETIRED', 'BORRADOR'].includes(item.state || item.status)).sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0) || planRank(a.code) - planRank(b.code))
export const freeDuration = contract => { const months = Number(contract?.snapshot?.plan?.trialMonths ?? contract?.trialMonths); return Number.isSafeInteger(months) && months > 0 ? `${count(months)} ${months === 1 ? 'mes calendario' : 'meses calendario'}` : 'el período gratuito contratado' }
const packageLimit = item => Math.max(1, Math.min(Number(item.repeatable ? item.maxQuantity || 1 : 1), 1000))
const packageError = (item, value) => !Number.isSafeInteger(Number(value || 0)) || Number(value || 0) < 0 || Number(value || 0) > packageLimit(item) ? `Ingresa una cantidad entera entre 0 y ${count(packageLimit(item))}.` : ''
export const invalidPackageSelection = (values, packages = []) => packages.find(item => packageError(item, values[item.code]))
export function PlanDetails({ plan }) { return <>{plan?.description && <p>{plan.description}</p>}{plan?.publicFeatures?.length > 0 && <ul className="nk-plan-benefits">{plan.publicFeatures.map((feature, index) => <li key={`${index}-${feature}`}>{feature}</li>)}</ul>}</> }
const auditActions = { 'subscription.catalog.publish': 'Versión del catálogo publicada', 'subscription.catalog.draft': 'Borrador de catálogo guardado', 'subscription.change.requested': 'Cambio de plan solicitado', 'subscription.free.activated': 'Período gratuito activado', 'subscription.free.unavailable': 'Oferta gratuita no disponible', 'subscription.free.previously_used': 'Beneficio gratuito utilizado anteriormente', 'subscription.changed': 'Plan actualizado', 'subscription.renewed': 'Plan renovado', 'subscription.lifecycle.changed': 'Estado del plan actualizado', 'subscription.services.changed': 'Servicios independientes actualizados', 'subscription.lead.updated': 'Solicitud comercial actualizada', 'subscription.request.review': 'Revisión iniciada', 'subscription.request.approve': 'Solicitud aprobada', 'subscription.request.reject': 'Solicitud rechazada', 'subscription.request.schedule': 'Cambio programado', 'subscription.request.execute': 'Cambio ejecutado', 'subscription.request.cancel': 'Solicitud cancelada', 'subscription.request.documents': 'Documentación comercial actualizada' }
const auditFields = { code: 'Código de oferta', name: 'Nombre', version: 'Versión', planCode: 'Plan', status: 'Estado', contractId: 'Referencia del contrato', reason: 'Motivo', effectiveAt: 'Fecha efectiva', startsAt: 'Inicio', endsAt: 'Término', type: 'Tipo de solicitud', requiresPaidActivation: 'Requiere contratación de pago', workerLimit: 'Capacidad base', workersQuantity: 'Trabajadores por paquete', monthlyPrice: 'Precio mensual neto CLP', totalCapacity: 'Capacidad total', trialMonths: 'Meses gratuitos', active: 'Oferta activa', displayOrder: 'Orden de presentación', workersAtRequest: 'Trabajadores al solicitar', description: 'Descripción pública', ctaText: 'Texto del botón', publicVisible: 'Visible públicamente', recommended: 'Recomendado', taxRate: 'IVA', graceDays: 'Días de gracia', warningPercent: 'Umbral de advertencia', criticalPercent: 'Umbral crítico', repeatable: 'Paquete repetible', stackable: 'Paquetes acumulables', maxQuantity: 'Máximo de paquetes', publicFeatures: 'Beneficios publicados', allowedUpgradeTargets: 'Mejoras de plan permitidas' }
const auditValue = (field, value) => value == null ? 'Sin registro' : Array.isArray(value) ? value.join(', ') || 'Sin selección' : typeof value === 'boolean' ? value ? 'Sí' : 'No' : field === 'monthlyPrice' ? money(value) : /At$/.test(field) ? dateTime(value) : subscriptionStates[value] || requestStates[value] || requestTypes[value] || String(value)
function AuditChanges({ event }) {
  const fields = Object.keys(auditFields).filter(field => Object.hasOwn(event.oldValue || {}, field) || Object.hasOwn(event.newValue || {}, field))
  if (!fields.length) return null
  return <details className="nk-subscription-details"><summary>Ver cambios</summary><div className="nk-table-wrapper"><table className="nk-table"><caption className="nk-sr-only">Condiciones antes y después de la actualización</caption><thead><tr><th scope="col">Condición</th><th scope="col">Antes</th><th scope="col">Después</th></tr></thead><tbody>{fields.map(field => <tr key={field}><th scope="row">{auditFields[field]}</th><td>{auditValue(field, event.oldValue?.[field])}</td><td>{auditValue(field, event.newValue?.[field])}</td></tr>)}</tbody></table></div></details>
}
export function SubscriptionAuditHistory({ tenantId, revision }) {
  const [events, setEvents] = useState([]), [nextCursor, setNextCursor] = useState(null), [loaded, setLoaded] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState('')
  const generation = useRef(0)
  const endpoint = tenantId ? `/subscriptions/admin/companies/${tenantId}/audit` : '/subscription/audit'
  const load = useCallback(async (cursor = null, replace = false) => {
    const current = ++generation.current; setLoading(true); setError('')
    try { const result = await api.get(`${endpoint}?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`); if (current !== generation.current) return
      setEvents(previous => { const rows = replace ? [] : previous; return [...rows, ...(result.events || []).filter(event => !rows.some(item => item.id === event.id))] }); setNextCursor(result.nextCursor || null); setLoaded(true)
    } catch (failure) { if (current === generation.current) setError(errorMessage(failure)) }
    finally { if (current === generation.current) setLoading(false) }
  }, [endpoint])
  useEffect(() => { setEvents([]); setNextCursor(null); setLoaded(false); load(null, true); return () => { generation.current++ } }, [load, revision])
  return <div className="nk-subscription-audit"><Feedback error>{error}</Feedback>{events.length ? <ol className="nk-subscription-audit-list">{events.map(item => <li key={item.id}><strong>{auditActions[item.action] || 'Actualización de suscripción'}</strong><p>{item.reason}</p><small>{dateTime(item.createdAt)}{item.actorName ? ` · ${item.actorName}` : ''}</small>{item.requesterName && <p>Solicitada por: {item.requesterName}</p>}<AuditChanges event={item} /></li>)}</ol> : loaded && !loading && <p>No hay eventos de auditoría registrados.</p>}{loading && <p role="status">Cargando historial…</p>}{(error || nextCursor) && <button className="nk-button nk-button-secondary" type="button" disabled={loading} onClick={() => load(nextCursor, !loaded)}>{error ? 'Reintentar historial' : 'Cargar más eventos'}</button>}</div>
}
export function SubscriptionExpiryNotice({ summary }) {
  const contract = summary?.contract; if (!contract) return null
  if (contract.planCode === 'FREE' && summary.canOperate === false) return <aside className="nk-subscription-expiry" role="status"><strong>El período gratuito terminó.</strong><p>Conservamos tus registros. Solicita un plan vigente para continuar operando.</p><Link className="nk-button nk-button-secondary" to="/planes">Ver planes</Link></aside>
  if (['SUSPENDED', 'EXPIRED'].includes(contract.status)) return <aside className="nk-subscription-expiry" role="status"><strong>{contract.status === 'SUSPENDED' ? 'Tu plan está suspendido.' : 'El período contratado terminó.'}</strong><p>Conservamos tus registros. Gestiona la renovación para recuperar la operación del plan.</p><Link className="nk-button nk-button-secondary" to="/app/mi-plan?tipo=RENEWAL">Gestionar renovación</Link></aside>
  if (contract.status === 'GRACE_PERIOD') return <aside className="nk-subscription-expiry" role="status"><strong>Tu plan está en período de gracia.</strong><p>{summary.daysInGraceRemaining != null ? `${count(summary.daysInGraceRemaining)} días de gracia restantes.` : `La gracia termina el ${dateTime(contract.graceEndsAt)}.`}{summary.graceDaysUsed != null ? ` ${count(summary.graceDaysUsed)} días de gracia utilizados.` : ''} Gestiona la renovación para mantener la continuidad.</p></aside>
  const remaining = Number(summary.daysRemaining); if (summary.daysRemaining == null || remaining < 0 || remaining > 30) return null
  const threshold = [1, 3, 7, 15, 30].find(value => remaining <= value)
  return <aside className="nk-subscription-expiry" role="status"><strong>{contract.planCode === 'FREE' ? 'Tu gratuidad está por terminar.' : 'Tu plan está próximo a vencer.'}</strong><p>Quedan {count(remaining)} días, hasta {dateTime(contract.endsAt)}. Aviso de vencimiento: {threshold} días.</p></aside>
}

export function Feedback({ children, error = false }) { return children ? <p className={`nk-form-message${error ? ' nk-subscription-error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p> : null }
export function SubscriptionStatus({ status }) { return <span className={`nk-subscription-status nk-subscription-status-${String(status || '').toLowerCase()}`}>{subscriptionStates[status] || status || 'Condiciones actuales'}</span> }
export function CapacityMeter({ capacity = {} }) {
  const { percentage, level } = capacityLevel(capacity)
  return <div className={`nk-capacity-meter nk-capacity-${level}`}><div><strong>{count(capacity.used)} de {count(capacity.total)} trabajadores</strong><span>{percentage}% utilizado</span></div><progress value={Math.min(100, percentage)} max="100" aria-label="Uso de capacidad de trabajadores" /><p>{Number(capacity.overCapacity) > 0 ? `${count(capacity.overCapacity)} trabajadores sobre la capacidad. Conservamos tu información; solicita una ampliación para registrar más personas.` : `${count(capacity.available)} cupos disponibles.`}</p></div>
}
export function TrialProgress({ summary }) {
  if (summary?.contract?.planCode !== 'FREE' || !Number(summary.totalTrialDays)) return null
  return <div className="nk-capacity-meter"><div><strong>{count(summary.daysUsed)} días utilizados</strong><span>{count(summary.daysRemaining)} días restantes</span></div><progress max={Number(summary.totalTrialDays)} value={Math.min(Number(summary.totalTrialDays), Math.max(0, Number(summary.daysUsed || 0)))} aria-label="Período gratuito utilizado" /><p>La gratuidad termina el {dateTime(summary.contract.endsAt)}.</p></div>
}
export function PackageFields({ packages = [], values, onChange, disabled = false }) {
  return <fieldset className="nk-subscription-packages"><legend>Capacidad adicional</legend>{packages.map(item => { const error = packageError(item, values[item.code]); const id = `subscription-package-${item.code}`; const props = { id, disabled, value: values[item.code] || 0, onChange: event => onChange(item.code, Number(event.target.value)), 'aria-label': `Cantidad de ${item.name}`, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined }
    return <div className="nk-field" key={item.code}><label htmlFor={id}>{item.name} · +{count(item.workersQuantity)} trabajadores</label><small>{money(planPrice(item), item.currency)} netos / mes + IVA</small>{packageLimit(item) > 100 ? <input {...props} className="nk-input" type="number" min="0" max={packageLimit(item)} step="1" /> : <select {...props} className="nk-select">{Array.from({ length: packageLimit(item) + 1 }, (_, index) => <option key={index} value={index}>{index === 0 ? 'No agregar' : `${index} ${index === 1 ? 'paquete' : 'paquetes'}`}</option>)}</select>}{error && <p id={`${id}-error`} className="nk-field-error" role="alert">{error}</p>}</div>
  })}</fieldset>
}
export function SubscriptionCard({ compact = false }) {
  const { summary, loading, error, refresh } = useSubscription()
  const { session } = useAuth()
  if (!isCompanyAdministrator(session)) return null
  if (loading && !summary) return <p role="status">Cargando información del plan…</p>
  return <section className="nk-module-card nk-subscription-card"><header><div><p className="nk-module-kicker">Mi plan Nexo Klar</p><h2>{summary?.legacy ? 'Condiciones actuales' : summary?.contract?.planName || 'Plan pendiente de activación'}</h2></div><Link className="nk-button nk-button-secondary" to="/app/mi-plan">Ver mi plan</Link></header>{error ? <><Feedback error>{error}</Feedback><button className="nk-button nk-button-secondary" onClick={refresh}>Reintentar</button></> : summary?.legacy ? <p>Tu empresa conserva sus condiciones actuales. Puedes solicitar uno de los nuevos planes sin modificar tus registros.</p> : summary?.contract ? <><SubscriptionStatus status={summary.contract.status} /><SubscriptionExpiryNotice summary={summary} /><dl className="nk-subscription-facts"><div><dt>Inicio del contrato</dt><dd>{dateTime(summary.contract.startsAt)}</dd></div><div><dt>Capacidad base</dt><dd>{count(summary.capacity?.base)}</dd></div><div><dt>Capacidad adicional</dt><dd>{count(summary.capacity?.additional)}</dd></div><div><dt>Capacidad total</dt><dd>{count(summary.capacity?.total)}</dd></div></dl><CapacityMeter capacity={summary.capacity} /><TrialProgress summary={summary} /><p>{summary.contract.planCode === 'FREE' ? 'Gratuidad hasta' : 'Vencimiento'}: {dateTime(summary.contract.endsAt)}</p><p>{money(summary.contract.monthlyNetPrice, summary.contract.currency)} netos + IVA · {summary.contract.planCode === 'FREE' ? freeDuration(summary.contract) : 'renovación mensual manual'}</p><div className="nk-plan-actions">{summary.contract.planCode !== 'PUERTO_OCTAY' && <Link className="nk-button nk-button-secondary" to="/app/mi-plan?tipo=UPGRADE">Mejorar plan</Link>}{summary.contract.planCode !== 'FREE' && <><Link className="nk-button nk-button-secondary" to="/app/mi-plan?tipo=DOWNGRADE">Solicitar reducción</Link><Link className="nk-button nk-button-secondary" to="/app/mi-plan?tipo=RENEWAL">Renovar plan</Link></>}{summary.contract.planCode === 'PUERTO_OCTAY' && <Link className="nk-button nk-button-secondary" to="/app/mi-plan?tipo=PACKAGES">Agregar paquetes</Link>}</div></> : <p>La activación de tu plan está en revisión. Consulta su estado y gestiona tus solicitudes.</p>}</section>
}
export function FreePlanNotice() {
  const { summary } = useSubscription()
  const { session } = useAuth()
  const dialog = useRef(null)
  const closeButton = useRef(null)
  const eligible = isCompanyAdministrator(session) && summary?.contract?.planCode === 'FREE' && summary?.canOperate !== false
  useEffect(() => {
    if (!eligible || !dialog.current) return
    let loginInstance
    try {
      loginInstance = sessionStorage.getItem('nexo:login-instance') || 'existing-session'
      const key = `nexo:free-notice:${session?.user?.id}:${session?.tenant?.id}:${loginInstance}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, 'seen')
    } catch { return }
    dialog.current.showModal()
    closeButton.current?.focus()
  }, [eligible, session?.user?.id, session?.tenant?.id])
  if (!eligible) return null
  return <dialog className="nk-dialog nk-free-notice" ref={dialog} aria-labelledby="free-notice-title"><header><h2 id="free-notice-title">Estás utilizando el Plan Free de Nexo Klar</h2></header><p>Tu gratuidad corresponde a {freeDuration(summary.contract)}, hasta {dateTime(summary.contract.endsAt)}.</p><TrialProgress summary={summary} />{!Number(summary.totalTrialDays) && <p>{summary.daysUsed != null && <>{count(summary.daysUsed)} días utilizados. </>}{summary.daysRemaining != null && <>Te quedan {count(summary.daysRemaining)} días.</>}</p>}<CapacityMeter capacity={summary.capacity} /><footer className="nk-dialog-footer"><button ref={closeButton} className="nk-button nk-button-secondary" onClick={() => dialog.current?.close()}>Continuar</button><Link className="nk-button nk-button-primary" to="/app/mi-plan" onClick={() => dialog.current?.close()}>Mejorar mi plan</Link><Link className="nk-button nk-button-quiet" to="/planes" onClick={() => dialog.current?.close()}>Conocer planes</Link></footer></dialog>
}
