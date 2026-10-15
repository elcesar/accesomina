import { useEffect, useId, useRef, useState } from 'react'
import { formatRut, isValidRut } from '../../services/rut.js'

export function RutInput({ value = '', onChange, required = false, disabled = false, id, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const hintId = `${inputId}-rut-hint`
  const errorId = `${inputId}-rut-error`
  const inputRef = useRef(null)
  const [touched, setTouched] = useState(false)
  const hasValue = String(value || '').trim().length > 0
  const invalid = !disabled && (hasValue ? !isValidRut(value) : required)
  const showError = touched && invalid
  const message = !hasValue ? 'Ingresa un RUT.' : 'El RUT no es válido. Revisa el dígito verificador.'
  const describedBy = [props['aria-describedby'], hintId, showError ? errorId : null].filter(Boolean).join(' ')

  useEffect(() => {
    inputRef.current?.setCustomValidity(invalid ? message : '')
  }, [invalid, message])

  return <>
    <input
      {...props}
      ref={inputRef}
      id={inputId}
      className="nk-input"
      type="text"
      value={value}
      required={required}
      disabled={disabled}
      autoComplete="off"
      inputMode="text"
      placeholder={props.placeholder || '13.848.379-7'}
      aria-invalid={props['aria-invalid'] === true || showError ? true : undefined}
      aria-describedby={describedBy}
      onChange={event => {
        onChange(formatRut(event.target.value))
      }}
      onInvalid={event => {
        setTouched(true)
        props.onInvalid?.(event)
      }}
      onBlur={event => {
        setTouched(true)
        onChange(formatRut(event.target.value))
        props.onBlur?.(event)
      }}
    />
    <p id={hintId} className="nk-field-help">Formato: 12.345.678-9.</p>
    {showError && <p id={errorId} className="nk-field-help" role="alert">{message}</p>}
  </>
}
