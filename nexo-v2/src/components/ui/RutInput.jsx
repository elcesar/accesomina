import { useId, useState } from 'react'
import { formatRut, isValidRut } from '../../services/rut.js'

export function RutInput({ value = '', onChange, required = false, disabled = false, id, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const helpId = `${inputId}-rut-error`
  const [touched, setTouched] = useState(false)
  const invalid = Boolean(value) && !isValidRut(value)
  const showError = touched && invalid

  return <>
    <input
      {...props}
      id={inputId}
      className="nk-input"
      type="text"
      value={value}
      required={required}
      disabled={disabled}
      autoComplete="off"
      inputMode="text"
      placeholder={props.placeholder || '13.848.379-7'}
      aria-invalid={showError || undefined}
      aria-describedby={showError ? helpId : props['aria-describedby']}
      onChange={event => onChange(formatRut(event.target.value))}
      onBlur={() => {
        setTouched(true)
        onChange(formatRut(value))
      }}
    />
    {showError && <p id={helpId} className="nk-field-error" role="alert">Ingresa un RUT chileno válido.</p>}
  </>
}
