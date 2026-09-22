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
