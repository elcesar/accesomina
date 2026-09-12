import { useLocation, useNavigate } from 'react-router-dom'
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

const activeModuleForPath = pathname => {
  if (pathname.startsWith('/app/trabajadores')) return 'personas'
  if (pathname.startsWith('/app/clientes')) return 'clientes'
  if (pathname.startsWith('/app/contratos')) return 'contratos'
  if (pathname.startsWith('/app/servicios')) return 'servicios'
  return null
}

export default function Header({ branding = {} }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, logout } = useAuth()
  const role = session?.user?.role
  const canCreateGeneral = role !== 'consulta'
  const canCreateCommercial = CONTRACT_EDIT_ROLES.has(role)
  const legalTenantName = session?.tenant?.name || 'Nexo Klar'
  const tenantName = String(branding?.displayName || '').trim() || legalTenantName
  const tenantLogo = String(branding?.logoUrl || '').trim()
  const userName = session?.user?.name || session?.user?.email || 'Usuario'
  const activeModule = activeModuleForPath(location.pathname)
  const createClass = module => `nk-button ${activeModule === module ? 'nk-button-primary' : 'nk-button-secondary'} nk-global-create`

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="nk-global-header">
      <div className="nk-global-context" aria-label="Contexto de sesión">
        <div className="nk-global-tenant-brand">
          {tenantLogo && (
            <img
              className="nk-global-tenant-logo"
              src={tenantLogo}
              alt=""
              aria-hidden="true"
              onError={event => { event.currentTarget.style.display = 'none' }}
            />
          )}
          <strong className="nk-global-tenant" title={legalTenantName}>{tenantName}</strong>
        </div>
        <span className="nk-global-user" title={`${userName} · ${roleLabel(role)}`}>
          {userName} <small>· {roleLabel(role)}</small>
        </span>
      </div>

      <div className="nk-global-actions" aria-label="Acciones globales">
        {canCreateGeneral && (
          <button
            className={createClass('personas')}
            type="button"
            onClick={() => navigate('/app/trabajadores/nuevo')}
          >
            <IconUserPlus size={15} strokeWidth={1.8} />
            + Persona
          </button>
        )}

        {canCreateGeneral && (
          <button
            className={createClass('clientes')}
            type="button"
            onClick={() => navigate('/app/clientes/nuevo')}
          >
            <IconBuilding size={15} strokeWidth={1.8} />
            + Cliente
          </button>
        )}

        {canCreateCommercial && (
          <button
            className={createClass('contratos')}
            type="button"
            onClick={() => navigate('/app/contratos/nuevo')}
          >
            <IconFileText size={15} strokeWidth={1.8} />
            + Contrato
          </button>
        )}

        {canCreateCommercial && (
          <button
            className={createClass('servicios')}
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
