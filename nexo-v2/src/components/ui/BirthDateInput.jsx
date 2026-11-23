import { useId } from 'react'
import { localDate as localToday } from '../../services/calendar-date.js'
export const MINIMUM_WORKER_AGE = 18



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

export function BirthDateInput({ value = '', onChange, minimumAge = MINIMUM_WORKER_AGE, id, error: externalError, showError = true, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const error = externalError || birthDateError(value, minimumAge)
  const errorId = `${inputId}-birth-error`
  return (
    <div>
      <input
        id={inputId}
        className="nk-input"
        type="date"
        value={value}
        max={minimumBirthDate(minimumAge)}
        onChange={event => onChange?.(event.target.value)}
        {...props}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[props['aria-describedby'], error && showError ? errorId : ''].filter(Boolean).join(' ') || undefined}
      />
      {error && showError && <p id={errorId} className="nk-field-error" role="alert">{error}</p>}
    </div>
  )
}
