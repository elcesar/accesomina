import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconCheck, IconLock, IconShieldCheck } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

const input = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d7d9e2', borderRadius: 8, fontSize: 14 }

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

  const panel = <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f7fb' }}><section style={{ width: 'min(460px,100%)', padding: 30, border: '1px solid #e0e2ea', borderRadius: 10, background: '#fff' }}>
    <IconShieldCheck size={28} color="#2a2a8c" />
    <p style={{ margin: '18px 0 5px', color: '#2a2a8c', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Seguridad de la cuenta</p>
    <h1 style={{ margin: '0 0 8px', fontSize: 25 }}>Configura la doble autenticación</h1>
    {step === 'start' && <><p style={{ margin: '0 0 22px', color: '#5d6b7a', fontSize: 14, lineHeight: 1.5 }}>Protege tu acceso con una aplicación autenticadora. Confirma tu contraseña para comenzar.</p><form onSubmit={startSetup} style={{ display: 'grid', gap: 14 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Contraseña actual<input required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} style={{ ...input, marginTop: 6 }} autoComplete="current-password" /></label>{message && <p role="alert" style={{ margin: 0, color: '#b3261e', fontSize: 13 }}>{message}</p>}<button disabled={loading} style={{ padding: 11, border: 0, borderRadius: 8, background: '#2a2a8c', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Preparando...' : 'Configurar autenticador'}</button></form></>}
    {step === 'confirm' && <><p style={{ margin: '0 0 16px', color: '#5d6b7a', fontSize: 14, lineHeight: 1.5 }}>Agrega esta clave en Google Authenticator, Microsoft Authenticator u otra aplicación compatible. Luego ingresa el código de seis dígitos.</p><div style={{ marginBottom: 18, padding: 14, background: '#f2f3fb', border: '1px solid #d7d9e2', borderRadius: 8 }}><span style={{ display: 'block', marginBottom: 6, color: '#5d6b7a', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Clave de configuración</span><code style={{ display: 'block', overflowWrap: 'anywhere', color: '#141a20', fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>{secret}</code></div><form onSubmit={enableMfa} style={{ display: 'grid', gap: 14 }}><label style={{ fontSize: 12, fontWeight: 700 }}>Código de la aplicación autenticadora<input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" style={{ ...input, marginTop: 6, letterSpacing: 5, fontWeight: 800 }} autoComplete="one-time-code" /></label>{message && <p role="alert" style={{ margin: 0, color: '#b3261e', fontSize: 13 }}>{message}</p>}<button disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, border: 0, borderRadius: 8, background: '#2a2a8c', color: '#fff', fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}><IconLock size={16} />{loading ? 'Activando...' : 'Activar doble autenticación'}</button></form></>}
    {step === 'complete' && <><div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '4px 0 16px', padding: 12, background: '#eef7f5', borderRadius: 8, color: '#1f5d57' }}><IconCheck size={20} /><strong>La doble autenticación quedó activada.</strong></div><p style={{ margin: '0 0 14px', color: '#5d6b7a', fontSize: 14, lineHeight: 1.5 }}>Guarda estos códigos de recuperación en un lugar seguro. Cada código se puede usar una sola vez si no tienes acceso a tu autenticador.</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18, padding: 14, background: '#f2f3fb', border: '1px solid #d7d9e2', borderRadius: 8 }}>{recoveryCodes.map(item => <code key={item} style={{ color: '#141a20', fontSize: 13, fontWeight: 800 }}>{item}</code>)}</div><button onClick={() => navigate('/app', { replace: true })} style={{ width: '100%', padding: 11, border: 0, borderRadius: 8, background: '#2a2a8c', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Ir al panel de control</button></>}
  </section></main>
  return panel
}
