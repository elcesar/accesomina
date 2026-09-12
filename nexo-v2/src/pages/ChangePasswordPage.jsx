import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconLock } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/password-recovery.css'

const passwordIsValid = value => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(value)

export default function ChangePasswordPage() {
  const { session, reload } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session && !session.user?.mustChangePassword) {
      navigate(session.user?.mfaEnrollmentRequired ? '/configurar-mfa' : '/app', { replace: true })
    }
  }, [navigate, session])

  const submit = async event => {
    event.preventDefault()
    setMessage('')

    if (!passwordIsValid(form.newPassword)) {
      setMessage('Usa al menos 12 caracteres, una mayúscula, una minúscula y un número.')
      return
    }
    if (form.newPassword !== form.confirmation) {
      setMessage('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      const nextSession = await reload()
      navigate(nextSession?.user?.mfaEnrollmentRequired ? '/configurar-mfa' : '/app', { replace: true })
    } catch (error) {
      setMessage(
        error.code === 'INVALID_CREDENTIALS'
          ? 'La contraseña actual no es correcta.'
          : error.code === 'WEAK_PASSWORD'
            ? 'La nueva contraseña no cumple con los requisitos de seguridad.'
            : 'No fue posible actualizar la contraseña. Intenta nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="nk-recovery-page">
      <section className="nk-recovery-card">
        <img className="nk-recovery-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
        <p className="nk-recovery-kicker">Primer acceso</p>
        <h1>Actualiza tu contraseña</h1>
        <p className="nk-recovery-copy">
          Antes de ingresar a Nexo Klar debes reemplazar la contraseña temporal por una contraseña personal.
        </p>

        <form className="nk-recovery-form" onSubmit={submit}>
          <label className="nk-recovery-field">
            Contraseña actual
            <input
              className="nk-input"
              required
              type="password"
              value={form.currentPassword}
              onChange={event => setForm(current => ({ ...current, currentPassword: event.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <label className="nk-recovery-field">
            Nueva contraseña
            <input
              className="nk-input"
              required
              minLength="12"
              type="password"
              value={form.newPassword}
              onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))}
              autoComplete="new-password"
            />
          </label>
          <label className="nk-recovery-field">
            Repite la nueva contraseña
            <input
              className="nk-input"
              required
              minLength="12"
              type="password"
              value={form.confirmation}
              onChange={event => setForm(current => ({ ...current, confirmation: event.target.value }))}
              autoComplete="new-password"
            />
          </label>
          <p className="nk-recovery-copy" style={{ marginBottom: 0 }}>
            Mínimo 12 caracteres, con al menos una mayúscula, una minúscula y un número.
          </p>
          {message && <p className="nk-recovery-error" role="alert">{message}</p>}
          <button className="nk-button nk-button-primary" disabled={loading} type="submit">
            <IconLock size={16} />
            {loading ? 'Actualizando…' : 'Guardar y continuar'}
          </button>
        </form>
      </section>
    </main>
  )
}
