const normalize = value => String(value || '').trim().toLocaleLowerCase()

export const STAFFING_FLOW = [
  ['reclutamiento', 'En reclutamiento'],
  ['convocado', 'Convocado'],
  ['en_validacion', 'Validación documental'],
  ['contrato_enviado', 'Contrato enviado'],
  ['contrato_firmado', 'Contrato firmado'],
  ['acreditacion_enviada', 'Acreditación enviada'],
]

const legacyStages = {
  candidato: 'reclutamiento',
  contactado: 'convocado',
  confirmado: 'en_validacion',
  asignado: 'contrato_enviado',
  habilitado: 'acreditacion_enviada',
  contrato_generado: 'contrato_enviado',
}

export function staffingAssignmentStage(assignment) {
  const value = normalize(assignment?.recruitmentStage || assignment?.estadoGestion)
  if (STAFFING_FLOW.some(([id]) => id === value)) return value
  return legacyStages[value] || (normalize(assignment?.estado) === 'confirmado' ? 'contrato_firmado' : '')
}

function requirementsFor(project, assignments, workers) {
  const configured = project?.especialidadesRequeridas || project?.especialidadesReq || project?.especialidades || []
  const requirements = Array.isArray(configured) ? configured.map(item => {
    if (typeof item === 'string') return { specialty: item, required: 0 }
    return { specialty: item?.especialidad || item?.name || item?.nombre || '', required: Number(item?.cantidad || item?.count || 0) }
  }).filter(item => item.specialty) : []

  if (requirements.length) return requirements
  return [...new Set(assignments.map(assignment => workers.find(worker => String(worker.id) === String(assignment.trabId)))
    .map(worker => worker?.especialidad || worker?.cargo)
    .filter(Boolean))].map(specialty => ({ specialty, required: 0 }))
}

function matchesSpecialty(worker, specialty) {
  const value = normalize(worker?.especialidad || worker?.cargo || 'Sin especialidad')
  const expected = normalize(specialty)
  return value === expected
}

export function staffingCoverage(project, assignments = [], workers = []) {
  const rows = requirementsFor(project, assignments, workers)
  const stageIndex = stage => STAFFING_FLOW.findIndex(([id]) => id === stage)
  const reached = (assignment, target) => stageIndex(staffingAssignmentStage(assignment)) >= stageIndex(target)

  return rows.map(({ specialty, required }) => {
    const related = assignments.filter(assignment => matchesSpecialty(workers.find(worker => String(worker.id) === String(assignment.trabId)), specialty))
    const recruiting = related.length
    return {
      specialty,
      required,
      recruiting,
      confirmed: related.filter(assignment => reached(assignment, 'en_validacion')).length,
      contractSent: related.filter(assignment => reached(assignment, 'contrato_enviado')).length,
      signed: related.filter(assignment => reached(assignment, 'contrato_firmado')).length,
      accredited: related.filter(assignment => reached(assignment, 'acreditacion_enviada')).length,
      gap: Math.max(0, required - recruiting),
    }
  })
}
