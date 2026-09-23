import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRut, isValidRut } from '../../nexo-v2/src/services/rut.js';

test('worker RUT input keeps Chilean separators and verifies its digit', () => {
  assert.equal(formatRut('138483797'), '13.848.379-7');
  assert.equal(formatRut('12.345.678-k'), '12.345.678-K');
  assert.equal(isValidRut('13.848.379-7'), true);
  assert.equal(isValidRut('13.848.379-6'), false);
});
