import { useState } from 'react'
import { IconX } from '@tabler/icons-react'

function Dialog({ title, eyebrow, children, onClose }) {
  return <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="nk-dialog nk-public-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
      <header><div><p className="nk-eyebrow">{eyebrow}</p><h2>{title}</h2></div><button className="nk-icon-button" onClick={onClose} aria-label="Cerrar"><IconX size={18}/></button></header>
      {children}
    </section>
  </div>
}

export function DemoRequestDialog({ onClose }) {
  const [form, setForm] = useState({ nombre:'', empresa:'', correo:'', telefono:'', industria:'', dotacion:'', necesidad:'' })
  const submit = event => { event.preventDefault(); const body=Object.entries(form).map(([key,value])=>`${key}: ${value}`).join('\n'); window.location.href=`mailto:contacto@nexoklar.cl?subject=${encodeURIComponent('Solicitud de demostración Nexo Klar')}&body=${encodeURIComponent(body)}`; onClose() }
  return <Dialog eyebrow="Solicita una demostración" title="Conversemos sobre tu operación." onClose={onClose}><p className="nk-dialog-copy">Cuéntanos lo esencial y prepararemos una conversación enfocada en tu operación.</p><form className="nk-public-form" onSubmit={submit}>{[['nombre','Nombre','Nombre y apellido'],['empresa','Empresa','Nombre de la empresa'],['correo','Correo de trabajo','nombre@empresa.cl'],['telefono','Teléfono','+56 9 1234 5678']].map(([key,label,placeholder])=><label key={key}>{label}<input required={key==='nombre'||key==='correo'} type={key==='correo'?'email':'text'} value={form[key]} onChange={event=>setForm({...form,[key]:event.target.value})} placeholder={placeholder}/></label>)}<label>Industria<select value={form.industria} onChange={event=>setForm({...form,industria:event.target.value})}><option value="">Seleccionar</option>{['Minería','Energía','Construcción','Mantenimiento industrial','Gestión de instalaciones','Logística','Seguridad privada','Agroindustria','Servicios técnicos','Otra'].map(value=><option key={value}>{value}</option>)}</select></label><label>Personas a gestionar<select value={form.dotacion} onChange={event=>setForm({...form,dotacion:event.target.value})}><option value="">Seleccionar</option>{['Hasta 30','31 a 75','76 a 200','Más de 200'].map(value=><option key={value}>{value}</option>)}</select></label><label className="wide">¿Qué proceso quieres ordenar?<textarea rows="3" value={form.necesidad} onChange={event=>setForm({...form,necesidad:event.target.value})} placeholder="Documentos, órdenes de servicio, personas, activos o cumplimiento."/></label><footer><button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary">Preparar solicitud</button></footer></form></Dialog>
}

export function InformationDialog({ kind, onClose }) {
  const content = kind==='faq' ? { eyebrow:'Preguntas frecuentes', title:'Lo esencial antes de implementar.', blocks:[['¿Para qué empresas sirve Nexo Klar?','Para empresas de servicios que necesitan relacionar personas, contratos, órdenes de servicio, documentos y recursos en una misma operación.'],['¿Podemos cargar información histórica?','Sí. La carga puede ser gradual, individual o masiva, priorizando los procesos y datos que cada empresa necesita controlar.'],['¿Las empresas comparten información?','No. Cada empresa trabaja en un espacio privado con sus propios usuarios, permisos, configuraciones y datos.'],['¿Qué acompañamiento recibe el equipo?','La puesta en marcha considera configuración inicial, carga priorizada y acompañamiento según el alcance contratado.']] } : { eyebrow:'Información comercial', title:'Términos y privacidad.', blocks:[['Espacios privados por empresa','Nexo Klar opera con usuarios, permisos, configuraciones y datos separados por empresa.'],['Condiciones de servicio','El alcance, responsabilidades y tratamiento de datos se formalizan en la propuesta y documentación contractual vigente para cada cliente.']] }
  return <Dialog {...content} onClose={onClose}><div className="nk-info-list">{content.blocks.map(([heading,text])=><article key={heading}><b>{heading}</b><p>{text}</p></article>)}</div></Dialog>
}
