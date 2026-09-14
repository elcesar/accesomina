export default function ProductSection({ openPreview }) {
  return (
    <section id="producto" className="nk-public-section">
      <div className="nk-two-columns nk-product-section">
        <div>
          <p className="nk-eyebrow">Producto real</p>
          <h2>Ve la operación antes de que un pendiente detenga el servicio.</h2>
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
            <img src="/assets/dashboard-demo.png" alt="Panel real de Nexo Klar con dotación, órdenes de servicio y alertas operativas" />
          </button>
          <p className="nk-caption">
            Vista real de Nexo Klar con información demostrativa. Cada empresa trabaja con su propia configuración, usuarios y datos privados.
          </p>
        </div>
      </div>
    </section>
  )
}
