import assert from 'node:assert/strict'
import test from 'node:test'
import { PPE_SIZE_FIELDS, normalizeWorkerEpp, updateWorkerEpp } from '../../nexo-v2/src/config/ppe-catalog.js'

test('EPP optional sizes start blank and helmet remains fixed', () => {
  const epp = normalizeWorkerEpp({})
  assert.equal(epp.casco, 'Talla única')
  assert.equal(epp.camisa, '')
  assert.equal(epp.pantalon, '')
  assert.equal(epp.calzado, '')
  assert.equal(PPE_SIZE_FIELDS.find(field => field.key === 'casco').fixed, true)
})

test('EPP keeps historical aliases and all previously visible fields', () => {
  const epp = normalizeWorkerEpp({ polera: 'L', zapato: '42', guante: 'M', arnes: 'L', respirador: 'fit test aprobado' })
  assert.equal(epp.camisa, 'L')
  assert.equal(epp.calzado, '42')
  assert.equal(epp.guante, 'M')
  assert.equal(epp.arnes, 'L')
  assert.equal(epp.respirador, 'fit test aprobado')
})

test('updating one EPP field preserves optional and historical data', () => {
  const next = updateWorkerEpp({ ropa: 'XL', guante: 'M', arnes: 'L' }, 'calzado', '43')
  assert.equal(next.camisa, 'XL')
  assert.equal(next.guante, 'M')
  assert.equal(next.arnes, 'L')
  assert.equal(next.calzado, '43')
})
