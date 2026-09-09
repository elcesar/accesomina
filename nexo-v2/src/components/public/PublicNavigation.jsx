import BrandLogo from './BrandLogo.jsx'

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

const primaryLinks = [
  ['solucion', 'La plataforma'],
  ['resultados', 'Beneficios'],
  ['capacidades', 'Soluciones'],
  ['implementacion', 'Implementación y privacidad'],
]

export default function PublicNavigation({ active = 'inicio', onNavigate }) {
  return <>
    <nav className="nk-public-topbar" aria-label="Navegación principal">
      <button className="nk-image-button" type="button" onClick={() => onNavigate?.('inicio')} aria-label="Ir al inicio">
        <BrandLogo className="nk-public-logo" />
      </button>

      <div className="nk-public-actions" aria-label="Secciones principales">
        {primaryLinks.map(([id, label]) => (
          <button className="nk-button nk-button-quiet" type="button" key={id} onClick={() => onNavigate?.(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="nk-public-actions">
        <a className="nk-button nk-button-quiet" href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a>
        <button className="nk-button nk-button-primary" type="button" onClick={() => onNavigate?.('clientes-access')}>Acceso</button>
      </div>
    </nav>

    <nav className="nk-public-tabs" aria-label="Etapas del sitio">
      {publicSections.map(([id, label]) => (
        <button
          key={id}
          className={active === id ? 'active' : ''}
          type="button"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onNavigate?.(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  </>
}
