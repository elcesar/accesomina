import InventoryCategoryPage from '../components/inventory/InventoryCategoryPage.jsx'

export default function MaterialesPage() {
  return <InventoryCategoryPage category="materiales" title="Materiales y ferretería" description="Controla materiales y artículos de ferretería por stock, mínimo y ubicación desde el catálogo central de inventario." singular="Material" defaultType="Material" focus="stock" />
}
