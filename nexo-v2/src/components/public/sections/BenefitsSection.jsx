const items = [
  ['01','Información confiable','Una sola fuente para saber qué está vigente, qué falta y qué requiere atención.'],
  ['02','Personas listas para operar','Consulta asignaciones, formación, aptitudes, documentos, EPP y credenciales desde la ficha de cada persona.'],
  ['03','Cumplimiento visible','Distingue estados vigentes, por vencer, no habilitados y sin información sin depender solo del color.'],
  ['04','Continuidad operacional','Mantén el conocimiento y la trazabilidad aunque cambien personas, equipos o responsables.'],
]

export default function BenefitsSection() {
  return <section id="resultados" className="nk-public-section nk-centered"><div>
    <p className="nk-eyebrow">Información que conecta</p>
    <h2>Menos dispersión. Más claridad y control.</h2>
    <p className="nk-lead">Las mejores decisiones nacen de información confiable, conectada y accesible para todos.</p>
    <div className="nk-card-grid nk-outcome-grid">{items.map(([n,t,b])=><article key={n}><strong>{n}</strong><b>{t}</b><span>{b}</span></article>)}</div>
  </div></section>
}
