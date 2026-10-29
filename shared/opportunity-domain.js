export const OPPORTUNITY_COLLECTIONS = ['prospectos', 'oportunidades', 'opportunities']

const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const normalizedText = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const stableValue = value => {
  if (Array.isArray(value)) return '[' + value.map(stableValue).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableValue(value[key])).join(',') + '}'
  return JSON.stringify(value ?? null)
}
const recordKey = record => record?.id !== undefined && record?.id !== null && String(record.id).trim() ? 'id:' + record.id : 'value:' + stableValue(record)

// Read legacy collections first; a record in prospectos with the same ID is canonical.
export function opportunityRows(state) {
  const merged = new Map()
  OPPORTUNITY_COLLECTIONS.slice().reverse().forEach(collection => {
    rows(state?.[collection]).forEach(record => merged.set(recordKey(record), record))
  })
  return [...merged.values()]
}

export function opportunityFields(item = {}) {
  const rawType = String(item.type || item.tipo || '').trim().toLowerCase()
  const rawStage = String(item.stage || item.etapa || '').trim().toLowerCase()
  const type = ({ cliente: 'nuevo_cliente', contrato: 'nuevo_contrato', proyecto: 'nuevo_servicio' })[rawType] || rawType
  const stage = ({ calificada: 'levantamiento', calificado: 'levantamiento', contactado: 'contactada' })[rawStage] || rawStage
  const company = item.company || item.empresa || item.razon || item.razonSocial || item.name || ''
  return {
    ...item, type, stage, company,
    service: item.service || item.servicio || '',
    contact: item.contact || item.contacto || item.contactName || item.nombreContacto || '',
    role: item.role || item.cargo || '',
    email: item.email || item.correo || '',
    phone: item.phone || item.telefono || item.tel || '',
    amount: item.amount ?? item.monto ?? item.value ?? 0,
    probability: item.probability ?? item.probabilidad ?? 20,
    expectedClose: item.expectedClose || item.cierreEstimado || '',
    nextAction: item.nextAction || item.proximaGestion || item.nextActionAt || item.proximaAccion || '',
    owner: item.owner || item.responsable || '',
    clientId: item.clientId || item.minaId || '',
    contractId: item.contractId || item.contratoId || '',
    notes: item.notes || item.notas || '',
    dataQuality: { missingType: !rawType, missingStage: !rawStage },
  }
}

export const opportunityIsClosed = item => ['ganada', 'perdida'].includes(opportunityFields(item).stage)

// Active deals identify by RUT when present. Without it, company, type and commercial scope
// form the business key. Closed deals intentionally preserve repeated history.
export function opportunityIdentity(item) {
  const value = opportunityFields(item)
  if (opportunityIsClosed(value)) return ''
  const type = value.type || 'sin_tipo'
  const rut = normalizedText(value.rut).replace(/[^0-9k]/g, '')
  if (rut) return 'rut:' + rut + '|tipo:' + type
  if (!normalizedText(value.company)) return ''
  return ['empresa:' + normalizedText(value.company), 'tipo:' + type, 'cliente:' + String(value.clientId || ''), 'contrato:' + String(value.contractId || '')].join('|')
}

export function canonicalizeOpportunityState(state) {
  const prospects = opportunityRows(state).map(opportunityFields)
  return { ...state, prospectos: prospects, oportunidades: [], opportunities: [] }
}
