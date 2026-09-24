const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export function documentRule(type, name) {
  const value = normalized(name)
  if (type === 'cv' || /\b(cv|curriculum)\b/.test(value)) return { key: 'cv', expiration: 'never', twoSided: false }
  if (value.includes('cedula de identidad') || value.includes('carnet de identidad')) return { key: 'identity-card', expiration: 'required', twoSided: true }
  if (value.includes('licencia de conducir')) return { key: 'driver-license', expiration: 'required', twoSided: true }
  return { key: 'standard', expiration: 'optional', twoSided: false }
}

export function hasRequiredEvidence(item) {
  const rule = documentRule(item?.type, item?.name)
  if (!rule.twoSided) return true
  const files = Array.isArray(item?.files) ? item.files : []
  const sides = new Set(files.filter(file => file?.fileId && file?.side).map(file => file.side))
  return sides.has('front') && sides.has('back') && Boolean(item?.vence)
}

export function documentEvidenceMessage(item) {
  const rule = documentRule(item?.type, item?.name)
  if (!rule.twoSided || hasRequiredEvidence(item)) return ''
  const files = Array.isArray(item?.files) ? item.files : []
  const sides = new Set(files.filter(file => file?.fileId && file?.side).map(file => file.side))
  const missing = []
  if (!sides.has('front')) missing.push('anverso')
  if (!sides.has('back')) missing.push('reverso')
  if (!item?.vence) missing.push('fecha de vencimiento')
  return `Falta ${missing.join(', ')}`
}
