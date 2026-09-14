import { useEffect, useId, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'

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

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const submit = event => {
    event.preventDefault()
    const body = Object.entries(form)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')

    window.location.href = `mailto:contacto@nexoklar.cl?subject=${encodeURIComponent('Solicitud de demostración Nexo Klar')}&body=${encodeURIComponent(body)}`
    onClose()
  }

  return (
    <Dialog eyebrow="Solicita una demostración" title="Conversemos sobre tu operación." onClose={onClose}>
      <p className="nk-dialog-copy">
        Cuéntanos lo esencial y prepararemos una conversación enfocada en tu operación.
      </p>

      <form className="nk-public-form" onSubmit={submit}>
        {BASIC_FIELDS.map(([key, label, placeholder]) => (
          <label key={key}>
            {label}
            <input
              required={key === 'nombre' || key === 'correo'}
              type={key === 'correo' ? 'email' : 'text'}
              value={form[key]}
              onChange={event => updateField(key, event.target.value)}
              placeholder={placeholder}
            />
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
          <button className="nk-button nk-button-primary" type="submit">Preparar solicitud</button>
        </footer>
      </form>
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
