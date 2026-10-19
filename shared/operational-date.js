export const DEFAULT_OPERATIONAL_TIME_ZONE = 'America/Santiago'

// Operational dates are calendar days in the operation's IANA timezone. They
// must not be derived from UTC or from the browser's local timezone.
export function operationalDay(value = new Date(), timeZone = DEFAULT_OPERATIONAL_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}

// A date-only value is a civil day, never an instant at UTC midnight.
export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year,month,day]=value.split('-').map(Number)
  const date=new Date(Date.UTC(year,month-1,day))
  return date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day
}
export function calendarDayNumber(value) {
  if (!isCalendarDate(value)) return null
  const [year,month,day]=value.split('-').map(Number)
  return Date.UTC(year,month-1,day)/86_400_000
}
export function calendarDaysUntil(value, now = new Date(), timeZone = DEFAULT_OPERATIONAL_TIME_ZONE) {
  const target=calendarDayNumber(value)
  const today=calendarDayNumber(operationalDay(now,timeZone))
  return target===null || today===null ? null : target-today
}
