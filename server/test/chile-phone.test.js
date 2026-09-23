import test from 'node:test';
import assert from 'node:assert/strict';
import { formatChilePhone, isValidChilePhone, normalizeChilePhone } from '../../nexo-v2/src/services/chile-phone.js';
test('worker phone uses +56 and exactly eleven digits', () => { assert.equal(normalizeChilePhone('9 1234 5678'), '+56912345678'); assert.equal(formatChilePhone('9 1234 5678'), '+56 9 1234 5678'); assert.equal(isValidChilePhone('+56912345678'), true); assert.equal(isValidChilePhone('56912345678'), true); assert.equal(isValidChilePhone('+5691234567'), false); assert.equal(normalizeChilePhone('+56 9 1234 5678 9'), '+569123456789'); assert.equal(isValidChilePhone('+56 9 1234 5678 9'), false); assert.equal(isValidChilePhone('9 1234 5678 9'), false); });
