import { useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'
import '../../styles/layout/public-layout.css'

export const publicSections = [
  ['inicio', 'Inicio'],
  ['solucion', 'Plataforma'],
  ['resultados', 'Beneficios'],
  ['producto', 'Producto'],
  ['capacidades', 'Soluciones'],
  ['industrias', 'Industrias'],
  ['implementacion', 'Implementación y privacidad'],
  ['proposito', 'Propósito'],
  ['clientes-access', 'Acceso clientes'],
]

export default function PublicNavigation({ active = 'inicio', onNavigate, onCreateCompany }) {
  const navigate = useNavigate()

  const goToSection = id => {
    onNavigate?.(id)
  }

  return (
    <header className="nk-public-header">
      <nav className="nk-public-topbar" aria-label="Navegación principal">
        <button
          className="nk-public-brand-button"
          type="button"
          onClick={() => goToSection('inicio')}
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
        {publicSections.map(([id, label]) => {
          const isActive = active === id

          return (
            <button
              key={id}
              className={isActive ? 'is-active' : ''}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => goToSection(id)}
            >
              {label}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
