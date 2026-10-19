import { formatChilePhone } from './chile-phone.js'

export { formatChilePhone }

export function formatChileDate(value) {
  const text = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return value || ''
  const [year,month,day] = text.split('-')
  return `${day}-${month}-${year}`
}
export function formatChileCount(value, singular, plural = `${singular}s`) {
  const count = Number(value) || 0
  return `${new Intl.NumberFormat('es-CL').format(count)} ${count === 1 ? singular : plural}`
}
