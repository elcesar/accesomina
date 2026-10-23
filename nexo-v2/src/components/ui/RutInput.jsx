import { useId } from 'react'
import { formatRut, OPTIONAL_RUT_ERROR } from '../../services/rut.js'

export function RutInput({ value = '', onChange, required = false, disabled = false, id, error, formatOnBlur = true, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const hintId = `${inputId}-rut-hint`
  const errorId = `${inputId}-error`
  const hasError = Boolean(error || props['aria-invalid'])
  const describedBy = [props['aria-describedby'], !hasError ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return <>
    <input
      {...props}
      id={inputId}
      className="nk-input"
      type="text"
      value={value ?? ''}
      required={required}
      disabled={disabled}
      autoComplete="off"
      inputMode="text"
      placeholder={props.placeholder || 'Ej.: XX.XXX.XXX-X'}
      aria-invalid={hasError}
      aria-describedby={describedBy || undefined}
      onChange={event => onChange(formatRut(event.target.value))}
      onBlur={event => {
        if (formatOnBlur) {
          const formatted = formatRut(value)
          if (formatted !== value) onChange(formatted)
        }
        props.onBlur?.(event)
      }}
    />
    {!hasError && <p id={hintId} className="nk-field-help">Formato: números, guion y dígito verificador (X.XXX.XXX-X).</p>}
    {error !== undefined && <p id={error ? errorId : undefined} className="nk-field-error"
      role={error ? 'alert' : undefined} aria-hidden={error ? undefined : true}
      style={{ visibility: error ? 'visible' : 'hidden' }}>{error || OPTIONAL_RUT_ERROR}</p>}
  </>
}
