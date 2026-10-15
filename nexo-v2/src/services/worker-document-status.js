import { documentEvidenceMessage, documentRule, hasRequiredEvidence } from './worker-document-rules.js'

const DAY_MS = 24 * 60 * 60 * 1000

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
    if (days <= 30) return { ok: true, label: 'Por vencer', className: 'nk-badge-warn', source: 'cargado' }
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
