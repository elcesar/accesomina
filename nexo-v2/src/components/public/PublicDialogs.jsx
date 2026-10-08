import { useEffect, useId, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { PhoneInput } from '../ui/PhoneInput.jsx'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function Dialog({ title, eyebrow, children, onClose }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    if (!dialog) return undefined

    const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
    const firstFocusable = focusable[0] || dialog
    firstFocusable.focus()

    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const currentFocusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)]
      if (!currentFocusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = currentFocusable[0]
      const last = currentFocusable[currentFocusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [onClose])

  return (
    <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="nk-dialog nk-public-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={event => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="nk-eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="nk-icon-button" type="button" onClick={onClose} aria-label="Cerrar diálogo">
            <IconX size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

const INITIAL_DEMO_FORM = {
  nombre: '',
  empresa: '',
  correo: '',
  telefono: '',
  industria: '',
  dotacion: '',
  necesidad: '',
}

const BASIC_FIELDS = [
  ['nombre', 'Nombre', 'Nombre y apellido'],
  ['empresa', 'Empresa', 'Nombre de la empresa'],
  ['correo', 'Correo de trabajo', 'nombre@empresa.cl'],
  ['telefono', 'Teléfono', '+56 9 1234 5678'],
]

const INDUSTRIES = [
  'Minería',
  'Energía',
  'Construcción',
  'Mantenimiento industrial',
  'Gestión de instalaciones',
  'Logística',
  'Seguridad privada',
  'Agroindustria',
  'Servicios técnicos',
  'Otra',
]

const COMPANY_SIZES = ['Hasta 30', '31 a 75', '76 a 200', 'Más de 200']

export function DemoRequestDialog({ onClose }) {
  const [form, setForm] = useState(INITIAL_DEMO_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: '' }))
  }

  const fallbackMailto = () => {
    const body = Object.entries(form)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    window.location.href = `mailto:contacto@nexoklar.com?subject=${encodeURIComponent('Solicitud de demostración Nexo Klar')}&body=${encodeURIComponent(body)}`
  }

  const submit = async event => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.nombre.trim()) nextErrors.nombre = 'Ingresa tu nombre.'
    if (!form.correo.trim()) nextErrors.correo = 'Ingresa tu correo de trabajo.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.message || 'No pudimos enviar tu solicitud en este momento.')
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error.message || 'No pudimos enviar tu solicitud en este momento.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog eyebrow="Solicita una demostración" title="Conversemos sobre tu operación." onClose={onClose}>
      <p className="nk-dialog-copy">
        Cuéntanos lo esencial y prepararemos una conversación enfocada en tu operación.
      </p>

      {submitted ? <div className="nk-public-form" role="status">
        <p className="nk-dialog-copy">Recibimos tu solicitud. El equipo de Nexo Klar te contactará pronto.</p>
        <footer><button className="nk-button nk-button-primary" type="button" onClick={onClose}>Cerrar</button></footer>
      </div> : <form className="nk-public-form" onSubmit={submit}>
        {BASIC_FIELDS.map(([key, label, placeholder]) => (
          <label key={key}>
            {label}{(key === 'nombre' || key === 'correo') ? ' (obligatorio)' : ''}
            {key === 'telefono' ? (
              <PhoneInput
                value={form.telefono}
                onChange={value => updateField('telefono', value)}
              />
            ) : (
              <input
                id={`demo-${key}`}
                required={key === 'nombre' || key === 'correo'}
                aria-required={key === 'nombre' || key === 'correo' || undefined}
                aria-invalid={Boolean(errors[key]) || undefined}
                aria-describedby={errors[key] ? `demo-${key}-error` : undefined}
                type={key === 'correo' ? 'email' : 'text'}
                value={form[key]}
                onChange={event => updateField(key, event.target.value)}
                placeholder={placeholder}
              />
            )}
            {errors[key] && <span id={`demo-${key}-error`} className="nk-field-error">{errors[key]}</span>}
          </label>
        ))}

        <label>
          Industria
          <select value={form.industria} onChange={event => updateField('industria', event.target.value)}>
            <option value="">Seleccionar</option>
            {INDUSTRIES.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label>
          Personas a gestionar
          <select value={form.dotacion} onChange={event => updateField('dotacion', event.target.value)}>
            <option value="">Seleccionar</option>
            {COMPANY_SIZES.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>

        <label className="wide">
          ¿Qué proceso quieres ordenar?
          <textarea
            rows="3"
            value={form.necesidad}
            onChange={event => updateField('necesidad', event.target.value)}
            placeholder="Documentos, órdenes de servicio, personas, activos o cumplimiento."
          />
        </label>

        <footer>
          <button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="nk-button nk-button-primary" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>
        </footer>
        {submitError && <div className="nk-field-error" role="alert">
          {submitError} <button className="nk-button nk-button-quiet" type="button" onClick={fallbackMailto}>Abrir correo como alternativa</button>
        </div>}
      </form>
      }
    </Dialog>
  )
}

export function InformationDialog({ kind, onClose }) {
  const content = kind === 'faq'
    ? {
        eyebrow: 'Preguntas frecuentes',
        title: 'Lo esencial antes de implementar.',
        blocks: [
          ['¿Para qué empresas sirve Nexo Klar?', 'Para empresas de servicios que necesitan relacionar personas, contratos, órdenes de servicio, documentos y recursos en una misma operación.'],
          ['¿Podemos cargar información histórica?', 'Sí. La carga puede ser gradual, individual o masiva, priorizando los procesos y datos que cada empresa necesita controlar.'],
          ['¿Las empresas comparten información?', 'No. Cada empresa trabaja en un espacio privado con sus propios usuarios, permisos, configuraciones y datos.'],
          ['¿Qué acompañamiento recibe el equipo?', 'La puesta en marcha considera configuración inicial, carga priorizada y acompañamiento según el alcance contratado.'],
        ],
      }
    : {
        eyebrow: 'Información comercial',
        title: 'Términos y privacidad.',
        blocks: [
          ['Espacios privados por empresa', 'Nexo Klar opera con usuarios, permisos, configuraciones y datos separados por empresa.'],
          ['Condiciones de servicio', 'El alcance, responsabilidades y tratamiento de datos se formalizan en la propuesta y documentación contractual vigente para cada cliente.'],
        ],
      }

  return (
    <Dialog {...content} onClose={onClose}>
      <div className="nk-info-list">
        {content.blocks.map(([heading, text]) => (
          <article key={heading}>
            <b>{heading}</b>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </Dialog>
  )
}
