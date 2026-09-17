import { useEffect, useState } from 'react'
import '../styles/landing.css'
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
import { DemoRequestDialog } from '../components/public/PublicDialogs.jsx'

const publicSections = {
  inicio: HomeSection,
  solucion: PlatformSection,
  resultados: BenefitsSection,
  producto: ProductSection,
  capacidades: SolutionsSection,
  industrias: IndustriesSection,
  implementacion: ImplementationSection,
  proposito: PurposeSection,
  'clientes-access': CustomerAccessSection,
}

function ProductPreview({ onClose }) {
  return (
    <div className="nk-lightbox" role="dialog" aria-modal="true" aria-label="Vista ampliada de Nexo Klar" onClick={onClose}>
      <button type="button" aria-label="Cerrar vista ampliada" onClick={onClose}>×</button>
      <img
        src="/assets/dashboard-demo.png"
        alt="Vista ampliada de Nexo Klar"
        onClick={event => event.stopPropagation()}
      />
    </div>
  )
}

export default function LandingPage() {
  const [active, setActive] = useState('inicio')
  const [preview, setPreview] = useState(false)
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    document.body.classList.add('nk-public-body')
    return () => document.body.classList.remove('nk-public-body')
  }, [])

  useEffect(() => {
    const syncSectionFromHash = () => {
      const hash = window.location.hash.replace('#', '')
      setActive(publicSections[hash] ? hash : 'inicio')
    }

    syncSectionFromHash()
    window.addEventListener('hashchange', syncSectionFromHash)
    return () => window.removeEventListener('hashchange', syncSectionFromHash)
  }, [])

  const goTo = id => {
    if (!publicSections[id]) return

    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openCompanyRegistration = () => {
    goTo('clientes-access')
  }

  const ActiveSection = publicSections[active] || HomeSection
  const sectionProps = active === 'inicio'
    ? {
      openDemo: () => setDialog('demo'),
      openPreview: () => setPreview(true),
      onNavigate: goTo,
    }
    : active === 'producto'
      ? { openPreview: () => setPreview(true) }
      : {}

  return (
    <div className="nk-public-site" data-public-page={active}>
      <PublicNavigation
        active={active}
        onNavigate={goTo}
        onCreateCompany={openCompanyRegistration}
      />

      <main>
        <ActiveSection {...sectionProps} />
      </main>

      <footer className="nk-public-footer">
        <span>Nexo Klar · Información que conecta</span>
        <div>
          <button type="button" onClick={() => goTo('inicio')}>Volver al inicio</button>
          <a href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a>
        </div>
      </footer>

      {preview && <ProductPreview onClose={() => setPreview(false)} />}
      {dialog === 'demo' && <DemoRequestDialog onClose={() => setDialog(null)} />}
    </div>
  )
}
