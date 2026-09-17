import { useEffect, useState } from 'react'
import { IconKey, IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/admin-clients.css'

const STATUS_LABELS = {
  pending: 'Pendiente de aprobación',
  active: 'Activa',
  suspended: 'Suspendida',
  deleted: 'Eliminada',
}

export default function AdministracionClientesPage() {
  const { session } = useAuth()
  const [tenants, setTenants] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [changingStatus, setChangingStatus] = useState('')
  const [deleting, setDeleting] = useState('')
  const [resettingAccess, setResettingAccess] = useState('')
  const isNexoAdmin = session?.user?.role === 'domian_admin'

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      setTenants(await api.get('/tenants'))
    } catch (error) {
      setMessage(error.message || 'No fue posible cargar las empresas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isNexoAdmin) load()
    else setLoading(false)
  }, [isNexoAdmin])

  const changeStatus = async (tenant, status) => {
    const action = status === 'active' ? 'activar' : 'suspender'
    if (!window.confirm(`¿Deseas ${action} la cuenta de ${tenant.company_name}?`)) return

    setChangingStatus(tenant.id)
    setMessage('')
    try {
      const updated = await api.patch(`/tenants/${tenant.id}`, { status })
      setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item))
      setMessage(`La cuenta de ${tenant.company_name} fue ${status === 'active' ? 'activada' : 'suspendida'} correctamente.`)
    } catch (error) {
      setMessage(error.message || `No fue posible ${action} la empresa.`)
    } finally {
      setChangingStatus('')
    }
  }

  const resetAdminAccess = async tenant => {
    if (!window.confirm(`Se restablecerá el acceso del administrador de ${tenant.company_name}. Las sesiones activas se cerrarán. ¿Continuar?`)) return
    setResettingAccess(tenant.id)
    setMessage('')
    try {
      const result = await api.post(`/tenants/${tenant.id}/reset-admin-password`, {})
      setMessage(result?.temporaryPassword
        ? `Acceso restablecido para ${tenant.company_name}. Contraseña temporal: ${result.temporaryPassword}`
        : `Acceso restablecido para ${tenant.company_name}.`)
    } catch (error) { setMessage(error.message || 'No fue posible restablecer el acceso del administrador.') }
    finally { setResettingAccess('') }
  }

  const deleteTenant = async tenant => {
    if (!window.confirm(`¿Deseas eliminar el cliente ${tenant.company_name}? Esta acción bloqueará sus accesos.`)) return

    setDeleting(tenant.id)
    setMessage('')
    try {
      const updated = await api.delete(`/tenants/${tenant.id}`)
      setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item))
      setMessage(`El cliente ${tenant.company_name} fue eliminado correctamente.`)
    } catch (error) {
      setMessage(error.message || 'No fue posible eliminar el cliente.')
    } finally {
      setDeleting('')
    }
  }

  if (!isNexoAdmin) {
    return (
      <section className="nk-module-page nk-admin-clients-page">
        <header className="nk-module-header">
          <div>
            <h1>Administración de clientes</h1>
            <p>Este módulo está disponible únicamente para Administración Nexo Klar.</p>
          </div>
        </header>
      </section>
    )
  }

  const visibleTenants = tenants.filter(tenant => !tenant.is_domian_admin)

  return (
    <section className="nk-module-page nk-admin-clients-page">
      <header className="nk-module-header">
        <div>
          <h1>Administración de clientes</h1>
          <p>Gestiona las empresas registradas en Nexo Klar.</p>
        </div>
        <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}>
          <IconRefresh size={16} />
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <section className="nk-module-card nk-admin-clients-card">
        <header className="nk-admin-clients-card-head">
          <div>
            <h2>Empresas usuarias</h2>
            <p>Administra el estado de las empresas registradas.</p>
          </div>
        </header>

        <div className="nk-table-wrapper nk-admin-clients-table-wrap">
          <table className="nk-table nk-admin-clients-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>RUT</th>
                <th>Administrador</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5">Cargando empresas…</td></tr>
              ) : visibleTenants.length ? visibleTenants.map(tenant => (
                <tr key={tenant.id}>
                  <td><strong>{tenant.company_name}</strong></td>
                  <td>{tenant.rut || '—'}</td>
                  <td>{tenant.admin_email || '—'}</td>
                  <td>
                    <span className={`nk-admin-clients-status ${tenant.status || ''}`}>
                      {STATUS_LABELS[tenant.status] || tenant.status || 'Sin estado'}
                    </span>
                  </td>
                  <td>
                    <div className="nk-admin-clients-actions">
                      {['pending', 'suspended'].includes(tenant.status) && (
                        <button
                          className="nk-button nk-button-primary nk-button-sm"
                          disabled={changingStatus === tenant.id}
                          onClick={() => changeStatus(tenant, 'active')}
                        >
                          {changingStatus === tenant.id ? 'Activando…' : 'Activar cuenta'}
                        </button>
                      )}

                      {tenant.status === 'active' && <button className="nk-button nk-button-secondary nk-button-sm" disabled={changingStatus === tenant.id} onClick={() => changeStatus(tenant, 'suspended')}>{changingStatus === tenant.id ? 'Suspendiendo…' : 'Suspender cuenta'}</button>}

                      {tenant.status !== 'deleted' && <button className="nk-button nk-button-secondary nk-button-sm" disabled={resettingAccess === tenant.id} onClick={() => resetAdminAccess(tenant)}><IconKey size={14}/>{resettingAccess === tenant.id ? 'Restableciendo…' : 'Restablecer acceso'}</button>}

                      {tenant.status !== 'deleted' && (
                        <button
                          className="nk-button nk-button-danger nk-button-sm"
                          disabled={deleting === tenant.id}
                          onClick={() => deleteTenant(tenant)}
                        >
                          {deleting === tenant.id ? 'Eliminando…' : 'Eliminar cliente'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="nk-admin-clients-empty">No hay empresas usuarias registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
