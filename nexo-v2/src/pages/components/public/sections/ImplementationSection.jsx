export default function ImplementationSection() {
  const steps = [
    ['1', 'Entender', 'Levantamos necesidades, procesos e información crítica.'],
    ['2', 'Configurar', 'Adaptamos la solución al contexto de la organización.'],
    ['3', 'Adoptar', 'Acompañamos la puesta en marcha y el uso cotidiano.'],
    ['4', 'Mejorar', 'Medimos resultados y priorizamos mejoras continuas.'],
  ]

  return (
    <section id="implementacion" className="nk-public-section">
      <div className="nk-container">
        <div className="nk-section-heading">
          <span className="nk-badge">Implementación y privacidad</span>
          <h2>Implementación gradual, con foco en seguridad y control.</h2>
        </div>
        <div className="nk-card-grid nk-card-grid-4">
          {steps.map(([number, title, text]) => (
            <article className="nk-card" key={number}>
              <span className="nk-step-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
