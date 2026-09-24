import { mergeCollections, rows } from './report-collections.js'

const normalize = value => String(value || '').trim().toLowerCase()

function serializeClient(draft, id, creating) {
  const now = new Date().toISOString()
  return {
    ...draft,
    id,
    nombre: draft.nombre.trim(),
    mandante: draft.mandante.trim(),
    rut: draft.rut.trim(),
    region: draft.region.trim(),
    comuna: draft.comuna.trim(),
    telefonoMandante: draft.telefonoMandante.trim(),
    emailMandante: draft.emailMandante.trim(),
    contacto: draft.contacto.trim(),
    altura: draft.altura === '' ? '' : Math.max(0, Number(draft.altura) || 0),
    sistema: draft.sistema.trim(),
    observacion: draft.observacion.trim(),
    contactos: rows(draft.contactos),
    requisitos: rows(draft.requisitos),
    updatedAt: now,
    ...(creating ? { createdAt: now } : {}),
  }
}

// A read and write can still be interleaved by another valid user action.
// Retry only the optimistic-lock conflict once, with a fresh module snapshot.
export async function saveClientWithRetry(api, { draft, creating, selectedId, createId }) {
  const id = creating ? createId() : selectedId
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await api.get('/state')
    const state = response?.state || response || {}
    const clients = mergeCollections(state, 'minas', 'clientes')
    const duplicate = clients.find(item => String(item.id) !== String(id)
      && normalize(item.nombre) === normalize(draft.nombre)
      && normalize(item.mandante) === normalize(draft.mandante))
    if (duplicate) return { duplicate: true }

    const saved = serializeClient(draft, id, creating)
    const next = creating ? [...clients, saved] : clients.map(item => String(item.id) === String(id) ? saved : item)
    try {
      const result = await api.put('/state/modules', {
        changes: { minas: { version: Number(response?.moduleVersions?.minas || 0), data: next } },
        reason: creating ? 'Cliente creado con ficha operativa' : 'Ficha 360 del cliente actualizada',
      })
      return { response, state, saved, result }
    } catch (error) {
      if (error?.code !== 'MODULE_VERSION_CONFLICT' || attempt === 1) throw error
    }
  }
}
