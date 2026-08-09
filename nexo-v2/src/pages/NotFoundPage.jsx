import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'

export default function NotFoundPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: '#F4EFE3' }}
    >
      <div className="text-center max-w-md">

        {/* Icono */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: '#E3E3F0' }}
        >
          <IconMapOff size={32} strokeWidth={1.5} style={{ color: '#2A2A8C' }} />
        </div>

        {/* Título principal */}
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#141A20' }}
        >
          Página no encontrada
        </h1>

        {/* Código — secundario */}
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#8A96A1' }}>
          Error 404
        </p>

        {/* Línea acento */}
        <div
          className="w-10 h-0.5 rounded-full mx-auto mb-5"
          style={{ background: '#00CFC1' }}
        />

        {/* Descripción */}
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#5D6B7A' }}>
          La dirección que ingresaste no existe o fue movida.
          Verifica la URL o vuelve a un lugar conocido.
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'transparent', color: '#2A2A8C', border: '1.5px solid #2A2A8C' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E3E3F0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <IconArrowLeft size={15} strokeWidth={2} />
            Volver atrás
          </button>

          <Link
            to={session ? '/app' : '/'}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#2A2A8C', color: '#FFFFFF' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1A1A5E' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2A2A8C' }}
          >
            <IconLayoutDashboard size={15} strokeWidth={2} />
            {session ? 'Ir al panel' : 'Ir al inicio'}
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs" style={{ color: '#8A96A1' }}>
          Nexo Klar · by Domian
        </p>
      </div>
    </div>
  )
}
