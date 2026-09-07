export default function CustomerAccessSection() {
  return (
    <section id="clientes-access" className="nk-public-section nk-access-section">
      <div className="nk-container nk-access-card">
        <div>
          <span className="nk-badge">Acceso</span>
          <h2>¿Ya eres cliente de Nexo Klar?</h2>
          <p>Ingresa a tu entorno para continuar con la gestión de tu organización.</p>
        </div>
        <a className="nk-button nk-button-primary" href="/login">Ingresar</a>
      </div>
    </section>
  )
}
