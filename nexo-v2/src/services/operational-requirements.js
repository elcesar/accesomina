import { documentEvidenceMessage, documentRule, hasRequiredEvidence } from './worker-document-rules.js'

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []

export const BASE_REQUIREMENTS = [
  { requirementCode: 'IDENTITY_CARD', name: 'Cédula de identidad', type: 'documento', requiresExpiry: true },
  { requirementCode: 'EMPLOYMENT_CONTRACT', name: 'Contrato de trabajo', type: 'contrato' },
  { requirementCode: 'AFP_CERTIFICATE', name: 'Certificado AFP', type: 'documento' },
  { requirementCode: 'HEALTH_INSURANCE_CERTIFICATE', name: 'Certificado Fonasa o Isapre', type: 'documento' },
  { requirementCode: 'MEDICAL_EXAM', name: 'Examen preocupacional', type: 'examen' },
  { requirementCode: 'ODI_ACKNOWLEDGMENT', name: 'ODI / Derecho a Saber', type: 'curso' },
  { requirementCode: 'INTERNAL_REGULATION_ACKNOWLEDGMENT', name: 'Reglamento Interno', type: 'curso' },
]

const activeOn = (rule, date) => {
  if (rule?.active === false || rule?.required === false) return false
  const current = String(date || new Date().toISOString().slice(0, 10))
  return (!rule?.validFrom || rule.validFrom <= current) && (!rule?.validUntil || rule.validUntil >= current)
}

const matchesScope = (rule, worker, context) => {
  if (rule?.clientId && String(rule.clientId) !== String(context.clientId || '')) return false
  if (rule?.contractId && String(rule.contractId) !== String(context.contractId || '')) return false
  if (rule?.orderId && String(rule.orderId) !== String(context.orderId || '')) return false
  if (rule?.cargo && normalize(rule.cargo) !== normalize(worker?.cargo)) return false
  if (rule?.specialty && normalize(rule.specialty) !== normalize(worker?.especialidad || worker?.specialty)) return false
  if (rule?.operationalStatus && normalize(rule.operationalStatus) !== normalize(worker?.disponibilidad || worker?.operationalStatus)) return false
  return true
}

const contextFor = (state, orderId) => {
  const order = rows(state?.mantenciones).find(item => String(item?.id) === String(orderId || ''))
  return { orderId: order?.id || orderId || '', contractId: order?.contratoId || '', clientId: order?.minaId || '' }
}

const configuredRules = state => rows(state?.requirementRules || state?.requisitosOperacionales || state?.requirements)

function documentStatus(requirement, item, evaluatedAt) {
  if (!item || !hasRequiredEvidence(item)) return { status: 'faltante', evidence: item || null, detail: item ? documentEvidenceMessage(item) : '' }
  const expiration = item.vence || item.expiresAt || item.fechaVencimiento
  if ((requirement.requiresExpiry || requirement.validityMonths) && !expiration) return { status: 'faltante', evidence: item, detail: 'Falta fecha de vencimiento.' }
  if (expiration && String(expiration).slice(0, 10) < evaluatedAt) return { status: 'vencido', evidence: item, detail: `Venció el ${String(expiration).slice(0, 10)}.` }
  return { status: 'vigente', evidence: item, detail: '' }
}

/** Resolves a single, traceable set of requirements for a worker and optional OS. */
export function resolveOperationalRequirements({ state = {}, worker = {}, orderId = '', evaluatedAt } = {}) {
  const date = String(evaluatedAt || new Date().toISOString().slice(0, 10)).slice(0, 10)
  const context = contextFor(state, orderId)
  const sources = [
    ...BASE_REQUIREMENTS.map(rule => ({ ...rule, source: { level: 'base', label: 'Base NEXOKLAR' } })),
    ...configuredRules(state)
      .filter(rule => activeOn(rule, date) && matchesScope(rule, worker, context))
      .map(rule => ({
        ...rule,
        requirementCode: rule.requirementCode || rule.code || documentRule(rule.type, rule.name, rule.documentType).code,
        source: { level: rule.level || 'configured', label: rule.sourceLabel || rule.name || 'Regla configurada', id: rule.id || '' },
      })),
  ]
  const merged = new Map()
  for (const rule of sources) {
    const code = rule.requirementCode
    if (!code) continue
    const previous = merged.get(code) || { requirementCode: code, name: rule.name || code, type: rule.type || 'documento', required: false, requiresExpiry: false, validityMonths: null, sources: [] }
    previous.required ||= rule.required !== false
    previous.requiresExpiry ||= Boolean(rule.requiresExpiry || rule.validityMonths)
    if (rule.validityMonths && (!previous.validityMonths || Number(rule.validityMonths) < previous.validityMonths)) previous.validityMonths = Number(rule.validityMonths)
    previous.sources.push(rule.source)
    merged.set(code, previous)
  }
  const items = rows(worker.workerItems)
  return [...merged.values()].map(requirement => {
    const matches = items.filter(item => documentRule(item?.type, item?.name, item?.documentType).code === requirement.requirementCode)
    const evidence = matches.find(item => hasRequiredEvidence(item)) || matches[0] || null
    return { ...requirement, ...documentStatus(requirement, evidence, date) }
  })
}

export function evaluateWorkerReadiness({ state = {}, worker = {}, orderId = '', evaluatedAt } = {}) {
  const requirements = resolveOperationalRequirements({ state, worker, orderId, evaluatedAt })
  const blocked = Boolean(worker?.bloqueado || worker?.restringido || /bloquead|restringid/.test(normalize(worker?.disponibilidad || worker?.operationalStatus)))
  const failed = requirements.find(requirement => requirement.status !== 'vigente')
  const cause = blocked
    ? { code: 'ACTIVE_RESTRICTION', label: 'Restricción activa', nextAction: 'Revisar restricción', destination: 'restricciones' }
    : failed?.status === 'vencido'
      ? { code: failed.requirementCode, label: `${failed.name} vencido`, nextAction: 'Renovar documento', destination: 'documentos' }
      : failed
        ? { code: failed.requirementCode, label: `${failed.name} faltante`, nextAction: 'Cargar documento', destination: 'documentos' }
        : null
  return { status: cause ? 'no_habilitado' : 'habilitado', cause, requirements, evaluatedAt: String(evaluatedAt || new Date().toISOString().slice(0, 10)).slice(0, 10), context: contextFor(state, orderId) }
}
