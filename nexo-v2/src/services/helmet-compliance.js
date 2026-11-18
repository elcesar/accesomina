import {
  HELMET_APPLICABILITY,
  helmetColorForCode,
  helmetContextFromWorker,
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

  const context = { ...helmetContextFromWorker(worker, state), ...(contextOverride || {}) }
  const policy = resolveHelmetPolicy(state, context)
  const color = helmetColorForCode(state, helmet.colorCode)
  const snapshot = helmet.policySnapshot || {}
  const historicalColor = Boolean(helmet.colorCode && helmet.colorLabel && (!color || color.active === false || color.label !== helmet.colorLabel))
  const missing = []
  if (policy.requireColor && !helmet.colorCode) missing.push('color')
  if (policy.requireSize && !helmet.size) missing.push('talla')
  if (policy.requireModelClass && !helmet.modelClass) missing.push('clase o modelo')
  if (helmet.colorCode && !color && !historicalColor) missing.push('color válido')
  if (helmet.colorCode && color && color.active !== false && policy.allowedColorCodes.length && !policy.allowedColorCodes.includes(helmet.colorCode) && !historicalColor) missing.push('color permitido')

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

export function helmetComplianceCounts(workers, state = {}) {
  return (Array.isArray(workers) ? workers : []).reduce((counts, worker) => {
    const status = helmetCompliance(worker, state)
    counts[status.status] = (counts[status.status] || 0) + 1
    if (status.warning) counts.warning += 1
    return counts
  }, { complete: 0, historical: 0, incomplete: 0, pending: 0, not_required: 0, warning: 0 })
}

export function helmetComplianceBadgeClass(status) {
  if (status?.severity === 'warning') return 'nk-badge-warn'
  if (status?.status === 'not_required') return 'nk-badge-none'
  return 'nk-badge-ok'
}
