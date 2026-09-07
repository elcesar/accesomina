export default function ProductSection({ openPreview }) {
  return (
    <section id="producto" className="nk-public-section">
      <div className="nk-container nk-product-layout">
        <div>
          <span className="nk-badge">Producto</span>
          <h2>Una experiencia diseñada para que la gestión sea simple.</h2>
          <p>Una interfaz clara, orientada a las tareas y a la información que las personas realmente necesitan para operar.</p>
          <button className="nk-button nk-button-primary" onClick={openPreview}>Explorar vista</button>
        </div>
        <div className="nk-card nk-product-preview"><img src="/dashboard-demo.png" alt="Interfaz de Nexo Klar" /></div>
      </div>
    </section>
  )
}
