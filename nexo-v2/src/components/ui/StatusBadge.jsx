const normalize = value => String(value || '').trim().toLocaleLowerCase('es-CL').replaceAll(' ', '_')

const statuses = {
  activo: ['Activo', 'ok'],
  vigente: ['Vigente', 'ok'],
  disponible: ['Disponible', 'ok'],
  preparado: ['Preparado', 'ok'],
  pendiente: ['Pendiente', 'warn'],
  en_revision: ['En revisión', 'warn'],
  proximo_a_vencer: ['Próximo a vencer', 'warn'],
  borrador: ['Borrador', 'none'],
  asignado: ['Asignado', 'none'],
  vacaciones: ['Vacaciones', 'warn'],
  cerrado: ['Cerrado', 'none'],
  finalizado: ['Finalizado', 'none'],
  inactivo: ['Inactivo', 'none'],
  cancelado: ['Cancelado', 'none'],
  suspendido: ['Suspendido', 'error'],
  vencido: ['Vencido', 'error'],
  restringido: ['Restringido', 'error'],
  bloqueado: ['Restringido', 'error'],
  no_habilitado: ['No habilitado', 'error'],
}

export function statusInfo(value, fallback = 'Sin información') {
  const key = normalize(value)
  const [label, tone] = statuses[key] || [value ? String(value).replaceAll('_', ' ') : fallback, 'none']
  return { label, tone }
}

export function StatusBadge({ value, fallback, className = '' }) {
  const { label, tone } = statusInfo(value, fallback)
  return <span className={`nk-badge nk-badge-${tone} ${className}`.trim()}>{label}</span>
}
