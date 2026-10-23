import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconAlertTriangle } from '@tabler/icons-react'
import { api } from '../../services/api.js'

export default function OperationFeedback({ children }) {
  const { pathname } = useLocation()
  const [message, setMessage] = useState('')
  const [failure, setFailure] = useState(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    setMessage('')
    setFailure(null)
    setRetrying(false)
  }, [pathname])

  useEffect(() => {
    let timer
    const started = () => { clearTimeout(timer); setMessage('') }
    const completed = event => {
      clearTimeout(timer)
      setMessage(event.detail?.message || 'Información guardada correctamente.')
      timer = setTimeout(() => setMessage(''), 8000)
    }
    const failed = event => setFailure(event.detail || { status: 503 })
    window.addEventListener('nexo:mutation-started', started)
    window.addEventListener('nexo:mutation-completed', completed)
    window.addEventListener('nexo:load-failed', failed)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('nexo:mutation-started', started)
      window.removeEventListener('nexo:mutation-completed', completed)
      window.removeEventListener('nexo:load-failed', failed)
    }
  }, [])

  async function retryLoad() {
    if (retrying) return
    setRetrying(true)
    try {
      await api.get('/state')
      setFailure(null)
      // Let mounted modules refresh their data without losing local form state.
      window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded'))
    } catch (error) {
      setFailure({ status: error.status === 500 ? 500 : 503 })
    } finally {
      setRetrying(false)
    }
  }

  return <>
    {failure && <section className="nk-operation-feedback nk-operation-feedback-error" role="alert" aria-live="assertive">
      <IconAlertTriangle size={20} aria-hidden="true" />
      <div>
        <strong>Error {failure.status === 500 ? 500 : 503}: {failure.status === 500 ? 'No pudimos cargar la información' : 'Servicio temporalmente no disponible'}</strong>
        <p>No fue posible actualizar los datos. Puedes seguir trabajando con la información que ya está visible. Evita recargar la página si tienes cambios sin guardar.</p>
      </div>
      <button type="button" className="nk-button nk-button-primary" onClick={retryLoad} disabled={retrying}>{retrying ? 'Reintentando…' : 'Volver a intentar'}</button>
      <button type="button" className="nk-button nk-button-quiet" onClick={() => setFailure(null)}>Cerrar aviso</button>
    </section>}
    {message && <div className="nk-operation-feedback" role="status" aria-live="polite">{message}<button type="button" className="nk-button nk-button-quiet" aria-label="Cerrar confirmación" onClick={() => setMessage('')}>Cerrar</button></div>}
    {children}
  </>
}
