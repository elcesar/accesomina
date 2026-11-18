import assert from 'node:assert/strict'
import test from 'node:test'
import { helmetCompliance } from '../../nexo-v2/src/services/helmet-compliance.js'
import { deriveOperationalAlerts } from '../../nexo-v2/src/services/operational-alerts.js'

const worker = (epp = {}) => ({ id: 'w1', nombre: 'Persona QA', mineras: ['m1'], epp })
const state = {
  minas: [{ id: 'm1', nombre: 'Cliente QA' }],
  mantenciones: [{ id: 'os1', minaId: 'm1', nombre: 'OS QA' }],
  helmetColors: [{ code: 'azul', label: 'Azul', active: true }],
  helmetPolicies: [{ id: 'tenant', scope: 'tenant', active: true, requireColor: true, requireSize: true, requireModelClass: false, allowedColorCodes: ['azul'] }],
}

test('helmet compliance leaves legacy helmet size pending instead of inferring a requirement', () => {
  const result = helmetCompliance(worker({ casco: 'Talla única' }), state)
  assert.equal(result.status, 'pending')
  assert.equal(result.warning, true)
  assert.equal(result.blocksOperation, false)
})

test('helmet compliance respects no-required and complete decisions', () => {
  assert.equal(helmetCompliance(worker({ helmet: { applicability: 'not_required', reason: 'Administrativo' } }), state).status, 'not_required')
  assert.equal(helmetCompliance(worker({ casco: 'M', helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' } }), state).status, 'complete')
})

test('operational alerts expose helmet incompleteness as an advisory warning only', () => {
  const alerts = deriveOperationalAlerts({ ...state, trabajadores: [worker({ helmet: { applicability: 'required', colorCode: '', colorLabel: '', size: '' } })] })
  const alert = alerts.find(item => item.id === 'derived-person-helmet-w1')
  assert.ok(alert)
  assert.equal(alert.urgencia, 'proximo')
  assert.equal(alert.advisory, true)
  assert.equal(alert.blocksOperation, false)
})
