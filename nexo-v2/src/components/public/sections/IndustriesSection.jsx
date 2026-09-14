const industries = [
  ['01','Minería','Dotación, acreditaciones, contratos, turnos, EPP, vehículos y recursos para operaciones exigentes en terreno.'],
  ['02','Energía','Cuadrillas, permisos, mantenimiento, recursos y cumplimiento operacional en terreno.'],
  ['03','Construcción','Personas, contratos, avances, turnos, recursos y control por obra.'],
  ['04','Mantenimiento industrial','Técnicos, herramientas, equipos, repuestos, servicios y trazabilidad operacional.'],
  ['05','Gestión de instalaciones','Servicios recurrentes, personas, recursos, turnos y cumplimiento por instalación.'],
  ['06','Logística','Turnos, vehículos, credenciales, recursos y control de la operación.'],
  ['07','Seguridad privada','Dotación, credenciales, turnos, asistencia y cumplimiento por instalación.'],
  ['08','Agroindustria','Temporadas, cuadrillas, EPP, asistencia y documentación habilitante.'],
  ['09','Servicios técnicos','Personas, contratos, órdenes de servicio, recursos y control operacional.'],
]

export default function IndustriesSection() {
  return <section id="industrias" className="nk-public-section"><div>
    <div className="nk-industry-heading">
      <div><p className="nk-eyebrow">Una base, distintas operaciones</p><h2>Diseñado para empresas que necesitan saber quién está listo para operar.</h2></div>
      <p className="nk-lead">La plataforma se adapta a distintos sectores manteniendo el mismo principio: información integrada, confiable y disponible en el momento preciso.</p>
    </div>
    <div className="nk-card-grid nk-industries-grid">{industries.map(([n,t,b])=><article key={n}><small>{n}</small><b>{t}</b><span>{b}</span></article>)}</div>
  </div></section>
}
