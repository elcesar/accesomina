const BASE = '/api'
let csrfToken = null

const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  SESSION_INVALID: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
  ACCOUNT_DISABLED: 'Tu cuenta o empresa no está habilitada para ingresar.',
  MFA_ENROLLMENT_REQUIRED: 'Debes configurar la doble autenticación antes de continuar.',
  MFA_REQUIRED: 'Ingresa el código de tu aplicación autenticadora.',
  MFA_CODE_INVALID: 'El código de doble autenticación no es válido.',
  MFA_CONFIGURATION_INVALID: 'No fue posible validar la doble autenticación. Contacta a soporte.',
  MFA_ALREADY_ENABLED: 'La doble autenticación ya está habilitada para esta cuenta.',
  MFA_SETUP_REQUIRED: 'Primero debes iniciar la configuración de doble autenticación.',
  CSRF_INVALID: 'No pudimos validar tu sesión. Actualiza la página e inténtalo nuevamente.',
  ORIGIN_REQUIRED: 'No fue posible validar el origen de la solicitud.',
  ORIGIN_NOT_ALLOWED: 'Esta solicitud no está autorizada desde este origen.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',

  REGISTRATION_CLOSED: 'El registro de nuevas empresas está temporalmente cerrado. Solicita una invitación a Nexo Klar.',
  INVITE_CODE_INVALID: 'El código de invitación ingresado no es válido.',
  INVALID_COMPANY_RUT: 'El RUT de la empresa no es válido.',
  INVALID_CREDENTIALS: 'El correo, RUT o contraseña ingresados no son correctos.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas y un número.',
  INVALID_RESET_REQUEST: 'El enlace o la nueva contraseña no son válidos.',
  RESET_TOKEN_INVALID: 'El enlace para cambiar la contraseña no es válido o ya venció. Solicita uno nuevo.',

  USER_NOT_FOUND: 'No encontramos el usuario solicitado.',
  INVALID_ROLE: 'El permiso seleccionado no es válido.',
  CANNOT_DISABLE_SELF: 'No puedes desactivar tu propia cuenta.',
  CANNOT_RESET_SELF: 'Para tu propia cuenta, utiliza la opción de cambio de contraseña.',
  CANNOT_RESET_SELF_MFA: 'No puedes restablecer tu propia doble autenticación desde esta opción.',
  DOMIAN_ADMIN_PROTECTED: 'La cuenta administrativa de Nexo Klar está protegida y no puede modificarse de esta forma.',
  LAST_ADMIN_REQUIRED: 'La empresa debe mantener al menos un administrador activo.',

  TENANT_NOT_FOUND: 'No encontramos la empresa solicitada.',
  INVALID_TENANT_DATA: 'Revisa los datos ingresados de la empresa.',
  INVALID_STATUS: 'No fue posible cambiar el estado de la empresa.',
  DOMIAN_ACCOUNT_PROTECTED: 'La cuenta administrativa de Nexo Klar está protegida y no puede modificarse de esta forma.',
  INVALID_CONTROL_DATA: 'Revisa la información de administración de la empresa antes de guardar.',
  INVALID_TICKET: 'Revisa los datos de la solicitud de soporte.',
  INVALID_TICKET_STATUS: 'El estado seleccionado para la solicitud de soporte no es válido.',
  TICKET_NOT_FOUND: 'No encontramos la solicitud de soporte.',

  INVALID_LOGO_URL: 'La dirección del logo no es válida. Utiliza una dirección HTTPS.',
  INVALID_ALERT_THRESHOLDS: 'El plazo crítico de alertas no puede ser mayor que el plazo de advertencia.',
  UNKNOWN_PROVIDER: 'La integración seleccionada no está disponible.',
  UNSAFE_INTEGRATION_URL: 'La dirección de la integración no es válida o no es segura.',

  23505: 'Ya existe un registro con esos datos.',
  SERVER_ERROR: 'Ocurrió un problema al procesar la solicitud. Inténtalo nuevamente.',
}

const STATUS_MESSAGES = {
  400: 'Revisa los datos ingresados e inténtalo nuevamente.',
  401: 'No pudimos validar tus credenciales. Inicia sesión nuevamente.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No encontramos la información solicitada.',
  409: 'La operación no se puede completar porque existe información relacionada o en conflicto.',
  413: 'El archivo o la información enviada supera el tamaño permitido.',
  429: 'Has realizado demasiadas solicitudes. Espera unos minutos e inténtalo nuevamente.',
  500: 'Ocurrió un problema al procesar la solicitud. Inténtalo nuevamente.',
  502: 'El servicio no está disponible temporalmente. Inténtalo nuevamente en unos minutos.',
  503: 'El servicio no está disponible temporalmente. Inténtalo nuevamente en unos minutos.',
  504: 'La solicitud tardó demasiado en responder. Inténtalo nuevamente.',
}

export function friendlyApiError(code, status) {
  return ERROR_MESSAGES[code] || STATUS_MESSAGES[status] || 'No fue posible completar la operación. Inténtalo nuevamente.'
}

export function setCsrf(token) {
  csrfToken = token
}

export function getCsrf() {
  return csrfToken
}

async function parseError(res) {
  const err = await res.json().catch(() => ({}))
  const code = err.error
  const message = friendlyApiError(code, res.status)

  throw Object.assign(new Error(message), {
    status: res.status,
    code,
    technicalMessage: err.message || null,
  })
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (csrfToken && !['GET', 'HEAD'].includes(options.method)) {
    headers['x-csrf-token'] = csrfToken
  }
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) await parseError(res)
  if (res.status === 204) return null
  return res.json()
}

async function upload(path, file, fields = {}) {
  const body = new FormData()
  body.append('file', file)
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, String(value))
  })

  const headers = {}
  if (csrfToken) headers['x-csrf-token'] = csrfToken

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body,
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload,
}
