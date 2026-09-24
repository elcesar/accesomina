import assert from 'node:assert/strict'
import test from 'node:test'
import { documentEvidenceMessage, documentRule, hasRequiredEvidence } from '../../nexo-v2/src/services/worker-document-rules.js'

test('CV does not require an expiry date', () => {
  assert.equal(documentRule('cv', 'CV actualizado').expiration, 'never')
  assert.equal(documentRule('documento', 'Currículum Vitae').expiration, 'never')
})

test('identity and driver documents require both sides and an expiry date', () => {
  const incomplete = { type: 'documento', name: 'Cédula de identidad', files: [{ side: 'front', fileId: 'front' }], vence: '' }
  assert.equal(documentRule(incomplete.type, incomplete.name).twoSided, true)
  assert.equal(hasRequiredEvidence(incomplete), false)
  assert.match(documentEvidenceMessage(incomplete), /reverso/)
  assert.match(documentEvidenceMessage(incomplete), /fecha de vencimiento/)

  const complete = { ...incomplete, vence: '2030-01-01', files: [...incomplete.files, { side: 'back', fileId: 'back' }] }
  assert.equal(hasRequiredEvidence(complete), true)
})
