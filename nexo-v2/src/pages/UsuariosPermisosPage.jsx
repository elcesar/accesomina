import { ActionButton } from '../components/ui/ActionButton.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { IconKey, IconLock, IconPlus, IconRefresh, IconShieldCheck, IconUserCheck, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import { EmailInput } from '../components/ui/EmailInput.jsx'
import { validateEmail } from '../services/email-validation.js'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { useConfirmation } from '../services/useConfirmation.js'
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

const INVITATION_FAILURES = {
  SMTP_NOT_CONFIGURED: 'El correo de invitación no está configurado. Contacta al administrador de Nexo Klar y vuelve a intentar el envío.',
  SMTP_AUTH_FAILED: 'No pudimos enviar la invitación. Solicita revisar la configuración del correo y vuelve a intentarlo.',
  SMTP_CONNECTION_FAILED: 'El servicio de correo no respondió. Intenta reenviar la invitación en unos minutos.',
}
const invitationFailure = invitation => INVITATION_FAILURES[invitation?.failureCode] || 'No pudimos enviar la invitación. Revisa el correo del usuario y vuelve a intentarlo.'
const invitationDate = value => {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(date) : ''
}
function invitationStatus(invitation) {
  if (!invitation) return { label: 'Acceso existente', tone: 'none' }
  if (invitation.status === 'accepted') return { label: 'Aceptada', tone: 'ok' }
  if (invitation.status === 'failed') return { label: 'Envío fallido', tone: 'error' }
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= Date.now()) return { label: 'Vencida', tone: 'warn' }
  if (invitation.status === 'sent') return { label: 'Enviada', tone: 'ok' }
  return { label: 'Pendiente de envío', tone: 'warn' }
}

function invitationResultMessage(result, created = false) {
  const email = result?.user?.email || 'la cuenta'
  const prefix = created ? `Acceso creado para ${email}.` : `Invitación de ${email}.`
  if (result?.invitation?.status === 'sent') return `${prefix} Invitación enviada por correo. El enlace es válido por 24 horas.`
  if (result?.invitation?.status === 'failed') return `${prefix} ${invitationFailure(result.invitation)} Usa Reenviar invitación; no necesitas crear otra cuenta.`
  return `${prefix} La invitación está pendiente de envío. Puedes reenviarla desde la lista de usuarios.`
}

