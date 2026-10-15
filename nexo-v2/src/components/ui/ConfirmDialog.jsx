import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Confirmación transversal. El consumidor administra open/loading/error y la mutación.
 * No cierra automáticamente: onCancel/onConfirm deciden cuándo cerrar.
 */
export default function ConfirmDialog({
  open = false,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  error,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)
  const openerRef = useRef(null)
  const cancelHandlerRef = useRef(onCancel)
  const loadingRef = useRef(loading)
  cancelHandlerRef.current = onCancel
  loadingRef.current = loading

  useEffect(() => {
    if (!open) return undefined

    openerRef.current = document.activeElement
    const dialog = dialogRef.current
    const focusPreviouslyActive = () => {
      if (openerRef.current?.isConnected) openerRef.current.focus()
    }
    cancelRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (!loadingRef.current) cancelHandlerRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const controls = Array.from(dialog.querySelectorAll(FOCUSABLE))
        .filter(element => element.getClientRects().length > 0)
      if (!controls.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      focusPreviouslyActive()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="nk-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="nk-dialog"
        role={variant === 'danger' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        aria-busy={loading}
        data-state={error ? 'error' : loading ? 'loading' : undefined}
        tabIndex={-1}
      >
        <header className="nk-dialog-header">
          <h2 className="nk-dialog-title" id={titleId}>{title}</h2>
        </header>
        <div className="nk-dialog-body" id={descriptionId}>{description}</div>
        {error && <p id={errorId} role="alert" className="nk-field-error">{error}</p>}
        <footer className="nk-dialog-footer">
          <button ref={cancelRef} className="nk-button nk-button-secondary" type="button" disabled={loading} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`nk-button ${variant === 'danger' ? 'nk-button-danger' : 'nk-button-primary'}`} type="button" disabled={loading} onClick={onConfirm}>
            {loading ? 'Procesando…' : confirmLabel}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
