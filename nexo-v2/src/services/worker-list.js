import { normalizeSearch } from './search.js'
import { includesSearch } from './search.js'
import { workerOperationalAssignments } from './worker-segments.js'

export function workerClientIds(worker, assignments = [], projects = []) {
  const ids = new Set((worker.mineras || []).filter(Boolean).map(String))
  for (const assignment of workerOperationalAssignments(worker, assignments, projects).current) {
    const project = projects.find(item => String(item.id) === String(assignment.mantId))
    if (project?.minaId) ids.add(String(project.minaId))
  }
  return [...ids]
}

export function matchesWorkerSearch(worker, query) {
  const term = normalizeSearch(query)
  if (!term) return true
  if (includesSearch(String(worker.nombre || ''), term)) return true
  if (!/^[\d.k\s-]+$/i.test(term)) return false
  const normalizeRut = value => String(value || '').replace(/[.\s-]/g, '').toUpperCase()
  const rut = normalizeRut(term)
  return Boolean(rut) && normalizeRut(worker.rut).includes(rut)
}

export function workerListCsv(records) {
  const escape = value => {
    const text = String(value ?? '')
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  const lines = [
    ['Persona', 'RUT', 'Especialidad', 'Tipo', 'Clientes', 'Órdenes de servicio', 'Disponibilidad', 'Cumplimiento'],
    ...records.map(record => [record.nombre, record.rut, record.especialidad, record.tipo, record.clientes, record.ordenes, record.disponibilidad, record.cumplimiento]),
  ]
  return '\uFEFF' + lines.map(line => line.map(escape).join(',')).join('\r\n')
}
