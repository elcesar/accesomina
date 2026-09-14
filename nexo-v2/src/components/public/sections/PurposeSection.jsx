const values = [
  {
    title: 'Claridad',
    body: 'Información fácil de entender, seguir y gestionar.',
  },
  {
    title: 'Conexión',
    body: 'Áreas, personas, documentos y procesos en una plataforma.',
  },
  {
    title: 'Control',
    body: 'Datos seguros, actualizados y dentro de la compañía.',
  },
  {
    title: 'Simplicidad',
    body: 'Una herramienta práctica y pensada para el uso diario.',
  },
  {
    title: 'Trazabilidad',
    body: 'Cada cambio, documento y vencimiento deja historial.',
  },
  {
    title: 'Continuidad',
    body: 'El conocimiento permanece aunque cambien los equipos.',
  },
]

const statements = [
  {
    label: 'Visión',
    title: 'Una operación más simple y controlada',
    body: 'Ser la plataforma que ayuda a las empresas a simplificar, unificar y controlar su información operativa, manteniendo los datos críticos dentro de la compañía.',
  },
  {
    label: 'Misión',
    title: 'Conectar la información que mueve a la empresa',
    body: 'Conectar personas, documentos, contratos y operaciones en un sistema fácil de usar, con información clara, estructurada y trazable para reducir riesgos y tomar mejores decisiones.',
  },
]

export default function PurposeSection() {
  return (
    <section id="proposito" className="nk-public-section">
      <div>
        <p className="nk-eyebrow">Nuestro propósito</p>
        <h2>Información clara que permanece y genera continuidad.</h2>
        <p className="nk-lead">
          Nexo Klar nace para simplificar, unificar y conectar la gestión diaria, evitando que la información crítica quede dispersa en personas, planillas, correos o carpetas.
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
