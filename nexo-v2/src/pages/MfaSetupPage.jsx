import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCopy, IconKey, IconLock, IconShieldCheck } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/password-recovery.css'

export default function MfaSetupPage() {
  const { session, reload } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (session && !session.user?.mustChangePassword && !session.user?.mfaEnrollmentRequired) {
      navigate('/app', { replace: true })
    }
  }, [navigate, session])

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
    } catch {
      setMessage('No fue posible copiar automáticamente. Selecciona y copia el código manualmente.')
    }
  }

  const startSetup = async event => {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const result = await api.post('/auth/mfa/setup', { currentPassword })
      setSecret(result.secret || '')
      setCode('')
    } catch (error) {
      setMessage(error.code === 'INVALID_CREDENTIALS'
        ? 'La contraseña ingresada no coincide con tu cuenta.'
        : error.message || 'No fue posible iniciar la configuración.')
    } finally {
      setLoading(false)
    }
  }

  const confirmSetup = async event => {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const result = await api.post('/auth/mfa/enable', { currentPassword, code })
      setRecoveryCodes(result.recoveryCodes || [])
      await reload()
    } catch (error) {
      setMessage(error.code === 'MFA_CODE_INVALID'
        ? 'El código de seis dígitos no es válido. Revisa tu aplicación e inténtalo nuevamente.'
        : error.message || 'No fue posible activar la doble autenticación.')
    } finally {
      setLoading(false)
    }
  }

  if (recoveryCodes.length) {
    return (
      <main className="nk-recovery-page">
        <section className="nk-recovery-card">
          <IconShieldCheck size={30} className="nk-mfa-success-icon" />
          <p className="nk-recovery-kicker">Cuenta protegida</p>
          <h1>Doble autenticación activada</h1>
          <p className="nk-recovery-copy">Guarda estos códigos de recuperación en un lugar seguro. Cada código se puede usar una sola vez si no tienes acceso a tu aplicación autenticadora.</p>
          <div className="nk-mfa-recovery-codes" aria-label="Códigos de recuperación">
            {recoveryCodes.map(item => <code key={item}>{item}</code>)}
          </div>
          <button className="nk-button nk-button-secondary" type="button" onClick={() => copy(recoveryCodes.join('\n'), 'recuperación')}>
            <IconCopy size={16} />{copied === 'recuperación' ? 'Códigos copiados' : 'Copiar códigos'}
          </button>
          <button className="nk-button nk-button-primary nk-mfa-continue" type="button" onClick={() => navigate('/app', { replace: true })}>
            Ir al panel
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="nk-recovery-page">
      <section className="nk-recovery-card">
        <IconShieldCheck size={30} className="nk-mfa-success-icon" />
        <p className="nk-recovery-kicker">Paso final de activación</p>
        <h1>Configura la doble autenticación</h1>
        <p className="nk-recovery-copy">Para terminar la activación de tu cuenta, usa una aplicación autenticadora compatible, como Microsoft Authenticator, Google Authenticator o Authy.</p>

        {!secret ? (
          <form className="nk-recovery-form" onSubmit={startSetup}>
            <label className="nk-recovery-field">
              Confirma tu contraseña nueva
              <input className="nk-input" required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" />
            </label>
            {message && <p className="nk-recovery-error" role="alert">{message}</p>}
            <button className="nk-button nk-button-primary" disabled={loading} type="submit">
              <IconKey size={16} />{loading ? 'Generando código…' : 'Generar código de configuración'}
            </button>
          </form>
        ) : (
          <form className="nk-recovery-form" onSubmit={confirmSetup}>
            <div className="nk-mfa-secret">
              <span>Clave de configuración</span>
              <code>{secret}</code>
              <button className="nk-button nk-button-secondary" type="button" onClick={() => copy(secret, 'clave')}>
                <IconCopy size={16} />{copied === 'clave' ? 'Clave copiada' : 'Copiar clave'}
              </button>
            </div>
            <p className="nk-recovery-copy">En tu aplicación autenticadora, agrega una cuenta manualmente, pega esta clave y luego ingresa el código de seis dígitos que te mostrará.</p>
            <label className="nk-recovery-field">
              Código de autenticación
              <input className="nk-input" required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            </label>
            {message && <p className="nk-recovery-error" role="alert">{message}</p>}
            <button className="nk-button nk-button-primary" disabled={loading || code.length !== 6} type="submit">
              <IconLock size={16} />{loading ? 'Verificando…' : 'Activar y continuar'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
