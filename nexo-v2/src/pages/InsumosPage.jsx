import InventoryCategoryPage from '../components/inventory/InventoryCategoryPage.jsx'

export default function InsumosPage() {
  return <InventoryCategoryPage category="insumos" title="Insumos y consumibles" description="Controla consumibles, stock disponible, mínimos y reposición desde el catálogo central de inventario." singular="Insumo" defaultType="Insumo" focus="stock" />
}
