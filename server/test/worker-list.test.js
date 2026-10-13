import assert from 'node:assert/strict'
import test from 'node:test'
import Papa from 'papaparse'
import { matchesWorkerSearch, workerClientIds, workerListCsv } from '../../nexo-v2/src/services/worker-list.js'
import { operationalStatus } from '../../nexo-v2/src/services/worker-segments.js'

const worker = { id: 'qa-person', nombre: 'QA Ronda 02 Persona Ficticia', rut: '11.111.111-1', disponibilidad: 'disponible', mineras: [] }
const projects = [{ id: 'qa-order', minaId: 'qa-client' }]
const active = { trabId: worker.id, mantId: 'qa-order', estado: 'confirmado' }

test('the list can resolve an operational client without a direct worker client link', () => {
  assert.deepEqual(workerClientIds(worker, [active], projects), ['qa-client'])
  assert.equal(operationalStatus(worker, [active]), 'asignado')
  assert.equal(worker.disponibilidad, 'disponible')
})

test('operational client links deduplicate enabled clients and ignore retired or unrelated assignments', () => {
  const linked = { ...worker, mineras: ['qa-client', 'enabled-client'] }
  const assignments = [active, active, { ...active, trabId: 'someone-else', mantId: 'other-order' }, { ...active, mantId: 'other-order', estado: 'retirado' }, { ...active, mantId: 'missing-order' }]
  assert.deepEqual(workerClientIds(linked, assignments, [...projects, { id: 'other-order', minaId: 'other-client' }]), ['qa-client', 'enabled-client'])
})

test('restrictions take precedence and vacation remains visible without an operational assignment', () => {
  assert.equal(operationalStatus(worker, [active], [{ workerId: worker.id, activa: true, estado: 'vigente' }]), 'restringido')
  assert.equal(operationalStatus({ ...worker, disponibilidad: 'vacaciones' }), 'vacaciones')
})

for (const query of ['11.111.111-1', '11111111-1', '111111111', ' 11.111.111-1 ', ' QA Ronda 02 ', 'qa ronda 02']) {
  test(`search finds the same person with ${JSON.stringify(query)}`, () => assert.equal(matchesWorkerSearch(worker, query), true))
}

test('search handles verifier K, empty queries, absent fields and punctuation without matching everyone', () => {
  assert.equal(matchesWorkerSearch({ rut: '7.000.000-K' }, '7000000k'), true)
  assert.equal(matchesWorkerSearch(worker, '   '), true)
  assert.equal(matchesWorkerSearch({}, '111'), false)
  assert.equal(matchesWorkerSearch(worker, '---'), false)
  assert.equal(matchesWorkerSearch(worker, 'No existe QA'), false)
})

test('CSV preserves Spanish text, commas, quotes, newlines and displayed operational values', () => {
  const csv = workerListCsv([{ nombre: 'Persona, "QA"\nsegunda línea', rut: worker.rut, especialidad: 'Mecánico', tipo: 'Trabajador fijo', clientes: 'Cliente QA', ordenes: 'Orden QA', disponibilidad: 'Asignado', cumplimiento: '0%' }])
  assert.equal(csv[0], '\uFEFF')
  const parsed = Papa.parse(csv, { header: true })
  assert.deepEqual(parsed.errors, [])
  assert.equal(parsed.data[0].Persona, 'Persona, "QA"\nsegunda línea')
  assert.equal(parsed.data[0].Disponibilidad, 'Asignado')
  assert.equal(parsed.data[0].Clientes, 'Cliente QA')
})

test('exported user text cannot become a spreadsheet formula', () => {
  const parsed = Papa.parse(workerListCsv([{ nombre: '=1+1', especialidad: '@SUM(1)', clientes: ' +SUM(1)', disponibilidad: 'Disponible' }]), { header: true })
  assert.equal(parsed.data[0].Persona, "'=1+1")
  assert.equal(parsed.data[0].Especialidad, "'@SUM(1)")
  assert.equal(parsed.data[0].Clientes, "' +SUM(1)")
})
