import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKER_RATINGS, workerRatingLevel } from '../../nexo-v2/src/services/worker-rating.js';

test('worker performance uses a post-creation five-level scale', () => {
  assert.deepEqual(WORKER_RATINGS.map(item => item.label), ['Insuficiente', 'En desarrollo', 'Suficiente', 'Bueno', 'Destacado']);
  assert.equal(workerRatingLevel(undefined), null);
  assert.equal(workerRatingLevel(3), 3);
  assert.equal(workerRatingLevel(7), 5);
});
