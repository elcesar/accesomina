export const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
export const normalize = value => String(value || '').trim().toLowerCase()

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
  const orders = rows(state.mantenciones).length || state.mantenciones ? rows(state.mantenciones) : rows(state.proyectos)

  people.forEach(person => {
    rows(person.workerItems).forEach(item => {
      const left = daysUntil(item.vence)
      const rejected = normalize(item.estado) === 'rechazado'
      if (rejected) derived.push({ id: `derived-person-rejected-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} rechazado`, derived: true })
      if (left !== null && left < 0) derived.push({ id: `derived-person-expired-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'vencido', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vencido`, derived: true })
      else if (left !== null && left <= 7) derived.push({ id: `derived-person-critical-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'critico', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
      else if (left !== null && left <= 30) derived.push({ id: `derived-person-upcoming-${person.id}-${item.id || item.name}`, tipo: item.type || 'documento', urgencia: 'proximo', trabId: person.id, msg: `${person.nombre}: ${item.name || 'antecedente'} vence en ${left}d`, derived: true })
    })

    if (person.bloqueado || normalize(person.disponibilidad) === 'bloqueado' || normalize(person.operationalStatus) === 'bloqueado') {
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
