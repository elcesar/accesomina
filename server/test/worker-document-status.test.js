import assert from 'node:assert/strict'
import test from 'node:test'
import { documentStatus, daysUntilExpiry, requirementStatus, requirementSummary, workerComplianceIssues, workerComplianceRequirements, workerComplianceSummary, workerRequirementStatus } from '../../nexo-v2/src/services/worker-document-status.js'

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

test('worker compliance uses the same specialty-aware requirements and evidence policy everywhere', () => {
  const validIdentity = { type: 'documento', documentType: 'IDENTITY_CARD', files: identityFiles, vence: '2030-01-01' }
  const worker = {
    especialidad: 'Mecánico Industrial',
    workerItems: [
      validIdentity,
      { ...regularFile, type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT', name: 'Contrato de trabajo' },
      { ...regularFile, type: 'contrato', documentType: 'SERVICE_ANNEX', name: 'Anexo asociado al servicio' },
      { ...regularFile, type: 'documento', documentType: 'AFP_CERTIFICATE', name: 'Certificado AFP' },
      { ...regularFile, type: 'documento', documentType: 'AFC_CERTIFICATE', name: 'Certificado AFC' },
      { ...regularFile, type: 'documento', documentType: 'HEALTH_INSURANCE_CERTIFICATE', name: 'Certificado Fonasa/Isapre' },
      { ...regularFile, type: 'examen', documentType: 'MEDICAL_EXAM', name: 'Examen preocupacional' },
      { ...regularFile, type: 'curso', documentType: 'ODI_ACKNOWLEDGMENT', name: 'ODI / Derecho a Saber' },
      { ...regularFile, type: 'curso', documentType: 'INTERNAL_REGULATION_ACKNOWLEDGMENT', name: 'Reglamento Interno' },
      { type: 'cv', documentType: 'CV', name: 'CV actualizado', fileId: 'cv-file' },
      { ...regularFile, type: 'curso', name: 'LOTO / Bloqueo y Etiquetado' },
    ],
  }

  const requirements = workerComplianceRequirements(worker)
  assert.equal(requirements.length, 11)
  assert.equal(workerComplianceSummary(worker, today).percentage, 100)
  assert.deepEqual(workerComplianceIssues(worker, today), [])

  const loto = requirements.find(requirement => requirement.name === 'LOTO / Bloqueo y Etiquetado')
  assert.equal(workerRequirementStatus(worker, loto, today).label, 'Vigente')

  worker.workerItems = worker.workerItems.filter(item => item.name !== 'Anexo asociado al servicio')
  const incomplete = workerComplianceSummary(worker, today)
  assert.deepEqual({ total: incomplete.total, fulfilled: incomplete.fulfilled, percentage: incomplete.percentage }, { total: 11, fulfilled: 10, percentage: 91 })
  assert.deepEqual(workerComplianceIssues(worker, today).map(issue => issue.message), ['Falta: Anexo asociado al servicio'])
})
