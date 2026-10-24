import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PUBLIC_PAGES, publicPageKey } from '../config/public-pages.js'
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
import ContactSection from '../components/public/sections/ContactSection.jsx'
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
  'registro-empresa': CustomerAccessSection,
  contacto: ContactSection,
};

function ProductPreview({ onClose }) {
  return (
    <div className="nk-lightbox" role="dialog" aria-modal="true" aria-label="Ilustración ampliada de Nexo Klar" onClick={onClose}>
      <button type="button" aria-label="Cerrar vista ampliada" onClick={onClose}>×</button>
      <img
        src="/product-overview.svg"
        alt="Ilustración ampliada de Nexo Klar"
        onClick={event => event.stopPropagation()}
      />
    </div>
  )
}

export default function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const active = publicPageKey(location.pathname) || 'inicio'
  const [preview, setPreview] = useState(false)
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    document.body.classList.add('nk-public-body')
    return () => document.body.classList.remove('nk-public-body')
  }, [])

  useEffect(() => {
    const metadata = PUBLIC_PAGES[active] || PUBLIC_PAGES.inicio
    document.title = `Nexo Klar · ${metadata.title}`
    document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metadata.description)
    const canonical = `https://nexoklar.com${metadata.path}`
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical)
  }, [active])

  useEffect(() => {
    if (!preview && !dialog) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [dialog, preview])

  // Preserve shared links from the previous hash navigation.
  useEffect(() => {
    const key = location.hash.slice(1)
    if (PUBLIC_PAGES[key]) navigate(PUBLIC_PAGES[key].path, { replace: true })
  }, [location.hash, navigate])

  const goTo = id => {
    if (!PUBLIC_PAGES[id]) return
    navigate(PUBLIC_PAGES[id].path)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openCompanyRegistration = () => {
    goTo('registro-empresa')
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
      : active === 'contacto'
        ? {
          openDemo: () => setDialog('demo'),
          openCompanyRegistration,
        }
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
          <Link to="/">Volver al inicio</Link>
          <a href="mailto:contacto@nexoklar.com">contacto@nexoklar.com</a>
        </div>
      </footer>

      {preview && <ProductPreview onClose={() => setPreview(false)} />}
      {dialog === 'demo' && <DemoRequestDialog onClose={() => setDialog(null)} />}
    </div>
  )
}
