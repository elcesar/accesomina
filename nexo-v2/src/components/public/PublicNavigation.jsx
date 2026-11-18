import { useState } from 'react'
import { IconMenu2, IconX } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { PUBLIC_PAGES } from '../../config/public-pages.js'
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
  const [menuOpen, setMenuOpen] = useState(false)

  const goToSection = id => {
    onNavigate?.(id)
    setMenuOpen(false)
  }

  return (
    <header className="nk-public-header">
      <nav className="nk-public-topbar" aria-label="Navegación principal">
        <Link
          className="nk-public-brand-button"
          to="/"
          onClick={() => setMenuOpen(false)}
          aria-label="Ir al inicio"
        >
          <BrandLogo claim={false} className="nk-public-logo" />
        </Link>

        <div className="nk-public-actions nk-public-nav-cta">
          <a className="nk-button nk-button-quiet nk-touch-target nk-public-contact" href="mailto:contacto@nexoklar.com">
            contacto@nexoklar.com
          </a>
          <button className="nk-button nk-button-secondary nk-public-create-company" type="button" onClick={onCreateCompany}>
            Crear empresa
          </button>
          <Link className="nk-button nk-button-primary" to="/login">
            Acceso
          </Link>
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
            <Link
              key={id}
              className={isActive ? 'is-active' : ''}
              to={PUBLIC_PAGES[id].path}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
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
          <Link
            key={id}
            className={active === id ? 'is-active' : ''}
            to={PUBLIC_PAGES[id].path}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </Link>
        ))}
        <button className="nk-button nk-button-secondary" type="button" onClick={() => { onCreateCompany?.(); setMenuOpen(false) }}>
          Crear empresa
        </button>
        <a className="nk-button nk-button-quiet nk-touch-target" href="mailto:contacto@nexoklar.com">contacto@nexoklar.com</a>
      </nav>
    </header>
  )
}
