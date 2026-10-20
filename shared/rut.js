export function formatRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${clean.slice(-1)}`
}

export function isValidRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false
  let factor = 2
  let sum = 0
  for (let index = clean.length - 2; index >= 0; index -= 1) {
    sum += Number(clean[index]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const result = 11 - (sum % 11)
  const verifier = result === 11 ? '0' : result === 10 ? 'K' : String(result)
  return verifier === clean.at(-1)
}

export const OPTIONAL_RUT_ERROR = 'Ingresa un RUT chileno válido o deja el campo vacío.'

// This exception requires an identified persisted record, never an array index.
// The server supplies its own previous value; request metadata is not trusted.
export function optionalHistoricalRut(value, { hasPrevious = false, previousValue } = {}) {
  if (hasPrevious && JSON.stringify(value) === JSON.stringify(previousValue)) return { value, error: null }
  if (value == null) return { value, error: null }
  if (typeof value !== 'string') return { value, error: OPTIONAL_RUT_ERROR }
  const trimmed = value.trim()
  if (!trimmed) return { value: '', error: null }
  if (trimmed.length > 20 || !/^[0-9kK.\s-]+$/.test(trimmed) || !isValidRut(trimmed)) {
    return { value, error: OPTIONAL_RUT_ERROR }
  }
  return { value: formatRut(trimmed), error: null }
}
