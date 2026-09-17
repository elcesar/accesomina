import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeReportCollections } from '../../nexo-v2/src/services/report-collections.js';

test('consolidates current and legacy EPP deliveries without losing records', () => {
  const state = {
    eppDeliveries: [{ id: 'current-1', itemName: 'Casco' }],
    eppEntregas: [{ id: 'legacy-1', itemName: 'Guantes' }],
  };

  assert.deepEqual(
    mergeReportCollections(state, 'eppDeliveries', 'eppEntregas').map(row => row.id),
    ['legacy-1', 'current-1'],
  );
});

test('consolidates prospect collections and keeps the canonical version of a duplicate', () => {
  const state = {
    prospectos: [{ id: 'shared', company: 'Proyecto actualizado' }, { id: 'prospect-1', company: 'Minera Norte' }],
    oportunidades: [{ id: 'legacy-1', company: 'Constructora ABC' }],
    opportunities: [{ id: 'shared', company: 'Proyecto histórico' }, { id: 'opportunity-1', company: 'Proyecto SQM' }],
  };

  const records = mergeReportCollections(state, 'prospectos', 'oportunidades', 'opportunities');
  assert.equal(records.length, 4);
  assert.equal(records.find(row => row.id === 'shared').company, 'Proyecto actualizado');
  assert.deepEqual(records.map(row => row.id), ['shared', 'opportunity-1', 'legacy-1', 'prospect-1']);
});

test('deduplicates equivalent legacy records without ids', () => {
  const delivery = { workerId: 'worker-1', itemId: 'helmet-1', deliveredAt: '2026-09-17' };
  const records = mergeReportCollections({ eppDeliveries: [delivery], eppEntregas: [{ ...delivery }] }, 'eppDeliveries', 'eppEntregas');
  assert.equal(records.length, 1);
});
