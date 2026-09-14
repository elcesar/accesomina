const items = [
  {
    number: '01',
    title: 'Personas listas para trabajar',
    body: 'Revisa asignaciones, documentos, formación, aptitudes, equipos de protección personal (EPP) y credenciales.',
  },
  {
    number: '02',
    title: 'Órdenes de servicio preparadas',
    body: 'Detecta brechas de personas, alojamiento, vehículos y recursos antes de iniciar el trabajo.',
  },
  {
    number: '03',
    title: 'Cumplimiento demostrable',
    body: 'Conserva estados, responsables, vencimientos, observaciones e historial.',
  },
  {
    number: '04',
    title: 'Continuidad para crecer',
    body: 'Protege el conocimiento aunque cambien personas, equipos o responsables.',
  },
]

export default function BenefitsSection() {
  return (
    <section id="resultados" className="nk-public-section nk-centered">
      <div>
        <p className="nk-eyebrow">Resultados para tu operación</p>
        <h2>Menos búsqueda. Más control. Mejores decisiones.</h2>
        <p className="nk-lead">
          Todos trabajan sobre una misma base de información para anticipar brechas y mantener cada orden de servicio preparada.
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
