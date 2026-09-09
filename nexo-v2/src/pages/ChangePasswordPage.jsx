import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconKey, IconLock, IconLoader2 } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d7d9e2', borderRadius: 8, fontSize: 14 }
const passwordIsValid = value => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(value)

export default function ChangePasswordPage() {
  const { session, reload } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session && !session.user?.mustChangePassword) navigate(session.user?.mfaEnrollmentRequired ? '/configurar-mfa' : '/app', { replace: true })
  }, [navigate, session])

  const submit = async event => {
    event.preventDefault()
    setMessage('')
    if (!passwordIsValid(form.newPassword)) return setMessage('Usa al menos 12 caracteres, una mayúscula, una minúscula y un número.')
    if (form.newPassword !== form.confirmation) return setMessage('Las contraseñas no coinciden.')
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      await reload()
      navigate(session?.user?.mfaEnrollmentRequired ? '/configurar-mfa' : '/app', { replace: true })
    } catch (error) {
      setMessage(error.code === 'INVALID_CREDENTIALS' ? 'La contraseña actual no es correcta.' : 'No fue posible actualizar la contraseña. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f7fb' }}>
    <section style={{ width: 'min(420px,100%)', padding: 30, border: '1px solid #e0e2ea', borderRadius: 10, background: '#fff' }}>
      <IconKey size={28} color="#2a2a8c" />
      <p style={{ margin: '18px 0 5px', color: '#2a2a8c', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Primer acceso</p>
      <h1 style={{ margin: '0 0 8px', fontSize: 25 }}>Actualiza tu contraseña</h1>
      <p style={{ margin: '0 0 22px', color: '#5d6b7a', fontSize: 14, lineHeight: 1.5 }}>Para proteger tu cuenta, crea una contraseña personal antes de continuar.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Contraseña actual<input required type="password" value={form.currentPassword} onChange={event => setForm({ ...form, currentPassword: event.target.value })} style={{ ...input, marginTop: 6 }} autoComplete="current-password" /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Nueva contraseña<input required type="password" minLength="12" value={form.newPassword} onChange={event => setForm({ ...form, newPassword: event.target.value })} style={{ ...input, marginTop: 6 }} autoComplete="new-password" /></label>
        <label style={{ fontSize: 12, fontWeight: 700 }}>Repite la nueva contraseña<input required type="password" minLength="12" value={form.confirmation} onChange={event => setForm({ ...form, confirmation: event.target.value })} style={{ ...input, marginTop: 6 }} autoComplete="new-password" /></label>
        <p style={{ margin: '-2px 0 0', color: '#5d6b7a', fontSize: 12, lineHeight: 1.45 }}>Al menos 12 caracteres, una mayúscula, una minúscula y un número.</p>
        {message && <p role="alert" style={{ margin: 0, color: '#b3261e', fontSize: 13 }}>{message}</p>}
        <button disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, border: 0, borderRadius: 8, background: '#2a2a8c', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconLock size={16} />}{loading ? 'Actualizando...' : 'Guardar y continuar'}</button>
      </form>
      <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13 }}><Link to="/recuperar-contrasena" style={{ color: '#00706a', fontWeight: 700, textDecoration: 'none' }}>No recuerdo mi contraseña</Link></p>
    </section>
  </main>
}
