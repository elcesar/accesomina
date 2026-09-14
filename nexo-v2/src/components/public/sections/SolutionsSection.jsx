const items = [
  {
    number: '01',
    title: 'Clientes y contratos',
    body: 'Registra empresas, vigencias, alcance, responsables y servicios asociados a cada relación comercial.',
  },
  {
    number: '02',
    title: 'Órdenes de servicio',
    body: 'Organiza operaciones recurrentes y órdenes de servicio, junto con las personas y los recursos asignados.',
  },
  {
    number: '03',
    title: 'Personas y asignaciones',
    body: 'Administra personas y distingue trabajadores fijos, trabajadores por proyecto y sus asignaciones.',
  },
  {
    number: '04',
    title: 'Documentos y vencimientos',
    body: 'Centraliza antecedentes, revisa estados y recibe alertas sobre documentos faltantes o próximos a vencer.',
  },
  {
    number: '05',
    title: 'Seguridad y recursos',
    body: 'Controla equipos de protección personal (EPP), exámenes y aptitudes, formación, permisos, vehículos, equipos, credenciales e incidentes.',
  },
  {
    number: '06',
    title: 'Comunicaciones, reportes y analítica',
    body: 'Segmenta equipos, prepara comunicaciones y genera reportes por cliente, contrato, orden de servicio o persona.',
  },
]

export default function SolutionsSection() {
  return (
    <section id="capacidades" className="nk-public-section">
      <div>
        <p className="nk-eyebrow">Control centralizado</p>
        <h2>Todo lo que necesita un servicio para operar con respaldo.</h2>
        <p className="nk-lead">
          Desde la relación con el cliente hasta la ejecución, el cumplimiento y los resultados: todas las áreas trabajan con una visión común.
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
