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

test('does not duplicate an identity alert when both sides and its expiry are registered', () => {
  const alerts = operationalAlerts({ trabajadores: [{ ...worker, workerItems: [{ id: 'identity', type: 'documento', name: 'Cédula de identidad', estado: 'aprobado', vence: '2030-01-01', files: [{ side: 'front', fileId: 'front' }, { side: 'back', fileId: 'back' }] }] }] })
  assert.equal(alerts.some(alert => alert.msg.includes('falta Cédula de identidad')), false)
  assert.equal(alerts.filter(alert => alert.trabId === worker.id).length, 6)
})

test('uses a complete replacement evidence when an older record is incomplete', () => {
  const alerts = operationalAlerts({ trabajadores: [{ ...worker, workerItems: [
    { id: 'identity-old', type: 'documento', name: 'Cédula de identidad', files: [{ side: 'front', fileId: 'front-old' }] },
    { id: 'identity-new', type: 'documento', name: 'Cédula de identidad', estado: 'aprobado', vence: '2030-01-01', files: [{ side: 'front', fileId: 'front-new' }, { side: 'back', fileId: 'back-new' }] },
  ] }] })

  assert.equal(alerts.some(alert => alert.msg.includes('falta Cédula de identidad')), false)
})
