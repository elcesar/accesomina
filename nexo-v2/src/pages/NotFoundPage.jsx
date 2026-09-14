import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'
import '../styles/account-pages.css'

export default function NotFoundPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="nk-not-found">
      <section className="nk-not-found-content">
        <div className="nk-not-found-icon"><IconMapOff size={32} strokeWidth={1.5} aria-hidden="true" /></div>
        <h1>Página no encontrada</h1>
        <p className="nk-not-found-code">Error 404</p>
        <div className="nk-not-found-rule" />
        <p className="nk-not-found-copy">
          La dirección que ingresaste no existe o fue movida.
          Verifica la URL o vuelve a un lugar conocido.
        </p>

        {/* Acciones */}
        <div className="nk-not-found-actions">
          <button onClick={() => navigate(-1)} className="nk-button nk-button-secondary">
            <IconArrowLeft size={15} strokeWidth={2} />
            Volver atrás
          </button>

          <Link to={session ? '/app' : '/'} className="nk-button nk-button-primary">
            <IconLayoutDashboard size={15} strokeWidth={2} />
            {session ? 'Ir al panel' : 'Ir al inicio'}
          </Link>
        </div>

        {/* Footer */}
        <p className="nk-not-found-brand">Nexo Klar</p>
      </section>
    </main>
  )
}
