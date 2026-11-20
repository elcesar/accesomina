import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'
import { ErrorPage } from '../components/ui/ErrorPage.jsx'

const SITE_URL = 'https://nexoklar.com'

function updateAttribute(element, attribute, value) {
  const previous = element.getAttribute(attribute)
  element.setAttribute(attribute, value)
  return () => {
    if (previous === null) element.removeAttribute(attribute)
    else element.setAttribute(attribute, previous)
  }
}

export default function NotFoundPage() {
  const { session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const title = 'Nexo Klar · Página no encontrada'
    const description = 'La dirección solicitada no existe o fue movida. Vuelve al inicio de Nexo Klar para continuar.'
    const canonical = new URL(location.pathname, SITE_URL).toString()
    const previousTitle = document.title
    const restores = []

    document.title = title
    for (const [selector, value] of [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:url"]', canonical],
      ['link[rel="canonical"]', canonical],
    ]) {
      const element = document.querySelector(selector)
      if (element) restores.push(updateAttribute(element, 'content', value))
      if (selector === 'link[rel="canonical"]' && element) {
        restores.pop()
        restores.push(updateAttribute(element, 'href', value))
      }
    }

    let robots = document.querySelector('meta[name="robots"]')
    const createdRobots = !robots
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    const restoreRobots = updateAttribute(robots, 'content', 'noindex, follow')

    return () => {
      document.title = previousTitle
      restores.reverse().forEach(restore => restore())
      restoreRobots()
      if (createdRobots) robots.remove()
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
