import { Fragment, useEffect, useState } from 'react'
import { IconKey, IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

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
      setUsersByTenant(current => ({
        ...current,
        [tenant.id]: await api.get(`/tenants/${tenant.id}/users`),
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
      <section className="nk-module-page">
        <h1>Administración de clientes</h1>
        <p>Este módulo está disponible únicamente para Administración Nexo Klar.</p>
      </section>
    )
  }

  return (
    <section className="nk-module-page">
      <header className="nk-module-header">
        <div>
          <p className="nk-module-kicker">Administración Nexo Klar</p>
          <h1>Administración de clientes</h1>
          <p>Gestiona empresas usuarias y ayuda a sus administradores sin acceder a sus contraseñas.</p>
        </div>
        <button className="nk-button nk-button-secondary" onClick={load}>
          <IconRefresh size={16} />
          Actualizar
        </button>
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <section className="nk-report-workspace">
        <header>
          <div>
            <h2>Empresas usuarias</h2>
            <p>Los enlaces son temporales, de un solo uso y se entregan solo al correo autorizado de cada cuenta.</p>
          </div>
        </header>

        {loading ? (
          <p>Cargando empresas...</p>
        ) : (
          <div className="nk-table-wrap">
            <table>
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
                {tenants.filter(tenant => !tenant.is_domian_admin).map(tenant => (
                  <Fragment key={tenant.id}>
                    <tr>
                      <td><b>{tenant.company_name}</b></td>
                      <td>{tenant.rut}</td>
                      <td>{tenant.admin_email}</td>
                      <td>{tenant.status}</td>
                      <td>
                        <button
                          className="nk-button nk-button-secondary"
                          disabled={sending === tenant.id || tenant.status === 'deleted'}
                          onClick={() => reset(tenant)}
                        >
                          <IconKey size={15} />
                          {sending === tenant.id ? 'Enviando...' : 'Restablecer administrador'}
                        </button>
                        <button
                          className="nk-button nk-button-secondary"
                          disabled={loadingUsers === tenant.id || tenant.status === 'deleted'}
                          onClick={() => loadUsers(tenant)}
                        >
                          {loadingUsers === tenant.id
                            ? 'Cargando...'
                            : usersByTenant[tenant.id]
                              ? 'Ocultar cuentas'
                              : 'Ver cuentas'}
                        </button>
                      </td>
                    </tr>

                    {usersByTenant[tenant.id] && (
                      <tr>
                        <td colSpan="5">
                          <div className="nk-table-wrap">
                            <table>
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
                                {usersByTenant[tenant.id].map(user => {
                                  const key = `${tenant.id}:${user.id}`
                                  return (
                                    <tr key={user.id}>
                                      <td>
                                        {user.full_name}<br />
                                        <small>{user.email}</small>
                                      </td>
                                      <td>{user.role}</td>
                                      <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('es-CL') : 'Sin acceso'}</td>
                                      <td>{user.active ? 'Activa' : 'Inactiva'}</td>
                                      <td>
                                        <button
                                          className="nk-button nk-button-secondary"
                                          disabled={!user.active || sending === key}
                                          onClick={() => resetUser(tenant, user)}
                                        >
                                          <IconKey size={15} />
                                          {sending === key ? 'Enviando...' : 'Restablecer acceso'}
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
