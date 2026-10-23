import { calendarDaysUntil as daysUntil, isCalendarDate } from '../../../shared/operational-date.js'
export const DEFAULT_OPERATIONAL_TIME_ZONE = 'America/Santiago'

let activeOperationalTimeZone = DEFAULT_OPERATIONAL_TIME_ZONE

export function isValidTimeZone(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function setOperationalTimeZone(value) {
  activeOperationalTimeZone = isValidTimeZone(value) ? value : DEFAULT_OPERATIONAL_TIME_ZONE
  return activeOperationalTimeZone
}

export function operationalTimeZone() {
  return activeOperationalTimeZone
}

function resolvedTimeZone(value) {
  return isValidTimeZone(value) ? value : activeOperationalTimeZone
}

function partsFor(date, timeZone, withTime = false) {
  const fields = withTime
    ? { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }
    : { year:'numeric', month:'2-digit', day:'2-digit' }
  const parts = new Intl.DateTimeFormat('en-CA', { ...fields, timeZone }).formatToParts(date)
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
}

export function operationalDate(date = new Date(), timeZone) {
  const parts = partsFor(date, resolvedTimeZone(timeZone))
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function operationalDateTime(date = new Date(), timeZone) {
  const parts = partsFor(date, resolvedTimeZone(timeZone), true)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function timeZoneOffsetMs(date, timeZone) {
  const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName:'longOffset' })
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value || 'GMT'
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(offset)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return (match[1] === '+' ? 1 : -1) * minutes * 60_000
}

export function operationalDateTimeToUtc(value, timeZone) {
  const zone = resolvedTimeZone(timeZone)
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || ''))
  if (!match) throw Object.assign(new Error('La fecha y hora operacional no tiene un formato válido.'), { code:'INVALID_OPERATIONAL_DATE_TIME' })

  const [, year, month, day, hour, minute] = match.map(Number)
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || Number.isNaN(naive) || new Date(naive).getUTCFullYear() !== year || new Date(naive).getUTCMonth() !== month - 1 || new Date(naive).getUTCDate() !== day) {
    throw Object.assign(new Error('La fecha operacional no existe.'), { code:'INVALID_OPERATIONAL_DATE_TIME' })
  }

  const candidates = new Set()
  for (const sample of [naive - 86_400_000, naive, naive + 86_400_000]) {
    const instant = new Date(naive - timeZoneOffsetMs(new Date(sample), zone))
    if (operationalDateTime(instant, zone) === value) candidates.add(instant.toISOString())
  }
  if (candidates.size === 0) throw Object.assign(new Error('La hora indicada no existe en la zona operacional por cambio de horario.'), { code:'NONEXISTENT_OPERATIONAL_TIME' })
  if (candidates.size > 1) throw Object.assign(new Error('La hora indicada es ambigua por cambio de horario. Selecciona otra hora.'), { code:'AMBIGUOUS_OPERATIONAL_TIME' })
  return [...candidates][0]
}

function addDaysToCalendarDate(value, days) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(days)))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

export function addCalendarDays(date, days, timeZone) {
  const zone = resolvedTimeZone(timeZone)
  return new Date(operationalDateTimeToUtc(`${addDaysToCalendarDate(operationalDate(date, zone), days)}T12:00`, zone))
}

export function isCalendarDateExpired(value, now = new Date(), timeZone) {
  const days = daysUntil(value, now, resolvedTimeZone(timeZone))
  return days !== null && days < 0
}

// Compatibility names. These now represent the configured operational calendar,
// never the browser locale.
export const localDate = operationalDate
export const localDateTime = operationalDateTime

export { isCalendarDate }
export function calendarDaysUntil(value, now = new Date(), timeZone) {
  return daysUntil(value, now, resolvedTimeZone(timeZone))
}
