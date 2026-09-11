export const CANONICAL_STATUSES = [
  ['activo', 'Activo'],
  ['pendiente', 'Pendiente'],
  ['en_revision', 'En revisión'],
  ['cerrado', 'Cerrado'],
  ['cancelado', 'Cancelado'],
  ['restringido', 'Restringido'],
]

export const OTHER_VALUE = 'otro'

export const isOther = value => String(value || '').trim().toLowerCase() === OTHER_VALUE

export const otherLabel = (value, detail, fallback = 'Otro') => isOther(value) ? String(detail || '').trim() || fallback : value
