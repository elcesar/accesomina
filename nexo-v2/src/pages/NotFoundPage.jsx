import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'
import { ErrorPage } from '../components/ui/ErrorPage.jsx'

export default function NotFoundPage() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const title = 'Nexo Klar · Página no encontrada'
    const description = 'La dirección solicitada no existe o fue movida. Vuelve al inicio de Nexo Klar para continuar.'
    const canonical = `https://nexoklar.com${location.pathname}`
    const robots = document.querySelector('meta[name="robots"]') || document.head.appendChild(document.createElement('meta'))
    const createdRobots = !robots.getAttribute('name')
    const previousRobots = robots.getAttribute('content')

    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
    robots.setAttribute('name', 'robots')
    robots.setAttribute('content', 'noindex, follow')

    return () => {
      if (createdRobots) robots.remove()
      else if (previousRobots === null) robots.removeAttribute('content')
      else robots.setAttribute('content', previousRobots)
    }
  }, [location.pathname])

  return (
    <ErrorPage
      code="Error 404"
      title="Página no encontrada"
      description="La dirección que ingresaste no existe o fue movida. Verifica la URL o vuelve a un lugar conocido."
      icon={IconMapOff}
      actions={<>
        <button type="button" className="nk-button nk-button-secondary nk-touch-target" onClick={() => navigate(-1)}>
          <IconArrowLeft size={16} /> Volver atrás
        </button>
        <Link to={session ? '/app' : '/'} className="nk-button nk-button-primary nk-touch-target">
          <IconLayoutDashboard size={16} /> {session ? 'Ir al panel' : 'Ir al inicio'}
        </Link>
      </>}
    />
  )
}
