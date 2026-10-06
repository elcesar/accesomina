import { useState } from 'react'
import { IconMenu2, IconX } from '@tabler/icons-react'
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
  ['contacto', 'Contacto'],
]

export default function PublicNavigation({ active = 'inicio', onNavigate, onCreateCompany }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const goToSection = id => {
    onNavigate?.(id)
    setMenuOpen(false)
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
          <a className="nk-button nk-button-quiet nk-public-contact" href="mailto:contacto@nexoklar.com">
            contacto@nexoklar.com
          </a>
          <button className="nk-button nk-button-secondary nk-public-create-company" type="button" onClick={onCreateCompany}>
            Crear empresa
          </button>
          <button className="nk-button nk-button-primary" type="button" onClick={() => navigate('/login')}>
            Acceso
          </button>
          <button
            className="nk-icon-button nk-public-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Cerrar menú de secciones' : 'Abrir menú de secciones'}
            aria-expanded={menuOpen}
            aria-controls="public-section-menu"
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
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

      <nav
        id="public-section-menu"
        className="nk-public-mobile-menu"
        aria-label="Secciones del sitio"
        hidden={!menuOpen}
      >
        {publicSections.map(([id, label]) => (
          <button
            key={id}
            className={active === id ? 'is-active' : ''}
            type="button"
            aria-current={active === id ? 'page' : undefined}
            onClick={() => goToSection(id)}
          >
            {label}
          </button>
        ))}
        <button className="nk-button nk-button-secondary" type="button" onClick={() => { onCreateCompany?.(); setMenuOpen(false) }}>
          Crear empresa
        </button>
        <a className="nk-button nk-button-quiet" href="mailto:contacto@nexoklar.com">contacto@nexoklar.com</a>
      </nav>
    </header>
  )
}
