import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconLock, IconShieldCheck } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

export default function MfaSetupPage() {
  const { session, reload } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [code, setCode] = useState('')
  const [secret, setSecret] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [step, setStep] = useState('start')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session && !session.user?.mfaEnrollmentRequired && step !== 'complete') navigate('/app', { replace: true })
  }, [navigate, session, step])

  const startSetup = async event => {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const result = await api.post('/auth/mfa/setup', { currentPassword })
      setSecret(result.secret)
      setStep('confirm')
    } catch (error) {
      setMessage(error.code === 'INVALID_CREDENTIALS' ? 'La contraseña no es correcta.' : 'No fue posible iniciar la configuración.')
    } finally {
      setLoading(false)
    }
  }

  const enableMfa = async event => {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const result = await api.post('/auth/mfa/enable', { currentPassword, code })
      setRecoveryCodes(result.recoveryCodes || [])
      await reload()
      setStep('complete')
    } catch (error) {
      setMessage(error.code === 'MFA_CODE_INVALID' ? 'El código no es válido. Verifica el código e inténtalo nuevamente.' : 'No fue posible activar la doble autenticación.')
    } finally {
      setLoading(false)
    }
  }

  const panel = <main className="nk-auth-setup"><section className="nk-auth-setup-card">
    <IconShieldCheck className="nk-auth-setup-icon" size={28} aria-hidden="true" />
    <p className="nk-auth-setup-kicker">Seguridad de la cuenta</p>
    <h1>Configura la doble autenticación</h1>
    {step === 'start' && <><p className="nk-auth-setup-copy">Protege tu acceso con una aplicación autenticadora. Confirma tu contraseña para comenzar.</p><form onSubmit={startSetup} className="nk-auth-setup-form"><label>Contraseña actual<input className="nk-input" required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label>{message && <p className="nk-auth-setup-error" role="alert">{message}</p>}<button className="nk-button nk-button-primary" disabled={loading}>{loading ? 'Preparando...' : 'Configurar autenticador'}</button></form></>}
    {step === 'confirm' && <><p className="nk-auth-setup-copy">Agrega esta clave en Google Authenticator, Microsoft Authenticator u otra aplicación compatible. Luego ingresa el código de seis dígitos.</p><div className="nk-auth-setup-secret"><span>Clave de configuración</span><code>{secret}</code></div><form onSubmit={enableMfa} className="nk-auth-setup-form"><label>Código de la aplicación autenticadora<input className="nk-input nk-auth-setup-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" autoComplete="one-time-code" /></label>{message && <p className="nk-auth-setup-error" role="alert">{message}</p>}<button className="nk-button nk-button-primary" disabled={loading}><IconLock size={16} aria-hidden="true" />{loading ? 'Activando...' : 'Activar doble autenticación'}</button></form></>}
    {step === 'complete' && <><div className="nk-auth-setup-success"><IconCheck size={20} aria-hidden="true" /><strong>La doble autenticación quedó activada.</strong></div><p className="nk-auth-setup-copy">Guarda estos códigos de recuperación en un lugar seguro. Cada código se puede usar una sola vez si no tienes acceso a tu autenticador.</p><div className="nk-auth-setup-recovery">{recoveryCodes.map(item => <code key={item}>{item}</code>)}</div><button className="nk-button nk-button-primary nk-auth-setup-submit" onClick={() => navigate('/app', { replace: true })}>Ir al panel de control</button></>}
  </section></main>
  return panel
}
