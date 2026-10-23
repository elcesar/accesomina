import { isValidRut, normalizeRut, isValidChilePhone } from './security.js'
import { validateEmail } from '../nexo-v2/src/services/email-validation.js'
import { AFP_CHILE, PREVISION_SALUD_CHILE } from '../nexo-v2/src/services/chile-social-security.js'
import { CHILE_REGIONES_COMUNAS } from '../nexo-v2/src/config/chile-geography.js'
import { operationalDay } from '../shared/operational-date.js'

const HEADER_NAMES = { mandante:'empresa_principal', minera:'cliente', mineras:'clientes', autorizacion_minera:'autorizacion_cliente', proyecto:'orden_servicio', trabajador:'persona' }
const TYPE_NAMES = { trabajadores:'personas', minas:'clientes', mantenciones:'ordenes_servicio', hoteles:'alojamientos', subcontratos:'terceros', oportunidades:'prospectos_oportunidades' }
export const publicCsvHeader = key => HEADER_NAMES[key] || key
export const publicCsvType = key => TYPE_NAMES[key] || key
export const toPublicCsvRow = row => Object.fromEntries(Object.entries(row).map(([key,value]) => [publicCsvHeader(key),value]))
export function normalizeCsvHeader(value, headers = []) {
  const key = String(value).trim().toLowerCase().replace(/\s+/g,'_')
  if(headers.includes(key))return key
  return Object.keys(HEADER_NAMES).find(old => HEADER_NAMES[old] === key) || key
}
const normalize = value => String(value || '').trim().toLocaleLowerCase('es-CL')
export const WORKER_TYPES = ['permanente','fijo','planta','esporadico','esporádico','temporal','proyecto','por proyecto','spot','disponible']
export const WORKER_IMPORT_INSTRUCTIONS = `Personas · Instrucciones de carga masiva
Obligatorios: nombre y rut. Las filas se numeran incluyendo la cabecera (primera persona: fila 2).
Tipo: ${WORKER_TYPES.join(', ')}. Vacío conserva compatibilidad histórica: categoría por proyecto, disponibilidad disponible. Una importación no crea una asignación a una orden de servicio.
Nacimiento: AAAA-MM-DD, opcional igual que en el alta individual; si se informa debe cumplir la edad mínima configurada. Región y ciudad/comuna deben corresponder al catálogo de Chile.
AFP: ${AFP_CHILE.join(', ')}. Salud: ${PREVISION_SALUD_CHILE.join(', ')}. Vacíos permitidos igual que en alta individual.
Especialidad: valor del catálogo de especialidades de la empresa; vacío permitido. Si la empresa no tiene catálogo, no se impone una lista diferente a la del alta individual.
Se aceptan cabeceras históricas y las actuales. Corregir todos los errores informados antes de volver a importar. No se guardan filas parciales.
`
const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value
const REFS = { contratos:{minera:'minas'}, mantenciones:{minera:'minas',contrato:'contratos'}, turnos:{trabajador:'trabajadores',proyecto:'mantenciones'}, credenciales:{trabajador:'trabajadores',minera:'minas'}, epp:{trabajador:'trabajadores',proyecto:'mantenciones'}, oportunidades:{cliente:'minas',contrato:'contratos'}, subcontratos:{contrato:'contratos'}, vehiculos:{operador:'trabajadores'} }
export function validateImportRows(type, rows, definition, state = {}, { fields, mode = 'append', today = operationalDay(), minimumAge = Number(process.env.MINIMUM_WORKER_AGE || 18), allowedSpecialties = [] } = {}) {
  const issues=[]
  const add=(row,column,code,message,value='')=>issues.push({row,column:publicCsvHeader(column),code,message,value:String(value ?? '').slice(0,200)})
  if (fields) {
    for (const field of definition.required.filter(key=>!fields.includes(key))) add(1,field,'MISSING_COLUMN',`Agrega la columna ${publicCsvHeader(field)}.`)
    for (const field of fields.filter(key=>!definition.headers.includes(key)&&!['tel','arrendado_hasta'].includes(key))) add(1,field,'UNKNOWN_COLUMN',`La columna ${field} no pertenece a esta plantilla. Descarga la plantilla actual.`)
    if (issues.length) return issues
  }
  const ruts=new Set(mode==='append' ? (state[definition.module]||[]).map(row=>normalizeRut(row.rut)).filter(Boolean) : [])
  const refSets=Object.fromEntries(Object.entries(REFS[type]||{}).map(([column,module])=>[column,new Set((state[module]||[]).flatMap(row=>[String(row.id),normalize(row.nombre||row.numero)]))]))
  const ageCutoff = `${Number(today.slice(0,4))-minimumAge}${today.slice(4)}`
  rows.forEach((row,index)=>{
    const line=index+2
    for (const field of definition.required) if (!String(row[field]||'').trim()) add(line,field,'REQUIRED','Completa este dato obligatorio.')
    if (['trabajadores','subcontratos'].includes(type) && row.rut) {
      if (!isValidRut(row.rut)) add(line,'rut','INVALID_RUT','Revisa los números y el dígito verificador del RUT.',row.rut)
      const rut=normalizeRut(row.rut)
      if(ruts.has(rut)) add(line,'rut','DUPLICATE_RUT','El RUT está repetido en el archivo o ya está registrado.',row.rut)
      ruts.add(rut)
    }
    for (const column of ['email']) if(row[column]) {
      const message=validateEmail(row[column]);if(message)add(line,column,'INVALID_EMAIL',message,row[column])
    }
    if(row.telefono && !isValidChilePhone(row.telefono)) add(line,'telefono','INVALID_PHONE','Ingresa un teléfono chileno válido, con código +56.',row.telefono)
    for(const column of ['inicio','termino','fecha','emision','vence','vencimiento','fecha_entrega','proxima_reposicion','cierre_estimado']) if(row[column]&&!validDay(row[column])) add(line,column,'INVALID_DATE','Usa una fecha existente con formato AAAA-MM-DD.',row[column])
    if(row.inicio&&row.termino&&row.inicio>row.termino) add(line,'termino','INVALID_DATES','La fecha de término debe ser igual o posterior al inicio.',row.termino)
    for(const column of ['cantidad','personal_requerido','piezas','camas_por_pieza','horas','monto','probabilidad','altura']) if(row[column]&&(!Number.isFinite(Number(row[column]))||Number(row[column])<0)) add(line,column,'INVALID_NUMBER','Ingresa un número válido igual o mayor que cero.',row[column])
    if(row.probabilidad&&Number(row.probabilidad)>100) add(line,'probabilidad','INVALID_NUMBER','Ingresa una probabilidad entre 0 y 100.',row.probabilidad)
    if(type==='trabajadores') {
      if(row.tipo && !WORKER_TYPES.includes(normalize(row.tipo))) add(line,'tipo','INVALID_WORKER_TYPE',`Usa uno de estos valores: ${WORKER_TYPES.join(', ')}.`,row.tipo)
      if(row.nacimiento && !validDay(row.nacimiento)) add(line,'nacimiento','INVALID_DATE','Usa una fecha existente con formato AAAA-MM-DD.',row.nacimiento)
      else if(row.nacimiento && row.nacimiento>ageCutoff) add(line,'nacimiento','WORKER_UNDERAGE',`La persona debe tener al menos ${minimumAge} años. Revisa su fecha de nacimiento.`,row.nacimiento)
      const region=CHILE_REGIONES_COMUNAS.find(item=>normalize(item.region)===normalize(row.region))
      if(row.region && !region) add(line,'region','INVALID_REGION','Selecciona una región del catálogo de Chile.',row.region)
      if(row.ciudad && region && !region.comunas.some(value=>normalize(value)===normalize(row.ciudad))) add(line,'ciudad','INVALID_CITY','La comuna no pertenece a la región indicada.',row.ciudad)
      for(const [column,options] of [['afp',AFP_CHILE],['salud',PREVISION_SALUD_CHILE]]) if(row[column]&&!options.some(value=>normalize(value)===normalize(row[column]))) add(line,column,'INVALID_CATALOG',`Usa un valor admitido: ${options.join(', ')}.`,row[column])
      if (row.especialidad && allowedSpecialties.length && !allowedSpecialties.some(value => normalize(value) === normalize(row.especialidad))) add(line,'especialidad','INVALID_SPECIALTY','Selecciona una especialidad configurada para esta empresa.',row.especialidad)
    }
    // Validate references only after loading the authorized tenant state, never globally.
    if(!fields) for(const [column,allowed] of Object.entries(refSets)) if(row[column]&&!allowed.has(String(row[column]))&&!allowed.has(normalize(row[column]))) add(line,column,'INVALID_REFERENCE','No existe un registro relacionado con ese nombre o identificador en esta empresa.',row[column])
  })
  return issues
}
