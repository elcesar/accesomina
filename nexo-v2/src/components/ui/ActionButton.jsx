import { forwardRef, useId } from 'react'
export const ActionButton = forwardRef(function ActionButton({ disabled, disabledReason, children, 'aria-describedby': describedBy, ...props }, ref) {
  const reasonId=useId()
  return <>
    <button {...props} ref={ref} disabled={disabled} title={disabled ? disabledReason : props.title} aria-describedby={[describedBy,disabled && disabledReason ? reasonId : ''].filter(Boolean).join(' ') || undefined}>{children}</button>
    {disabled && disabledReason && <small id={reasonId} className="nk-disabled-action-help">{disabledReason}</small>}
  </>
})
