import { useId, useState } from 'react'
import { formatRut, validateRut } from '../../services/rut.js'

/**
 * Controlled, reusable RUT field. Its help/error slot is always rendered so a
 * validation message never moves adjacent commercial fields or submit controls.
 */
export function RutInput({
  value = '', onChange, required = false, disabled = false, id, name, error,
  validationRequested = false, formatOnBlur = true, onBlur,
  'aria-describedby': describedBy, ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const hintId = `${inputId}-rut-hint`
  const errorId = `${inputId}-error`
  const [touched, setTouched] = useState(false)
  const validationError = (touched || validationRequested) ? validateRut(value, { required }) : null
  const message = error || validationError
  const hasExternalError = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  const hasError = Boolean(message) || hasExternalError
  const description = [describedBy, message ? errorId : hintId].filter(Boolean).join(' ') || undefined

  return <>
    <input
      {...props}
      id={inputId}
      name={name}
      className="nk-input"
      type="text"
      value={value ?? ''}
      required={required}
      disabled={disabled}
      autoComplete="off"
      inputMode="text"
      placeholder={props.placeholder || 'Ej.: XX.XXX.XXX-X'}
      aria-invalid={hasError}
      aria-describedby={description}
      onChange={event => onChange?.(formatRut(event.target.value))}
      onBlur={event => {
        setTouched(true)
        if (formatOnBlur) {
          const formatted = formatRut(value)
          if (formatted !== value) onChange?.(formatted)
        }
        onBlur?.(event)
      }}
    />
    {!message && <p id={hintId} className="nk-field-help">Formato: números, guion y dígito verificador (X.XXX.XXX-X).</p>}
    {message && <p id={errorId} className="nk-field-error" role="alert">{message}</p>}
  </>
}
