import {
  HELMET_APPLICABILITY,
  helmetColorForCode,
  helmetContextFromWorker,
  helmetContextForWorkerScope,
  normalizeHelmetRequirement,
  resolveHelmetPolicy,
} from '../../../shared/helmet-policy.js'

/**
 * Read-only helmet completeness status shared by people, accreditation, EPP
 * and alerts. It is deliberately advisory: it never changes availability,
 * accreditation records, or a manually assigned operational restriction.
 */
export function helmetCompliance(worker, state = {}, { context: contextOverride = {} } = {}) {
  const source = worker?.epp || {}
  const hasExplicitDecision = Object.hasOwn(source, 'helmet')
  const helmet = normalizeHelmetRequirement(source)

  if (!hasExplicitDecision || helmet.applicability === HELMET_APPLICABILITY.UNKNOWN) {
    return {
      status: 'pending',
      severity: 'warning',
      applicable: null,
      label: 'Casco pendiente de definir',
      detail: helmet.legacySize ? `Dato histórico: talla ${helmet.legacySize}.` : 'Confirma si el casco aplica para esta persona.',
      warning: true,
      blocksOperation: false,
      helmet,
    }
  }

  if (helmet.applicability === HELMET_APPLICABILITY.NOT_REQUIRED) {
    return {
      status: 'not_required',
      severity: 'ok',
      applicable: false,
      label: 'Casco no requerido',
      detail: helmet.reason || 'No aplica según la función o exposición registrada.',
      warning: false,
      blocksOperation: false,
      helmet,
    }
  }

  const requestedKeys = ['mantId', 'orderId', 'projectId', 'minaId', 'clientId']
  const hasContextOverride = Boolean(contextOverride && typeof contextOverride === 'object'
    && requestedKeys.some(key => Object.hasOwn(contextOverride, key)))
  const requestedContext = hasContextOverride
    ? helmetContextForWorkerScope(worker, state, contextOverride)
    : null
  // A client-row override is accepted only when it belongs to the worker's
  // persisted scope. It deliberately clears any OS from the base context so a
  // policy of another client can never leak into this row.
  const context = hasContextOverride
    ? (requestedContext
      ? { ...requestedContext, multipleActiveOrders: false, multipleActiveClients: false, invalidContext: false }
      : { mantId: '', minaId: '', multipleActiveOrders: false, multipleActiveClients: false, invalidContext: true })
    : helmetContextFromWorker(worker, state)
  if (context.multipleActiveOrders || context.multipleActiveClients || context.invalidContext) {
    const detail = context.invalidContext
      ? 'El contexto de casco registrado no coincide con las asociaciones vigentes de la persona.'
      : context.multipleActiveOrders
        ? 'La persona tiene más de una orden activa. Selecciona el contexto de OS antes de aplicar una política específica.'
        : 'La persona tiene más de un cliente vigente. Selecciona el cliente aplicable antes de aplicar una política específica.'
    return {
      status: 'context_required',
      severity: 'warning',
      applicable: true,
      label: 'Contexto de casco pendiente',
      detail,
      warning: true,
      blocksOperation: false,
      context,
      helmet,
    }
  }
  const policy = resolveHelmetPolicy(state, context)
  const color = helmetColorForCode(state, helmet.colorCode)
  const snapshot = helmet.policySnapshot || {}
  const historicalColor = Boolean(helmet.colorCode && helmet.colorLabel && (!color || color.active === false || color.label !== helmet.colorLabel))
  const missing = []
  if (policy.requireColor && !helmet.colorCode) missing.push('color')
  if (policy.requireSize && !helmet.size) missing.push('talla')
  if (policy.requireModelClass && !helmet.modelClass) missing.push('clase o modelo')
  if (helmet.colorCode && !color && !historicalColor) missing.push('color válido')
  if (helmet.colorCode && color && color.active !== false && policy.hasColorRestriction && !policy.allowedColorCodes.includes(helmet.colorCode) && !historicalColor) missing.push('color permitido')

  if (missing.length) {
    return {
      status: 'incomplete',
      severity: 'warning',
      applicable: true,
      label: 'Casco incompleto',
      detail: `Falta ${missing.join(', ')} según la política aplicable.`,
      warning: true,
      blocksOperation: false,
      policy,
      context,
      helmet,
    }
  }

  return {
    status: historicalColor ? 'historical' : 'complete',
    severity: 'ok',
    applicable: true,
    label: historicalColor ? 'Casco histórico completo' : 'Casco completo',
    detail: historicalColor
      ? `Color histórico: ${helmet.colorLabel || snapshot.colorLabel || helmet.colorCode}.`
      : `${helmet.colorLabel || 'Color registrado'} · ${helmet.size || 'talla registrada'}.`,
    warning: false,
    blocksOperation: false,
    policy,
    context,
    helmet,
  }
}


// A helmet only changes the worker compliance denominator when a decision is
// still pending or it is required. “No requerido” remains neutral.
export function helmetComplianceContribution(status) {
  if (!status || status.status === 'not_required') return { required: 0, completed: 0 }
  return { required: 1, completed: status.warning ? 0 : 1 }
}

export function helmetComplianceCounts(workers, state = {}) {
  return (Array.isArray(workers) ? workers : []).reduce((counts, worker) => {
    const status = helmetCompliance(worker, state)
    counts[status.status] = (counts[status.status] || 0) + 1
    if (status.warning) counts.warning += 1
    return counts
  }, { complete: 0, historical: 0, incomplete: 0, pending: 0, context_required: 0, not_required: 0, warning: 0 })
}

export function helmetComplianceBadgeClass(status) {
  if (status?.severity === 'warning') return 'nk-badge-warn'
  if (status?.status === 'not_required') return 'nk-badge-none'
  return 'nk-badge-ok'
}
