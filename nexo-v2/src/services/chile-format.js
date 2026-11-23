import { formatChilePhone } from './chile-phone.js'
import { isCalendarDate } from '../../../shared/operational-date.js'

export { formatChilePhone }

export function formatChileDate(value) {
  const text = String(value || '')
  if (!isCalendarDate(text)) return value || ''
  const [year,month,day] = text.split('-')
  return `${day}-${month}-${year}`
}
export function formatChileCount(value, singular, plural = `${singular}s`) {
  const count = Number(value) || 0
  return `${new Intl.NumberFormat('es-CL').format(count)} ${count === 1 ? singular : plural}`
}
