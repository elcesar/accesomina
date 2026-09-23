import { useId, useState } from 'react'
import { formatChilePhone, isValidChilePhone, normalizeChilePhone } from '../../services/chile-phone.js'

export function PhoneInput({ value = '', onChange, country = 'CL', id, required = false, disabled = false, ...props }) {
  const generatedId = useId()
  const [touched, setTouched] = useState(false)
  const inputId = id || generatedId
  const normalized = normalizeChilePhone(value)
  const invalid = Boolean(normalized) && !isValidChilePhone(normalized)
  const showError = touched && invalid
  const prefix = country === 'CL' ? '+56' : ''
  return <>
    <input {...props} id={inputId} className={`nk-input${props.className ? ` ${props.className}` : ''}`} type="tel" inputMode="tel" autoComplete="tel" required={required} disabled={disabled} value={formatChilePhone(value)} placeholder={props.placeholder || `${prefix} 9 1234 5678`} aria-invalid={showError || undefined} aria-describedby={showError ? `${inputId}-error` : undefined} onChange={event => onChange(normalizeChilePhone(event.target.value))} onBlur={() => { setTouched(true); onChange(normalized) }} />
    {showError && <p id={`${inputId}-error`} className="nk-field-error">Ingresa un teléfono chileno válido.</p>}
  </>
}