import Header from '../components/layout/Header.jsx'
import { IconUserPlus, IconUsers } from '@tabler/icons-react'

export default function TrabajadoresPage() {
  return (
    <div className="p-6">
      <Header title="Trabajadores" subtitle="Gestión de dotación" />

      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            className="input w-64"
            placeholder="Buscar por nombre o RUT..."
          />
          <select className="input w-auto">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <IconUserPlus size={16} />
          Nuevo trabajador
        </button>
      </div>

      <div className="mt-4 card flex flex-col items-center justify-center py-16 text-center">
        <IconUsers size={36} className="text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-400 mb-1">Módulo en construcción</p>
        <p className="text-xs text-gray-600">Trabajadores estará disponible en el próximo sprint</p>
      </div>
    </div>
  )
}
