import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../services/auth.jsx'
import { useSubscription } from '../../services/subscription.jsx'
import { capacityLevel, count, dateTime, isCompanyAdministrator, money, planPrice, subscriptionStates } from '../../services/subscriptions.js'
import '../../styles/subscriptions.css'

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
  return <fieldset className="nk-subscription-packages"><legend>Capacidad adicional</legend>{packages.map(item => <label className="nk-field" key={item.code}><span>{item.name} · +{count(item.workersQuantity)} trabajadores</span><small>{money(planPrice(item), item.currency)} netos / mes + IVA</small><select className="nk-select" value={values[item.code] || 0} disabled={disabled} onChange={event => onChange(item.code, Number(event.target.value))} aria-label={`Cantidad de ${item.name}`}>{Array.from({ length: Math.min(item.repeatable ? Number(item.maxQuantity || 10) : 1, 100) + 1 }, (_, index) => <option key={index} value={index}>{index === 0 ? 'No agregar' : `${index} ${index === 1 ? 'paquete' : 'paquetes'}`}</option>)}</select></label>)}</fieldset>
}
export function SubscriptionCard({ compact = false }) {
  const { summary, loading, error, refresh } = useSubscription()
  const { session } = useAuth()
  if (!isCompanyAdministrator(session)) return null
  if (loading && !summary) return <p role="status">Cargando información del plan…</p>
  return <section className="nk-module-card nk-subscription-card"><header><div><p className="nk-module-kicker">Mi plan Nexo Klar</p><h2>{summary?.legacy ? 'Condiciones actuales' : summary?.contract?.planName || 'Plan pendiente de activación'}</h2></div><Link className="nk-button nk-button-secondary" to="/app/mi-plan">Ver mi plan</Link></header>{error ? <><Feedback error>{error}</Feedback><button className="nk-button nk-button-secondary" onClick={refresh}>Reintentar</button></> : summary?.legacy ? <p>Tu empresa conserva sus condiciones actuales. Puedes solicitar uno de los nuevos planes sin modificar tus registros.</p> : summary?.contract ? <><SubscriptionStatus status={summary.contract.status} /><CapacityMeter capacity={summary.capacity} /><TrialProgress summary={summary} /><p>{summary.contract.planCode === 'FREE' ? 'Gratuidad hasta' : 'Vencimiento'}: {dateTime(summary.contract.endsAt)}</p>{!compact && <p>{money(summary.contract.monthlyNetPrice, summary.contract.currency)} netos + IVA · {summary.contract.planCode === 'FREE' ? 'seis meses calendario' : 'renovación mensual manual'}</p>}</> : <p>La activación de tu plan está en revisión. Consulta su estado y gestiona tus solicitudes.</p>}</section>
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
  return <dialog className="nk-dialog nk-free-notice" ref={dialog} aria-labelledby="free-notice-title"><header><h2 id="free-notice-title">Estás utilizando el Plan Free de Nexo Klar</h2></header><p>Tu gratuidad dura seis meses calendario, hasta {dateTime(summary.contract.endsAt)}.</p>{summary.daysRemaining != null && <p>Te quedan {count(summary.daysRemaining)} días.</p>}<CapacityMeter capacity={summary.capacity} /><footer className="nk-dialog-footer"><button ref={closeButton} className="nk-button nk-button-secondary" onClick={() => dialog.current?.close()}>Continuar</button><Link className="nk-button nk-button-primary" to="/app/mi-plan" onClick={() => dialog.current?.close()}>Mejorar mi plan</Link><Link className="nk-button nk-button-quiet" to="/planes" onClick={() => dialog.current?.close()}>Conocer planes</Link></footer></dialog>
}
