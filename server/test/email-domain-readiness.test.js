import test from 'node:test';
import assert from 'node:assert/strict';
import { dkimRecordName, inspectEmailDomainAuthentication, senderDomain } from '../email-domain-readiness.js';

test('extracts a normalized sender domain without retaining the display name', () => {
  assert.equal(senderDomain('Nexo Klar <No-Reply@NexoKlar.com>'), 'nexoklar.com');
  assert.equal(senderDomain('sin-correo'), null);
  assert.equal(dkimRecordName('nexoklar.com', 'selector-2026'), 'selector-2026._domainkey.nexoklar.com');
  assert.equal(dkimRecordName('nexoklar.com', '../../invalid'), null);
});

test('requires SPF, DMARC and the configured DKIM selector', async () => {
  const records = new Map([
    ['nexoklar.com', [['v=spf1 include:mailer.example -all']]],
    ['_dmarc.nexoklar.com', [['v=DMARC1; p=quarantine']]],
    ['s1._domainkey.nexoklar.com', [['v=DKIM1; k=rsa; p=public-key']]],
  ]);
  const result = await inspectEmailDomainAuthentication({
    emailFrom:'Nexo Klar <no-reply@nexoklar.com>',
    dkimSelector:'s1',
    resolveTxt: async name => records.get(name) || [],
  });
  assert.deepEqual(result, {
    ready:true,
    domain:'nexoklar.com',
    spf:{ name:'nexoklar.com', status:'present' },
    dmarc:{ name:'_dmarc.nexoklar.com', status:'present' },
    dkim:{ name:'s1._domainkey.nexoklar.com', status:'present' },
  });
});

test('reports missing records or a missing selector without querying SMTP or sending mail', async () => {
  const result = await inspectEmailDomainAuthentication({
    emailFrom:'no-reply@nexoklar.com',
    resolveTxt: async () => [],
  });
  assert.equal(result.ready, false);
  assert.equal(result.spf.status, 'missing');
  assert.equal(result.dmarc.status, 'missing');
  assert.equal(result.dkim.status, 'selector_required');
});

test('keeps DNS outages distinct from absent authentication records', async () => {
  const result = await inspectEmailDomainAuthentication({
    emailFrom:'no-reply@nexoklar.com',
    dkimSelector:'s1',
    resolveTxt: async () => { throw Object.assign(new Error('resolver unavailable'), { code:'ETIMEOUT' }); },
  });
  assert.equal(result.ready, false);
  assert.equal(result.spf.status, 'unavailable');
  assert.equal(result.dmarc.status, 'unavailable');
  assert.equal(result.dkim.status, 'unavailable');
});
