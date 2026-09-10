const STATUS_MAP = {
  disponible: ['Disponible', 'nk-badge-ok'],
  asignado: ['Asignado', 'nk-badge-none'],
  vacaciones: ['Vacaciones', 'nk-badge-warn'],
  bloqueado: ['Restringido', 'nk-badge-error'],
  restringido: ['Restringido', 'nk-badge-error'],
  vigente: ['Vigente', 'nk-badge-ok'],
  por_vencer: ['Por vencer', 'nk-badge-warn'],
  vencido: ['No habilitado', 'nk-badge-error'],
  no_habilitado: ['No habilitado', 'nk-badge-error'],
  sin_informacion: ['Sin información', 'nk-badge-none'],
}

export function StatusBadge({ value }) {
  const normalized = String(value || '').trim().toLowerCase()
  const [label, className] = STATUS_MAP[normalized] || [value || 'Sin información', 'nk-badge-none']

  return <span className={`nk-badge ${className}`}>{label}</span>
}
