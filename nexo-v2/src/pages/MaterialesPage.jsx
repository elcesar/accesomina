import InventoryCategoryPage from '../components/inventory/InventoryCategoryPage.jsx'

export default function MaterialesPage() {
  return <InventoryCategoryPage category="materiales" title="Materiales y ferretería" description="Controla materiales y artículos de ferretería por existencias, mínimos y distribución física en bodegas." singular="Material" defaultType="Material" focus="materials" />
}
