import { useNavigate } from 'react-router-dom'

const points = [
  ['Una fuente común', 'Tu equipo trabaja con información ordenada, conectada y disponible.'],
  ['Servicios preparados', 'Detecta vencimientos, faltantes y restricciones antes de ejecutar.'],
  ['Historial que permanece', 'El conocimiento queda en la empresa, no disperso en planillas o correos.'],
]

export default function HomeSection({ openPreview }) {
  const navigate = useNavigate()
  return <section id="inicio" className="nk-hero nk-public-section">
    <div className="nk-hero-copy">
      <p className="nk-eyebrow">Gestión operativa para empresas de servicios</p>
      <h1>Convierte información dispersa en una <span>operación que avanza</span>.</h1>
      <p className="nk-lead">Nexo Klar conecta clientes, contratos, órdenes de servicio, personas, documentos y recursos para que tu equipo sepa qué está listo, qué falta y quién debe actuar.</p>
      <div className="nk-actions"><a className="nk-button nk-button-primary" href="mailto:contacto@nexoklar.cl?subject=Solicitar%20demostración%20Nexo%20Klar">Solicitar demostración</a><button className="nk-button nk-button-secondary" onClick={() => document.getElementById('solucion')?.scrollIntoView({ behavior: 'smooth' })}>Ver cómo funciona</button></div>
      <div className="nk-card-grid nk-hero-points">{points.map(([title, body]) => <article key={title}><b>{title}</b><span>{body}</span></article>)}</div>
    </div>
    <div className="nk-hero-product">
      <button className="nk-image-button" onClick={openPreview} aria-label="Ampliar vista de Nexo Klar"><img src="/dashboard-demo.png" alt="Panel de control de Nexo Klar" /></button>
      <div className="nk-product-notes">{[['Estado operativo','Identifica qué servicios están listos y cuáles tienen brechas.'],['Alertas prioritarias','Concentra pendientes y vencimientos que requieren acción.'],['Información conectada','Accede desde el cliente hasta cada persona, recurso y documento.']].map(([title,body]) => <article key={title}><b>{title}</b><span>{body}</span></article>)}</div>
    </div>
  </section>
}
