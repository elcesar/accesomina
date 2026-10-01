import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateWorkerReadiness, resolveOperationalRequirements } from '../../nexo-v2/src/services/operational-requirements.js'

const worker = { id: 'w1', nombre: 'Ana', cargo: 'Conductor', especialidad: 'Operadora', workerItems: [
  { id: 'id', type: 'documento', documentType: 'IDENTITY_CARD', vence: '2030-01-01', files: [{ side: 'front', fileId: 'f1' }, { side: 'back', fileId: 'f2' }] },
] }

const completeBaseItems = [
  { id: 'contract', type: 'documento', documentType: 'EMPLOYMENT_CONTRACT' },
  { id: 'afp', type: 'documento', documentType: 'AFP_CERTIFICATE' },
  { id: 'health', type: 'documento', documentType: 'HEALTH_INSURANCE_CERTIFICATE' },
  { id: 'medical', type: 'documento', documentType: 'MEDICAL_EXAM' },
  { id: 'odi', type: 'documento', documentType: 'ODI_ACKNOWLEDGMENT' },
  { id: 'internal', type: 'documento', documentType: 'INTERNAL_REGULATION_ACKNOWLEDGMENT' },
]

test('merges an OS requirement with the same base requirement and preserves sources', () => {
  const state = { mantenciones: [{ id: 'os-1', minaId: 'c1', contratoId: 'ctr-1' }], requirementRules: [
    { id: 'rule-1', requirementCode: 'IDENTITY_CARD', name: 'Cédula de identidad', orderId: 'os-1', required: true },
  ] }
  const requirements = resolveOperationalRequirements({ state, worker, orderId: 'os-1', evaluatedAt: '2026-10-01' })
  const identity = requirements.find(item => item.requirementCode === 'IDENTITY_CARD')
  assert.equal(identity.status, 'vigente')
  assert.equal(identity.sources.length, 2)
})

test('uses exact cargo applicability and reports an expired document as not ready', () => {
  const state = { mantenciones: [{ id: 'os-1', minaId: 'c1', contratoId: 'ctr-1' }], requirementRules: [
    { id: 'a4', requirementCode: 'DRIVER_LICENSE', name: 'Licencia A4', orderId: 'os-1', cargo: 'Conductor', requiresExpiry: true },
    { id: 'height', requirementCode: 'MEDICAL_EXAM', name: 'Examen de altura', orderId: 'os-1', cargo: 'Mecánico', requiresExpiry: true },
  ] }
  const withLicense = { ...worker, workerItems: [...worker.workerItems, ...completeBaseItems, { id: 'license', type: 'documento', documentType: 'DRIVER_LICENSE', vence: '2026-09-30', files: [{ side: 'front', fileId: 'f3' }, { side: 'back', fileId: 'f4' }] }] }
  const readiness = evaluateWorkerReadiness({ state, worker: withLicense, orderId: 'os-1', evaluatedAt: '2026-10-01' })
  assert.equal(readiness.requirements.some(item => item.requirementCode === 'MEDICAL_EXAM' && item.sources.some(source => source.id === 'height')), false)
  assert.equal(readiness.status, 'no_habilitado')
  assert.equal(readiness.cause.code, 'DRIVER_LICENSE')
})
