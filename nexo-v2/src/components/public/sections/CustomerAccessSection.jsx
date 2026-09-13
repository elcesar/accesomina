import { useEffect, useState } from 'react'
import BrandLogo from '../BrandLogo.jsx'
import { api } from '../../../services/api.js'

const initialRegistration = { companyName: '', rut: '', phone: '', adminName: '', email: '', password: '', inviteCode: '' }

const registrationErrorMessages = {
  INVITE_CODE_INVALID: 'El código de invitación ingresado no es válido.',
  WEAK_PASSWORD: 'La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas y un número.',
}

function formatRut(value) {
  const clean = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${dv}`
}

export function CustomerAccessPanel() {
  const [config, setConfig] = useState({ registrationEnabled: false })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [registration, setRegistration] = useState(initialRegistration)

  useEffect(() => {
    api.get('/auth/config').then(setConfig).catch(() => {})
  }, [])

  const update = key => event => setRegistration(current => ({ ...current, [key]: event.target.value }))
  const formatFieldRut = () => setRegistration(current => ({ ...current, rut: formatRut(current.rut) }))

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
      setMessage(registrationErrorMessages[error.code] || error.message || 'No fue posible crear el sitio privado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="nk-access-card">
      <BrandLogo className="nk-access-logo" />
      <div className="nk-access-heading">
        <p className="nk-eyebrow">Nuevo cliente</p>
        <h2>Crear empresa</h2>
        <p className="nk-access-note">Crea el espacio privado inicial de tu empresa. El alta requiere una invitación de Nexo Klar.</p>
      </div>

      <form className="nk-access-form" onSubmit={submitRegistration}>
        <label>
          Nombre empresa
          <input required value={registration.companyName} onChange={update('companyName')} placeholder="Ej: Servicios Mineros Norte SpA" />
        </label>

        <div className="nk-access-form-row">
          <label>
            RUT empresa
            <input required value={registration.rut} onChange={update('rut')} onBlur={formatFieldRut} placeholder="76.123.456-7" />
          </label>
          <label>
            Teléfono
            <input value={registration.phone} onChange={update('phone')} placeholder="+56 9..." autoComplete="tel" />
          </label>
        </div>

        <label>
          Nombre administrador
          <input required value={registration.adminName} onChange={update('adminName')} placeholder="Nombre y apellido" autoComplete="name" />
        </label>
        <label>
          Correo administrador
          <input required type="email" value={registration.email} onChange={update('email')} placeholder="admin@empresa.cl" autoComplete="email" />
        </label>

        <div className="nk-access-form-row">
          <label>
            Contraseña
            <input required type="password" minLength="12" value={registration.password} onChange={update('password')} placeholder="12+ caracteres" autoComplete="new-password" />
          </label>
          <label>
            Código de invitación
            <input required type="password" value={registration.inviteCode} onChange={update('inviteCode')} placeholder="Entregado por Nexo Klar" />
          </label>
        </div>

        <button className="nk-button nk-button-primary" disabled={busy || !config.registrationEnabled}>
          {busy ? 'Creando…' : config.registrationEnabled ? 'Crear sitio privado vacío' : 'Registro mediante invitación'}
        </button>
        <p className="nk-access-note">Cada empresa parte con una base independiente y un administrador propio. El acceso de usuarios existentes se realiza únicamente desde el botón Acceso del sitio.</p>
      </form>

      {message && <p className="nk-form-message">{message}</p>}
    </article>
  )
}

export default function CustomerAccessSection() {
  return (
    <section id="clientes-access" className="nk-public-section">
      <div className="nk-access-layout">
        <div>
          <p className="nk-eyebrow">Nuevo cliente</p>
          <h2>Crea el espacio privado de tu empresa.</h2>
          <p className="nk-lead">Registra la empresa y su administrador inicial para comenzar el proceso de habilitación en Nexo Klar.</p>
        </div>
        <CustomerAccessPanel />
      </div>
    </section>
  )
}
