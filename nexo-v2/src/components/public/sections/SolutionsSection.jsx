const items = [
  {
    number: '01',
    title: 'Personas y dotación',
    body: 'Administra personas, asignaciones, identificadores, formación, aptitudes, credenciales y documentación habilitante.',
  },
  {
    number: '02',
    title: 'Clientes, contratos y servicios',
    body: 'Relaciona clientes, contratos, órdenes de servicio y responsables para mantener el contexto comercial y operacional.',
  },
  {
    number: '03',
    title: 'Cumplimiento',
    body: 'Controla vigencias, vencimientos, faltantes y observaciones con estados claros y trazables.',
  },
  {
    number: '04',
    title: 'Recursos e inventario',
    body: 'Gestiona EPP, vehículos, equipos, herramientas, materiales, alojamientos y otros recursos de la operación.',
  },
  {
    number: '05',
    title: 'Proyectos y operación',
    body: 'Coordina turnos, ejecución, Libro de Obra, incidentes, comunicaciones y actividades asociadas a cada servicio.',
  },
  {
    number: '06',
    title: 'Control y reportería',
    body: 'Consulta paneles, alertas, historial y reportes para tomar decisiones con información integrada.',
  },
]

export default function SolutionsSection() {
  return (
    <section id="capacidades" className="nk-public-section">
      <div>
        <p className="nk-eyebrow">Una plataforma modular</p>
        <h2>Activa lo que tu operación necesita.</h2>
        <p className="nk-lead">
          Nexo Klar se configura por módulos y acompaña el crecimiento de cada empresa sin perder una base común de información.
        </p>

        <div className="nk-card-grid nk-solutions-grid">
          {items.map(({ number, title, body }) => (
            <article key={number}>
              <small>{number}</small>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
