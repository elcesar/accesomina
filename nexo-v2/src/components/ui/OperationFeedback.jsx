import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ErrorPage } from './ErrorPage.jsx'
export default function OperationFeedback({ children }) {
  const {pathname}=useLocation()
  const [message,setMessage]=useState('')
  const [failure,setFailure]=useState(null)
  useEffect(()=>{setMessage('');setFailure(null)},[pathname])
  useEffect(()=>{
    let timer
    const started=()=>{clearTimeout(timer);setMessage('')}
    const completed=event=>{clearTimeout(timer);setMessage(event.detail?.message || 'Información guardada correctamente.');timer=setTimeout(()=>setMessage(''),8000)}
    const failed=event=>setFailure(event.detail)
    window.addEventListener('nexo:mutation-started',started)
    window.addEventListener('nexo:mutation-completed',completed)
    window.addEventListener('nexo:load-failed',failed)
    return ()=>{clearTimeout(timer);window.removeEventListener('nexo:mutation-started',started);window.removeEventListener('nexo:mutation-completed',completed);window.removeEventListener('nexo:load-failed',failed)}
  },[])
  const failurePage=failure ? <ErrorPage as="section" code={`Error ${failure.status===500?500:503}`} title={failure.status===500?'No pudimos cargar esta información':'Servicio temporalmente no disponible'} description="Tu información no se ha modificado. Intenta cargar la vista nuevamente en unos minutos." icon={IconAlertTriangle} actions={<><button className="nk-button nk-button-primary" onClick={()=>window.location.reload()}>Volver a intentar</button><Link className="nk-button nk-button-secondary" to="/app">Ir al panel</Link></>} /> : null
  return <>{failurePage}{message && <div className="nk-operation-feedback" role="status" aria-live="polite">{message}<button type="button" className="nk-button nk-button-quiet" aria-label="Cerrar confirmación" onClick={()=>setMessage('')}>Cerrar</button></div>}<div style={{display:failure?'none':'contents'}}>{children}</div></>
}
