import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconEye, IconEyeOff, IconLoader2, IconLock, IconShieldCheck } from '@tabler/icons-react'

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '9px',
  border: '1.5px solid #E3DED2',
  background: '#FFFFFF',
  color: '#141A20',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
}

const INPUT_FOCUS = { borderColor: '#2A2A8C' }

function Field({ label, children }) {
  return (
    <div>
      <label
        style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#5D6B7A', marginBottom: 6 }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function FocusInput({ style, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      {...props}
      style={{ ...INPUT_STYLE, ...(focused ? INPUT_FOCUS : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F4EFE3' }}>

      {/* Panel izquierdo — marca */}
      <div
        className="hidden lg:flex"
        style={{
          width: '45%',
          background: '#2A2A8C',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 52px',
          flexShrink: 0,
        }}
      >
        <img
          src="/brand/NK-blanco-horizontal.svg"
          alt="Nexo Klar"
          style={{ height: 36, width: 'auto' }}
        />

        {/* Tagline */}
        <div>
          <h2 style={{
            color: '#FFFFFF',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.25,
            marginBottom: 16,
          }}>
            Personas, operaciones<br />y cumplimiento<br />
            <span style={{ color: '#00CFC1' }}>en un solo lugar.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.65, maxWidth: 340 }}>
            Gestiona dotación, contratos, acreditaciones y proyectos desde una plataforma segura y conectada.
          </p>

          {/* Puntos clave */}
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Información centralizada y disponible',
              'Alertas de vencimiento en tiempo real',
              'Trazabilidad completa por persona y contrato',
            ].map(txt => (
              <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00CFC1', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          © {new Date().getFullYear()} Nexo Klar · nexoklar.com
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div className="flex lg:hidden" style={{ marginBottom: 32 }}>
            <img
              src="/brand/NK-color-horizontal.svg"
              alt="Nexo Klar"
              style={{ height: 28, width: 'auto' }}
            />
          </div>

          {/* Encabezado */}
          {!mfaRequired ? (
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 22, color: '#141A20', margin: '0 0 6px' }}>
                Acceso al sistema
              </h1>
              <p style={{ fontSize: 13, color: '#5D6B7A', margin: 0 }}>
                Ingresa con tus credenciales autorizadas
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#E3E3F0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <IconShieldCheck size={24} strokeWidth={1.5} style={{ color: '#2A2A8C' }} />
              </div>
              <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 20, color: '#141A20', margin: '0 0 6px' }}>
                Verificación en dos pasos
              </h1>
              <p style={{ fontSize: 13, color: '#5D6B7A', margin: 0 }}>
                Ingresa el código de 6 dígitos de tu aplicación autenticadora.
              </p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!mfaRequired ? (
              <>
                <Field label="RUT empresa">
                  <FocusInput
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    placeholder="12.345.678-9"
                    required
                    autoComplete="organization"
                  />
                </Field>

                <Field label="Correo">
                  <FocusInput
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
                  <div style={{ position: 'relative' }}>
                    <FocusInput
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      required
                      autoComplete="current-password"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#8A96A1', padding: 0, display: 'flex',
                      }}
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <Field label="Código de autenticación">
                <FocusInput
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 20 }}
                />
              </Field>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: '#FBE8E6',
                border: '1px solid #F5C4C2',
                borderRadius: 9,
                padding: '10px 14px',
              }}>
                <p style={{ fontSize: 13, color: '#B3261E', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '11px 0',
                borderRadius: 9,
                border: 'none',
                background: loading ? '#6A6AAE' : '#2A2A8C',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s',
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1A1A5E' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#2A2A8C' }}
            >
              {loading && <IconLoader2 size={16} className="animate-spin" />}
              {mfaRequired ? 'Verificar código' : 'Ingresar'}
            </button>

            {/* Volver desde MFA */}
            {mfaRequired && (
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(''); setError(null) }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#5D6B7A', padding: '4px 0',
                  textAlign: 'center', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#141A20' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#5D6B7A' }}
              >
                ← Volver al formulario
              </button>
            )}
          </form>

          {/* Footer */}
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IconLock size={12} style={{ color: '#8A96A1' }} />
            <p style={{ fontSize: 11, color: '#8A96A1', margin: 0 }}>
              Sesión con cookie segura · Solo HTTPS
            </p>
          </div>

          {/* Volver a la landing */}
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12 }}>
            <Link to="/" style={{ color: '#00706A', textDecoration: 'none', fontWeight: 600 }}>
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
