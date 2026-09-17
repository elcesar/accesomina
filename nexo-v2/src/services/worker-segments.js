const CLOSED_PROJECT_STATES = new Set([
  'cerrada', 'cerrado', 'cancelada', 'cancelado', 'finalizada', 'finalizado',
])

const ACTIVE_ASSIGNMENT_STATES = new Set([
  'confirmado', 'activa', 'activo', 'en_curso', 'acreditado', 'acreditacion_enviada',
])

function normalized(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

function projectIsActive(project) {
  return Boolean(project) && !CLOSED_PROJECT_STATES.has(normalized(project.estado))
}

function assignmentIsOperational(assignment) {
  const state = normalized(assignment?.estado)
  return !state || ACTIVE_ASSIGNMENT_STATES.has(state)
}

export function hasOperationalProjectAssignment(worker, assignments, projects) {
  return assignments.some(assignment => (
    String(assignment.trabId) === String(worker.id) &&
    assignmentIsOperational(assignment) &&
    projectIsActive(projects.find(project => String(project.id) === String(assignment.mantId)))
  ))
}

// Each person belongs to one visible segment. A project segment requires an effective assignment.
export function workerSegment(worker, assignments = [], projects = []) {
  if (worker.bloqueado || normalized(worker.disponibilidad) === 'bloqueado') return 'bloqueados'
  if (hasOperationalProjectAssignment(worker, assignments, projects)) return 'esporadico'

  const profile = normalized(worker.employmentProfile || worker.tipo)
  if (['permanente', 'fijo', 'planta'].includes(profile)) return 'planta'
  return 'disponible'
}
