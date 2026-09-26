import assert from 'node:assert/strict';
import test from 'node:test';
import { friendlyApiError } from '../../nexo-v2/src/services/api.js';

test('save validation errors remain actionable instead of falling back to a generic conflict',()=>{
  assert.match(friendlyApiError('DUPLICATE_CREDENTIAL',409),/Ya existe un registro equivalente/);
  assert.match(friendlyApiError('INVALID_WORK_BOOK_REFERENCE',409),/Revisa los datos relacionados/);
  assert.match(friendlyApiError('MISSING_RENTAL_EXPIRY',409),/Completa la información obligatoria/);
  assert.match(friendlyApiError('OVERLAPPING_HOTEL_ASSIGNMENT',409),/superpone/);
});
