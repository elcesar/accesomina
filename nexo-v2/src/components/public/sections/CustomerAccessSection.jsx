import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandLogo from '../BrandLogo.jsx'
import { api } from '../../../services/api.js'
import { useAuth } from '../../../services/auth.jsx'

const initialRegistration = { companyName: '', rut: '', phone: '', adminName: '', email: '', password: '', inviteCode: '' }

function formatRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${dv}`
}

export default function CustomerAccessSection() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [tab, setTab] = useState('login')
  const [config, setConfig] = useState({ registrationEnabled: false })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loginData, setLoginData] = useState({ rut: '', email: '', password: '' })
  const [registration, setRegistration] = useState(initialRegistration)

  useEffect(() => {
    api.get('/auth/config').then(setConfig).catch(() => {})
  }, [])

  const update = set => key => event => set(current => ({ ...current, [key]: event.target.value }))
  const formatFieldRut = set => key => () => set(current => ({ ...current, [key]: formatRut(current[key]) }))

  const submitLogin = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const data = await login(loginData)
      if (data.user?.mustChangePassword) navigate('/cambiar-password')
      else if (data.user?.mfaEnrollmentRequired) navigate('/configurar-mfa')
      else navigate('/app')
    } catch (error) {
      setMessage(error.message || 'No fue posible ingresar. Revisa tus datos.')
    } finally {
      setBusy(false)
    }
  }

  const submitRegistration = async event => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const result = await api.post('/auth/register', {
        ...registration,
        rut: formatRut(registration.rut),
      })
      setMessage(result.message || 'Cuenta creada y pendiente de aprobación por Nexo Klar.')
      setRegistration(initialRegistration)
    } catch (error) {
      setMessage(error.message || 'No fue posible crear el sitio privado.')
    } finally {
      setBusy(false)
    }
  }

  const switchTab = nextTab => {
    setTab(nextTab)
    setMessage('')
  }

  return (
    <section id="clientes-access" className="nk-public-section">
      <div className="nk-access-layout">
        <div>
          <p className="nk-eyebrow">Clientes Nexo Klar</p>
          <h2>Un espacio privado para cada empresa.</h2>
          <p className="nk-lead">Cada integrante accede con su cuenta autorizada y trabaja únicamente con la información, permisos y configuración de su empresa.</p>
        </div>

        <article className="nk-access-card">
          <BrandLogo className="nk-access-logo" />
          <div className="nk-access-tabs">
            <button className={tab === 'login' ? 'active' : ''} onClick={() => switchTab('login')}>Acceso</button>
            <button className={tab === 'register' ? 'active' : ''} onClick={() => switchTab('register')}>Nuevo cliente</button>
          </div>

          {tab === 'login' ? (
            <form className="nk-access-form" onSubmit={submitLogin}>
              <label>
                Empresa / RUT
                <input required value={loginData.rut} onChange={update(setLoginData)('rut')} onBlur={formatFieldRut(setLoginData)('rut')} placeholder="76.123.456-7" autoComplete="organization" />
              </label>
              <label>
                Correo personal autorizado
                <input required type="email" value={loginData.email} onChange={update(setLoginData)('email')} placeholder="persona@empresa.cl" autoComplete="username" />
              </label>
              <label>
                Contraseña
                <input required type="password" value={loginData.password} onChange={update(setLoginData)('password')} placeholder="Contraseña segura" autoComplete="current-password" />
              </label>
              <button className="nk-button nk-button-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al sitio privado'}</button>
              <p className="nk-access-note">En la nube, la sesión utiliza una conexión segura y los datos se consultan exclusivamente desde la empresa autenticada.</p>
            </form>
          ) : (
            <form className="nk-access-form" onSubmit={submitRegistration}>
              <label>
                Nombre empresa
                <input required value={registration.companyName} onChange={update(setRegistration)('companyName')} placeholder="Ej: Servicios Mineros Norte SpA" />
              </label>

              <div className="nk-access-form-row">
                <label>
                  RUT empresa
                  <input required value={registration.rut} onChange={update(setRegistration)('rut')} onBlur={formatFieldRut(setRegistration)('rut')} placeholder="76.123.456-7" />
                </label>
                <label>
                  Teléfono
                  <input value={registration.phone} onChange={update(setRegistration)('phone')} placeholder="+56 9..." autoComplete="tel" />
                </label>
              </div>

              <label>
                Nombre administrador
                <input required value={registration.adminName} onChange={update(setRegistration)('adminName')} placeholder="Nombre y apellido" autoComplete="name" />
              </label>
              <label>
                Correo administrador
                <input required type="email" value={registration.email} onChange={update(setRegistration)('email')} placeholder="admin@empresa.cl" autoComplete="email" />
              </label>

              <div className="nk-access-form-row">
                <label>
                  Contraseña
                  <input required type="password" minLength="12" value={registration.password} onChange={update(setRegistration)('password')} placeholder="12+ caracteres" autoComplete="new-password" />
                </label>
                <label>
                  Código de invitación
                  <input required type="password" value={registration.inviteCode} onChange={update(setRegistration)('inviteCode')} placeholder="Entregado por Nexo Klar" />
                </label>
              </div>

              <button className="nk-button nk-button-primary" disabled={busy || !config.registrationEnabled}>
                {busy ? 'Creando…' : config.registrationEnabled ? 'Crear sitio privado vacío' : 'Registro mediante invitación'}
              </button>
              <p className="nk-access-note">El alta requiere invitación de Nexo Klar. Cada empresa parte con una base independiente y un administrador propio.</p>
            </form>
          )}

          {message && <p className="nk-form-message">{message}</p>}
        </article>
      </div>
    </section>
  )
}