export default function UsuariosPermisosPage() {
  const { session } = useAuth()
  const confirmation = useConfirmation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('status')
  const [busy, setBusy] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState({ fullName: '', email: '', role: 'consulta' })
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [createError, setCreateError] = useState('')
  const [createNeedsRefresh, setCreateNeedsRefresh] = useState(false)
  const creating = useRef(false)
  const createDialogRef = useRef(null)
  const nameInputRef = useRef(null)
  const admin = ['client_admin', 'domian_admin'].includes(session?.user?.role)

  const load = async () => {
    setLoading(true)
    setMessage('')
    setMessageTone('status')
    try { setUsers(await api.get('/users')) }
    catch (error) { setMessageTone('alert'); setMessage(error.message || 'No fue posible cargar los usuarios.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!showCreate) return undefined
    const opener = document.activeElement
    const dialog = createDialogRef.current
    dialog?.querySelector('input')?.focus()
    const keydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!creating.current) setShowCreate(false)
      }
      if (event.key !== 'Tab' || !dialog) return
      const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')]
      if (!controls.length) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); if (opener?.isConnected) opener.focus() }
  }, [showCreate])

  const activeCount = useMemo(() => users.filter(user => user.active).length, [users])
  const adminCount = useMemo(() => users.filter(user => user.active && ['client_admin', 'domian_admin'].includes(user.role)).length, [users])

  const createUser = async event => {
    event.preventDefault()
    if (creating.current || createNeedsRefresh || !admin) return
    const fullName = draft.fullName.trim()
    const nextNameError = fullName.length < 3 || fullName.length > 160 ? 'Ingresa un nombre de entre 3 y 160 caracteres, sin contar los espacios al inicio o al final.' : ''
    const nextEmailError = validateEmail(draft.email, { required: true })
    setNameError(nextNameError)
    setEmailError(nextEmailError || '')
    setCreateError('')
    if (nextNameError || nextEmailError) {
      if (nextNameError) nameInputRef.current?.focus()
      else document.getElementById('create-user-email')?.focus()
      return
    }
    creating.current = true
    setBusy('create')
    setMessage('')
    setCreateError('')
    try {
      const result = await api.post('/users', { ...draft, fullName }, { feedback: false })
      setUsers(current => [...current.filter(user => user.id !== result.user.id), { ...result.user, invitation: result.invitation }])
      setShowCreate(false)
      setDraft({ fullName: '', email: '', role: 'consulta' })
      setNameError('')
      setEmailError('')
      setMessageTone(result?.invitation?.status === 'failed' ? 'alert' : 'status')
      setMessage(invitationResultMessage(result, true))
    } catch (error) {
      const unknownResult = !error.status || error.code === 'USER_ALREADY_EXISTS'
      setCreateNeedsRefresh(unknownResult)
      setCreateError(error.code === 'USER_ALREADY_EXISTS' ? error.message : unknownResult
        ? 'No confirmamos un acceso nuevo. Actualiza la lista antes de volver a crear la cuenta; si ya aparece, reenvía su invitación.'
        : error.message || 'No fue posible crear el acceso.')
    }
    finally { creating.current = false; setBusy('') }
  }

  const resendInvitation = async user => {
    if (busy || !admin) return
    setBusy(user.id)
    setMessage('')
    try {
      const result = await api.post(`/users/${user.id}/resend-invitation`, {}, { feedback: false })
      setUsers(current => current.map(item => item.id === user.id ? { ...item, ...result.user, invitation: result.invitation } : item))
      if (result?.invitation?.status === 'failed') throw new Error(invitationFailure(result.invitation))
      setMessageTone('status')
      setMessage(invitationResultMessage(result))
    } finally { setBusy('') }
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
    setBusy(user.id)
    setMessage('')
    try {
      const result = await api.post(`/users/${user.id}/reset-password`, {})
      setMessage(result?.temporaryPassword
        ? `Acceso restablecido para ${user.email}. Contraseña temporal: ${result.temporaryPassword}`
        : `Acceso restablecido para ${user.email}.`)
    } catch (error) { throw new Error(error.message || 'No fue posible restablecer el acceso.') }
    finally { setBusy('') }
  }

  const resetMfa = async user => {
    setBusy(user.id)
    setMessage('')
    try {
      const result = await api.post(`/users/${user.id}/reset-mfa`, {})
      setUsers(current => current.map(item => item.id === user.id ? { ...item, ...result.user } : item))
      setMessage(result?.message || `Verificación adicional restablecida para ${user.email}.`)
    } catch (error) { throw new Error(error.message || 'No fue posible restablecer la verificación adicional.') }
    finally { setBusy('') }
  }

  return (
    <section className="nk-module-page nk-users-page">
      <header className="nk-module-header">
        <div>
          <h1>Usuarios y permisos</h1>
          <p>{session?.tenant?.name || 'Empresa'} · datos independientes de otros clientes</p>
        </div>
        {admin && <button className="nk-button nk-button-primary" disabled={Boolean(busy)} onClick={() => { setCreateError(''); setNameError(''); setCreateNeedsRefresh(false); setShowCreate(true) }}><IconPlus size={16}/> Dar acceso</button>}
      </header>

      {message && <p className="nk-form-message" role={messageTone}>{message}</p>}

      <div className="nk-users-summary">
        <article className="nk-dashboard-metric"><IconUserCheck size={22}/><div><b>{loading ? '—' : activeCount}</b><span>Usuarios activos</span></div></article>
        <article className="nk-dashboard-metric teal"><IconShieldCheck size={22}/><div><b>{loading ? '—' : adminCount}</b><span>Administradores</span></div></article>
        <article className="nk-dashboard-metric amber"><IconLock size={22}/><div><b>Privado</b><span>Espacio independiente</span></div></article>
      </div>

      <section className="nk-module-card nk-users-card">
        <header className="nk-users-card-head">
          <div><h2>Equipo con acceso al sitio privado</h2><p>Administra el rol y la invitación de cada cuenta de esta empresa.</p></div>
          <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={16}/> Actualizar</ActionButton>
        </header>

        <div className="nk-table-wrapper nk-users-table-wrap">
          <table className="nk-table nk-users-table">
            <thead><tr><th>Persona</th><th>Correo de acceso</th><th>Permiso</th><th>Estado</th><th>Invitación</th><th>Acciones</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6">Cargando usuarios…</td></tr> : users.length ? users.map(user => {
                const self = user.id === session?.user?.id
                const protectedUser = user.role === 'domian_admin'
                const pendingInvitation = user.invitation && user.invitation.status !== 'accepted'
                const invitation = invitationStatus(user.invitation)
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
                      <span className={`nk-badge nk-badge-${invitation.tone}`}>{invitation.label}</span>
                      {pendingInvitation && invitationDate(user.invitation.expiresAt) && <small>Vence: {invitationDate(user.invitation.expiresAt)}</small>}
                      {user.invitation?.status === 'failed' && <small>{invitationFailure(user.invitation)}</small>}
                    </td>
                    <td>
                      <div className="nk-user-actions">
                        {admin && !self && !protectedUser ? <>
                          {pendingInvitation ? <ActionButton disabledReason={user.active ? 'Espera mientras se completa la operación en curso.' : 'Activa la cuenta antes de reenviar su invitación.'} className="nk-button nk-button-secondary nk-button-sm" disabled={Boolean(busy) || !user.active} onClick={() => confirmation.ask({title:'Reenviar invitación',description:`Se enviará un enlace nuevo a ${user.email}. El enlace anterior dejará de funcionar.`,confirmLabel:'Reenviar invitación',onConfirm:()=>resendInvitation(user)})}>Reenviar invitación</ActionButton> : <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" disabled={busy === user.id} onClick={() => confirmation.ask({title:'Restablecer acceso',description:`Se restablecerá el acceso de ${user.email}. Las sesiones activas se cerrarán.`,confirmLabel:'Restablecer acceso',variant:'danger',onConfirm:()=>reset(user)})}><IconKey size={14}/> Restablecer acceso</ActionButton>}
                          {user.mfa_enabled && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" disabled={busy === user.id} onClick={() => confirmation.ask({title:'Restablecer verificación adicional',description:`Se restablecerá la verificación adicional de ${user.email}. Deberá configurarla nuevamente al ingresar.`,confirmLabel:'Restablecer MFA',variant:'danger',onConfirm:()=>resetMfa(user)})}>Restablecer MFA</ActionButton>}
                          <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" disabled={busy === user.id} onClick={() => patchUser(user, { active: !user.active })}>{user.active ? 'Suspender' : 'Activar'}</ActionButton>
                        </> : <span>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              }) : <tr><td colSpan="6">No hay usuarios registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="nk-user-dialog-backdrop" role="presentation" onMouseDown={() => { if (!creating.current) setShowCreate(false) }}>
          <section ref={createDialogRef} className="nk-user-dialog" role="dialog" aria-modal="true" aria-labelledby="nk-user-create-title" aria-busy={busy === 'create'} onMouseDown={event => event.stopPropagation()}>
            <header><div><h2 id="nk-user-create-title">Dar acceso</h2><p>La persona recibirá un enlace por correo para crear su contraseña. El enlace es válido por 24 horas.</p></div><button type="button" className="nk-user-dialog-close" disabled={busy === 'create'} onClick={() => setShowCreate(false)} aria-label="Cerrar"><IconX size={18}/></button></header>
            <form noValidate onSubmit={createUser}>
              <div className="nk-field"><label className="nk-label" htmlFor="create-user-name">Nombre</label><input ref={nameInputRef} id="create-user-name" className="nk-input" minLength={3} maxLength={160} disabled={busy === 'create'} value={draft.fullName} onChange={e => { setDraft({ ...draft, fullName: e.target.value }); setNameError('') }} aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'create-user-name-error' : undefined} required />{nameError && <p id="create-user-name-error" className="nk-field-error" role="alert">{nameError}</p>}</div>
              <div className="nk-field"><label className="nk-label" htmlFor="create-user-email">Correo de acceso</label><EmailInput id="create-user-email" required disabled={busy === 'create'} value={draft.email} error={emailError} onChange={value => { setDraft({ ...draft, email: value }); setEmailError('') }} placeholder="persona@empresa.cl" /></div>
              <div className="nk-field"><label className="nk-label" htmlFor="create-user-role">Permiso</label><select id="create-user-role" className="nk-input" disabled={busy === 'create'} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}>{EDITABLE_ROLES.map(role => <option value={role} key={role}>{ROLE_LABEL[role]}</option>)}</select></div>
              {createError && <p className="nk-field-error" role="alert">{createError}</p>}
              {createNeedsRefresh && <button type="button" className="nk-button nk-button-secondary" onClick={() => { setShowCreate(false); load() }}>Actualizar usuarios</button>}
              <div className="nk-user-dialog-actions"><button type="button" className="nk-button nk-button-secondary" disabled={busy === 'create'} onClick={() => setShowCreate(false)}>Cancelar</button><ActionButton disabledReason={createNeedsRefresh ? 'Actualiza la lista para comprobar si la cuenta ya fue creada.' : 'Espera mientras se completa la operación en curso.'} className="nk-button nk-button-primary" disabled={busy === 'create' || createNeedsRefresh}>{busy === 'create' ? 'Creando…' : 'Crear acceso'}</ActionButton></div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDialog {...confirmation.dialogProps} />
    </section>
  )
}
