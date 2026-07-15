import Header from '../components/layout/Header.jsx'
import { IconUsers, IconFileText, IconAlertTriangle, IconShieldCheck } from '@tabler/icons-react'
import { useAuth } from '../services/auth.jsx'

function KpiCard({ icon: Icon, label, value, color = 'text-white' }) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { session } = useAuth()

  return (
    <div className="p-6">
      <Header
        title={`Bienvenido, ${session?.user?.name?.split(' ')[0] || 'usuario'}`}
        subtitle={session?.tenant?.name}
      />

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={IconUsers} label="Trabajadores activos" value="—" />
        <KpiCard icon={IconFileText} label="Contratos vigentes" value="—" />
        <KpiCard icon={IconAlertTriangle} label="Alertas pendientes" value="—" color="text-yellow-400" />
        <KpiCard icon={IconShieldCheck} label="Acreditados al día" value="—" color="text-green-400" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-sm font-medium text-gray-300 mb-3">Alertas de vencimiento</p>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <IconAlertTriangle size={28} className="text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No hay alertas pendientes</p>
          </div>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-300 mb-3">Actividad reciente</p>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-500">Sin actividad reciente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
