const CLOSED_PROJECT_STATES = new Set([
  'cerrada', 'cerrado', 'cancelada', 'cancelado', 'finalizada', 'finalizado',
])

const OPERATIONAL_PROJECT_STATES = new Set([
  'activa', 'activo', 'en_curso', 'en curso', 'confirmada', 'confirmado',
])

const SCHEDULED_PROJECT_STATES = new Set(['programada', 'programado'])
const OPERATIONAL_ASSIGNMENT_STATES = new Set([
  'asignado', 'habilitado', 'confirmado', 'activa', 'activo', 'en_curso',
  'contrato_enviado', 'contrato_firmado', 'acreditado', 'acreditacion_enviada',
])

const CLOSED_RESTRICTION_STATES = new Set(['levantada', 'cerrada', 'inactiva'])
const normalized = value => String(value || '').trim().toLocaleLowerCase()

function localDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function dateValue(record, keys) {
  return keys.map(key => record?.[key]).find(Boolean) || ''
}

function windowState(record, today = localDay()) {
  const start = dateValue(record, ['inicio', 'fechaInicio', 'startDate', 'desde'])
  const end = dateValue(record, ['termino', 'fechaTermino', 'endDate', 'hasta'])
  if (start && start > today) return 'future'
  if (end && end < today) return 'past'
  return 'current'
}

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

export function projectIsOperational(project, today = localDay()) {
  return Boolean(project) &&
    OPERATIONAL_PROJECT_STATES.has(normalized(project.estado)) &&
    windowState(project, today) === 'current'
}

export function projectCanAcceptAssignment(project, today = localDay()) {
  if (!project || CLOSED_PROJECT_STATES.has(normalized(project.estado))) return false
  const timing = windowState(project, today)
  return timing !== 'past' && (
    OPERATIONAL_PROJECT_STATES.has(normalized(project.estado)) ||
    (SCHEDULED_PROJECT_STATES.has(normalized(project.estado)) && timing === 'future')
  )
}

function isAssignmentCurrent(assignment, project, today) {
  return windowState(assignment, today) === 'current' && projectIsOperational(project, today)
}

function isAssignmentScheduled(assignment, project, today) {
  return windowState(assignment, today) === 'future' ||
    (windowState(project, today) === 'future' && projectCanAcceptAssignment(project, today))
}

// Returns current, future and data-quality assignment groups without changing history.
export function workerOperationalAssignments(worker, assignments = [], projects = [], today = localDay()) {
  const result = { current: [], scheduled: [], inconsistent: [] }

  for (const assignment of assignments) {
    if (String(assignment.trabId) !== String(worker.id) || !assignmentIsOperational(assignment)) continue

    const project = projects.find(item => String(item.id) === String(assignment.mantId))
    if (!project) {
      if (windowState(assignment, today) !== 'future') result.inconsistent.push(assignment)
      continue
    }

    if (CLOSED_PROJECT_STATES.has(normalized(project.estado)) || windowState(project, today) === 'past' || windowState(assignment, today) === 'past') continue
    if (isAssignmentCurrent(assignment, project, today)) {
      result.current.push(assignment)
      continue
    }
    if (isAssignmentScheduled(assignment, project, today)) {
      result.scheduled.push(assignment)
      continue
    }
    result.inconsistent.push(assignment)
  }

  return result
}

export function hasOperationalProjectAssignment(worker, assignments = [], projects = [], today = localDay()) {
  return workerOperationalAssignments(worker, assignments, projects, today).current.length > 0
}

export function employmentRelationship(worker) {
  const profile = normalized(worker.employmentProfile || worker.tipo)
  if (['permanente', 'fijo', 'planta'].includes(profile)) return 'fijo'
  if (['esporadico', 'temporal', 'proyecto'].includes(profile)) return 'proyecto'
  return 'sin_definir'
}

export function operationalStatus(worker, assignments = [], restrictions = [], projects = [], today = localDay()) {
  if (worker.bloqueado || normalized(worker.disponibilidad) === 'bloqueado' || hasActiveRestriction(worker, restrictions)) return 'restringido'
  if (normalized(worker.disponibilidad) === 'vacaciones') return 'vacaciones'

  const assignmentGroups = workerOperationalAssignments(worker, assignments, projects, today)
  if (assignmentGroups.current.length > 0) return 'asignado'
  if (assignmentGroups.inconsistent.length > 0) return 'regularizacion'
  return 'disponible'
}

// Each person belongs to one visible segment. Restrictions take precedence.
export function workerSegment(worker, assignments = [], projects = [], restrictions = []) {
  if (operationalStatus(worker, assignments, restrictions, projects) === 'restringido') return 'bloqueados'
  if (employmentRelationship(worker) === 'fijo') return 'planta'
  if (hasOperationalProjectAssignment(worker, assignments, projects)) return 'esporadico'
  return 'disponible'
}
