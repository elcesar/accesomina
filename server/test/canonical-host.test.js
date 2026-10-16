import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRedirectMiddleware } from '../canonical-host.js';

function invoke({ hostname, url = '/', enabled = true } = {}) {
  const result = {};
  let continued = false;
  const middleware = canonicalRedirectMiddleware({
    origin: 'https://nexoklar.com',
    redirectHosts: ['nexoklar.cl', 'www.nexoklar.cl', 'www.nexoklar.com'],
    enabled,
  });
  middleware(
    { hostname, originalUrl: url },
    { redirect(status, location) { result.status = status; result.location = location; return result; } },
    () => { continued = true; },
  );
  return { result, continued };
}

for (const hostname of ['nexoklar.cl', 'www.nexoklar.cl', 'www.nexoklar.com']) {
  test(`canonical redirect sends ${hostname} to nexoklar.com and preserves URL`, () => {
    const { result, continued } = invoke({ hostname, url: '/registro-empresa?source=qa' });
    assert.equal(continued, false);
    assert.equal(result.status, 308);
    assert.equal(result.location, 'https://nexoklar.com/registro-empresa?source=qa');
  });
}

test('canonical redirect does not change the canonical host or an unrecognized host', () => {
  for (const hostname of ['nexoklar.com', 'preview.nexoklar.com']) {
    const { result, continued } = invoke({ hostname });
    assert.equal(continued, true);
    assert.deepEqual(result, {});
  }
});

test('canonical redirect remains disabled outside production', () => {
  const { result, continued } = invoke({ hostname: 'www.nexoklar.cl', enabled: false });
  assert.equal(continued, true);
  assert.deepEqual(result, {});
});
