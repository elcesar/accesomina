import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconArrowLeft, IconHome, IconMapOff } from '@tabler/icons-react'

const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  boxSizing: 'border-box',
  padding: '32px 20px',
  background: '#F4EFE3',
  color: '#141A20',
  fontFamily: 'Inter, sans-serif',
}

const panelStyle = {
  width: 'min(100%, 560px)',
  display: 'grid',
  justifyItems: 'center',
  gap: '20px',
  textAlign: 'center',
}

const secondaryButtonStyle = {
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 16px',
  border: '1px solid #2A2A8C',
  borderRadius: '6px',
  background: '#FFFFFF',
  color: '#2A2A8C',
  fontSize: '15px',
  fontWeight: 700,
  textDecoration: 'none',
}

const primaryButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: '#2A2A8C',
  background: '#2A2A8C',
  color: '#FFFFFF',
}

export default function NotFoundPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  return (
    <main style={pageStyle} aria-labelledby="not-found-title">
      <section style={panelStyle}>
        <img
          src="/brand/NK-color-horizontal.svg"
          alt="Nexo Klar"
          style={{ width: 'min(210px, 72vw)', height: 'auto' }}
        />
        <div
          aria-hidden="true"
          style={{ width: '64px', height: '64px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#E3E3F0', color: '#2A2A8C' }}
        >
          <IconMapOff size={32} strokeWidth={1.6} />
        </div>
        <div>
          <p style={{ margin: '0 0 8px', color: '#5D6B7A', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Error 404</p>
          <h1 id="not-found-title" style={{ margin: 0, fontSize: 'clamp(28px, 6vw, 40px)', lineHeight: 1.15, fontFamily: 'Manrope, sans-serif' }}>Página no encontrada</h1>
        </div>
        <p style={{ maxWidth: '440px', margin: 0, color: '#5D6B7A', fontSize: '17px', lineHeight: 1.55 }}>
          La dirección que ingresaste no existe o fue movida. Revisa la URL o vuelve a una sección conocida.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
          <button type="button" onClick={() => navigate(-1)} style={{ ...secondaryButtonStyle, cursor: 'pointer' }}>
            <IconArrowLeft size={17} strokeWidth={2} /> Volver atrás
          </button>
          <Link to={session ? '/app' : '/'} style={primaryButtonStyle}>
            <IconHome size={17} strokeWidth={2} /> {session ? 'Ir al panel' : 'Ir al inicio'}
          </Link>
        </div>
      </section>
    </main>
  )
}
