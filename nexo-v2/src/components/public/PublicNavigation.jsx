import { useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import '../../styles/public-navigation.css'

export const publicSections = [
  ['solucion', 'Plataforma'],
  ['capacidades', 'Soluciones'],
  ['industrias', 'Industrias'],
  ['implementacion', 'Implementación y privacidad'],
]

export default function PublicNavigation({ active = 'inicio', onNavigate, onCreateCompany }) {
  const navigate = useNavigate()

  return (
    <header className="nk-public-header">
      <nav className="nk-public-topbar" aria-label="Navegación principal">
        <button
          className="nk-public-brand-button"
          type="button"
          onClick={() => onNavigate?.('inicio')}
          aria-label="Ir al inicio"
        >
          <BrandLogo claim={false} className="nk-public-logo" />
        </button>

        <div className="nk-public-actions nk-public-nav-cta">
          <a className="nk-button nk-button-quiet" href="mailto:contacto@nexoklar.cl">
            contacto@nexoklar.cl
          </a>
          <button className="nk-button nk-button-secondary" type="button" onClick={onCreateCompany}>
            Crear empresa
          </button>
          <button className="nk-button nk-button-primary" type="button" onClick={() => navigate('/login')}>
            Acceso
          </button>
        </div>
      </nav>

      <nav className="nk-public-section-tabs" aria-label="Secciones del sitio">
        {publicSections.map(([id, label]) => (
          <button
            key={id}
            className={active === id ? 'is-active' : ''}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onNavigate?.(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
