import { mergeCollections } from './report-collections.js'

export const OPPORTUNITY_COLLECTIONS = ['prospectos', 'oportunidades', 'opportunities']

export function opportunityRows(state) {
  return mergeCollections(state, ...OPPORTUNITY_COLLECTIONS)
}

export function opportunityFields(item) {
  const type = String(item.type || item.tipo || 'nuevo_cliente').toLowerCase()
  const stage = String(item.stage || item.etapa || 'prospecto').toLowerCase()
  return {
    ...item,
    type: ({ cliente: 'nuevo_cliente', contrato: 'nuevo_contrato', proyecto: 'nuevo_servicio' })[type] || type,
    stage: ({ calificada: 'levantamiento', calificado: 'levantamiento', contactado: 'contactada' })[stage] || stage,
    company: item.company || item.empresa || item.razon || item.razonSocial || item.name || '',
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
  }
}
