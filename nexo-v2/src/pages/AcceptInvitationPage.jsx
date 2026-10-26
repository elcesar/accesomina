import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/password-recovery.css'

const PASSWORD_HELP = 'Usa entre 12 y 128 caracteres, con una mayúscula, una minúscula y un número.'
const validPassword = value => value.length >= 12 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
const invalidInvitation = error => ['INVALID_INVITATION_REQUEST', 'INVITATION_INVALID_OR_EXPIRED', 'INVITATION_ALREADY_ACCEPTED'].includes(error?.code)

export default function AcceptInvitationPage() {
  const { session, loading: sessionLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || '', tenant = params.get('tenant') || ''
  const [phase, setPhase] = useState('loading')
  const [invitation, setInvitation] = useState(null)
  const [retry, setRetry] = useState(0)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const running = useRef(false)
  const passwordRef = useRef(null), confirmationRef = useRef(null)

  useEffect(() => {
    let active = true
    setInvitation(null)
    setMessage('')
    setErrors({})
    setForm({ newPassword: '', confirmPassword: '' })
    if (!token || !tenant) { setPhase('invalid'); return undefined }
    setPhase('loading')
    api.post('/auth/invitations/verify', { tenant, token }).then(data => {
      if (active) { setInvitation(data); setPhase('ready') }
    }).catch(error => {
      if (!active) return
      setMessage(error.message || 'No fue posible comprobar la invitación. Inténtalo nuevamente.')
      setPhase(invalidInvitation(error) || error.code === 'ACCOUNT_DISABLED' ? 'invalid' : 'error')
    })
    return () => { active = false }
  }, [token, tenant, retry])

  async function submit(event) {
    event.preventDefault()
    if (running.current || phase !== 'ready') return
    const next = {}
    if (!validPassword(form.newPassword)) next.newPassword = PASSWORD_HELP
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.'
    setErrors(next)
    setMessage('')
    if (Object.keys(next).length) {
      ;(next.newPassword ? passwordRef : confirmationRef).current?.focus()
      return
    }
    running.current = true
    setSaving(true)
    try {
      await api.post('/auth/invitations/accept', { tenant, token, ...form })
      setForm({ newPassword: '', confirmPassword: '' })
      setPhase('success')
    } catch (error) {
      if (invalidInvitation(error) || error.code === 'ACCOUNT_DISABLED') {
        setForm({ newPassword: '', confirmPassword: '' })
        setPhase('invalid')
        setMessage(error.message)
      } else if (error.code === 'WEAK_PASSWORD') {
        setErrors({ newPassword: PASSWORD_HELP }); requestAnimationFrame(() => passwordRef.current?.focus())
      } else if (error.code === 'INVITATION_PASSWORD_MISMATCH') {
        setErrors({ confirmPassword: 'Las contraseñas no coinciden. Vuelve a escribir la confirmación.' }); requestAnimationFrame(() => confirmationRef.current?.focus())
      } else setMessage(error.message || 'No fue posible guardar la contraseña. Inténtalo nuevamente.')
    } finally { running.current = false; setSaving(false) }
  }

  const change = field => event => {
    setForm(current => ({ ...current, [field]: event.target.value }))
    setErrors(current => ({ ...current, [field]: '' }))
    setMessage('')
  }

  async function goToAccess() {
    if (leaving) return
    setLeaving(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return <main className="nk-recovery-page">
    <section className="nk-recovery-card" aria-busy={phase === 'loading' || saving}>
      <img className="nk-recovery-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
      {phase === 'loading' && <><h1>Comprobando invitación</h1><p className="nk-recovery-copy" role="status">Espera mientras verificamos tu enlace de acceso.</p></>}
      {phase === 'invalid' && <>
        <h1>Invitación no disponible</h1>
        <p className="nk-recovery-error" role="alert">{message || 'Este enlace está incompleto, venció o ya fue utilizado.'}</p>
        <p className="nk-recovery-copy">Solicita al administrador de tu empresa que reenvíe la invitación desde Usuarios y permisos. Usa el enlace del correo más reciente.</p>
        <Link className="nk-link" to="/login">Ir a Acceso</Link>
      </>}
      {phase === 'error' && <>
        <h1>No pudimos comprobar la invitación</h1>
        <p className="nk-recovery-error" role="alert">{message}</p>
        <button className="nk-button nk-button-primary" onClick={() => setRetry(current => current + 1)}>Reintentar</button>
      </>}
      {phase === 'success' && <>
        <h1>Tu contraseña está lista</h1>
        <p className="nk-recovery-message" role="status">Ahora puedes iniciar sesión con tu correo, el RUT de tu empresa y la contraseña que acabas de crear.</p>
        <p className="nk-recovery-copy">{invitation?.companyName} · RUT {invitation?.companyRut}<br />{invitation?.email}</p>
        <p className="nk-recovery-copy">Al ingresar, completa la verificación adicional que corresponda.</p>
        {session && <p className="nk-recovery-copy">Hay otra sesión abierta en este navegador. La siguiente acción la cerrará también en las demás pestañas para que puedas ingresar con tu cuenta invitada.</p>}
        {session || sessionLoading
          ? <button className="nk-button nk-button-primary" type="button" disabled={sessionLoading || leaving} onClick={goToAccess}>{leaving ? 'Cerrando sesión…' : 'Cerrar sesión actual e ir a Acceso'}</button>
          : <Link className="nk-button nk-button-primary" to="/login">Ir a Acceso</Link>}
      </>}
      {phase === 'ready' && <>
        <h1>Crea tu contraseña de acceso</h1>
        <p className="nk-recovery-copy">{invitation?.companyName} te dio acceso a Nexo Klar con el correo {invitation?.email}. Este enlace es personal y sólo puede utilizarse una vez.</p>
        <form className="nk-recovery-form" noValidate onSubmit={submit}>
          <label className="nk-recovery-field" htmlFor="invitation-password">Nueva contraseña</label>
          <input ref={passwordRef} id="invitation-password" name="newPassword" className="nk-input" type="password" autoComplete="new-password" autoFocus required maxLength={128} value={form.newPassword} disabled={saving} aria-invalid={Boolean(errors.newPassword)} aria-describedby={errors.newPassword ? 'invitation-password-help invitation-password-error' : 'invitation-password-help'} onChange={change('newPassword')} />
          <p id="invitation-password-help" className="nk-field-help">{PASSWORD_HELP}</p>
          {errors.newPassword && <p id="invitation-password-error" className="nk-recovery-error" role="alert">{errors.newPassword}</p>}
          <label className="nk-recovery-field" htmlFor="invitation-confirmation">Repite la contraseña</label>
          <input ref={confirmationRef} id="invitation-confirmation" name="confirmPassword" className="nk-input" type="password" autoComplete="new-password" required maxLength={128} value={form.confirmPassword} disabled={saving} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? 'invitation-confirmation-error' : undefined} onChange={change('confirmPassword')} />
          {errors.confirmPassword && <p id="invitation-confirmation-error" className="nk-recovery-error" role="alert">{errors.confirmPassword}</p>}
          {message && <p className="nk-recovery-error" role="alert">{message}</p>}
          <button className="nk-button nk-button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
      </>}
    </section>
  </main>
}
