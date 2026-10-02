export function formatChileDate(value) {
  const normalized = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized

  // Noon avoids moving a date-only value to the prior day in negative UTC offsets.
  const date = new Date(`${normalized}T12:00:00`)
  if (Number.isNaN(date.getTime())) return normalized
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}
