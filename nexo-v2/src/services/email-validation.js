// Shared UI policy for email fields. Backend remains authoritative.
// Keep this policy aligned with the server's Zod email validation.
const EMAIL_FORMAT = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i
export const EMAIL_ERROR = 'Ingresa un correo electrónico válido.'
export const EMAIL_REQUIRED_ERROR = 'Ingresa un correo electrónico.'
export const normalizeEmail = value => typeof value === 'string' ? value.trim() : ''
export function validateEmail(value, { required = false } = {}) {
  const email = normalizeEmail(value)
  if (!email) return required ? EMAIL_REQUIRED_ERROR : null
  return email.length <= 254 && EMAIL_FORMAT.test(email) ? null : EMAIL_ERROR
}
export const isValidEmail = (value, options) => !validateEmail(value, options)
