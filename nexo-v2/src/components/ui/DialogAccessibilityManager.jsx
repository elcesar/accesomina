import { useEffect, useRef } from 'react'

const DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"], .nk-dialog, .nk-privacy-dialog, .nk-book-modal > form, .nk-book-detail'
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function dialogLabel(dialog) {
  const heading = dialog.querySelector('h1, h2, h3, [data-dialog-title]')
  return heading?.textContent?.trim() || 'Diálogo de Nexo Klar'
}

function focusableIn(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter(element => !element.hasAttribute('hidden') && element.getClientRects().length > 0)
}

/** Applies the brand accessibility contract to legacy and new dialogs alike. */
export default function DialogAccessibilityManager() {
  const activeDialogRef = useRef(null)
  const restoreFocusRef = useRef(null)

  useEffect(() => {
    const sync = () => {
      const dialogs = [...document.querySelectorAll(DIALOG_SELECTOR)]
      dialogs.forEach(dialog => {
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        dialog.setAttribute('tabindex', '-1')
        if (!dialog.getAttribute('aria-label') && !dialog.getAttribute('aria-labelledby')) {
          dialog.setAttribute('aria-label', dialogLabel(dialog))
        }
        const closeButton = dialog.querySelector('header > button, .nk-dialog-header > button')
        if (closeButton instanceof HTMLButtonElement) {
          closeButton.dataset.dialogClose = 'true'
          if (!closeButton.getAttribute('aria-label')) closeButton.setAttribute('aria-label', 'Cerrar')
        }
      })

      const activeDialog = dialogs.at(-1) || null
      if (activeDialog === activeDialogRef.current) return

      if (!activeDialog) {
        const previous = restoreFocusRef.current
        activeDialogRef.current = null
        restoreFocusRef.current = null
        if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
        return
      }

      if (!activeDialog.contains(document.activeElement)) restoreFocusRef.current = document.activeElement
      activeDialogRef.current = activeDialog
      requestAnimationFrame(() => (focusableIn(activeDialog)[0] || activeDialog).focus())
    }

    const onKeyDown = event => {
      const dialog = activeDialogRef.current
      if (!dialog) return

      if (event.key === 'Escape') {
        const close = dialog.querySelector('[data-dialog-close], button[aria-label^="Cerrar"], button[aria-label^="cerrar"]')
        if (close instanceof HTMLElement) {
          event.preventDefault()
          close.click()
        }
        return
      }

      if (event.key !== 'Tab') return
      const elements = focusableIn(dialog)
      if (!elements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('keydown', onKeyDown)
    sync()
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}
