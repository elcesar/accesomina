export default function IndustriesSection() {
  const industries = ['Minería', 'Industria', 'Servicios', 'Logística', 'Construcción', 'Organizaciones reguladas']

  return (
    <section id="industrias" className="nk-public-section">
      <div className="nk-container">
        <div className="nk-section-heading">
          <span className="nk-badge">Industrias</span>
          <h2>Una base flexible para distintos contextos operativos.</h2>
          <p>La plataforma puede adaptarse a organizaciones donde la coordinación, la evidencia y el cumplimiento son especialmente relevantes.</p>
        </div>
        <div className="nk-chip-list">
          {industries.map(industry => <span className="nk-badge" key={industry}>{industry}</span>)}
        </div>
      </div>
    </section>
  )
}
