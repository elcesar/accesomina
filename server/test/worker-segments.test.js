import assert from 'node:assert/strict'
import test from 'node:test'
import { employmentRelationship, operationalStatus, workerSegment } from '../../nexo-v2/src/services/worker-segments.js'

const order = { id: 'os-1', estado: 'activo' }
const available = { id: 'person-1', nombre: 'Persona disponible', tipo: 'esporadico', disponibilidad: 'disponible' }

test('a legacy project type remains available when its lifecycle says available', () => {
  assert.equal(workerSegment(available, [], [order]), 'disponible')
})

test('a fixed worker remains in the fixed segment without an operational assignment', () => {
  assert.equal(workerSegment({ ...available, employmentProfile: 'permanente', tipo: 'permanente' }, [], [order]), 'planta')
})

test('an operational assignment does not change a fixed worker segment', () => {
  const fixedWorker = { ...available, employmentProfile: 'permanente', tipo: 'permanente' }
  const assignment = [{ trabId: fixedWorker.id, mantId: order.id, estado: 'confirmado' }]
  assert.equal(workerSegment(fixedWorker, assignment, [order]), 'planta')
})

test('employment relationship and operational availability remain independent', () => {
  const fixedWorker = { ...available, employmentProfile: 'permanente', tipo: 'permanente' }
  const assignment = [{ trabId: fixedWorker.id, mantId: order.id, estado: 'confirmado' }]
  assert.equal(employmentRelationship(fixedWorker), 'fijo')
  assert.equal(operationalStatus(fixedWorker, assignment), 'asignado')

  const projectWorker = { ...available, employmentProfile: 'esporadico', tipo: 'esporadico' }
  assert.equal(employmentRelationship(projectWorker), 'proyecto')
  assert.equal(operationalStatus(projectWorker, []), 'disponible')
})

test('a current restriction takes priority over a worker availability value', () => {
  const restrictions = [{ id: 'restriction-1', workerId: available.id, estado: 'vigente', activa: true }]
  assert.equal(workerSegment(available, [], [order], restrictions), 'bloqueados')
})

test('a lifted or expired restriction does not block the worker segment', () => {
  assert.equal(workerSegment(available, [], [order], [{ workerId: available.id, estado: 'levantada' }]), 'disponible')
  assert.equal(workerSegment(available, [], [order], [{ workerId: available.id, estado: 'vigente', hasta: '2020-01-01' }]), 'disponible')
})

for (const state of ['asignado', 'habilitado', 'contrato_enviado', 'contrato_firmado', 'acreditacion_enviada']) {
  test(`an ${state} assignment is operational`, () => {
    assert.equal(workerSegment(available, [{ trabId: available.id, mantId: order.id, estadoGestion: state }], [order]), 'esporadico')
  })
}

test('a non-operational recruitment assignment keeps the worker available', () => {
  assert.equal(workerSegment(available, [{ trabId: available.id, mantId: order.id, recruitmentStage: 'reclutamiento' }], [order]), 'disponible')
})


test('each worker resolves to one exclusive segment for every consumer', () => {
  const fixed = { id: 'fixed', tipo: 'permanente', disponibilidad: 'disponible' }
  const projectWorker = { id: 'project', tipo: 'esporadico', disponibilidad: 'disponible' }
  const restrictedWorker = { id: 'restricted', tipo: 'permanente', disponibilidad: 'disponible' }

  assert.equal(workerSegment(fixed, [], [order], []), 'planta')
  assert.equal(workerSegment(projectWorker, [{ trabId: projectWorker.id, mantId: order.id, estado: 'confirmado' }], [order], []), 'esporadico')
  assert.equal(workerSegment(restrictedWorker, [], [order], [{ workerId: restrictedWorker.id, estado: 'vigente' }]), 'bloqueados')
})
