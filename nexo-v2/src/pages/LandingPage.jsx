import { useEffect, useMemo, useState } from 'react'
import PublicNavigation from '../components/public/PublicNavigation.jsx'
import HomeSection from '../components/public/sections/HomeSection.jsx'
import PlatformSection from '../components/public/sections/PlatformSection.jsx'
import BenefitsSection from '../components/public/sections/BenefitsSection.jsx'
import ProductSection from '../components/public/sections/ProductSection.jsx'
import SolutionsSection from '../components/public/sections/SolutionsSection.jsx'
import IndustriesSection from '../components/public/sections/IndustriesSection.jsx'
import ImplementationSection from '../components/public/sections/ImplementationSection.jsx'
import PurposeSection from '../components/public/sections/PurposeSection.jsx'
import CustomerAccessSection from '../components/public/sections/CustomerAccessSection.jsx'

const sections = { inicio: HomeSection, solucion: PlatformSection, resultados: BenefitsSection, producto: ProductSection, soluciones: SolutionsSection, industrias: IndustriesSection, implementacion: ImplementationSection, proposito: PurposeSection, 'clientes-access': CustomerAccessSection }

export default function LandingPage() {
  const [preview, setPreview] = useState(false)
  const [active, setActive] = useState('inicio')
  useEffect(() => {
    document.body.classList.add('nk-public-body')
    return () => document.body.classList.remove('nk-public-body')
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (sections[hash]) setActive(hash)
  }, [])

  const goTo = id => {
    if (!sections[id]) return
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const ActiveSection = useMemo(() => sections[active] || HomeSection, [active])
  const sectionProps = active === 'inicio' ? { openPreview: () => setPreview(true), onNavigate: goTo } : active === 'producto' ? { openPreview: () => setPreview(true) } : {}

  return <div className="nk-public-site" data-public-page={active}>
    <PublicNavigation active={active} onNavigate={goTo} />
    <main>
      <ActiveSection {...sectionProps} />
    </main>
    <footer className="nk-public-footer"><span>Nexo Klar · Gestión operativa, información y cumplimiento</span><button type="button" onClick={() => goTo('inicio')}>Volver al inicio</button><a href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a></footer>
    {preview && <div className="nk-lightbox" role="dialog" aria-modal="true" onClick={() => setPreview(false)}><button aria-label="Cerrar vista ampliada" onClick={() => setPreview(false)}>×</button><img src="/dashboard-demo.png" alt="Vista ampliada de Nexo Klar" onClick={event => event.stopPropagation()} /></div>}
  </div>
}
