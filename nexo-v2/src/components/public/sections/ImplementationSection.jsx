const steps = [
  {
    step: 'Paso 1',
    title: 'Configura tu empresa',
    body: 'Define clientes, contratos, órdenes de servicio y los requisitos operacionales que necesitas controlar.',
  },
  {
    step: 'Paso 2',
    title: 'Incorpora tu información',
    body: 'Registra personas y recursos de forma individual o utiliza importación masiva para comenzar más rápido.',
  },
  {
    step: 'Paso 3',
    title: 'Gestiona desde el panel',
    body: 'Asigna responsables, revisa alertas, actualiza documentos y consulta el avance desde una sola vista.',
  },
]

const privacy = [
  {
    title: 'Acceso individual',
    body: 'Cada integrante utiliza su propia cuenta autorizada.',
  },
  {
    title: 'Roles y permisos',
    body: 'Configura administración, edición o consulta según responsabilidades.',
  },
  {
    title: 'Datos separados',
    body: 'La información de una empresa no se mezcla con la de otra.',
  },
  {
    title: 'Historial y trazabilidad',
    body: 'Conserva registros para revisar cambios, estados y antecedentes.',
  },
]

export default function ImplementationSection() {
  return (
    <section id="implementacion" className="nk-public-section">
      <div className="nk-two-columns">
        <div>
          <p className="nk-eyebrow">Puesta en marcha simple</p>
          <h2>Empieza ordenado, sin detener tu operación.</h2>
          <p className="nk-lead">
            Partimos con una estructura clara, acompañamos la carga inicial y dejamos la información disponible para cada equipo autorizado.
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
          <h2>Tu información es de tu empresa.</h2>
          <p className="nk-lead">
            Cada empresa trabaja en un espacio privado e independiente. Sus usuarios, permisos, configuraciones y datos permanecen separados de las demás organizaciones.
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
