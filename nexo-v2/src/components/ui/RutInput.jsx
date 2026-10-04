import { useId } from 'react'
import { formatRut } from '../../services/rut.js'

export function RutInput({ value = '', onChange, required = false, disabled = false, id, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const hintId = `${inputId}-rut-hint`
  const describedBy = [props['aria-describedby'], hintId].filter(Boolean).join(' ')

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
      aria-invalid={props['aria-invalid']}
      aria-describedby={describedBy}
      onChange={event => onChange(formatRut(event.target.value))}
      onBlur={event => {
        onChange(formatRut(value))
        props.onBlur?.(event)
      }}
    />
    <p id={hintId} className="nk-field-help">Formato: 12.345.678-9.</p>
  </>
}
