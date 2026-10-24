import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'
import { ErrorPage } from '../components/ui/ErrorPage.jsx'

export default function NotFoundPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

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
