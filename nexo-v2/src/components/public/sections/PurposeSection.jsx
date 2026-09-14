const values = [
  ['Conexión','Unimos datos, sistemas y personas para que la información fluya sin barreras.'],
  ['Claridad','Hacemos visible lo importante para que cada decisión tenga fundamento.'],
  ['Control','Convertimos la información en dominio de la operación, reduciendo incertidumbre y mejorando el desempeño.'],
  ['Confianza','Damos visibilidad y trazabilidad a datos. No asumir que todo está bien, sino tener la información para comprobarlo.'],
  ['Continuidad','Acompañamos la operación de forma permanente con soluciones confiables, escalables y disponibles cuando más se necesita.'],
]

export default function PurposeSection() {
  return <section id="proposito" className="nk-public-section"><div>
    <p className="nk-eyebrow">Nuestro propósito</p>
    <h2>Creemos que las mejores decisiones nacen de información confiable, conectada y accesible para todos.</h2>
    <p className="nk-lead">La simplicidad guía el producto: hacer visible lo importante, reducir fricción y ayudar a cada persona a saber qué ocurre y qué debe hacer.</p>

    <div className="nk-card-grid nk-statements">
      <article>
        <small>Visión</small>
        <h3>Información disponible en el momento preciso</h3>
        <p>Construir un futuro donde cada decisión operacional se tome con información integrada, confiable y disponible en el momento preciso.</p>
      </article>
      <article>
        <small>Misión</small>
        <h3>Todo empieza por las personas</h3>
        <p>Impulsamos la excelencia operacional de cada empresa con una sola base de información que unifica y conecta su operación, la simplifica y le da control, con datos claros y trazables. Porque todo empieza por las personas: saber quiénes son, qué saben hacer y que estén siempre listas para operar.</p>
      </article>
    </div>

    <div className="nk-card-grid nk-values">{values.map(([t,b])=><article key={t}><b>{t}</b><span>{b}</span></article>)}</div>
  </div></section>
}
