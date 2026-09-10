import { useEffect, useMemo, useState } from 'react'
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
import { DemoRequestDialog, InformationDialog } from '../components/public/PublicDialogs.jsx'

const sectionComponents = {
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

export default function LandingPage() {
  const [page, setPage] = useState('inicio')
  const [preview, setPreview] = useState(false)
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    document.body.classList.add('nk-public-body')
    return () => document.body.classList.remove('nk-public-body')
  }, [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (sectionComponents[hash]) setPage(hash)
  }, [])

  const goTo = id => {
    if (!sectionComponents[id]) return
    setPage(id)
    window.history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ActiveSection = useMemo(() => sectionComponents[page] || HomeSection, [page])
  const sectionProps = page === 'inicio'
    ? { openPreview: () => setPreview(true), openDemo: () => setDialog('demo'), onNavigate: goTo }
    : page === 'producto'
      ? { openPreview: () => setPreview(true) }
      : {}

  return <div className="nk-public-site" data-public-page={page}>
    <PublicNavigation active={page} onNavigate={goTo} />
    <main>
      <ActiveSection {...sectionProps} />
    </main>
    <footer className="nk-public-footer"><span>Nexo Klar · Gestión operativa, información y cumplimiento</span><div><button onClick={() => setDialog('faq')}>Preguntas frecuentes</button><button onClick={() => setDialog('legal')}>Términos y privacidad</button><a href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a></div></footer>
    {preview && <div className="nk-lightbox" role="dialog" aria-modal="true" onClick={() => setPreview(false)}><button aria-label="Cerrar vista ampliada" onClick={() => setPreview(false)}>×</button><img src="/assets/dashboard-demo.png" alt="Vista ampliada de Nexo Klar" onClick={event => event.stopPropagation()} /></div>}
    {dialog === 'demo' && <DemoRequestDialog onClose={() => setDialog(null)} />}
    {dialog && dialog !== 'demo' && <InformationDialog kind={dialog} onClose={() => setDialog(null)} />}
  </div>
}
