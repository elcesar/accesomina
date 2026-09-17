export default function ContactSection({ openDemo, openCompanyRegistration }) {
  return (
    <section id="contacto" className="nk-public-section nk-final-cta">
      <div>
        <p className="nk-eyebrow">Conversemos</p>
        <h2>Conecta tu operación sobre una sola base de información.</h2>
        <p className="nk-lead">
          Cuéntanos cómo administras hoy personas, documentos, recursos y cumplimiento. Revisaremos contigo qué módulos necesita tu empresa para comenzar.
        </p>
        <div className="nk-actions">
          <button className="nk-button nk-button-primary" type="button" onClick={openDemo}>
            Solicitar demostración
          </button>
          <button className="nk-button nk-button-secondary" type="button" onClick={openCompanyRegistration}>
            Crear empresa
          </button>
        </div>
      </div>
    </section>
  )
}
