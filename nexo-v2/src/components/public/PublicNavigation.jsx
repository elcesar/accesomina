import BrandLogo from './BrandLogo.jsx'
import '../../styles/public-navigation.css'

export const publicSections = [
  ['inicio', 'Inicio'],
  ['solucion', 'Plataforma'],
  ['resultados', 'Beneficios'],
  ['producto', 'Producto'],
  ['capacidades', 'Soluciones'],
  ['industrias', 'Industrias'],
  ['implementacion', 'Implementación y privacidad'],
  ['proposito', 'Propósito'],
]

export default function PublicNavigation({ active = 'inicio', onNavigate }) {
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

        <div className="nk-public-actions nk-public-nav-links" aria-label="Secciones del sitio">
          {publicSections.map(([id, label]) => (
            <button
              key={id}
              className={`nk-button nk-button-quiet ${active === id ? 'is-active' : ''}`}
              type="button"
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onNavigate?.(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="nk-public-actions nk-public-nav-cta">
          <a className="nk-button nk-button-quiet" href="mailto:contacto@nexoklar.cl">
            contacto@nexoklar.cl
          </a>
          <button
            className={`nk-button ${active === 'clientes-access' ? 'nk-button-secondary' : 'nk-button-primary'}`}
            type="button"
            aria-current={active === 'clientes-access' ? 'page' : undefined}
            onClick={() => onNavigate?.('clientes-access')}
          >
            Acceso
          </button>
        </div>
      </nav>

      <nav className="nk-public-mobile-tabs" aria-label="Secciones del sitio">
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
