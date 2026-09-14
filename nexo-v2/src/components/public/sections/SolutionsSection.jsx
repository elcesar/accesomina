const items = [
  ['01','Personas y dotación','Administra personas, asignaciones, identificadores, formación, aptitudes, credenciales y documentación habilitante.'],
  ['02','Clientes, contratos y servicios','Relaciona clientes, contratos, órdenes de servicio y responsables para mantener el contexto comercial y operacional.'],
  ['03','Cumplimiento','Controla vigencias, vencimientos, faltantes y observaciones con estados claros y trazables.'],
  ['04','Recursos e inventario','Gestiona EPP, vehículos, equipos, herramientas, materiales, alojamientos y otros recursos de la operación.'],
  ['05','Proyectos y operación','Coordina turnos, ejecución, Libro de Obra, incidentes, comunicaciones y actividades asociadas a cada servicio.'],
  ['06','Control y reportería','Consulta paneles, alertas, historial y reportes para tomar decisiones con información integrada.'],
]

export default function SolutionsSection() {
  return <section id="capacidades" className="nk-public-section"><div>
    <p className="nk-eyebrow">Una plataforma modular</p>
    <h2>Activa lo que tu operación necesita.</h2>
    <p className="nk-lead">Nexo Klar se configura por módulos y acompaña el crecimiento de cada empresa sin perder una base común de información.</p>
    <div className="nk-card-grid nk-solutions-grid">{items.map(([n,t,b])=><article key={n}><small>{n}</small><h3>{t}</h3><p>{b}</p></article>)}</div>
  </div></section>
}
