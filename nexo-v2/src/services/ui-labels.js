/**
 * Etiquetas para presentar códigos técnicos en español claro.
 * Los valores originales se conservan en API, auditoría, roles y persistencia.
 */
export const ROLE_LABELS = Object.freeze({
  domian_admin: 'Administrador de Nexo Klar',
  client_admin: 'Administrador de empresa',
  rrhh: 'Recursos humanos',
  prevencion: 'Prevención de riesgos',
  acreditacion: 'Acreditación',
  consulta: 'Solo lectura',
})

export const AUDIT_ACTION_LABELS = Object.freeze({
  'tenant.created': 'Empresa creada',
  'session.login': 'Inicio de sesión',
  'session.logout': 'Cierre de sesión',
  'user.created': 'Usuario creado',
  'user.updated': 'Usuario actualizado',
  'user.password_reset_by_company_admin': 'Contraseña restablecida por el administrador',
  'user.mfa_reset_by_admin': 'Verificación en dos pasos restablecida',
  'user.password_changed': 'Contraseña modificada',
  'user.mfa_enabled': 'Verificación en dos pasos activada',
  'user.mfa_disabled': 'Verificación en dos pasos desactivada',
  password_reset_delivery: 'Envío de instrucciones para restablecer la contraseña',
  document_added: 'Documento agregado',
  document_updated: 'Documento actualizado',
  document_deleted: 'Documento eliminado',
  'worker.document_added': 'Documento de persona agregado',
  'worker.document_updated': 'Documento de persona actualizado',
  'worker.document_deleted': 'Documento de persona eliminado',
  'worker.created': 'Persona registrada',
  'worker.updated': 'Datos de persona actualizados',
  'worker.deleted': 'Persona eliminada',
})

export const AUDIT_ENTITY_LABELS = Object.freeze({
  tenant: 'Empresa',
  session: 'Sesión',
  user: 'Usuario',
  worker: 'Persona',
  trabajador: 'Persona',
  worker_document: 'Documento de persona',
  document: 'Documento',
  contract: 'Contrato',
  project: 'Orden de servicio',
  maintenance: 'Orden de servicio',
  accreditation: 'Acreditación',
})

export const AUDIT_FIELD_LABELS = Object.freeze({
  action: 'Acción',
  status: 'Estado',
  estado: 'Estado',
  role: 'Perfil de acceso',
  email: 'Correo electrónico',
  user_email: 'Correo del usuario',
  name: 'Nombre',
  nombre: 'Nombre',
  password: 'Contraseña',
  password_reset_delivery: 'Envío de recuperación de contraseña',
  worker_document: 'Documento de persona',
  document_type: 'Tipo de documento',
  document_id: 'Documento',
  worker_id: 'Persona',
  tenant_id: 'Empresa',
  created_at: 'Fecha de creación',
  updated_at: 'Fecha de actualización',
  expires_at: 'Fecha de vencimiento',
  phone_number_id: 'Identificador de número telefónico',
})

export function roleLabel(value) {
  if (!value) return 'Usuario'
  return ROLE_LABELS[String(value).toLowerCase()] || 'Perfil de usuario'
}

function readableWords(value) {
  return String(value || '').replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

const TECHNICAL_WORDS = new Set([
  'id', 'uuid', 'json', 'api', 'payload', 'token', 'tenant', 'worker',
  'document', 'delivery', 'reset', 'password', 'updated', 'created',
  'deleted', 'mfa', 'smtp',
])

export function auditActionLabel(value) {
  const key = String(value || '')
  if (AUDIT_ACTION_LABELS[key]) return AUDIT_ACTION_LABELS[key]
  // Unknown machine values are intentionally not shown as raw identifiers.
  const words = readableWords(key)
  if (!words || /^[a-f0-9-]{16,}$/i.test(words) || [...words.split(' ')].some(word => TECHNICAL_WORDS.has(word.toLowerCase()))) {
    return 'Actividad registrada'
  }
  return 'Actividad registrada'
}

export function auditEntityLabel(value) {
  return AUDIT_ENTITY_LABELS[String(value || '')] || 'Registro'
}

export function auditFieldLabel(value) {
  const key = String(value || '')
  return AUDIT_FIELD_LABELS[key] || 'Información del registro'
}
