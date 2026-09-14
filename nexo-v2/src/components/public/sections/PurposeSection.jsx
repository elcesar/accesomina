const values = [
  {
    title: 'Conexión',
    body: 'Unimos datos, sistemas y personas para que la información fluya sin barreras.',
  },
  {
    title: 'Claridad',
    body: 'Hacemos visible lo importante para que cada decisión tenga fundamento.',
  },
  {
    title: 'Control',
    body: 'Convertimos la información en dominio de la operación, reduciendo incertidumbre y mejorando el desempeño.',
  },
  {
    title: 'Confianza',
    body: 'Damos visibilidad y trazabilidad a datos. No asumir que todo está bien, sino tener la información para comprobarlo.',
  },
  {
    title: 'Continuidad',
    body: 'Acompañamos la operación de forma permanente con soluciones confiables, escalables y disponibles cuando más se necesita.',
  },
]

const statements = [
  {
    label: 'Visión',
    title: 'Información disponible en el momento preciso',
    body: 'Construir un futuro donde cada decisión operacional se tome con información integrada, confiable y disponible en el momento preciso.',
  },
  {
    label: 'Misión',
    title: 'Todo empieza por las personas',
    body: 'Impulsamos la excelencia operacional de cada empresa con una sola base de información que unifica y conecta su operación, la simplifica y le da control, con datos claros y trazables. Porque todo empieza por las personas: saber quiénes son, qué saben hacer y que estén siempre listas para operar.',
  },
]

export default function PurposeSection() {
  return (
    <section id="proposito" className="nk-public-section">
      <div>
        <p className="nk-eyebrow">Nuestro propósito</p>
        <h2>Creemos que las mejores decisiones nacen de información confiable, conectada y accesible para todos.</h2>
        <p className="nk-lead">
          La simplicidad guía el producto: hacer visible lo importante, reducir fricción y ayudar a cada persona a saber qué ocurre y qué debe hacer.
        </p>

        <div className="nk-card-grid nk-statements">
          {statements.map(({ label, title, body }) => (
            <article key={label}>
              <small>{label}</small>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <div className="nk-card-grid nk-values">
          {values.map(({ title, body }) => (
            <article key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
