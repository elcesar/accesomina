const benefits = [
  ['01','Unifica','Concentra personas, documentos, contratos, formación, exámenes, EPP, vehículos y vencimientos en una sola base.'],
  ['02','Conecta','Relaciona la información con clientes, contratos, órdenes de servicio, personas y recursos para trabajar con contexto.'],
  ['03','Simplifica y controla','Haz visible qué está vigente, qué está por vencer y qué necesita atención antes de afectar la operación.'],
]

export default function PlatformSection() {
  return <section id="solucion" className="nk-public-section"><div className="nk-two-columns">
    <div>
      <p className="nk-eyebrow">Una sola base de información</p>
      <h2>Unificar. Conectar. Simplificar. Controlar.</h2>
      <p className="nk-lead">Nexo Klar transforma información dispersa en una operación integrada, confiable y trazable. Cada elemento queda relacionado con la persona, servicio y recurso que corresponde.</p>
      <div className="nk-number-list">{benefits.map(([n,t,b]) => <article key={n}><strong>{n}</strong><div><b>{t}</b><span>{b}</span></div></article>)}</div>
    </div>
    <div className="nk-product-mock"><header><i/><i/><i/><span>Nexo Klar · Panel de control</span></header><div><aside>{['Panel de control','Clientes','Contratos','Órdenes de servicio','Personas','Cumplimiento','Inventario','Reportería'].map((x,i) => <span className={i===0 ? 'active':''} key={x}>{x}</span>)}</aside><main><h3>Resumen de la operación</h3><p>Información integrada y disponible</p><div className="nk-mini-kpis">{[['12','Órdenes activas'],['86%','Dotación vigente'],['7','Alertas por atender']].map(([v,l])=><article key={l}><b>{v}</b><small>{l}</small></article>)}</div>{[['Servicio en terreno','Operaciones','Vigente'],['Proyecto de instalación','Proyectos','Por vencer'],['Orden programada','Equipo técnico','Sin información']].map(row=><div className="nk-mock-row" key={row[0]}>{row.map(cell=><span key={cell}>{cell}</span>)}</div>)}</main></div></div>
  </div></section>
}
