import { CustomerAccessPanel } from './CustomerAccessSection.jsx'

const points = [
  ['Menos tareas manuales', 'La información operativa queda ordenada y disponible para las áreas autorizadas.'],
  ['Alertas a tiempo', 'Identifica vencimientos, faltantes y observaciones antes de que afecten el servicio.'],
  ['Decisiones con respaldo', 'Consulta estados, documentos e historial desde una única fuente de información.'],
]

export default function HomeSection({ openDemo, onNavigate, accessTab = 'login' }) {
  return <section id="inicio" className="nk-hero nk-public-section">
    <div className="nk-hero-copy">
      <p className="nk-eyebrow">Gestión operativa para empresas de servicios</p>
      <h1>Toda tu operación, conectada y <span>bajo control</span>.</h1>
      <p className="nk-lead">Nexo Klar reúne clientes, contratos, órdenes de servicio, personas, documentos y recursos en una plataforma privada para que tu equipo sepa qué está vigente, qué falta y qué requiere atención.</p>
      <div className="nk-actions">
        <button className="nk-button nk-button-primary" type="button" onClick={() => onNavigate?.('solucion')}>Conocer la plataforma</button>
        <button className="nk-button nk-button-secondary" type="button" onClick={openDemo}>Solicitar demostración</button>
      </div>
      <div className="nk-card-grid nk-hero-points">
        {points.map(([title, body]) => <article key={title}><b>{title}</b><span>{body}</span></article>)}
      </div>
    </div>

    <div id="clientes-access" className="nk-hero-access" aria-label="Acceso y creación de empresa">
      <CustomerAccessPanel initialTab={accessTab} />
    </div>
  </section>
}
