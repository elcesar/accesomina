import assert from 'node:assert/strict'
import test from 'node:test'
import { formatChileDate, formatChilePhone } from '../../nexo-v2/src/services/chile-format.js'

test('formats date-only values for Chilean presentation', () => {
  assert.equal(formatChileDate('2000-01-09'), '09-01-2000')
  assert.equal(formatChileDate(''), '')
})

test('formats the canonical Chilean mobile phone for presentation', () => {
  assert.equal(formatChilePhone('+56912345678'), '+56 9 1234 5678')
})
