// Calendar dates belong to the browser's local day. Audit timestamps continue
// to use toISOString(), which represents an instant in UTC.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function localDateTime(date = new Date()) {
  return `${localDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function addCalendarDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
