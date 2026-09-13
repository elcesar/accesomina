import { Fragment, useEffect, useState } from 'react'
import { IconKey, IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/admin-clients.css'

export default function AdministracionClientesPage() {
  const { session } = useAuth()
  const [tenants, setTenants] = useState([])
  const [usersByTenant, setUsersByTenant] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState('')
  const [loadingUsers, setLoadingUsers] = useState('')
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

  const reset = async tenant => {
    if (!window.confirm(`Se enviará un enlace al administrador de ${tenant.company_name}. ¿Continuar?`)) return
    setSending(tenant.id)
    setMessage('')
    try {
      const result = await api.post(`/tenants/${tenant.id}/reset-admin-password`, {})
      setMessage(
        result.delivery === 'pending_configuration'
          ? 'La solicitud quedó registrada. Falta configurar el correo saliente para entregar el enlace.'
          : `Enlace de restablecimiento enviado a ${result.user.email}.`,
      )
    } catch (error) {
      setMessage(error.message || 'No fue posible solicitar el restablecimiento.')
    } finally {
      setSending('')
    }
  }

  const loadUsers = async tenant => {
    if (usersByTenant[tenant.id]) {
      setUsersByTenant(current => {
        const next = { ...current }
        delete next[tenant.id]
        return next
      })
      return
    }

    setLoadingUsers(tenant.id)
    setMessage('')
    try {
      const users = await api.get(`/tenants/${tenant.id}/users`)
      setUsersByTenant(current => ({
        ...current,
        [tenant.id]: users,
      }))
    } catch (error) {
      setMessage(error.message || 'No fue posible cargar las cuentas de la empresa.')
    } finally {
      setLoadingUsers('')
    }
  }

  const resetUser = async (tenant, user) => {
    if (!window.confirm(`Se enviará un enlace temporal a ${user.email}. ¿Continuar?`)) return
    const key = `${tenant.id}:${user.id}`
    setSending(key)
    setMessage('')
    try {
      const result = await api.post(`/tenants/${tenant.id}/users/${user.id}/reset-password`, {})
      setMessage(
        result.delivery === 'pending_configuration'
          ? 'La solicitud quedó registrada. Falta configurar el correo saliente para entregar el enlace.'
          : `Enlace de restablecimiento enviado a ${result.user.email}.`,
      )
    } catch (error) {
      setMessage(error.message || 'No fue posible solicitar el restablecimiento.')
    } finally {
      setSending('')
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
          <p>Gestiona empresas usuarias y ayuda a sus administradores sin acceder a sus contraseñas.</p>
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
            <p>Administra las cuentas de empresa y los accesos de sus usuarios autorizados.</p>
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
                <Fragment key={tenant.id}>
                  <tr>
                    <td><strong>{tenant.company_name}</strong></td>
                    <td>{tenant.rut || '—'}</td>
                    <td>{tenant.admin_email || '—'}</td>
                    <td><span className={`nk-admin-clients-status ${tenant.status || ''}`}>{tenant.status || 'Sin estado'}</span></td>
                    <td>
                      <div className="nk-admin-clients-actions">
                        <button
                          className="nk-button nk-button-secondary nk-button-sm"
                          disabled={sending === tenant.id || tenant.status === 'deleted'}
                          onClick={() => reset(tenant)}
                        >
                          <IconKey size={14} />
                          {sending === tenant.id ? 'Enviando…' : 'Restablecer administrador'}
                        </button>
                        <button
                          className="nk-button nk-button-secondary nk-button-sm"
                          disabled={loadingUsers === tenant.id || tenant.status === 'deleted'}
                          onClick={() => loadUsers(tenant)}
                        >
                          {loadingUsers === tenant.id
                            ? 'Cargando…'
                            : usersByTenant[tenant.id]
                              ? 'Ocultar cuentas'
                              : 'Ver cuentas'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {usersByTenant[tenant.id] && (
                    <tr>
                      <td colSpan="5" className="nk-admin-clients-users-cell">
                        <div className="nk-admin-clients-users-panel">
                          <div className="nk-table-wrapper">
                            <table className="nk-table nk-admin-clients-users-table">
                              <thead>
                                <tr>
                                  <th>Cuenta</th>
                                  <th>Rol</th>
                                  <th>Último acceso</th>
                                  <th>Estado</th>
                                  <th>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usersByTenant[tenant.id].length ? usersByTenant[tenant.id].map(user => {
                                  const key = `${tenant.id}:${user.id}`
                                  return (
                                    <tr key={user.id}>
                                      <td><strong>{user.full_name}</strong><small>{user.email}</small></td>
                                      <td>{user.role}</td>
                                      <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('es-CL') : 'Sin acceso'}</td>
                                      <td><span className={`nk-admin-clients-status ${user.active ? 'active' : ''}`}>{user.active ? 'Activa' : 'Inactiva'}</span></td>
                                      <td>
                                        <button
                                          className="nk-button nk-button-secondary nk-button-sm"
                                          disabled={!user.active || sending === key}
                                          onClick={() => resetUser(tenant, user)}
                                        >
                                          <IconKey size={14} />
                                          {sending === key ? 'Enviando…' : 'Restablecer acceso'}
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                }) : <tr><td colSpan="5">No hay cuentas registradas.</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
