export default function HomeSection({ openPreview, openDemo }) {
  return (
    <section id="inicio" className="nk-public-section nk-home-section">
      <div className="nk-container nk-hero">
        <div className="nk-hero-copy">
          <span className="nk-badge">Nexo Klar</span>
          <h1>Claridad para gestionar. Control para avanzar.</h1>
          <p>Una plataforma para transformar información operativa en decisiones trazables, procesos ordenados y mayor capacidad de cumplimiento.</p>
          <div className="nk-action-group">
            <button className="nk-button nk-button-primary" onClick={openDemo}>Solicitar una demostración</button>
            <button className="nk-button nk-button-secondary" onClick={openPreview}>Ver plataforma</button>
          </div>
        </div>
        <div className="nk-hero-media"><img src="/dashboard-demo.png" alt="Panel de Nexo Klar" /></div>
      </div>
    </section>
  )
}
