import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAppendChanges, validateTenantState, workerHasBlockingRestriction } from '../validation.js'
import { hasActiveRestriction, workerOperationalAssignments } from '../../nexo-v2/src/services/worker-segments.js'
import { operationalDay } from '../../shared/operational-date.js'

const worker = { id: 'qa-worker', nombre: 'Persona QA', rut: '11.111.111-1', disponibilidad: 'disponible' }
const project = { id: 'qa-order', nombre: 'Orden QA', estado: 'activo' }
const assignment = { id: 'qa-assignment', trabId: worker.id, mantId: project.id, estado: 'confirmado' }

function stateFor(workerPatch = {}, restrictions = []) {
  return {
    trabajadores: [{ ...worker, ...workerPatch }],
    mantenciones: [project],
    asignaciones: [],
    restricted: restrictions,
  }
}

test('append validation rejects an operational assignment for a restricted worker', () => {
  const current = stateFor({ bloqueado: true, disponibilidad: 'bloqueado' })
  const proposed = { ...structuredClone(current), asignaciones: [assignment] }
  assert.throws(
    () => validateAppendChanges(current, proposed, ['asignaciones']),
    error => error?.status === 409 && error?.code === 'WORKER_NOT_AVAILABLE',
  )
})

test('strict validation also rejects a direct operational assignment for an active restriction', () => {
  const state = stateFor({}, [{ id: 'qa-restriction', workerId: worker.id, activa: true, estado: 'vigente' }])
  state.asignaciones = [assignment]
  assert.throws(
    () => validateTenantState(state),
    error => error?.status === 409 && error?.code === 'WORKER_NOT_AVAILABLE',
  )
})

test('retired assignments and enabled workers remain valid', () => {
  const current = stateFor()
  const proposed = { ...structuredClone(current), asignaciones: [{ ...assignment, estado: 'retirado' }] }
  assert.equal(validateAppendChanges(current, proposed, ['asignaciones']), true)
  assert.doesNotThrow(() => validateTenantState({ ...current, asignaciones: [assignment] }))
})


test('historical operational assignments do not block unrelated saves after a later restriction', () => {
  const previous = stateFor()
  previous.asignaciones = [assignment]
  const proposed = structuredClone(previous)
  proposed.trabajadores[0].especialidad = 'Mecánica'
  proposed.restricted = [{ id: 'later-restriction', workerId: worker.id, activa: true, estado: 'vigente' }]

  assert.doesNotThrow(() => validateTenantState(proposed, {previousState:previous}))
})

test('a new operational assignment and a transition to operational remain blocked for restricted workers', () => {
  const previous = stateFor({}, [{ id: 'restriction', workerId: worker.id, activa: true, estado: 'vigente' }])
  const newAssignment = { ...structuredClone(previous), asignaciones: [assignment] }
  assert.throws(() => validateTenantState(newAssignment, {previousState:previous}), error => error?.code === 'WORKER_NOT_AVAILABLE')

  const inactive = { ...assignment, estado: 'retirado' }
  const priorInactive = { ...structuredClone(previous), asignaciones: [inactive] }
  const transitioned = { ...structuredClone(priorInactive), asignaciones: [assignment] }
  assert.throws(() => validateTenantState(transitioned, priorInactive), error => error?.code === 'WORKER_NOT_AVAILABLE')
})

test('operational day and restrictions use the Santiago calendar day across UTC and DST boundaries', () => {
  assert.equal(operationalDay('2026-10-15T02:30:00.000Z'), '2026-10-14')
  assert.equal(operationalDay('2026-04-05T02:30:00.000Z'), '2026-04-04')
  const restriction = { workerId: worker.id, activa: true, estado: 'vigente', hasta: '2026-10-14' }
  assert.equal(hasActiveRestriction(worker, [restriction], '2026-10-14'), true)
  assert.equal(hasActiveRestriction(worker, [restriction], '2026-10-15'), false)
  assert.equal(workerHasBlockingRestriction(stateFor({}, [restriction]), worker.id, '2026-10-14'), true)
  assert.equal(workerHasBlockingRestriction(stateFor({}, [restriction]), worker.id, '2026-10-15'), false)
})

test('future assignments require a recognized, schedulable order state', () => {
  const futureAssignment = { ...assignment, inicio: '2026-11-10' }
  const scheduledProject = { ...project, estado: 'programado', inicio: '2026-11-10' }
  assert.equal(workerOperationalAssignments(worker, [futureAssignment], [scheduledProject], '2026-10-15').scheduled.length, 1)

  const unknownState = { ...scheduledProject, estado: 'estado_legacy_desconocido' }
  assert.equal(workerOperationalAssignments(worker, [futureAssignment], [unknownState], '2026-10-15').inconsistent.length, 1)
  assert.equal(workerOperationalAssignments(worker, [futureAssignment], [], '2026-10-15').inconsistent.length, 1)
})
