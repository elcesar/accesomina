import InventoryCategoryPage from '../components/inventory/InventoryCategoryPage.jsx'

export default function EquiposInstrumentosPage() {
  return <InventoryCategoryPage category="equipos" title="Equipos e instrumentos" description="Controla equipos, calibraciones, certificados y custodia desde el catálogo central de inventario." singular="Equipo" defaultType="Equipo / instrumento" focus="equipment" />
}
