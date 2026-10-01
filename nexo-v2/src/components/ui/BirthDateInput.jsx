export const MINIMUM_WORKER_AGE = 18

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function minimumBirthDate(age = MINIMUM_WORKER_AGE, today = localToday()) {
  const [year, month, day] = today.split('-').map(Number)
  return `${year - age}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function birthDateError(value, minimumAge = MINIMUM_WORKER_AGE, today = localToday()) {
  if (!value) return ''
  if (value > today) return 'La fecha de nacimiento no puede ser posterior a hoy.'
  if (value > minimumBirthDate(minimumAge, today)) return `La persona es menor de edad. Debe tener al menos ${minimumAge} años para ser registrada.`
  return ''
}

export function BirthDateInput({ value = '', onChange, minimumAge = MINIMUM_WORKER_AGE, ...props }) {
  const error = birthDateError(value, minimumAge)
  return (
    <div>
      <input
        className="nk-input"
        type="date"
        value={value}
        max={minimumBirthDate(minimumAge)}
        onChange={event => onChange?.(event.target.value)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && <p className="nk-person-field-hint" role="alert">{error}</p>}
    </div>
  )
}
