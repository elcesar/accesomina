import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAppendChanges, validateTenantState } from '../validation.js'

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
