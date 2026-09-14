import { CustomerAccessPanel } from './CustomerAccessSection.jsx'

const points = [
  ['Unifica', 'Una sola base para tu dotación, documentos, contratos y recursos.'],
  ['Conecta', 'Relaciona personas, operación y cumplimiento para trabajar con contexto.'],
  ['Controla', 'Haz visible lo importante y actúa antes de que un vencimiento detenga la operación.'],
]

export default function HomeSection({ openDemo, onNavigate }) {
  return (
    <section id="inicio" className="nk-hero nk-public-section">
      <div className="nk-hero-copy">
        <p className="nk-eyebrow">Control operacional y cumplimiento</p>
        <h1>
          Tu operación comienza con un <span>nexo de información confiable.</span>
        </h1>
        <p className="nk-lead">
          Nexo Klar ordena tu dotación, tus documentos y tus recursos en una sola base de información para simplificar la operación, mantener el cumplimiento visible y tomar mejores decisiones.
        </p>

        <div className="nk-actions">
          <button
            className="nk-button nk-button-primary"
            type="button"
            onClick={() => onNavigate?.('solucion')}
          >
            Conocer la plataforma
          </button>
          <button className="nk-button nk-button-secondary" type="button" onClick={openDemo}>
            Solicitar demostración
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

      <div id="clientes-access" className="nk-hero-access" aria-label="Registro de nueva empresa">
        <CustomerAccessPanel />
      </div>
    </section>
  )
}
