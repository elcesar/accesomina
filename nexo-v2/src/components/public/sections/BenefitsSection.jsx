const items = [
  {
    number: '01',
    title: 'Información confiable',
    body: 'Una sola fuente para saber qué está vigente, qué falta y qué requiere atención.',
  },
  {
    number: '02',
    title: 'Personas listas para operar',
    body: 'Consulta asignaciones, formación, aptitudes, documentos, EPP y credenciales desde la ficha de cada persona.',
  },
  {
    number: '03',
    title: 'Cumplimiento visible',
    body: 'Distingue estados vigentes, por vencer, no habilitados y sin información sin depender solo del color.',
  },
  {
    number: '04',
    title: 'Continuidad operacional',
    body: 'Mantén el conocimiento y la trazabilidad aunque cambien personas, equipos o responsables.',
  },
]

export default function BenefitsSection() {
  return (
    <section id="resultados" className="nk-public-section nk-centered">
      <div>
        <p className="nk-eyebrow">Información que conecta</p>
        <h2>Menos dispersión. Más claridad y control.</h2>
        <p className="nk-lead">
          Las mejores decisiones nacen de información confiable, conectada y accesible para todos.
        </p>

        <div className="nk-card-grid nk-outcome-grid">
          {items.map(({ number, title, body }) => (
            <article key={number}>
              <strong>{number}</strong>
              <b>{title}</b>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
