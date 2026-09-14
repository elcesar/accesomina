const points = [
  ['Una fuente común', 'Tu equipo trabaja con información ordenada, conectada y disponible.'],
  ['Órdenes de servicio preparadas', 'Detecta vencimientos, faltantes y restricciones antes de iniciar el trabajo.'],
  ['Historial que permanece', 'El conocimiento queda en la empresa, no disperso en planillas o correos.'],
]

const productNotes = [
  ['Estado operativo', 'Identifica qué servicios están listos y cuáles tienen brechas.'],
  ['Alertas prioritarias', 'Concentra pendientes y vencimientos que requieren acción.'],
  ['Información conectada', 'Accede desde el cliente hasta cada persona, recurso y documento.'],
]

export default function HomeSection({ openDemo, openPreview, onNavigate }) {
  return (
    <section id="inicio" className="nk-hero nk-public-section">
      <div className="nk-hero-copy">
        <p className="nk-eyebrow">Gestión operativa para empresas de servicios</p>
        <h1>
          Convierte información dispersa en una <span>operación que avanza.</span>
        </h1>
        <p className="nk-lead">
          Nexo Klar conecta clientes, contratos, órdenes de servicio, personas, documentos y recursos para que tu equipo sepa qué está listo, qué falta y quién debe actuar.
        </p>

        <div className="nk-actions">
          <button className="nk-button nk-button-primary" type="button" onClick={openDemo}>
            Solicitar demostración
          </button>
          <button
            className="nk-button nk-button-secondary"
            type="button"
            onClick={() => onNavigate?.('solucion')}
          >
            Ver cómo funciona
          </button>
        </div>

        <div className="nk-card-grid nk-hero-points" aria-label="Principales beneficios">
          {points.map(([title, body]) => (
            <article key={title}>
              <b>{title}</b>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="nk-hero-product" aria-label="Vista real de Nexo Klar">
        <button
          className="nk-image-button"
          type="button"
          onClick={openPreview}
          aria-label="Ampliar vista del panel de control de Nexo Klar"
        >
          <img src="/assets/dashboard-demo.png" alt="Panel de control real de Nexo Klar" />
        </button>

        <div className="nk-card-grid nk-hero-product-notes" aria-label="Información del panel">
          {productNotes.map(([title, body]) => (
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
