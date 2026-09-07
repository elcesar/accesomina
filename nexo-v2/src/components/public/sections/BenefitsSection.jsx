export default function BenefitsSection() {
  const benefits = [
    ['Más visibilidad', 'Convierte información dispersa en una visión común.'],
    ['Menos fricción', 'Simplifica tareas y reduce pasos innecesarios.'],
    ['Mayor trazabilidad', 'Facilita saber qué ocurrió, cuándo y quién participó.'],
    ['Decisiones informadas', 'Entrega contexto para actuar con mayor confianza.'],
  ]

  return (
    <section id="resultados" className="nk-public-section">
      <div className="nk-container">
        <div className="nk-section-heading">
          <span className="nk-badge">Beneficios</span>
          <h2>El resultado es una organización más clara y controlable.</h2>
        </div>
        <div className="nk-card-grid nk-card-grid-4">
          {benefits.map(([title, text]) => (
            <article className="nk-card" key={title}><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </div>
    </section>
  )
}
