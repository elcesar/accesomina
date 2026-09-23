import assert from 'node:assert/strict'
import test from 'node:test'
import { staffingCoverage } from '../../nexo-v2/src/services/staffing-coverage.js'

test('coverage by specialty keeps the local recruitment columns and values', () => {
  const project = { especialidadesRequeridas: [{ especialidad: 'Eléctrico', cantidad: 3 }] }
  const workers = [{ id: 'one', especialidad: 'Eléctrico' }, { id: 'two', especialidad: 'Eléctrico' }]
  const assignments = [
    { trabId: 'one', recruitmentStage: 'contrato_firmado' },
    { trabId: 'two', recruitmentStage: 'acreditacion_enviada' },
  ]

  assert.deepEqual(staffingCoverage(project, assignments, workers), [{
    specialty: 'Eléctrico', required: 3, recruiting: 2, confirmed: 2,
    contractSent: 2, signed: 2, accredited: 1, gap: 1,
  }])
})

test('coverage does not count a specialty in a partially matching requirement', () => {
  const project = {
    especialidadesRequeridas: [
      { especialidad: 'Mecánico', cantidad: 1 },
      { especialidad: 'Mecánico Soldador', cantidad: 1 },
    ],
  }
  const workers = [{ id: 'one', especialidad: 'Mecánico Soldador' }]
  const assignments = [{ trabId: 'one', recruitmentStage: 'contrato_firmado' }]

  assert.deepEqual(staffingCoverage(project, assignments, workers), [
    { specialty: 'Mecánico', required: 1, recruiting: 0, confirmed: 0, contractSent: 0, signed: 0, accredited: 0, gap: 1 },
    { specialty: 'Mecánico Soldador', required: 1, recruiting: 1, confirmed: 1, contractSent: 1, signed: 1, accredited: 0, gap: 0 },
  ])
})
