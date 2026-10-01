import { useId, useState } from 'react'
import { minimumWorkerAgeFor, validateWorkerBirthDate } from '../../services/worker-age.js'

function todayLocal() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function BirthDateInput({ value, onChange, minimumWorkerAge = minimumWorkerAgeFor('CL'), ...props }) {
  const [touched, setTouched] = useState(false)
  const errorId = useId()
  const validation = validateWorkerBirthDate(value, { minimumWorkerAge })
  const showError = touched && value && !validation.valid

  return <>
    <input
      className="nk-input"
      type="date"
      value={value || ''}
      max={todayLocal()}
      autoComplete="bday"
      aria-invalid={showError || undefined}
      aria-describedby={showError ? errorId : undefined}
      onChange={event => {
        setTouched(Boolean(event.target.value))
        onChange(event.target.value)
      }}
      onBlur={() => setTouched(true)}
      {...props}
    />
    {showError && <p id={errorId} className="nk-field-error" role="alert">{validation.message}</p>}
  </>
}
