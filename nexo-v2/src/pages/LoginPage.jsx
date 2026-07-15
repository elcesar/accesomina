import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../services/auth.jsx'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'

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
        navigate('/')
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
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 bg-surface flex-col justify-between p-12 border-r border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <div>
            <p className="text-white font-semibold text-lg leading-none">Nexo</p>
            <p className="text-gray-500 text-sm leading-none mt-0.5">by Domian</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-semibold text-white leading-snug mb-4">
            Personas, operaciones<br />y cumplimiento<br />
            <span className="text-brand">en un solo lugar.</span>
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Gestiona tu dotación, contratos, acreditaciones y proyectos desde una plataforma segura y conectada.
          </p>
        </div>

        <p className="text-gray-600 text-xs">
          © {new Date().getFullYear()} Domian · domian.cl · Santiago, Chile
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-white mb-1">Acceso al sistema</h1>
            <p className="text-gray-500 text-sm">Ingresa con tus credenciales autorizadas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaRequired ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    RUT empresa
                  </label>
                  <input
                    name="rut"
                    value={form.rut}
                    onChange={handleChange}
                    placeholder="12.345.678-9"
                    className="input"
                    required
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Correo
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="correo@empresa.cl"
                    className="input"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••••••"
                      className="input pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Código de autenticación
                </label>
                <input
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="000000"
                  className="input text-center tracking-widest text-lg"
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  Ingresa el código de 6 dígitos de tu aplicación autenticadora.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading && <IconLoader2 size={16} className="animate-spin" />}
              {mfaRequired ? 'Verificar código' : 'Ingresar'}
            </button>

            {mfaRequired && (
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(''); setError(null) }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
              >
                ← Volver al formulario
              </button>
            )}
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">
            La sesión usa cookie segura · Solo HTTPS
          </p>
        </div>
      </div>
    </div>
  )
}
