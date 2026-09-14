export default function ProductSection({ openPreview }) {
  return (
    <section id="producto" className="nk-public-section">
      <div className="nk-two-columns nk-product-section">
        <div>
          <p className="nk-eyebrow">Control operacional y cumplimiento</p>
          <h2>Todo empieza por las personas.</h2>
          <p className="nk-lead">
            Consulta quiénes son, qué saben hacer, qué documentación tienen vigente y si están listas para operar. Desde esa base, Nexo Klar conecta contratos, órdenes de servicio, recursos y cumplimiento.
          </p>
        </div>

        <div>
          <button
            className="nk-image-button"
            type="button"
            onClick={openPreview}
            aria-label="Ampliar vista demostrativa del panel de control"
          >
            <img src="/assets/dashboard-demo.png" alt="Panel de control de Nexo Klar" />
          </button>
          <p className="nk-caption">
            Vista demostrativa. Cada empresa trabaja con su propia configuración, usuarios autorizados e información independiente.
          </p>
        </div>
      </div>
    </section>
  )
}
