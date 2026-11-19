import { inspectEmailDomainAuthentication } from '../email-domain-readiness.js';

const result = await inspectEmailDomainAuthentication({
  emailFrom: process.env.EMAIL_FROM,
  dkimSelector: process.env.EMAIL_DKIM_SELECTOR,
});

console.log(JSON.stringify({
  status: result.ready ? 'ready' : 'not_ready',
  senderDomain: result.domain,
  checks: { spf:result.spf, dmarc:result.dmarc, dkim:result.dkim },
}, null, 2));

if (!result.ready) process.exitCode = 1;
