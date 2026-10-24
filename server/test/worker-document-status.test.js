import assert from 'node:assert/strict'
import test from 'node:test'
import { documentStatus, daysUntilExpiry, requirementStatus, requirementSummary } from '../../nexo-v2/src/services/worker-document-status.js'

const today = new Date(2026, 0, 15, 12)
const regularFile = { type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', fileId: 'file-1' }
const identityFiles = [{ side: 'front', fileId: 'front-1' }, { side: 'back', fileId: 'back-1' }]

test('a valid optional document without expiry is vigente and counts exactly once', () => {
  const optional = { ...regularFile, vence: null }
  assert.deepEqual(documentStatus(optional, today), { ok: true, label: 'Vigente', className: 'nk-badge-ok', source: 'cargado' })

  const summary = requirementSummary([[optional], [regularFile], [{ ...regularFile, fileId: 'file-2' }], [{ ...regularFile, fileId: 'file-3' }], []], today)
  assert.deepEqual(summary, { total: 5, fulfilled: 4, percentage: 80 })
})

test('a required identity expiry is a separate requirement from both-side evidence', () => {
  const incompleteIdentity = { type: 'documento', documentType: 'IDENTITY_CARD', files: identityFiles }
  const driverLicense = { type: 'documento', documentType: 'DRIVER_LICENSE', files: identityFiles }
  const cv = { type: 'cv', documentType: 'CV', fileId: 'cv-file' }
  assert.deepEqual(documentStatus(incompleteIdentity, today), { ok: false, label: 'No habilitado', className: 'nk-badge-error', source: 'falta fecha de vencimiento' })
  assert.equal(documentStatus(driverLicense, today).source, 'falta fecha de vencimiento')
  assert.equal(documentStatus(cv, today).label, 'Vigente')
})

test('a rejected file is no habilitado and does not count', () => {
  const rejected = { type: 'examen', documentType: 'MEDICAL_EXAM', fileId: 'exam-1', estado: 'rechazado', vence: '2026-12-31' }
  assert.equal(documentStatus(rejected, today).label, 'No habilitado')
  assert.equal(requirementSummary([[regularFile], [regularFile], [regularFile], [rejected], []], today).percentage, 60)
})

test('a legacy filename without a stored file is no habilitado and does not count', () => {
  const legacy = { type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', fileName: 'contrato-legacy.pdf' }
  assert.equal(documentStatus(legacy, today).label, 'No habilitado')
  assert.equal(requirementStatus([legacy], today).ok, false)
})

test('expiry boundaries are evaluated by local calendar day', () => {
  assert.equal(daysUntilExpiry('2026-01-15', today), 0)
  assert.equal(daysUntilExpiry('2026-02-14', today), 30)
  assert.equal(documentStatus({ ...regularFile, vence: '2026-01-15' }, today).label, 'Vigente')
  assert.equal(documentStatus({ ...regularFile, vence: '2026-01-16' }, today).label, 'Por vencer')
  assert.equal(documentStatus({ ...regularFile, vence: '2026-02-14' }, today).label, 'Por vencer')
  assert.equal(documentStatus({ ...regularFile, vence: '2026-01-25' }, today).label, 'Por vencer')
  assert.equal(documentStatus({ ...regularFile, vence: '2026-01-14' }, today).label, 'No habilitado')
})

test('two documents for one requirement count once and keep their individual status', () => {
  const expired = { ...regularFile, fileId: 'old-file', vence: '2026-01-14' }
  const current = { ...regularFile, fileId: 'current-file', vence: '2026-12-31' }
  assert.equal(documentStatus(expired, today).label, 'No habilitado')
  assert.equal(documentStatus(current, today).label, 'Vigente')
  assert.deepEqual(requirementSummary([[expired, current]], today), { total: 1, fulfilled: 1, percentage: 100 })
  assert.equal(requirementStatus([expired, current], today).label, 'Vigente')
})
