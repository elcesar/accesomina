import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReadiness } from '../readiness.js';

test('production readiness does not require an antivirus explicitly disabled by configuration', async () => {
  const config = {
    env: 'production',
    serviceName: 'nexo-klar',
    version: 'test',
    fileStorage: 's3',
    aws: { region: 'us-east-1', bucket: 'qa-bucket' },
    virusScan: { enabled: false, url: '', healthUrl: '', token: '' },
    documentAi: { url: '', token: '' },
  };
  const result = await evaluateReadiness(config, {
    query: async () => ({ rows: [] }),
    s3Client: { send: async () => ({}) },
  });

  assert.equal(result.status, 'ready');
  assert.deepEqual(result.checks.find(check => check.name === 'antivirus'), {
    name: 'antivirus', ok: true, required: false, latencyMs: 0, detail: 'disabled-by-configuration',
  });
});
