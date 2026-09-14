const industries = [
  {
    number: '01',
    title: 'Minería',
    body: 'Habilitación, centros de trabajo, contratistas y documentos críticos siempre al día.',
  },
  {
    number: '02',
    title: 'Energía',
    body: 'Cuadrillas, permisos, mantenimiento y seguridad operacional en terreno.',
  },
  {
    number: '03',
    title: 'Construcción',
    body: 'Contratistas, avances, turnos, evidencias y control por obra.',
  },
  {
    number: '04',
    title: 'Mantenimiento industrial',
    body: 'Despacho de técnicos, herramientas, repuestos, costos y trazabilidad.',
  },
  {
    number: '05',
    title: 'Gestión de instalaciones',
    body: 'Servicios recurrentes, personal externo, alojamiento, recursos y reportes por cliente.',
  },
  {
    number: '06',
    title: 'Logística',
    body: 'Turnos, vehículos, credenciales, despachos operativos y respaldo documental.',
  },
  {
    number: '07',
    title: 'Seguridad privada',
    body: 'Dotación, credenciales, turnos, asistencia y cumplimiento por instalación.',
  },
  {
    number: '08',
    title: 'Agroindustria',
    body: 'Temporadas, cuadrillas, EPP, asistencia y documentación del personal.',
  },
  {
    number: '09',
    title: 'Servicios técnicos',
    body: 'Órdenes de servicio, recursos, contratos, documentación, costos y trazabilidad.',
  },
]

export default function IndustriesSection() {
  return (
    <section id="industrias" className="nk-public-section">
      <div>
        <div className="nk-industry-heading">
          <div>
            <p className="nk-eyebrow">Adaptable a tu industria</p>
            <h2>Se adapta a la forma en que trabaja tu empresa.</h2>
          </div>
          <p className="nk-lead">
            Una misma base de información para coordinar personas, recursos, documentación, turnos y servicios en terreno, adaptada a la realidad de cada industria.
          </p>
        </div>

        <div className="nk-card-grid nk-industries-grid">
          {industries.map(({ number, title, body }) => (
            <article key={number}>
              <small>{number}</small>
              <b>{title}</b>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
