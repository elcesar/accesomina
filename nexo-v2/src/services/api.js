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
  FILE_REQUIRED: 'Selecciona un archivo antes de continuar.',
  FILE_TYPE_NOT_ALLOWED: 'El formato no está permitido. Usa PDF, JPG, PNG, Word o Excel.',
  STORAGE_NOT_CONFIGURED: 'La carga de archivos aún no está configurada en este ambiente. Contacta a soporte.',
  VIRUS_SCAN_REQUIRED: 'La carga de archivos está temporalmente suspendida mientras se configura la revisión de seguridad.',
  VIRUS_SCAN_UNAVAILABLE: 'La revisión de seguridad de archivos no está disponible. Inténtalo nuevamente en unos minutos.',
  MALWARE_DETECTED: 'El archivo fue rechazado por la revisión de seguridad.',
  LIMIT_FILE_SIZE: 'El archivo supera el tamaño máximo permitido de 25 MB.',
  MODULE_VERSION_CONFLICT: 'La información cambió mientras la estabas editando. Actualizamos los datos; revísalos y vuelve a guardar.',
  INVALID_REFERENCE: 'Uno de los registros relacionados ya no existe o no corresponde. Actualiza la página y revisa las selecciones.',
  INVALID_EPP_DELIVERY: 'Completa persona, equipo de protección, cantidad y fecha de entrega antes de guardar.',
  INVALID_EPP_DELIVERY_STATUS: 'La condición o el estado de la entrega de EPP no es válido.',
  DUPLICATE_EPP_DELIVERY: 'Ya existe una entrega de este equipo para la misma persona, fecha y lote.',
  DUPLICATE_WORKER_DOCUMENT: 'Ya existe un documento con la misma clasificación, referencia y vigencia para esta persona.',
  DUPLICATE_WORKER_DOCUMENT_ID: 'No fue posible registrar el documento porque coincide con una evidencia existente. Actualiza la página e inténtalo nuevamente.',
  DUPLICATE_WORKER_RUT: 'Ya existe una persona registrada con ese RUT.',
  INVALID_WORKER_RUT: 'El RUT ingresado no corresponde a un RUT chileno válido.',
  INVALID_WORKER_PHONE: 'El teléfono ingresado no tiene un formato chileno válido.',
  INVALID_WORKER_BIRTH_DATE: 'La fecha de nacimiento no puede ser futura.',
  WORKER_UNDERAGE: 'La persona no cumple con la edad mínima permitida. Revisa la fecha de nacimiento ingresada.',
  DUPLICATE_CONTRACT_NUMBER: 'Ya existe un contrato registrado con ese número o código.',
  DUPLICATE_ASSIGNMENT: 'La persona ya está asignada a esa orden de servicio.',
  DUPLICATE_SHIFT: 'La persona ya tiene una jornada registrada para esa fecha y turno.',
  INVALID_DATES: 'Revisa las fechas ingresadas: la fecha de inicio debe ser anterior a la de término.',
  INCOMPLETE_WORKER: 'Completa los datos obligatorios de la persona antes de guardar.',
  INCOMPLETE_CLIENT: 'Completa los datos obligatorios del cliente antes de guardar.',
  INVALID_CLIENT_RUT: 'El RUT ingresado no corresponde a un RUT chileno válido.',
  DUPLICATE_CLIENT_RUT: 'Ya existe un cliente registrado con ese RUT.',
  DUPLICATE_CLIENT: 'Ya existe un cliente con el mismo nombre y organización relacionada.',
  DUPLICATE_ID: 'Ya existe un registro con ese identificador.',
  DUPLICATE_PROJECT: 'Ya existe una orden de servicio equivalente para ese cliente y fecha.',
  DUPLICATE_HOTEL: 'Ya existe un alojamiento equivalente registrado.',
  INVALID_SUBCONTRACTOR_RUT: 'El RUT del subcontratista no es válido.',
  DUPLICATE_SUBCONTRACTOR_RUT: 'Ya existe un subcontratista registrado con ese RUT.',
  DUPLICATE_VEHICLE: 'Ya existe un vehículo registrado con esa patente o número de serie.',
  DUPLICATE_HEALTH_PROTOCOL: 'Ya existe un protocolo de salud equivalente para esta persona.',
  DUPLICATE_INCIDENT: 'Ya existe un incidente equivalente registrado.',
  DUPLICATE_WORK_PERMIT: 'Ya existe un permiso de trabajo equivalente para esta orden de servicio.',
  DUPLICATE_WHATSAPP_GROUP: 'Ya existe un grupo de WhatsApp equivalente.',
  DUPLICATE_SIGNATURE_REQUEST: 'Ya existe una solicitud de firma activa equivalente.',
  FIELD_PERMISSION_DENIED: 'No tienes permisos para modificar uno o más de estos datos.',

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

export function friendlyApiError(code, status, metadata = {}) {
  if (code === 'WORKER_UNDERAGE' && metadata.minimumAge) {
    return `La persona no cumple con la edad mínima permitida de ${metadata.minimumAge} años. Revisa la fecha de nacimiento ingresada.`
  }
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]
  if (String(code || '').startsWith('DUPLICATE_')) return 'Ya existe un registro equivalente. Revisa los datos ingresados antes de guardar.'
  if (String(code || '').startsWith('INVALID_')) return 'Revisa los datos relacionados y los campos obligatorios antes de guardar.'
  if (String(code || '').startsWith('MISSING_')) return 'Completa la información obligatoria antes de guardar.'
  if (String(code || '').includes('OVERLAPPING')) return 'El registro se superpone con una asignación o estadía existente.'
  return STATUS_MESSAGES[status] || 'No fue posible completar la operación. Inténtalo nuevamente.'
}

export function setCsrf(token) {
  csrfToken = token
}

export function getCsrf() {
  return csrfToken
}

async function parseError(res) {
  const err = await res.json().catch(() => ({}))
  // API errors historically used `error`; state validation returns `code`.
  // Preserve both contracts while code is the canonical functional identifier.
  const code = err.code || err.error || null
  const metadata = Object.fromEntries(
    Object.entries(err).filter(([key]) => !['code', 'error', 'message'].includes(key))
  )
  const message = friendlyApiError(code, res.status, metadata)

  throw Object.assign(new Error(message), {
    status: res.status,
    code,
    technicalMessage: err.message || null,
    metadata,
    ...metadata,
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
