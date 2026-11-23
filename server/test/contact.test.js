import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createContactRouter, deliverToSales, evaluateSmtpDelivery, logContactDelivery, normalizeDemoRequest } from '../routes/contact.js';
import { sha256 } from '../security.js';

const DEMO_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';
const SALES_EMAIL = 'ventas@nexoklar.example';
const SMTP = {
  host: 'smtp.qa.invalid',
  port: 587,
  secure: false,
  user: 'qa-user',
  pass: 'not-a-real-secret',
  from: 'Nexo Klar <no-reply@nexoklar.example>',
};

const validPayload = {
  nombre: 'Carolina Soto',
  empresa: 'Servicios Norte',
  correo: 'carolina@empresa.example',
  telefono: '9 1234 5678',
  industria: 'Minería',
  dotacion: '31 a 75',
  necesidad: 'Acreditar personas.',
};

async function withContactApp({ deliver }, run) {
  const writes = [];
  const logs = [];
  const queryFn = async (sql, params) => {
    if (/^\s*INSERT INTO public_demo_requests/.test(sql)) return { rows: [{ id: DEMO_ID }] };
    if (/^\s*UPDATE public_demo_requests/.test(sql)) {
      writes.push({ sql, params });
      return { rows: [] };
    }
    throw new Error('Unexpected query in contact test');
  };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.requestId = REQUEST_ID;
    next();
  });
  app.use('/api', createContactRouter({ deliver, queryFn, logger: entry => logs.push(JSON.parse(entry)) }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.code || 'SERVER_ERROR' }));
  const server = await new Promise((resolve, reject) => {
    const active = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(active));
  });
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    return await run({ base, writes, logs });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function postContact(base) {
  const response = await fetch(base + '/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validPayload),
  });
  return { status: response.status, body: await response.json() };
}

test('normalizes a valid public demo request before persistence', () => {
  const request = normalizeDemoRequest({
    nombre: '  Carolina Soto ',
    empresa: ' Servicios Norte ',
    correo: ' CAROLINA@EMPRESA.CL ',
    telefono: '9 1234 5678',
    industria: 'Minería',
    dotacion: '31 a 75',
    necesidad: 'Acreditar personas.',
  });
  assert.deepEqual(request, {
    fullName: 'Carolina Soto', companyName: 'Servicios Norte', email: 'carolina@empresa.cl',
    phone: '+56912345678', industry: 'Minería', workforceSize: '31 a 75', need: 'Acreditar personas.',
  });
});

test('rejects a malformed public demo request', () => {
  assert.throws(() => normalizeDemoRequest({ nombre: 'A', correo: 'no-es-correo' }));
  assert.throws(() => normalizeDemoRequest({ nombre: 'Carolina Soto', correo: 'carolina@empresa.cl', telefono: '123' }), error => error.code === 'INVALID_CONTACT_PHONE');
});

test('SMTP delivery succeeds only when the commercial recipient is accepted', async () => {
  let message;
  const accepted = await deliverToSales(normalizeDemoRequest(validPayload), {
    smtpConfig: SMTP,
    salesContactEmail: SALES_EMAIL,
    createTransport: () => ({
      sendMail: async value => {
        message = value;
        return { accepted: ['Nexo Klar <VENTAS@NEXOKLAR.EXAMPLE>'], responseCode: 250, messageId: '<accepted-message@qa.invalid>' };
      },
    }),
  });
  assert.deepEqual(accepted, {
    delivered: true,
    outcome: 'SMTP_ACCEPTED',
    smtpResponseCode: 250,
    smtpMessageIdHash: sha256('<accepted-message@qa.invalid>'),
  });
  assert.equal(message.to, SALES_EMAIL);

  const rejected = evaluateSmtpDelivery({
    accepted: [],
    rejected: [SALES_EMAIL],
    responseCode: 550,
    messageId: '<rejected-message@qa.invalid>',
  }, SALES_EMAIL);
  assert.deepEqual(rejected, {
    delivered: false,
    outcome: 'SMTP_RECIPIENT_REJECTED',
    smtpResponseCode: 550,
    smtpMessageIdHash: sha256('<rejected-message@qa.invalid>'),
  });

  // Contradictory provider results must not report a successful delivery.
  const contradictoryRejected = evaluateSmtpDelivery({
    accepted: [SALES_EMAIL], rejected: [SALES_EMAIL], responseCode: 250,
  }, SALES_EMAIL);
  assert.equal(contradictoryRejected.delivered, false);
  assert.equal(contradictoryRejected.outcome, 'SMTP_RECIPIENT_REJECTED');

  const contradictoryPending = evaluateSmtpDelivery({
    accepted: [SALES_EMAIL], pending: [SALES_EMAIL], responseCode: 250,
  }, SALES_EMAIL);
  assert.equal(contradictoryPending.delivered, false);
  assert.equal(contradictoryPending.outcome, 'SMTP_RECIPIENT_PENDING');

  const empty = evaluateSmtpDelivery({ accepted: [], responseCode: 250 }, SALES_EMAIL);
  assert.equal(empty.delivered, false);
  assert.equal(empty.outcome, 'SMTP_RECIPIENT_NOT_ACCEPTED');

  const pending = evaluateSmtpDelivery({ accepted: [], pending: [SALES_EMAIL], responseCode: 250 }, SALES_EMAIL);
  assert.equal(pending.delivered, false);
  assert.equal(pending.outcome, 'SMTP_RECIPIENT_PENDING');

  const failure = await deliverToSales(normalizeDemoRequest(validPayload), {
    smtpConfig: SMTP,
    salesContactEmail: SALES_EMAIL,
    createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error('smtp secret detail'), { code: 'EAUTH', responseCode: 535 }); } }),
  });
  assert.deepEqual(failure, {
    delivered: false,
    outcome: 'SMTP_AUTH_FAILED',
    smtpResponseCode: 535,
    smtpMessageIdHash: null,
  });
});

