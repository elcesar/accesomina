import assert from 'node:assert/strict'
import test from 'node:test'
import { operationalAlerts } from '../../nexo-v2/src/services/operational-alerts.js'

const worker = { id: 'worker-1', nombre: 'Raúl Hornig', workerItems: [] }

test('creates critical alerts for each required document missing from a worker profile', () => {
  const alerts = operationalAlerts({ trabajadores: [worker] })
  const missing = alerts.filter(alert => alert.trabId === worker.id && alert.urgencia === 'critico')

  assert.equal(missing.length, 7)
  assert.ok(missing.some(alert => alert.msg.includes('Cédula de identidad')))
  assert.ok(missing.some(alert => alert.msg.includes('Examen preocupacional')))
  assert.ok(missing.some(alert => alert.msg.includes('ODI / Derecho a Saber')))
})

test('does not duplicate a required-document alert when the document exists', () => {
  const alerts = operationalAlerts({ trabajadores: [{ ...worker, workerItems: [{ id: 'identity', type: 'documento', name: 'Cédula de identidad', estado: 'aprobado' }] }] })
  assert.equal(alerts.some(alert => alert.msg.includes('falta Cédula de identidad')), false)
  assert.equal(alerts.filter(alert => alert.trabId === worker.id).length, 6)
})
