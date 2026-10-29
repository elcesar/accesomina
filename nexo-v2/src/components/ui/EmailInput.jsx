import { useId, useState } from 'react'
import { EMAIL_ERROR, normalizeEmail, validateEmail } from '../../services/email-validation.js'

/**
 * Controlled, reusable email field. A parent may pass error from a server
 * rejection and invalid/validationRequested after a submit attempt.
 */
export function EmailInput({
  value = '', onChange, id, name, required = false, disabled = false,
  error, validationRequested = false, onBlur, normalizeOnBlur = true, className = '',
  'aria-describedby': describedBy, ...props
}) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [touched, setTouched] = useState(false)
  const message = error || ((touched || validationRequested) ? validateEmail(value, { required }) : null)
  const errorId = `${inputId}-error`
  const description = [describedBy, message ? errorId : null].filter(Boolean).join(' ') || undefined

  return <>
    <input
      {...props}
      id={inputId}
      name={name}
      type="email"
      inputMode="email"
      autoComplete={props.autoComplete || 'email'}
      maxLength={254}
      className={['nk-input', className].filter(Boolean).join(' ')}
      value={value ?? ''}
      required={required}
      disabled={disabled}
      aria-invalid={Boolean(message)}
      aria-describedby={description}
      onChange={event => onChange?.(event.target.value)}
      onBlur={event => {
        setTouched(true)
        const normalized = normalizeOnBlur ? normalizeEmail(event.target.value) : event.target.value
        if (normalized !== event.target.value) onChange?.(normalized)
        onBlur?.(event)
      }}
    />
    {/* Reserve the wrapped error line so validation on blur cannot move the
        submit button between pointer down and click. Hidden text is not read. */}
    <p id={message ? errorId : undefined} className="nk-field-error"
      role={message ? 'alert' : undefined} aria-hidden={message ? undefined : true}
      style={{ visibility: message ? 'visible' : 'hidden' }}>{message || EMAIL_ERROR}</p>
  </>
}
