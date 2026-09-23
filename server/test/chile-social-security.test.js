import test from 'node:test';
import assert from 'node:assert/strict';
import { AFP_CHILE, PREVISION_SALUD_CHILE } from '../../nexo-v2/src/services/chile-social-security.js';

test('worker social security lists include current Chilean AFP and health choices', () => {
  assert.deepEqual(AFP_CHILE, ['AFP Capital', 'AFP Cuprum', 'AFP Habitat', 'AFP Modelo', 'AFP PlanVital', 'AFP Provida', 'AFP Uno']);
  assert.ok(PREVISION_SALUD_CHILE.includes('Fonasa'));
  assert.ok(PREVISION_SALUD_CHILE.includes('Isapre Esencial'));
});
