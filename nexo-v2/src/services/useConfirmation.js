import { useRef, useState } from 'react'

// The caller owns the operation; the shared dialog owns its accessible presentation.
export function useConfirmation() {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false)

  function ask(options) {
    if (request || running.current) return
    setError('')
    setRequest(options)
  }

  function cancel() {
    if (running.current) return
    setRequest(null)
    setError('')
  }

  async function confirm() {
    if (!request || running.current) return
    running.current = true
    setLoading(true)
    setError('')
    try {
      await request.onConfirm()
      setRequest(null)
    } catch (cause) {
      setError(cause?.message || 'No fue posible completar la acción. Inténtalo nuevamente.')
    } finally {
      running.current = false
      setLoading(false)
    }
  }

  return {
    ask,
    dialogProps: {
      open: Boolean(request),
      title: request?.title,
      description: request?.description,
      confirmLabel: request?.confirmLabel,
      variant: request?.variant,
      loading,
      error,
      onCancel: cancel,
      onConfirm: confirm,
    },
  }
}
