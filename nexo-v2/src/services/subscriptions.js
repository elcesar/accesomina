export const subscriptionStates = { ACTIVE: 'Activa', GRACE_PERIOD: 'Período de gracia', SUSPENDED: 'Suspendida', PENDING: 'Pendiente de activación', EXPIRED: 'Vencida' }
export const requestStates = { NEW: 'Nueva', REQUESTED: 'Solicitada', UNDER_REVIEW: 'En revisión', APPROVED: 'Aprobada', SCHEDULED: 'Programada', EXECUTED: 'Ejecutada', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Vencida', EXECUTION_FAILED: 'Requiere reintento' }
export const requestTypes = { INITIAL: 'Contratación inicial', UPGRADE: 'Mejora de plan', DOWNGRADE: 'Reducción de plan', RENEWAL: 'Renovación', PACKAGES: 'Capacidad adicional' }
export const requestPlanCode = request => request.planCode || request.proposal?.plan?.code || request.requestedPlanCode || ''
export const requestPlanName = request => request.planName || request.proposal?.plan?.name || requestPlanCode(request)
export const money = (value, currency = 'CLP') => new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(Number(value || 0))
export const count = value => new Intl.NumberFormat('es-CL').format(Number(value || 0))
export const dateTime = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Por definir'
export const planPrice = plan => Number(plan.monthlyPrice ?? plan.netPrice ?? 0)
export const requestKey = () => globalThis.crypto?.randomUUID?.() || `request-${Date.now()}-${Math.random().toString(36).slice(2)}`
export const isCompanyAdministrator = session => ['client_admin', 'domian_admin'].includes(session?.user?.role)
export function errorMessage(error) {
  const messages = {
    WORKER_CAPACITY_EXCEEDED: 'Has alcanzado la capacidad de trabajadores. Solicita un plan o paquete con mayor capacidad.',
    SUBSCRIPTION_CAPACITY_EXCEEDED: 'La capacidad solicitada es menor que la dotación actual. Ajusta la solicitud y vuelve a intentarlo.',
    CAPACITY_EXCEEDED: 'La dotación supera la capacidad solicitada. Revisa el plan y los paquetes.',
    SUBSCRIPTION_SUSPENDED: 'El período de tu plan terminó. Gestiona su renovación desde Mi plan.',
    INVALID_SUBSCRIPTION_TRANSITION: 'El estado de la solicitud cambió. Actualiza y revisa las acciones disponibles.',
    SUBSCRIPTION_REQUEST_CONFLICT: 'La solicitud cambió mientras la revisabas. Actualiza los datos antes de continuar.',
    COMMERCIAL_DOCUMENTS_REQUIRED: 'Adjunta cotización aceptada, orden de compra y factura antes de programar o ejecutar.',
    PLAN_VERSION_CHANGED: 'La oferta cambió. Revisa los valores actualizados y confirma nuevamente la solicitud.',
    SUBSCRIPTION_OFFER_CHANGED: 'La oferta cambió. Actualiza el catálogo y revisa los valores antes de continuar.',
    SUBSCRIPTION_DOCUMENT_REQUIRED: 'Completa y adjunta los documentos comerciales requeridos.',
    SUBSCRIPTION_REQUEST_INVALID: 'Revisa el plan, las cantidades y el motivo de la solicitud.',
    SUBSCRIPTION_WORKER_LIMIT: 'La selección no cubre la dotación indicada. Elige un plan o paquetes con mayor capacidad.',
    SUBSCRIPTION_DOWNGRADE_CAPACITY: 'La dotación actual supera la capacidad solicitada. Ajusta el plan o los paquetes; tus registros se conservan.',
    SUBSCRIPTION_CHANGE_DIRECTION: 'Selecciona un plan superior para mejorar o inferior para reducir. La renovación mantiene el plan actual.',
    SUBSCRIPTION_PACKAGES_PLAN: 'Los paquetes de trabajadores sólo están disponibles para Puerto Octay.',
    SUBSCRIPTION_PACKAGE_INVALID: 'El paquete o la cantidad cambió. Actualiza el catálogo y revisa la selección.',
    SUBSCRIPTION_PACKAGES_NOT_STACKABLE: 'La configuración actual de los paquetes no permite esta combinación.',
    SUBSCRIPTION_REASON_REQUIRED: 'Registra un motivo de entre 3 y 2.000 caracteres.',
    SUBSCRIPTION_PERMISSION_DENIED: 'Tu cuenta no tiene permiso para realizar esta gestión comercial.',
    SUBSCRIPTION_REQUEST_STATE: 'El estado de la solicitud cambió. Actualiza y revisa las acciones disponibles.',
    SUBSCRIPTION_DOCUMENT_REQUIRED: 'Completa el número y adjunta el archivo privado de cada documento requerido.',
    SUBSCRIPTION_ACCEPTANCE_REQUIRED: 'Registra una fecha válida de aceptación de la cotización.',
    SUBSCRIPTION_EFFECTIVE_DATE: 'Revisa la fecha y hora efectivas acordadas para el cambio.',
    SUBSCRIPTION_DOWNGRADE_DATE: 'La reducción de capacidad comienza al terminar el período contratado.',
    SUBSCRIPTION_RENEWAL_ANCHOR: 'La renovación anticipada debe comenzar al terminar el período actual.',
    SUBSCRIPTION_MID_PERIOD_TERMS: 'Documenta las condiciones aceptadas del cambio inmediato; no hay prorrateo automático.',
    SUBSCRIPTION_IDEMPOTENCY_CONFLICT: 'La solicitud original ya se registró con otros datos. Actualiza la página y revisa su estado antes de enviar otra.',
    SUBSCRIPTION_RATE_LIMITED: 'Se recibieron varias solicitudes. Espera unos minutos antes de volver a enviar.',
    SUBSCRIPTION_CATALOG_CONFLICT: 'Otra persona actualizó esta versión. Recarga el catálogo y revisa sus cambios.',
  }
  return messages[error?.code] || error?.message || 'No fue posible completar la operación. Inténtalo nuevamente.'
}
export function capacityLevel(capacity = {}) {
  const ratio = Number(capacity.total) > 0 ? Number(capacity.used || 0) / Number(capacity.total) : 0
  const warning = Number(capacity.warningPercent ?? 80) / 100
  const critical = Number(capacity.criticalPercent ?? 90) / 100
  return { percentage: Math.round(ratio * 100), level: ratio >= 1 ? 'full' : ratio >= critical ? 'critical' : ratio >= warning ? 'warning' : 'normal' }
}
export function selectedPackages(values, packages = []) {
  return packages.filter(item => Number(values[item.code]) > 0).map(item => ({ code: item.code, quantity: Number(values[item.code]) }))
}
export function packageSelectionTotals(values, packages = []) {
  return packages.reduce((total, item) => ({ workers: total.workers + Number(item.workersQuantity || 0) * Number(values[item.code] || 0), price: total.price + planPrice(item) * Number(values[item.code] || 0) }), { workers: 0, price: 0 })
}
