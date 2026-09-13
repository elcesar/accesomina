import { IconCircleCheck, IconCircleX, IconMinus, IconProgress } from '@tabler/icons-react'

const STATUS_MAP = {
  disponible: ['Disponible', 'nk-badge-ok'],
  asignado: ['Asignado', 'nk-badge-none'],
  vacaciones: ['Vacaciones', 'nk-badge-warn'],
  bloqueado: ['No habilitado', 'nk-badge-error'],
  restringido: ['No habilitado', 'nk-badge-error'],
  vigente: ['Vigente', 'nk-badge-ok'],
  por_vencer: ['Por vencer', 'nk-badge-warn'],
  vencido: ['No habilitado', 'nk-badge-error'],
  no_habilitado: ['No habilitado', 'nk-badge-error'],
  sin_informacion: ['Sin información', 'nk-badge-none'],
}

const STATE_ICONS = {
  'nk-badge-ok': IconCircleCheck,
  'nk-badge-warn': IconProgress,
  'nk-badge-error': IconCircleX,
  'nk-badge-none': IconMinus,
}

export function StatusBadge({ value }) {
  const normalized = String(value || '').trim().toLowerCase()
  const [label, className] = STATUS_MAP[normalized] || [value || 'Sin información', 'nk-badge-none']

  const Icon = STATE_ICONS[className] || IconMinus
  return <span className={`nk-badge ${className}`}><Icon size={14} strokeWidth={2} aria-hidden="true" />{label}</span>
}
