import assert from 'node:assert/strict'
import test from 'node:test'
import { documentEvidenceMessage, documentRule, hasRequiredEvidence, workerItemType } from '../../nexo-v2/src/services/worker-document-rules.js'

test('CV does not require an expiry date', () => {
  assert.equal(documentRule('cv', 'CV actualizado').expiration, 'never')
  assert.equal(documentRule('documento', 'Currículum Vitae').expiration, 'never')
})

test('identity and driver documents require both sides, while expiry remains an input rule', () => {
  const incomplete = { type: 'documento', name: 'Cédula de identidad', files: [{ side: 'front', fileId: 'front' }], vence: '' }
  assert.equal(documentRule(incomplete.type, incomplete.name).twoSided, true)
  assert.equal(hasRequiredEvidence(incomplete), false)
  assert.match(documentEvidenceMessage(incomplete), /reverso/)

  const complete = { ...incomplete, files: [...incomplete.files, { side: 'back', fileId: 'back' }] }
  assert.equal(hasRequiredEvidence(complete), true)
})

test('a legacy filename without a stored file is not evidence', () => {
  const legacy = { type: 'contrato', name: 'Contrato de trabajo', fileName: 'contrato-legacy.pdf' }
  assert.equal(hasRequiredEvidence(legacy), false)
  assert.equal(documentEvidenceMessage(legacy), 'archivo no disponible')
})

test('semantic document codes take precedence over display names', () => {
  assert.equal(documentRule('IDENTITY_CARD').twoSided, true)
  assert.equal(documentRule('DRIVER_LICENSE').expiration, 'required')
  assert.equal(documentRule('documento', 'Archivo renombrado', 'CV').expiration, 'never')
})

test('a single visible document type resolves the legacy item category internally', () => {
  assert.equal(workerItemType('EMPLOYMENT_CONTRACT'), 'contrato')
  assert.equal(workerItemType('SERVICE_ANNEX'), 'contrato')
  assert.equal(workerItemType('MEDICAL_EXAM'), 'examen')
  assert.equal(workerItemType('TRAINING'), 'curso')
})
