import assert from 'node:assert/strict'
import test from 'node:test'
import Papa from 'papaparse'
import { matchesWorkerSearch, workerClientIds, workerListCsv } from '../../nexo-v2/src/services/worker-list.js'
import { operationalStatus, workerOperationalAssignments } from '../../nexo-v2/src/services/worker-segments.js'

const worker = { id: 'qa-person', nombre: 'QA Ronda 02 Persona Ficticia', rut: '11.111.111-1', disponibilidad: 'disponible', mineras: [] }
const activeProject = { id: 'qa-order', minaId: 'qa-client', estado: 'activo' }
const active = { trabId: worker.id, mantId: activeProject.id, estado: 'confirmado' }

test('the list can resolve an operational client without a direct worker client link', () => {
  assert.deepEqual(workerClientIds(worker, [active], [activeProject]), ['qa-client'])
  assert.equal(operationalStatus(worker, [active], [], [activeProject]), 'asignado')
  assert.equal(worker.disponibilidad, 'disponible')
})

test('closed or cancelled projects free the worker and do not contribute an operational client', () => {
  for (const estado of ['cerrada', 'finalizado', 'cancelada']) {
    const project = { ...activeProject, estado }
    assert.equal(operationalStatus(worker, [active], [], [project]), 'disponible')
    assert.deepEqual(workerClientIds(worker, [active], [project]), [])
  }
})

test('missing or unknown operational project states require regularization instead of showing available', () => {
  assert.equal(operationalStatus(worker, [active], [], []), 'regularizacion')
  assert.equal(operationalStatus(worker, [active], [], [{ ...activeProject, estado: 'sin_estado' }]), 'regularizacion')
})

test('restrictions and vacation take precedence over active assignments', () => {
  assert.equal(operationalStatus(worker, [active], [{ workerId: worker.id, activa: true, estado: 'vigente' }], [activeProject]), 'restringido')
  assert.equal(operationalStatus({ ...worker, disponibilidad: 'vacaciones' }, [active], [], [activeProject]), 'vacaciones')
})

test('future assignments do not occupy current availability and remain visible as scheduling', () => {
  const tomorrow = new Date(Date.now() + 86400000)
  const date = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const future = { ...active, inicio: date }
  const groups = workerOperationalAssignments(worker, [future], [activeProject])
  assert.equal(operationalStatus(worker, [future], [], [activeProject]), 'disponible')
  assert.equal(groups.current.length, 0)
  assert.equal(groups.scheduled.length, 1)
})

test('one current operational assignment is sufficient and retired assignments do not count', () => {
  const closed = { ...activeProject, id: 'closed-order', estado: 'cerrada' }
  const assignments = [
    { ...active, mantId: closed.id },
    { ...active, mantId: activeProject.id, estado: 'retirado' },
    { ...active, mantId: activeProject.id },
  ]
  assert.equal(operationalStatus(worker, assignments, [], [activeProject, closed]), 'asignado')
  assert.deepEqual(workerClientIds(worker, assignments, [activeProject, closed]), ['qa-client'])
})

test('operational client links deduplicate enabled clients and ignore retired or unrelated assignments', () => {
  const linked = { ...worker, mineras: ['qa-client', 'enabled-client'] }
  const assignments = [active, active, { ...active, trabId: 'someone-else', mantId: 'other-order' }, { ...active, mantId: 'other-order', estado: 'retirado' }, { ...active, mantId: 'missing-order' }]
  assert.deepEqual(workerClientIds(linked, assignments, [activeProject, { id: 'other-order', minaId: 'other-client', estado: 'activo' }]), ['qa-client', 'enabled-client'])
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
