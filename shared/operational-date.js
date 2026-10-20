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
