import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IconKey } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/password-recovery.css'

const passwordIsValid = value => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(value)

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const tenant = params.get('tenant') || ''
  const [form, setForm] = useState({ newPassword: '', confirmation: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
      await api.post('/auth/reset-password', { token, tenant, ...form })
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch (error) {
      setMessage(error.message || 'No fue posible restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !tenant) {
    return (
      <main className="nk-recovery-page">
        <section className="nk-recovery-card">
          <img className="nk-recovery-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
          <h1>Enlace no válido</h1>
          <p className="nk-recovery-copy">El enlace de recuperación está incompleto o ya no es válido.</p>
          <Link className="nk-link" to="/recuperar-contrasena">Solicitar un enlace nuevo</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="nk-recovery-page">
      <section className="nk-recovery-card">
        <img className="nk-recovery-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
        <p className="nk-recovery-kicker"><IconKey size={15} /> Nueva contraseña</p>
        <h1>Crea una contraseña nueva</h1>
        <p className="nk-recovery-copy">Debe tener al menos 12 caracteres, una mayúscula, una minúscula y un número.</p>

        <form className="nk-recovery-form" onSubmit={submit}>
          <label className="nk-recovery-field">
            Nueva contraseña
            <input
              className="nk-input"
              required
              minLength={12}
              type="password"
              value={form.newPassword}
              onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))}
              autoComplete="new-password"
            />
          </label>
          <label className="nk-recovery-field">
            Repite la contraseña
            <input
              className="nk-input"
              required
              minLength={12}
              type="password"
              value={form.confirmation}
              onChange={event => setForm(current => ({ ...current, confirmation: event.target.value }))}
              autoComplete="new-password"
            />
          </label>
          {message && <p className="nk-recovery-error" role="alert">{message}</p>}
          <button className="nk-button nk-button-primary" disabled={loading} type="submit">
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </section>
    </main>
  )
}
