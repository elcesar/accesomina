export function normalizeChilePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  const national = digits.startsWith('56') ? digits.slice(2) : digits
  if (!national) return ''
  return `+56${national}`
}
export function formatChilePhone(value) {
  const normalized = normalizeChilePhone(value)
  if (!normalized) return ''
  const national = normalized.slice(3)
  return `+56 ${national.slice(0, 1)}${national.length > 1 ? ` ${national.slice(1, 5)}` : ''}${national.length > 5 ? ` ${national.slice(5)}` : ''}`
}
export function isValidChilePhone(value) { return /^\+56[2-9]\d{8}$/.test(normalizeChilePhone(value)) }