test('contact endpoint persists accepted-by-SMTP evidence and returns 201', async () => {
  const delivery = evaluateSmtpDelivery({
    accepted: [SALES_EMAIL],
    responseCode: 250,
    messageId: '<accepted-http@qa.invalid>',
  }, SALES_EMAIL);

  await withContactApp({ deliver: async () => delivery }, async ({ base, writes, logs }) => {
    const response = await postContact(base);
    assert.equal(response.status, 201);
    assert.equal(response.body.requestId, DEMO_ID);
    assert.deepEqual(writes[0].params, [
      DEMO_ID, 'sent', 'SMTP_ACCEPTED', 250, sha256('<accepted-http@qa.invalid>'), '',
    ]);
    assert.deepEqual(logs[0], {
      at: logs[0].at,
      service: logs[0].service,
      event: 'contact.smtp_delivery',
      outcome: 'accepted_by_smtp',
      code: 'SMTP_ACCEPTED',
      requestId: REQUEST_ID,
      demoRequestId: DEMO_ID,
      smtpResponseCode: 250,
      smtpMessageIdHash: sha256('<accepted-http@qa.invalid>'),
    });
    assert.ok(!JSON.stringify(logs).includes(SALES_EMAIL));
  });
});

test('contact endpoint records rejected or empty SMTP acceptance as failed and returns 503', async () => {
  const delivery = evaluateSmtpDelivery({
    accepted: [],
    rejected: [SALES_EMAIL],
    responseCode: 550,
    messageId: '<rejected-http@qa.invalid>',
  }, SALES_EMAIL);

  await withContactApp({ deliver: async () => delivery }, async ({ base, writes, logs }) => {
    const response = await postContact(base);
    assert.equal(response.status, 503);
    assert.equal(response.body.error, 'CONTACT_DELIVERY_UNAVAILABLE');
    assert.deepEqual(writes[0].params, [
      DEMO_ID, 'failed', 'SMTP_RECIPIENT_REJECTED', 550, sha256('<rejected-http@qa.invalid>'), 'SMTP_RECIPIENT_REJECTED',
    ]);
    assert.equal(logs[0].code, 'SMTP_RECIPIENT_REJECTED');
    assert.ok(!JSON.stringify({ writes, logs }).includes(SALES_EMAIL));
    assert.ok(!JSON.stringify({ writes, logs }).includes('<rejected-http@qa.invalid>'));
  });
});

test('contact endpoint records a sanitized transport failure and never logs error content', async () => {
  const secret = 'smtp-password-and-recipient-' + SALES_EMAIL;
  await withContactApp({
    deliver: async () => { throw Object.assign(new Error(secret), { code: 'EAUTH', responseCode: 535 }); },
  }, async ({ base, writes, logs }) => {
    const response = await postContact(base);
    assert.equal(response.status, 503);
    assert.ok(!JSON.stringify(response.body).includes(secret));
    assert.ok(!JSON.stringify(response.body).includes(SALES_EMAIL));
    assert.deepEqual(writes[0].params, [
      DEMO_ID, 'failed', 'SMTP_AUTH_FAILED', 535, null, 'SMTP_AUTH_FAILED',
    ]);
    assert.equal(logs[0].code, 'SMTP_AUTH_FAILED');
    assert.ok(!JSON.stringify(logs).includes(secret));
    assert.ok(!JSON.stringify(logs).includes(SALES_EMAIL));
  });
});

test('contact delivery logs reject caller-supplied identifiers, outcome and hash values', () => {
  const entries = [];
  logContactDelivery({
    requestId: 'https://qa.invalid/private',
    demoRequestId: 'sales@nexoklar.example',
    delivery: {
      delivered: true,
      outcome: 'untrusted outcome',
      smtpResponseCode: 'not-a-code',
      smtpMessageIdHash: 'sales@nexoklar.example',
    },
  }, entry => entries.push(JSON.parse(entry)));

  assert.equal(entries[0].outcome, 'failed');
  assert.equal(entries[0].code, 'SMTP_DELIVERY_FAILED');
  assert.equal(entries[0].requestId, null);
  assert.equal(entries[0].demoRequestId, null);
  assert.equal(entries[0].smtpResponseCode, null);
  assert.equal(entries[0].smtpMessageIdHash, null);
});
