// Shared worker catalogs. Values preserve stored records; labels define the visible vocabulary.
export const WORKER_SPECIALTIES = [
  { value: 'Mecánico Industrial', label: 'Mecánico industrial' },
  { value: 'Soldador 6G', label: 'Soldador 6G' },
  { value: 'Eléctrico', label: 'Eléctrico' },
  { value: 'Instrumentista', label: 'Instrumentista' },
  { value: 'Rigger', label: 'Rigger' },
  { value: 'Calderero', label: 'Calderero' },
  { value: 'Maestro Andamios', label: 'Maestro andamios' },
  { value: 'Operador de equipos', label: 'Operador de equipos' },
  { value: 'Prevencionista', label: 'Prevencionista' },
  { value: 'Supervisor', label: 'Supervisor' },
  { value: 'Técnico electrónico', label: 'Técnico electrónico' },
  { value: 'Pintor industrial', label: 'Pintor industrial' },
  { value: 'Operadora', label: 'Operadora' },
  { value: 'Enfermero/a', label: 'Enfermero/a' },
  { value: 'Paramédico', label: 'Paramédico' },
  { value: 'Conductor', label: 'Conductor' },
  { value: 'Administrativo', label: 'Administrativo' },
  { value: 'Otro', label: 'Otro' },
]

export const WORKER_REGIMENS = [
  { value: '5x2', label: '5x2' },
  { value: '4x3', label: '4x3' },
  { value: '6x1', label: '6x1' },
  { value: '7x7', label: '7x7' },
  { value: '10x10', label: '10x10' },
  { value: '14x14', label: '14x14' },
  { value: 'otro', label: 'Turno especial' },
]

export const WORKER_ASSIGNMENT_SHIFTS = [
  { value: 'día', label: 'Día' },
  { value: 'noche', label: 'Noche' },
  { value: 'ambos', label: 'Ambos' },
]

const REGIMEN_ALIASES = new Map([
  ['turno_especial', 'otro'],
  ['otro tipo de turno', 'otro'],
])

export function normalizeWorkerRegimen(value) {
  const raw = String(value || '').trim()
  return REGIMEN_ALIASES.get(raw.toLocaleLowerCase('es-CL')) || raw
}

export function workerRegimenMatches(value, filter) {
  return normalizeWorkerRegimen(value) === normalizeWorkerRegimen(filter)
}

export function isCanonicalWorkerRegimen(value) {
  return WORKER_REGIMENS.some(item => item.value === value)
}

export function workerRegimenLabel(value) {
  const canonical = normalizeWorkerRegimen(value)
  return WORKER_REGIMENS.find(item => item.value === canonical)?.label || String(value || '').trim()
}
