const steps = [
  {
    step: 'Paso 1',
    title: 'Configura tu empresa',
    body: 'Define la estructura operacional, clientes, contratos, órdenes de servicio y módulos que necesitas utilizar.',
  },
  {
    step: 'Paso 2',
    title: 'Incorpora tu información',
    body: 'Registra personas, documentos y recursos de forma individual o mediante importación masiva.',
  },
  {
    step: 'Paso 3',
    title: 'Opera con control',
    body: 'Consulta estados, alertas, responsables e historial desde una sola base de información.',
  },
]

const privacy = [
  {
    title: 'Acceso individual',
    body: 'Cada persona utiliza su propia cuenta autorizada.',
  },
  {
    title: 'Roles y permisos',
    body: 'La información visible y editable depende de las responsabilidades asignadas.',
  },
  {
    title: 'Información separada',
    body: 'Cada empresa trabaja en un espacio independiente.',
  },
  {
    title: 'Trazabilidad',
    body: 'Los cambios y estados relevantes quedan disponibles para revisión.',
  },
]

export default function ImplementationSection() {
  return (
    <section id="implementacion" className="nk-public-section">
      <div className="nk-two-columns">
        <div>
          <p className="nk-eyebrow">Puesta en marcha simple</p>
          <h2>Empieza con una estructura clara y crece sobre la misma base.</h2>
          <p className="nk-lead">
            La configuración modular permite comenzar con lo necesario y ampliar capacidades a medida que evoluciona la operación.
          </p>

          <div className="nk-card-grid nk-steps">
            {steps.map(({ step, title, body }) => (
              <article key={step}>
                <small>{step}</small>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>

        <article className="nk-access-card">
          <p className="nk-eyebrow">Privacidad y control de acceso</p>
          <h2>La información de tu empresa permanece en su propio espacio.</h2>
          <p className="nk-lead">
            Usuarios, permisos, configuración e información operacional se administran de manera independiente para cada organización.
          </p>

          <div className="nk-card-grid nk-values">
            {privacy.map(({ title, body }) => (
              <article key={title}>
                <b>{title}</b>
                <span>{body}</span>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
