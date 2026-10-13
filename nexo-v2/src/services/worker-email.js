// Match the server's email format policy while keeping this field optional.
const EMAIL_FORMAT = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i
export const WORKER_EMAIL_ERROR = 'Ingresa un correo electrónico válido o deja el campo vacío.'
export function validWorkerEmail(value) {
  if (value == null) return true
  if (typeof value !== 'string') return false
  const email = value.trim()
  return email === '' || (email.length <= 254 && EMAIL_FORMAT.test(email))
}
