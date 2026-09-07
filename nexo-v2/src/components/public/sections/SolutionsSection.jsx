export default function SolutionsSection() {
  const solutions = [
    ['Gestión documental', 'Orden y acceso a información relevante.'],
    ['Procesos', 'Flujos claros con responsables y trazabilidad.'],
    ['Indicadores', 'Información operacional para monitorear resultados.'],
    ['Asistencia inteligente', 'Capacidades de IA aplicadas donde aportan valor.'],
  ]

  return (
    <section id="capacidades" className="nk-public-section">
      <div className="nk-container">
        <div className="nk-section-heading">
          <span className="nk-badge">Soluciones</span>
          <h2>Capacidades que se pueden combinar según la necesidad.</h2>
        </div>
        <div className="nk-card-grid nk-card-grid-4">
          {solutions.map(([title, text]) => (
            <article className="nk-card" key={title}><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </div>
    </section>
  )
}
