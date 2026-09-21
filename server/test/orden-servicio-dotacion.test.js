import assert from 'node:assert/strict'
import test from 'node:test'
import { hasOperationalProjectAssignment } from '../../nexo-v2/src/services/worker-segments.js'

const worker = { id: 'worker-1', nombre: 'Juan' }
const activeOrder = { id: 'os-001', estado: 'activo' }
const closedOrder = { id: 'os-closed', estado: 'cerrado' }

test('a confirmed assignment in an active order makes a worker unavailable for another order', () => {
  const assignments = [{ trabId: worker.id, mantId: activeOrder.id, estado: 'confirmado' }]

  assert.equal(hasOperationalProjectAssignment(worker, assignments, [activeOrder]), true)
})

test('a confirmed assignment in a closed order does not keep a worker unavailable', () => {
  const assignments = [{ trabId: worker.id, mantId: closedOrder.id, estado: 'confirmado' }]

  assert.equal(hasOperationalProjectAssignment(worker, assignments, [closedOrder]), false)
})

test('a non-operational recruitment entry does not reserve the worker', () => {
  const assignments = [{ trabId: worker.id, mantId: activeOrder.id, estado: 'reclutamiento' }]

  assert.equal(hasOperationalProjectAssignment(worker, assignments, [activeOrder]), false)
})
