import { calendarDaysUntil } from './calendar-date.js'

/**
 * Estado semántico de cumplimiento, distinto del estado de gestión del flujo.
 * Un proceso "cerrado" NO acredita cumplimiento ni habilitación por sí solo.
 */
export const COMPLIANCE_STATES = Object.freeze({
  ok: Object.freeze({ key: 'ok', label: 'Vigente', cls: 'nk-badge-ok' }),
  warn: Object.freeze({ key: 'warn', label: 'Por vencer', cls: 'nk-badge-warn' }),
  error: Object.freeze({ key: 'error', label: 'No habilitado', cls: 'nk-badge-error' }),
  none: Object.freeze({ key: 'none', label: 'Sin información', cls: 'nk-badge-none' }),
})

export const COMPLIANCE_FILTERS = Object.freeze([
  { key: 'ok', label: 'Vigente' },
  { key: 'warn', label: 'Por vencer' },
  { key: 'error', label: 'No habilitado' },
  { key: 'none', label: 'Sin información' },
])

const normalize = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_')

const invalid = new Set(['rechazado', 'no_apto', 'inapto', 'no_habilitado', 'vencido', 'caducado', 'suspendido', 'restringido', 'bloqueado'])
const valid = new Set(['vigente', 'habilitado', 'apto', 'aprobado', 'al_dia', 'valido', 'validado', 'activo'])
const expiring = new Set(['por_vencer'])
// Pendiente, en seguimiento, cerrado, revisado, histórico y similares son FLUJOS, no evidencias.
export function complianceStatus({ outcome, expiresOn, warnDays = 30, hasEvidence = true, today } = {}) {
  const code = normalize(outcome)
  if (invalid.has(code)) return COMPLIANCE_STATES.error
  if (!hasEvidence || !code || code === 'sin_informacion') return COMPLIANCE_STATES.none
  if (expiring.has(code)) return COMPLIANCE_STATES.warn
  if (!valid.has(code)) return COMPLIANCE_STATES.none
  const days = expiresOn ? calendarDaysUntil(expiresOn, today) : null
  if (days !== null && days < 0) return COMPLIANCE_STATES.error
  if (days !== null && days <= warnDays) return COMPLIANCE_STATES.warn
  return COMPLIANCE_STATES.ok
}

export function expiryComplianceStatus(expiresOn, warnDays = 30) {
  const days = expiresOn ? calendarDaysUntil(expiresOn) : null
  if (days === null) return COMPLIANCE_STATES.none
  if (days < 0) return COMPLIANCE_STATES.error
  return days <= warnDays ? COMPLIANCE_STATES.warn : COMPLIANCE_STATES.ok
}
