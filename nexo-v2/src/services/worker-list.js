import { assignmentIsOperational } from './worker-segments.js'

export function workerClientIds(worker, assignments = [], projects = []) {
  const ids = new Set((worker.mineras || []).filter(Boolean).map(String))
  for (const assignment of assignments) {
    if (String(assignment.trabId) !== String(worker.id) || !assignmentIsOperational(assignment)) continue
    const project = projects.find(item => String(item.id) === String(assignment.mantId))
    if (project?.minaId) ids.add(String(project.minaId))
  }
  return [...ids]
}

export function matchesWorkerSearch(worker, query) {
  const term = String(query || '').trim().toLocaleLowerCase()
  if (!term) return true
  if (String(worker.nombre || '').toLocaleLowerCase().includes(term)) return true
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
