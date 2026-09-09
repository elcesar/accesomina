import { useNavigate } from 'react-router-dom'
import {
  IconBell,
  IconBuilding,
  IconFileText,
  IconLogout,
  IconTool,
  IconUserPlus,
} from '@tabler/icons-react'
import { useAuth } from '../../services/auth.jsx'
import '../../styles/header.css'

const CONTRACT_EDIT_ROLES = new Set(['domian_admin', 'client_admin'])

const roleLabel = value => String(value || 'usuario')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())

export default function Header() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const role = session?.user?.role
  const canCreateGeneral = role !== 'consulta'
  const canCreateCommercial = CONTRACT_EDIT_ROLES.has(role)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="nk-global-header">
      <div className="nk-global-context" aria-label="Contexto de sesión">
        <div className="nk-global-context-item">
          <span className="nk-global-context-label">Empresa</span>
          <strong>{session?.tenant?.name || 'Nexo Klar'}</strong>
        </div>
        <div className="nk-global-context-separator" aria-hidden="true" />
        <div className="nk-global-context-item">
          <span className="nk-global-context-label">Usuario</span>
          <strong>{session?.user?.name || session?.user?.email || 'Usuario'}</strong>
          <small>{roleLabel(role)}</small>
        </div>
      </div>

      <div className="nk-global-actions" aria-label="Acciones globales">
        {canCreateGeneral && (
          <button
            className="nk-button nk-button-primary nk-global-create"
            type="button"
            onClick={() => navigate('/app/trabajadores/nuevo')}
          >
            <IconUserPlus size={15} strokeWidth={1.8} />
            + Persona
          </button>
        )}

        {canCreateGeneral && (
          <button
            className="nk-button nk-button-secondary nk-global-create"
            type="button"
            onClick={() => navigate('/app/clientes/nuevo')}
          >
            <IconBuilding size={15} strokeWidth={1.8} />
            + Cliente
          </button>
        )}

        {canCreateCommercial && (
          <button
            className="nk-button nk-button-secondary nk-global-create"
            type="button"
            onClick={() => navigate('/app/contratos/nuevo')}
          >
            <IconFileText size={15} strokeWidth={1.8} />
            + Contrato
          </button>
        )}

        {canCreateCommercial && (
          <button
            className="nk-button nk-button-secondary nk-global-create"
            type="button"
            onClick={() => navigate('/app/servicios/nuevo')}
          >
            <IconTool size={15} strokeWidth={1.8} />
            + Orden de servicio
          </button>
        )}

        <button
          className="nk-icon-button"
          type="button"
          onClick={() => navigate('/app/alertas')}
          aria-label="Ir a alertas"
          title="Alertas"
        >
          <IconBell size={18} strokeWidth={1.7} />
        </button>

        <button
          className="nk-button nk-button-quiet nk-global-logout"
          type="button"
          onClick={handleLogout}
        >
          <IconLogout size={15} strokeWidth={1.8} />
          Salir
        </button>
      </div>
    </header>
  )
}
