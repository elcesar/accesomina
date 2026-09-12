import { useEffect, useMemo, useState } from 'react'
import { IconKey, IconLock, IconPlus, IconRefresh, IconShieldCheck, IconUserCheck, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/users-admin.css'

const ROLE_LABEL = {
  client_admin: 'Administrador',
  rrhh: 'Personas y operación',
  prevencion: 'Prevención',
  acreditacion: 'Cumplimiento',
  consulta: 'Solo lectura',
  domian_admin: 'Administrador Nexo Klar',
}

const EDITABLE_ROLES = ['client_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta']

export default function UsuariosPermisosPage() {
  const { session } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState({ fullName: '', email: '', role: 'consulta' })
  const admin = ['client_admin', 'domian_admin'].includes(session?.user?.role)

  const load = async () => {
    setLoading(true)
    setMessage('')
    try { setUsers(await api.get('/users')) }
    catch (error) { setMessage(error.message || 'No fue posible cargar los usuarios.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activeCount = useMemo(() => users.filter(user => user.active).length, [users])
  const adminCount = useMemo(() => users.filter(user => user.active && ['client_admin', 'domian_admin'].includes(user.role)).length, [users])

  const createUser = async event => {
    event.preventDefault()
    if (!draft.fullName.trim() || !draft.email.trim()) return
    setBusy('create')
    setMessage('')
    try {
      const result = await api.post('/users', draft)
      setShowCreate(false)
      setDraft({ fullName: '', email: '', role: 'consulta' })
      await load()
      setMessage(result?.temporaryPassword
        ? `Acceso creado para ${result.user.email}. Contraseña temporal: ${result.temporaryPassword}`
        : `Acceso creado para ${result?.user?.email || draft.email}.`)
    } catch (error) { setMessage(error.message || 'No fue posible crear el acceso.') }
    finally { setBusy('') }
  }

  const patchUser = async (user, changes) => {
    setBusy(user.id)
    setMessage('')
    try {
      const updated = await api.patch(`/users/${user.id}`, changes)
      setUsers(current => current.map(item => item.id === user.id ? { ...item, ...updated } : item))
    } catch (error) { setMessage(error.message || 'No fue posible actualizar el usuario.') }
    finally { setBusy('') }
  }

  const reset = async user => {
    if (!window.confirm(`Se restablecerá el acceso de ${user.email}. ¿Continuar?`)) return
    setBusy(user.id)
    setMessage('')
    try {
      const result = await api.post(`/users/${user.id}/reset-password`, {})
      setMessage(result?.temporaryPassword
        ? `Acceso restablecido para ${user.email}. Contraseña temporal: ${result.temporaryPassword}`
        : `Acceso restablecido para ${user.email}.`)
    } catch (error) { setMessage(error.message || 'No fue posible restablecer el acceso.') }
    finally { setBusy('') }
  }

  return (
    <section className="nk-module-page nk-users-page">
      <header className="nk-module-header">
        <div>
          <h1>Usuarios y permisos</h1>
          <p>{session?.tenant?.name || 'Empresa'} · datos independientes de otros clientes</p>
        </div>
        {admin && <button className="nk-button nk-button-primary" onClick={() => setShowCreate(true)}><IconPlus size={16}/> Dar acceso</button>}
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <div className="nk-users-summary">
        <article className="nk-dashboard-metric"><IconUserCheck size={22}/><div><b>{loading ? '—' : activeCount}</b><span>Usuarios activos</span></div></article>
        <article className="nk-dashboard-metric teal"><IconShieldCheck size={22}/><div><b>{loading ? '—' : adminCount}</b><span>Administradores</span></div></article>
        <article className="nk-dashboard-metric amber"><IconLock size={22}/><div><b>Privado</b><span>Espacio independiente</span></div></article>
      </div>

      <section className="nk-module-card nk-users-card">
        <header className="nk-users-card-head">
          <div><h2>Equipo con acceso al sitio privado</h2><p>Todos ven la misma empresa; ningún usuario puede consultar datos de otra empresa.</p></div>
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={16}/> Actualizar</button>
        </header>

        <div className="nk-table-wrapper nk-users-table-wrap">
          <table className="nk-table nk-users-table">
            <thead><tr><th>Persona</th><th>Correo de acceso</th><th>Permiso</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5">Cargando usuarios…</td></tr> : users.length ? users.map(user => {
                const self = user.id === session?.user?.id
                const protectedUser = user.role === 'domian_admin'
                return (
                  <tr key={user.id}>
                    <td><strong>{user.full_name}</strong>{self && <small>Sesión actual</small>}</td>
                    <td>{user.email}</td>
                    <td>
                      {admin && !protectedUser && !self ? (
                        <select className="nk-input nk-user-role" value={user.role} disabled={busy === user.id} onChange={event => patchUser(user, { role: event.target.value })}>
                          {EDITABLE_ROLES.map(role => <option value={role} key={role}>{ROLE_LABEL[role]}</option>)}
                        </select>
                      ) : <span className="nk-user-role-badge">{ROLE_LABEL[user.role] || user.role}</span>}
                    </td>
                    <td><span className={`nk-user-status ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Activo' : 'Suspendido'}</span></td>
                    <td>
                      <div className="nk-user-actions">
                        {admin && !self && !protectedUser ? <>
                          <button className="nk-button nk-button-secondary nk-button-sm" disabled={busy === user.id} onClick={() => reset(user)}><IconKey size={14}/> Restablecer acceso</button>
                          <button className="nk-button nk-button-secondary nk-button-sm" disabled={busy === user.id} onClick={() => patchUser(user, { active: !user.active })}>{user.active ? 'Suspender' : 'Activar'}</button>
                        </> : <span>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              }) : <tr><td colSpan="5">No hay usuarios registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="nk-user-dialog-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <section className="nk-user-dialog" role="dialog" aria-modal="true" aria-labelledby="nk-user-create-title" onMouseDown={event => event.stopPropagation()}>
            <header><div><h2 id="nk-user-create-title">Dar acceso</h2><p>Crea un usuario para esta empresa y define su permiso inicial.</p></div><button className="nk-user-dialog-close" onClick={() => setShowCreate(false)} aria-label="Cerrar"><IconX size={18}/></button></header>
            <form onSubmit={createUser}>
              <label><span>Nombre</span><input className="nk-input" value={draft.fullName} onChange={e => setDraft({ ...draft, fullName: e.target.value })} required /></label>
              <label><span>Correo de acceso</span><input className="nk-input" type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} required /></label>
              <label><span>Permiso</span><select className="nk-input" value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>{EDITABLE_ROLES.map(role => <option value={role} key={role}>{ROLE_LABEL[role]}</option>)}</select></label>
              <div className="nk-user-dialog-actions"><button type="button" className="nk-button nk-button-secondary" onClick={() => setShowCreate(false)}>Cancelar</button><button className="nk-button nk-button-primary" disabled={busy === 'create'}>{busy === 'create' ? 'Creando…' : 'Crear acceso'}</button></div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
