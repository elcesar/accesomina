import Header from '../components/layout/Header.jsx'
import { IconFileText } from '@tabler/icons-react'

export default function ContratosPage() {
  return (
    <div className="p-6">
      <Header title="Contratos" subtitle="Contratos y firmas" />
      <div className="mt-6 card flex flex-col items-center justify-center py-16 text-center">
        <IconFileText size={36} className="text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-400 mb-1">Módulo en construcción</p>
        <p className="text-xs text-gray-600">Contratos estará disponible en el próximo sprint</p>
      </div>
    </div>
  )
}
