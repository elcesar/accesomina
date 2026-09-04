import { useEffect, useState } from 'react'
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

export default function LandingPage() {
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    document.body.classList.add('nk-public-body')
    return () => document.body.classList.remove('nk-public-body')
  }, [])

  return <div className="nk-public-site">
    <PublicNavigation />
    <main>
      <HomeSection openPreview={() => setPreview(true)} />
      <PlatformSection />
      <BenefitsSection />
      <ProductSection openPreview={() => setPreview(true)} />
      <SolutionsSection />
      <IndustriesSection />
      <ImplementationSection />
      <PurposeSection />
      <CustomerAccessSection />
    </main>
    <footer className="nk-public-footer"><span>Nexo Klar · Gestión operativa, información y cumplimiento</span><a href="mailto:contacto@nexoklar.cl">contacto@nexoklar.cl</a></footer>
    {preview && <div className="nk-lightbox" role="dialog" aria-modal="true" onClick={() => setPreview(false)}><button aria-label="Cerrar vista ampliada" onClick={() => setPreview(false)}>×</button><img src="/dashboard-demo.png" alt="Vista ampliada de Nexo Klar" onClick={event => event.stopPropagation()} /></div>}
  </div>
}
