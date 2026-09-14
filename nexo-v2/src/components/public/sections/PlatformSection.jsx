const benefits = [
  {
    number: '01',
    title: 'Unifica',
    body: 'Concentra personas, documentos, contratos, formación, exámenes, EPP, vehículos y vencimientos en una sola base.',
  },
  {
    number: '02',
    title: 'Conecta',
    body: 'Relaciona la información con clientes, contratos, órdenes de servicio, personas y recursos para trabajar con contexto.',
  },
  {
    number: '03',
    title: 'Simplifica y controla',
    body: 'Haz visible qué está vigente, qué está por vencer y qué necesita atención antes de afectar la operación.',
  },
]

const mockNavigation = [
  'Panel de control',
  'Clientes',
  'Contratos',
  'Órdenes de servicio',
  'Personas',
  'Cumplimiento',
  'Inventario',
  'Reportería',
]

const mockKpis = [
  ['12', 'Órdenes activas'],
  ['86%', 'Dotación vigente'],
  ['7', 'Alertas por atender'],
]

const mockRows = [
  ['Servicio en terreno', 'Operaciones', 'Vigente'],
  ['Proyecto de instalación', 'Proyectos', 'Por vencer'],
  ['Orden programada', 'Equipo técnico', 'Sin información'],
]

export default function PlatformSection() {
  return (
    <section id="solucion" className="nk-public-section">
      <div className="nk-two-columns">
        <div>
          <p className="nk-eyebrow">Una sola base de información</p>
          <h2>Unificar. Conectar. Simplificar. Controlar.</h2>
          <p className="nk-lead">
            Nexo Klar transforma información dispersa en una operación integrada, confiable y trazable. Cada elemento queda relacionado con la persona, servicio y recurso que corresponde.
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
              <p>Información integrada y disponible</p>

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
