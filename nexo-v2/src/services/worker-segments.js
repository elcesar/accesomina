const CLOSED_PROJECT_STATES = new Set([
  'cerrada', 'cerrado', 'cancelada', 'cancelado', 'finalizada', 'finalizado',
])

const OPERATIONAL_ASSIGNMENT_STATES = new Set([
  'asignado', 'habilitado', 'confirmado', 'activa', 'activo', 'en_curso',
  'contrato_enviado', 'contrato_firmado', 'acreditado', 'acreditacion_enviada',
])

const CLOSED_RESTRICTION_STATES = new Set(['levantada', 'cerrada', 'inactiva'])
const normalized = value => String(value || '').trim().toLocaleLowerCase()

export function restrictionIsActive(restriction) {
  if (restriction?.activa === false) return false
  if (restriction?.hasta) {
    const end = new Date(`${restriction.hasta}T23:59:59`)
    if (!Number.isNaN(end.getTime()) && end < new Date()) return false
  }
  return !CLOSED_RESTRICTION_STATES.has(normalized(restriction?.estado))
}

export function hasActiveRestriction(worker, restrictions = []) {
  return restrictions.some(restriction => (
    restrictionIsActive(restriction) &&
    String(restriction.workerId || restriction.trabId || restriction.personaId) === String(worker.id)
  ))
}

export function assignmentWorkflowState(assignment) {
  return normalized(assignment?.recruitmentStage || assignment?.estadoGestion || assignment?.estado)
}

export function assignmentIsOperational(assignment) {
  return OPERATIONAL_ASSIGNMENT_STATES.has(assignmentWorkflowState(assignment))
}

function projectIsActive(project) {
  return Boolean(project) && !CLOSED_PROJECT_STATES.has(normalized(project.estado))
}

export function hasOperationalProjectAssignment(worker, assignments = [], projects = []) {
  return assignments.some(assignment => (
    String(assignment.trabId) === String(worker.id) &&
    assignmentIsOperational(assignment) &&
    projectIsActive(projects.find(project => String(project.id) === String(assignment.mantId)))
  ))
}

export function employmentRelationship(worker) {
  const profile = normalized(worker.employmentProfile || worker.tipo)
  if (['permanente', 'fijo', 'planta'].includes(profile)) return 'fijo'
  if (['esporadico', 'temporal', 'proyecto'].includes(profile)) return 'proyecto'
  return 'sin_definir'
}

export function operationalStatus(worker, assignments = [], restrictions = []) {
  if (worker.bloqueado || normalized(worker.disponibilidad) === 'bloqueado' || hasActiveRestriction(worker, restrictions)) return 'restringido'
  if (assignments.some(assignment => String(assignment.trabId) === String(worker.id) && assignmentIsOperational(assignment))) return 'asignado'
  return 'disponible'
}

// Each person belongs to one visible segment. Restrictions take precedence.
export function workerSegment(worker, assignments = [], projects = [], restrictions = []) {
  if (operationalStatus(worker, assignments, restrictions) === 'restringido') return 'bloqueados'

  if (employmentRelationship(worker) === 'fijo') return 'planta'
  if (hasOperationalProjectAssignment(worker, assignments, projects)) return 'esporadico'
  return 'disponible'
}
