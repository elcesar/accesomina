import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSend } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/password-recovery.css'

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ rut: '', email: '' })
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setPreviewUrl('')
    try {
      const result = await api.post('/auth/forgot-password', form)
      setSent(true)
      setMessage(result?.message || 'Si los datos corresponden a una cuenta activa, recibirás un enlace para restablecer tu contraseña.')
      setPreviewUrl(result?.previewUrl || '')
    } catch (error) {
      setMessage(error.message || 'No fue posible procesar la solicitud. Intenta nuevamente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="nk-recovery-page">
      <section className="nk-recovery-card">
        <img className="nk-recovery-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
        <p className="nk-recovery-kicker">Recuperar acceso</p>
        <h1>Restablece tu contraseña</h1>
        <p className="nk-recovery-copy">
          Ingresa el RUT de tu empresa y tu correo autorizado. Si existe una cuenta activa, recibirás un enlace seguro válido por 30 minutos.
        </p>

        {sent ? (
          <>
            <p className="nk-recovery-message">{message}</p>
            {previewUrl && (
              <p className="nk-recovery-preview">
                Entorno de desarrollo: <a className="nk-link" href={previewUrl}>abrir enlace de recuperación</a>
              </p>
            )}
          </>
        ) : (
          <form className="nk-recovery-form" onSubmit={submit}>
            <label className="nk-recovery-field">
              RUT empresa
              <input
                className="nk-input"
                required
                value={form.rut}
                onChange={event => setForm(current => ({ ...current, rut: event.target.value }))}
                placeholder="12.345.678-9"
                autoComplete="organization"
              />
            </label>
            <label className="nk-recovery-field">
              Correo autorizado
              <input
                className="nk-input"
                required
                type="email"
                value={form.email}
                onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                placeholder="persona@empresa.cl"
                autoComplete="email"
              />
            </label>
            {message && <p className="nk-recovery-error" role="alert">{message}</p>}
            <button className="nk-button nk-button-primary" disabled={loading} type="submit">
              <IconSend size={16} />
              {loading ? 'Enviando…' : 'Enviar enlace seguro'}
            </button>
          </form>
        )}

        <div className="nk-recovery-actions">
          <Link className="nk-link" to="/login">← Volver al acceso</Link>
        </div>
      </section>
    </main>
  )
}
