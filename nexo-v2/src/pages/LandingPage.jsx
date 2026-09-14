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

const trackedSections = [
  'inicio',
  'solucion',
  'resultados',
  'producto',
  'capacidades',
  'industrias',
  'implementacion',
  'proposito',
  'clientes-access',
  'contacto',
]

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
    const hash = window.location.hash.replace('#', '')

    if (hash === 'clientes-access') {
      requestAnimationFrame(() => {
        document.getElementById('clientes-access')?.scrollIntoView({ block: 'center' })
      })
      return
    }

    if (trackedSections.includes(hash)) {
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' })
      })
    }
  }, [])

  useEffect(() => {
    const sections = trackedSections
      .map(id => document.getElementById(id))
      .filter(Boolean)

    if (!sections.length || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (visible?.target?.id) setActive(visible.target.id)
    }, {
      rootMargin: '-24% 0px -58% 0px',
      threshold: [0.08, 0.2, 0.45],
    })

    sections.forEach(section => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  const goTo = id => {
    const target = document.getElementById(id)
    if (!target) return

    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openCompanyRegistration = () => {
    window.history.replaceState(null, '', '#clientes-access')
    document.getElementById('clientes-access')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="nk-public-site" data-public-page={active}>
      <PublicNavigation
        active={active}
        onNavigate={goTo}
        onCreateCompany={openCompanyRegistration}
      />

      <main>
        <HomeSection
          openDemo={() => setDialog('demo')}
          openPreview={() => setPreview(true)}
          onNavigate={goTo}
        />
        <PlatformSection />
        <BenefitsSection />
        <ProductSection openPreview={() => setPreview(true)} />
        <SolutionsSection />
        <IndustriesSection />
        <ImplementationSection />
        <PurposeSection />
        <CustomerAccessSection />

        <section className="nk-public-section nk-centered nk-final-cta" id="contacto">
          <div>
            <p className="nk-eyebrow">Conversemos</p>
            <h2>Conecta tu operación sobre una sola base de información.</h2>
            <p className="nk-lead">
              Cuéntanos cómo administras hoy tu dotación, documentos, recursos y cumplimiento. Revisaremos contigo qué módulos necesita tu empresa para comenzar.
            </p>
            <div className="nk-actions">
              <button className="nk-button nk-button-primary" type="button" onClick={() => setDialog('demo')}>
                Solicitar demostración
              </button>
              <button className="nk-button nk-button-secondary" type="button" onClick={openCompanyRegistration}>
                Crear empresa
              </button>
            </div>
          </div>
        </section>
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
