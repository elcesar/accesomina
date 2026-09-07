import { useState } from 'react'
import { IconX } from '@tabler/icons-react'

function Dialog({ title, children, onClose }) {
  return (
    <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="nk-dialog" role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={e => e.stopPropagation()}>
        <header className="nk-dialog-header">
          <h2>{title}</h2>
          <button className="nk-icon-button" aria-label="Cerrar" onClick={onClose}>
            <IconX size={20} />
          </button>
        </header>
        <div className="nk-dialog-body">{children}</div>
      </section>
    </div>
  )
}

export function DemoRequestDialog({ onClose }) {
  const [form, setForm] = useState({
    nombre: '', empresa: '', correo: '', telefono: '', industria: '', dotacion: '', necesidad: ''
  })

  const update = e => setForm(current => ({ ...current, [e.target.name]: e.target.value }))

  const submit = e => {
    e.preventDefault()
    const subject = encodeURIComponent(`Solicitud de demo Nexo Klar — ${form.empresa}`)
    const body = encodeURIComponent([
      `Nombre: ${form.nombre}`,
      `Empresa: ${form.empresa}`,
      `Correo: ${form.correo}`,
      `Teléfono: ${form.telefono}`,
      `Industria: ${form.industria}`,
      `Dotación: ${form.dotacion}`,
      '',
      'Necesidad:',
      form.necesidad,
    ].join('\n'))
    window.location.href = `mailto:contacto@nexoklar.cl?subject=${subject}&body=${body}`
    onClose()
  }

  return (
    <Dialog title="Solicitar una demostración" onClose={onClose}>
      <form className="nk-form" onSubmit={submit}>
        <div className="nk-form-grid">
          <label>Nombre<input name="nombre" value={form.nombre} onChange={update} required /></label>
          <label>Empresa<input name="empresa" value={form.empresa} onChange={update} required /></label>
          <label>Correo<input type="email" name="correo" value={form.correo} onChange={update} required /></label>
          <label>Teléfono<input name="telefono" value={form.telefono} onChange={update} /></label>
          <label>Industria<input name="industria" value={form.industria} onChange={update} /></label>
          <label>Dotación<input name="dotacion" value={form.dotacion} onChange={update} /></label>
        </div>
        <label>Cuéntanos qué necesitas
          <textarea name="necesidad" value={form.necesidad} onChange={update} rows={5} />
        </label>
        <div className="nk-action-group">
          <button type="button" className="nk-button nk-button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="nk-button nk-button-primary">Solicitar demo</button>
        </div>
      </form>
    </Dialog>
  )
}

export function InformationDialog({ kind, onClose }) {
  const content = {
    faq: {
      title: 'Preguntas frecuentes',
      body: <>
        <h3>¿Qué es Nexo Klar?</h3>
        <p>Una plataforma orientada a ordenar la gestión operativa, la información y el cumplimiento.</p>
        <h3>¿Para quién está pensado?</h3>
        <p>Para organizaciones que necesitan mayor trazabilidad, control y visibilidad.</p>
        <h3>¿Cómo se implementa?</h3>
        <p>La implementación se adapta al contexto de cada organización y prioriza una adopción gradual.</p>
      </>,
    },
    legal: {
      title: 'Términos y privacidad',
      body: <>
        <p>Nexo Klar busca operar bajo principios de seguridad, privacidad, trazabilidad y uso responsable de la información.</p>
        <p>Las condiciones específicas de servicio y tratamiento de datos deben formalizarse antes de contratar o integrar la plataforma.</p>
      </>,
    },
  }

  const selected = content[kind] || content.faq
  return (
    <Dialog title={selected.title} onClose={onClose}>
      <div className="nk-prose">{selected.body}</div>
    </Dialog>
  )
}
