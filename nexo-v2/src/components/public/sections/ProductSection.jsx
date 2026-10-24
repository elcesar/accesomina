export default function ProductSection({ openPreview }) {
  return (
    <section id="producto" className="nk-public-section">
      <div className="nk-two-columns nk-product-section">
        <div>
          <p className="nk-eyebrow">Vista del producto</p>
          <h1>Ve la operación antes de que un pendiente detenga el servicio.</h1>
          <p className="nk-lead">
            Revisa dotación, órdenes de servicio, vencimientos, pendientes y alertas desde un panel centralizado. Identifica rápidamente qué está listo, qué falta y quién debe actuar.
          </p>
        </div>

        <div>
          <button
            className="nk-image-button"
            type="button"
            onClick={openPreview}
            aria-label="Ampliar vista demostrativa del panel de control"
          >
            <img src="/product-overview.svg" alt="Ilustración de Nexo Klar: personas, órdenes de servicio y alertas" />
          </button>
          <p className="nk-caption">
            Ilustración de Nexo Klar con información demostrativa. Cada empresa trabaja con su propia configuración, usuarios e información privada.
          </p>
        </div>
      </div>
    </section>
  )
}
