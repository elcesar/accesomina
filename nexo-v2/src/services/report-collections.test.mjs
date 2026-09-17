import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeCollections } from './report-collections.js'

test('combines current and historical collections without losing records', () => {
  const rows = mergeCollections({
    eppDeliveries: [{ id: 'current-1', itemName: 'Casco' }, { id: 'shared', itemName: 'Casco actualizado' }],
    eppEntregas: [{ id: 'legacy-1', itemName: 'Guantes' }, { id: 'shared', itemName: 'Casco histórico' }],
  }, 'eppDeliveries', 'eppEntregas')

  assert.equal(rows.length, 3)
  assert.equal(rows.find(item => item.id === 'shared').itemName, 'Casco actualizado')
  assert.ok(rows.some(item => item.id === 'legacy-1'))
  assert.ok(rows.some(item => item.id === 'current-1'))
})
