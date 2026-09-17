import test from 'node:test'
import assert from 'node:assert/strict'
import { workerSegment } from '../../nexo-v2/src/services/worker-segments.js'

const order = { id: 'os-1', estado: 'activo' }

test('keeps an available worker only in the available segment', () => {
  const worker = { id: 'raul', tipo: 'disponible', employmentProfile: 'disponible', disponibilidad: 'disponible' }
  assert.equal(workerSegment(worker, [], [order]), 'disponible')
})

test('does not treat a preassignment as an effective project assignment', () => {
  const worker = { id: 'raul', tipo: 'disponible', disponibilidad: 'disponible' }
  const assignments = [{ trabId: 'raul', mantId: 'os-1', estado: 'preasignado' }]
  assert.equal(workerSegment(worker, assignments, [order]), 'disponible')
})

test('moves a worker to the project segment only after a confirmed active assignment', () => {
  const worker = { id: 'raul', tipo: 'disponible', disponibilidad: 'asignado' }
  const assignments = [{ trabId: 'raul', mantId: 'os-1', estado: 'confirmado' }]
  assert.equal(workerSegment(worker, assignments, [order]), 'esporadico')
})

test('keeps restricted workers only in the restricted segment', () => {
  const worker = { id: 'raul', tipo: 'permanente', disponibilidad: 'bloqueado' }
  assert.equal(workerSegment(worker, [], [order]), 'bloqueados')
})
