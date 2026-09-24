import { mergeCollections } from './report-collections.js'
import { documentEvidenceMessage, hasRequiredEvidence } from './worker-document-rules.js'
export const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
export const normalize = value => String(value || '').trim().toLowerCase()
export const isRestricted = person => Boolean(person?.bloqueado || person?.restringido || /bloquead|restringid/.test(normalize(person?.disponibilidad || person?.operationalStatus)))

const REQUIRED_WORKER_ITEMS = [
  { type: 'documento', name: 'Cédula de identidad', matches: ['cedula', 'cédula'] },
  { type: 'contrato', name: 'Contrato de trabajo', matches: ['contrato'] },
  { type: 'documento', name: 'Certificado AFP', matches: ['afp'] },
  { type: 'documento', name: 'Certificado Fonasa o Isapre', matches: ['fonasa', 'isapre'] },
  { type: 'examen', name: 'Examen preocupacional', matches: ['preocupacional'] },
  { type: 'curso', name: 'ODI / Derecho a Saber', matches: ['odi', 'derecho a saber'] },
  { type: 'curso', name: 'Reglamento Interno', matches: ['reglamento interno'] },
]

const itemMatchesRequirement = (item, requirement) => {
  const name = normalize(item?.name || item?.nombre)
  return (!requirement.type || normalize(item?.type) === requirement.type) && requirement.matches.some(match => name.includes(match))
}

export function daysUntil(value) {
  if (!value) return null
  const target = new Date(`${String(value).slice(0, 10)}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

export function alertKind(item) {
  const urgency = normalize(item.urgencia || item.estado)
  if (['vencido', 'critico', 'crítico', 'falta', 'bloqueado', 'restringido'].includes(urgency)) return 'critical'
  if (['proximo', 'próximo', 'upcoming'].includes(urgency)) return 'upcoming'
  const body = normalize(JSON.stringify(item))
  if (/vencid|restring|bloque|no habil|faltante|rechazad/.test(body)) return 'critical'
  if (/próxim|proxim|vence/.test(body)) return 'upcoming'
  return 'operation'
}

export function deriveOperationalAlerts(state) {
  const derived = []
  const people = rows(state.trabajadores)
  const contracts = rows(state.contratos)
  const orders = mergeCollections(state, 'mantenciones', 'proyectos')

  people.forEach(person => {
    const items = rows(person.workerItems)
    REQUIRED_WORKER_ITEMS.forEach(requirement => {
      const matches = items.filter(item => itemMatchesRequirement(item, requirement))
      const match = matches.find(item => hasRequiredEvidence(item)) || matches[0]
      if (!match || !hasRequiredEvidence(match)) {
        const detail = match ? ` (${documentEvidenceMessage(match)})` : ''
        derived.push({ id: `derived-person-required-${person.id}-${requirement.name}`, tipo: requirement.type, urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: falta ${requirement.name}${detail}`, derived: true })
      }
    })

    items.forEach(item => {
      const left = daysUntil(item.vence)
      const rejected = normalize(item.estado) === 'rechazado'
      const missing = normalize(item.estado) === 'faltante'
      if (rejected) derived.push({ id: `derived-person-rejected-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} rechazado`, derived: true })
      if (missing) derived.push({ id: `derived-person-missing-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: falta ${item.name || 'antecedente'}`, derived: true })
      if (left !== null && left < 0) derived.push({ id: `derived-person-expired-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'vencido', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vencido`, derived: true })
      else if (left !== null && left <= 7) derived.push({ id: `derived-person-critical-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
      else if (left !== null && left <= 30) derived.push({ id: `derived-person-upcoming-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'proximo', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
    })

    if (isRestricted(person)) {
      derived.push({ id: `derived-person-blocked-${person.id}`, tipo: 'persona', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: persona restringida para operar`, derived: true })
    }
  })

  contracts.forEach(contract => {
    const end = contract.fechaTermino || contract.termino
    const left = daysUntil(end)
    if (left !== null && left < 0) derived.push({ id: `derived-contract-expired-${contract.id}`, tipo: 'contrato', urgencia: 'vencido', contratoId: contract.id, minaId: contract.minaId, contratoNombre: contract.nombre || contract.numero, msg: `Contrato ${contract.numero || contract.nombre || contract.id} vencido`, derived: true })
    else if (left !== null && left <= 30) derived.push({ id: `derived-contract-upcoming-${contract.id}`, tipo: 'contrato', urgencia: left <= 7 ? 'critico' : 'proximo', contratoId: contract.id, minaId: contract.minaId, contratoNombre: contract.nombre || contract.numero, msg: `Contrato ${contract.numero || contract.nombre || contract.id} vence en ${left}d`, derived: true })
  })

  orders.forEach(order => {
    if (!order.contratoId) derived.push({ id: `derived-order-contract-${order.id}`, tipo: 'orden', urgencia: 'critico', mantId: order.id, minaId: order.minaId, entidad: order.nombre || order.codigo, msg: `${order.nombre || 'Orden de servicio'}: falta contrato asociado`, derived: true })
    if (!order.minaId) derived.push({ id: `derived-order-client-${order.id}`, tipo: 'orden', urgencia: 'critico', mantId: order.id, entidad: order.nombre || order.codigo, msg: `${order.nombre || 'Orden de servicio'}: falta cliente asociado`, derived: true })
  })

  return derived
}

export function operationalAlerts(state) {
  return [...rows(state.alertas), ...deriveOperationalAlerts(state)]
}
