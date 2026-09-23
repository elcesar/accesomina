export function formatRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean

  const body = clean.slice(0, -1)
  const verifier = clean.slice(-1)
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${verifier}`
}

export function isValidRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false

  const body = clean.slice(0, -1)
  const expected = clean.at(-1)
  let sum = 0
  let factor = 2
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const remainder = 11 - (sum % 11)
  const verifier = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  return verifier === expected
}
