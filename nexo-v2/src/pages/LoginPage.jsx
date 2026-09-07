import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconEye, IconEyeOff, IconLoader2, IconLock, IconShieldCheck } from '@tabler/icons-react'
import '../styles/login.css'

function Field({ label, children }) {
  return (
    <div className="nk-field nk-login-field">
      <label className="nk-label">{label}</label>
      {children}
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ rut: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState('')

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login({ ...form, mfaCode: mfaRequired ? mfaCode : undefined })
      if (data.user?.mustChangePassword) {
        navigate('/cambiar-password')
      } else if (data.user?.mfaEnrollmentRequired) {
        navigate('/configurar-mfa')
      } else {
        navigate('/app')
      }
    } catch (err) {
      if (err.code === 'MFA_REQUIRED') {
        setMfaRequired(true)
        setError(null)
      } else {
        setError(
          err.code === 'INVALID_CREDENTIALS'
            ? 'RUT, correo o contraseña incorrectos.'
            : err.code === 'MFA_CODE_INVALID'
            ? 'Código de autenticación incorrecto.'
            : 'Error al iniciar sesión. Intenta de nuevo.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="nk-login">
      <div className="nk-login-brand">
        <img
          className="nk-login-brand-logo"
          src="/brand/NK-blanco-horizontal.svg"
          alt="Nexo Klar"
        />

        <div className="nk-login-brand-copy">
          <h2 className="nk-login-brand-title">
            Personas, operaciones<br />y cumplimiento<br />
            <span className="nk-login-brand-accent">en un solo lugar.</span>
          </h2>
          <p className="nk-login-brand-description">
            Gestiona dotación, contratos, acreditaciones y proyectos desde una plataforma segura y conectada.
          </p>

          <div className="nk-login-brand-points">
            {[
              'Información centralizada y disponible',
              'Alertas de vencimiento en tiempo real',
              'Trazabilidad completa por persona y contrato',
            ].map(txt => (
              <div key={txt} className="nk-login-brand-point">{txt}</div>
            ))}
          </div>
        </div>

        <p className="nk-login-brand-footer">
          © {new Date().getFullYear()} Nexo Klar · nexoklar.com
        </p>
      </div>

      <div className="nk-login-content">
        <div className="nk-login-form-wrap">
          <div className="nk-login-mobile-logo">
            <img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
          </div>

          {!mfaRequired ? (
            <div className="nk-login-header">
              <h1 className="nk-login-title">Acceso al sistema</h1>
              <p className="nk-login-subtitle">Ingresa con tus credenciales autorizadas</p>
            </div>
          ) : (
            <div className="nk-login-header nk-login-header-mfa">
              <div className="nk-login-mfa-icon">
                <IconShieldCheck size={24} strokeWidth={1.5} />
              </div>
              <h1 className="nk-login-title nk-login-title-mfa">Verificación en dos pasos</h1>
              <p className="nk-login-subtitle">
                Ingresa el código de 6 dígitos de tu aplicación autenticadora.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="nk-login-form">
            {!mfaRequired ? (
              <>
                <Field label="RUT empresa">
                  <input
                    className="nk-input"
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    placeholder="12.345.678-9"
                    required
                    autoComplete="organization"
                  />
                </Field>

                <Field label="Correo">
                  <input
                    className="nk-input"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="correo@empresa.cl"
                    required
                    autoComplete="email"
                  />
                </Field>

                <Field label="Contraseña">
                  <div className="nk-login-password">
                    <input
                      className="nk-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      className="nk-login-password-toggle"
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(v => !v)}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <Field label="Código de autenticación">
                <input
                  className="nk-input nk-login-mfa-input"
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Field>
            )}

            {error && (
              <div className="nk-login-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            <button
              className="nk-button nk-button-primary nk-login-submit"
              type="submit"
              disabled={loading}
            >
              {loading && <IconLoader2 size={16} className="nk-login-spinner" />}
              {mfaRequired ? 'Verificar código' : 'Ingresar'}
            </button>

            {mfaRequired && (
              <button
                className="nk-login-back"
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(''); setError(null) }}
              >
                ← Volver al formulario
              </button>
            )}
          </form>

          <div className="nk-login-footer">
            <IconLock size={12} />
            <p>Sesión con cookie segura · Solo HTTPS</p>
          </div>

          <p className="nk-login-back-home">
            <Link className="nk-link" to="/">← Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
