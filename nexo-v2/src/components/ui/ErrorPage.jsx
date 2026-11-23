export function ErrorPage({ code, title, description, icon: Icon, actions, as: Container = 'main' }) {
  return (
    <Container className="nk-error-page">
      <section className="nk-error-page-panel" aria-labelledby="error-page-title">
        <img className="nk-error-page-logo" src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
        <div className="nk-error-page-icon" aria-hidden="true"><Icon size={32} strokeWidth={1.5} /></div>
        <p className="nk-error-page-code">{code}</p>
        <h1 id="error-page-title">{title}</h1>
        <p className="nk-error-page-description">{description}</p>
        <div className="nk-error-page-actions">{actions}</div>
      </section>
    </Container>
  )
}
