const benefits = [
  {
    number: '01',
    title: 'Coordina con contexto',
    body: 'Consulta responsables, personas, documentos, turnos, alojamiento y recursos desde cada orden de servicio.',
  },
  {
    number: '02',
    title: 'Actúa a tiempo',
    body: 'Identifica pendientes, vencimientos y brechas operativas con paneles claros.',
  },
  {
    number: '03',
    title: 'Responde con evidencia',
    body: 'Conserva historial, documentos y responsables para revisiones, clientes y auditorías.',
  },
]

const mockNavigation = [
  'Panel de control',
  'Empresas y clientes',
  'Contratos',
  'Órdenes de servicio',
  'Personas',
  'Documentos',
  'Alertas',
  'Reportes y analítica',
]

const mockKpis = [
  ['12', 'Servicios activos'],
  ['86%', 'Documentación vigente'],
  ['7', 'Alertas por atender'],
]

const mockRows = [
  ['Servicio en terreno', 'Equipo de Operaciones', 'Al día'],
  ['Proyecto de instalación', 'Equipo de Proyectos', 'En curso'],
  ['Orden programada', 'Equipo técnico', 'Revisar'],
]

export default function PlatformSection() {
  return (
    <section id="solucion" className="nk-public-section">
      <div className="nk-two-columns">
        <div>
          <p className="nk-eyebrow">Una operación conectada de principio a fin</p>
          <h2>De la oportunidad al servicio cerrado.</h2>
          <p className="nk-lead">
            Nexo Klar transforma datos dispersos en una operación clara, trazable y fácil de seguir. La información se registra una vez y se relaciona con el cliente, contrato, orden de servicio, persona y recurso correspondiente.
          </p>

          <div className="nk-number-list">
            {benefits.map(({ number, title, body }) => (
              <article key={number}>
                <strong>{number}</strong>
                <div>
                  <b>{title}</b>
                  <span>{body}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="nk-product-mock" aria-label="Vista demostrativa del panel de control">
          <header>
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <span>Nexo Klar · Panel de control</span>
          </header>

          <div>
            <aside aria-label="Módulos de ejemplo">
              {mockNavigation.map((item, index) => (
                <span className={index === 0 ? 'active' : ''} key={item}>
                  {item}
                </span>
              ))}
            </aside>

            <main>
              <h3>Resumen de la operación</h3>
              <p>Información centralizada y actualizada</p>

              <div className="nk-mini-kpis">
                {mockKpis.map(([value, label]) => (
                  <article key={label}>
                    <b>{value}</b>
                    <small>{label}</small>
                  </article>
                ))}
              </div>

              {mockRows.map(row => (
                <div className="nk-mock-row" key={row[0]}>
                  {row.map(cell => <span key={cell}>{cell}</span>)}
                </div>
              ))}
            </main>
          </div>
        </div>
      </div>
    </section>
  )
}
