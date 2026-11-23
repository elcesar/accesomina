import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WORKER_REGIMENS,
  isCanonicalWorkerRegimen,
  normalizeWorkerRegimen,
  workerRegimenLabel,
  workerRegimenMatches,
} from '../../nexo-v2/src/config/worker-catalogs.js'

test('historical worker regimen aliases match the canonical Turno especial filter', () => {
  for (const historical of ['turno_especial', 'Otro tipo de turno', 'otro']) {
    assert.equal(normalizeWorkerRegimen(historical), 'otro')
    assert.equal(workerRegimenMatches(historical, 'otro'), true)
    assert.equal(workerRegimenLabel(historical), 'Turno especial')
  }
})

test('canonical regimens remain distinct and six by one is not historical', () => {
  for (const regimen of ['5x2', '6x1', '7x7', '10x10', '14x14']) {
    assert.equal(workerRegimenMatches(regimen, regimen), true)
    assert.equal(isCanonicalWorkerRegimen(regimen), true)
  }
  assert.equal(WORKER_REGIMENS.filter(item => item.value === '6x1').length, 1)
  assert.equal(isCanonicalWorkerRegimen('turno_especial'), false)
})
