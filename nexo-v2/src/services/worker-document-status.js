import { documentEvidenceMessage, documentRule, hasRequiredEvidence } from './worker-document-rules.js'

const DAY_MS = 24 * 60 * 60 * 1000

// This catalog is the single definition of the worker accreditation baseline.
// It deliberately lives beside the document-status policy: every surface that
// reports a percentage must count the same requirements with the same evidence,
// expiry and rejection rules.
export const WORKER_COMPLIANCE_REQUIREMENTS = [
  { type: 'documento', documentType: 'IDENTITY_CARD', name: 'Cédula de identidad' },
  { type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', name: 'Contrato de trabajo' },
  { type: 'contrato', documentType: 'SERVICE_ANNEX', name: 'Anexo asociado al servicio' },
  { type: 'documento', documentType: 'AFP_CERTIFICATE', name: 'Certificado AFP' },
  { type: 'documento', documentType: 'AFC_CERTIFICATE', name: 'Certificado AFC' },
  { type: 'documento', documentType: 'HEALTH_INSURANCE_CERTIFICATE', name: 'Certificado Fonasa/Isapre' },
  { type: 'examen', documentType: 'MEDICAL_EXAM', name: 'Examen preocupacional' },
  { type: 'curso', documentType: 'ODI_ACKNOWLEDGMENT', name: 'ODI / Derecho a Saber' },
  { type: 'curso', documentType: 'INTERNAL_REGULATION_ACKNOWLEDGMENT', name: 'Reglamento Interno' },
  { type: 'documento', documentType: 'CV', name: 'CV actualizado' },
]

export const WORKER_COMPLIANCE_REQUIREMENTS_BY_SPECIALTY = {
  Eléctrico: [{ type: 'curso', name: 'Arc Flash' }, { type: 'certificacion', name: 'Certificación eléctrica' }],
  Instrumentista: [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Mecánico Industrial': [{ type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' }],
  'Soldador 6G': [{ type: 'curso', name: 'Trabajos en caliente' }, { type: 'certificacion', name: 'Calificación soldador 6G' }],
  Rigger: [{ type: 'certificacion', name: 'Certificación Rigger' }, { type: 'curso', name: 'Izaje de cargas' }],
  'Maestro Andamios': [{ type: 'curso', name: 'Trabajo en altura física' }],
}

function startOfLocalDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function expiryDay(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export function daysUntilExpiry(expiry, today = new Date()) {
  const due = expiryDay(expiry)
  if (!due) return null
  return Math.round((due.getTime() - startOfLocalDay(today).getTime()) / DAY_MS)
}

export function documentStatus(item, today = new Date()) {
  if (!item) return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'faltante' }
  if (!hasRequiredEvidence(item)) return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: documentEvidenceMessage(item) }
  const rule = documentRule(item.type, item.name, item.documentType)
  if (rule.expiration === 'required' && !item.vence) return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'falta fecha de vencimiento' }
  if (String(item.estado || '').trim().toLowerCase() === 'rechazado') return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'rechazado' }
  if (item.vence) {
    const days = daysUntilExpiry(item.vence, today)
    if (days === null) return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'fecha inválida' }
    if (days < 0) return { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'vencido' }
    if (days > 0 && days <= 30) return { ok: true, label: 'Por vencer', className: 'nk-badge-warn', source: 'cargado' }
  }
  return { ok: true, label: 'Vigente', className: 'nk-badge-ok', source: 'cargado' }
}

export function requirementStatus(items, today = new Date()) {
  const statuses = (items || []).map(item => documentStatus(item, today))
  return statuses.find(status => status.ok) || statuses[0] || documentStatus(null, today)
}

export function requirementSummary(requirementItems, today = new Date()) {
  const statuses = (requirementItems || []).map(items => requirementStatus(items, today))
  const total = statuses.length
  const fulfilled = statuses.filter(status => status.ok).length
  return { total, fulfilled, percentage: total ? Math.round(fulfilled / total * 100) : 0 }
}

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function workerComplianceRequirements(worker = {}) {
  return [
    ...WORKER_COMPLIANCE_REQUIREMENTS,
    ...(WORKER_COMPLIANCE_REQUIREMENTS_BY_SPECIALTY[worker?.especialidad] || []),
  ]
}

export function workerItemMatchesRequirement(item, requirement) {
  if (!item || !requirement) return false
  if (requirement.documentType && item.documentType) return requirement.documentType === item.documentType

  const expectedName = normalized(requirement.name).split('/')[0].trim()
  const isCvRequirement = requirement.type === 'documento' && expectedName.startsWith('cv')
  const typeMatches = item.type === requirement.type || (isCvRequirement && item.type === 'cv')
  return typeMatches && normalized(item.name).includes(expectedName)
}

export function workerRequirementStatus(worker, requirement, today = new Date()) {
  const items = Array.isArray(worker?.workerItems) ? worker.workerItems : []
  return requirementStatus(items.filter(item => workerItemMatchesRequirement(item, requirement)), today)
}

export function workerComplianceSummary(worker, today = new Date()) {
  const requirements = workerComplianceRequirements(worker)
  const checks = requirements.map(requirement => ({
    requirement,
    status: workerRequirementStatus(worker, requirement, today),
  }))
  const total = checks.length
  const fulfilled = checks.filter(check => check.status.ok).length
  return { requirements, checks, total, fulfilled, percentage: total ? Math.round(fulfilled / total * 100) : 0 }
}

export function workerComplianceIssues(worker, today = new Date()) {
  return workerComplianceSummary(worker, today).checks
    .filter(check => !check.status.ok)
    .map(({ requirement, status }) => ({
      requirement,
      status,
      message: status.source === 'faltante'
        ? `Falta: ${requirement.name}`
        : `${requirement.name}: ${status.source}`,
    }))
}
