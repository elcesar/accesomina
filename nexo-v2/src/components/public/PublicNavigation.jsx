import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from './BrandLogo.jsx'

export const publicSections = [
  ['inicio', 'Inicio'], ['solucion', 'Plataforma'], ['resultados', 'Beneficios'],
  ['producto', 'Producto'], ['capacidades', 'Soluciones'], ['industrias', 'Industrias'],
  ['implementacion', 'Implementación y privacidad'], ['proposito', 'Propósito'], ['clientes-access', 'Acceso'],
]

export default function PublicNavigation() {
  const navigate = useNavigate()
  const [active, setActive] = useState('inicio')
  const go = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => {
    const listener = () => {
      const current = publicSections.filter(([id]) => document.getElementById(id)?.getBoundingClientRect().top <= 160).pop()?.[0]
      if (current) setActive(current)
    }
    window.addEventListener('scroll', listener, { passive: true })
    listener()
    return () => window.removeEventListener('scroll', listener)
  }, [])

  return <>
    <nav className="nk-public-topbar">
      <BrandLogo className="nk-public-logo" />
      <div className="nk-public-actions">
        <a className="nk-button nk-button-quiet" href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a>
        <button className="nk-button nk-button-primary" onClick={() => navigate('/login')}>Acceso</button>
      </div>
    </nav>
    <nav className="nk-public-tabs" aria-label="Navegación pública">
      {publicSections.map(([id, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => go(id)}>{label}</button>)}
    </nav>
  </>
}
