const industries = [
  {
    number: '01',
    title: 'Minería',
    body: 'Dotación, acreditaciones, contratos, turnos, EPP, vehículos y recursos para operaciones exigentes en terreno.',
  },
  {
    number: '02',
    title: 'Energía',
    body: 'Cuadrillas, permisos, mantenimiento, recursos y cumplimiento operacional en terreno.',
  },
  {
    number: '03',
    title: 'Construcción',
    body: 'Personas, contratos, avances, turnos, recursos y control por obra.',
  },
  {
    number: '04',
    title: 'Mantenimiento industrial',
    body: 'Técnicos, herramientas, equipos, repuestos, servicios y trazabilidad operacional.',
  },
  {
    number: '05',
    title: 'Gestión de instalaciones',
    body: 'Servicios recurrentes, personas, recursos, turnos y cumplimiento por instalación.',
  },
  {
    number: '06',
    title: 'Logística',
    body: 'Turnos, vehículos, credenciales, recursos y control de la operación.',
  },
  {
    number: '07',
    title: 'Seguridad privada',
    body: 'Dotación, credenciales, turnos, asistencia y cumplimiento por instalación.',
  },
  {
    number: '08',
    title: 'Agroindustria',
    body: 'Temporadas, cuadrillas, EPP, asistencia y documentación habilitante.',
  },
  {
    number: '09',
    title: 'Servicios técnicos',
    body: 'Personas, contratos, órdenes de servicio, recursos y control operacional.',
  },
]

export default function IndustriesSection() {
  return (
    <section id="industrias" className="nk-public-section">
      <div>
        <div className="nk-industry-heading">
          <div>
            <p className="nk-eyebrow">Una base, distintas operaciones</p>
            <h2>Diseñado para empresas que necesitan saber quién está listo para operar.</h2>
          </div>
          <p className="nk-lead">
            La plataforma se adapta a distintos sectores manteniendo el mismo principio: información integrada, confiable y disponible en el momento preciso.
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
