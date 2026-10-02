import { formatChilePhone } from './chile-phone.js'

export { formatChilePhone }

export function formatChileDate(value) {
  const date = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return value || ''

  // Keep date-only values in local time so their day cannot shift by timezone.
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(year, month - 1, day, 12))
}
