import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChileDate } from '../../nexo-v2/src/services/chile-format.js';
import { formatChilePhone } from '../../nexo-v2/src/services/chile-phone.js';

test('worker summary formats Chilean date-only values without timezone shifts', () => {
  assert.equal(formatChileDate('2026-10-02'), '02-10-2026');
  assert.equal(formatChileDate(''), '');
  assert.equal(formatChileDate('not-a-date'), 'not-a-date');
});

test('worker summary formats a Chilean mobile phone for reading', () => {
  assert.equal(formatChilePhone('+56912345678'), '+56 9 1234 5678');
});
