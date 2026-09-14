const steps = [
  ['Paso 1', 'Configura tu empresa', 'Define la estructura operacional, clientes, contratos, órdenes de servicio y módulos que necesitas utilizar.'],
  ['Paso 2', 'Incorpora tu información', 'Registra personas, documentos y recursos de forma individual o mediante importación masiva.'],
  ['Paso 3', 'Opera con control', 'Consulta estados, alertas, responsables e historial desde una sola base de información.'],
]

const privacy = [
  ['Acceso individual', 'Cada persona utiliza su propia cuenta autorizada.'],
  ['Roles y permisos', 'La información visible y editable depende de las responsabilidades asignadas.'],
  ['Información separada', 'Cada empresa trabaja en un espacio independiente.'],
  ['Trazabilidad', 'Los cambios y estados relevantes quedan disponibles para revisión.'],
]

export default function ImplementationSection() {
  return <section id="implementacion" className="nk-public-section">
    <div className="nk-two-columns">
      <div>
        <p className="nk-eyebrow">Puesta en marcha simple</p>
        <h2>Empieza con una estructura clara y crece sobre la misma base.</h2>
        <p className="nk-lead">La configuración modular permite comenzar con lo necesario y ampliar capacidades a medida que evoluciona la operación.</p>
        <div className="nk-card-grid nk-steps">
          {steps.map(([n, title, body]) => <article key={n}><small>{n}</small><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </div>

      <article className="nk-access-card">
        <p className="nk-eyebrow">Privacidad y control de acceso</p>
        <h2>La información de tu empresa permanece en su propio espacio.</h2>
        <p className="nk-lead">Usuarios, permisos, configuración e información operacional se administran de manera independiente para cada organización.</p>
        <div className="nk-card-grid nk-values">
          {privacy.map(([title, body]) => <article key={title}><b>{title}</b><span>{body}</span></article>)}
        </div>
      </article>
    </div>
  </section>
}
