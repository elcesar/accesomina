import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dkimRecordName,
  inspectEmailDeliveryPreflight,
  senderDomain,
  smtpTransportConfiguration,
} from '../email-delivery-preflight.js'

const smtp = {
  host: 'smtp.example.test',
  port: '587',
  secure: 'false',
  user: 'smtp-user',
  pass: 'super-secret-password',
  from: 'Nexo Klar <no-reply@nexoklar.com>',
}

const dnsRecords = new Map([
  ['nexoklar.com', [['v=spf1 include:mailer.example -all']]],
  ['_dmarc.nexoklar.com', [['v=DMARC1; p=quarantine']]],
  ['s1._domainkey.nexoklar.com', [['v=DKIM1; k=rsa; p=public-key']]],
])

const resolveTxt = async name => dnsRecords.get(name) || []

test('normalizes sender domain and safely constrains the DKIM lookup name', () => {
  assert.equal(senderDomain('Nexo Klar <No-Reply@NexoKlar.com>'), 'nexoklar.com')
  assert.equal(senderDomain('sender without an address'), null)
  assert.equal(dkimRecordName('nexoklar.com', 's1'), 's1._domainkey.nexoklar.com')
  assert.equal(dkimRecordName('nexoklar.com', '../../invalid'), null)
  assert.deepEqual(smtpTransportConfiguration({ ...smtp, secure: 'unexpected' }), {
    configured: false,
    missing: [],
    invalid: ['SMTP_SECURE'],
  })
})

test('preflight requires public SPF, DMARC, DKIM and complete transport configuration', async () => {
  const result = await inspectEmailDeliveryPreflight({
    emailFrom: smtp.from,
    dkimSelector: 's1',
    smtp,
    resolveTxt,
  })
  assert.equal(result.ready, true)
  assert.equal(result.verified, false)
  assert.deepEqual(result.spf, { name: 'nexoklar.com', status: 'present' })
  assert.deepEqual(result.dmarc, { name: '_dmarc.nexoklar.com', status: 'present' })
  assert.deepEqual(result.dkim, { name: 's1._domainkey.nexoklar.com', status: 'present' })
  assert.deepEqual(result.transport, { checked: false, status: 'not_checked' })
})

test('the default safe preflight never opens SMTP transport or sends mail', async () => {
  let transportCalls = 0
  const result = await inspectEmailDeliveryPreflight({
    emailFrom: smtp.from,
    dkimSelector: 's1',
    smtp,
    resolveTxt,
    createTransport: () => {
      transportCalls += 1
      throw new Error('must not be called')
    },
  })
  assert.equal(result.ready, true)
  assert.equal(transportCalls, 0)
})

test('explicit transport verification authenticates without accepting a recipient or calling sendMail', async () => {
  let sent = false
  let closed = false
  const result = await inspectEmailDeliveryPreflight({
    emailFrom: smtp.from,
    dkimSelector: 's1',
    smtp,
    resolveTxt,
    verifyTransport: true,
    createTransport: options => {
      assert.equal(options.host, 'smtp.example.test')
      assert.equal(options.port, 587)
      assert.equal(options.secure, false)
      return {
        verify: async () => true,
        sendMail: async () => { sent = true },
        close: () => { closed = true },
      }
    },
  })
  assert.equal(result.ready, true)
  assert.equal(result.verified, true)
  assert.deepEqual(result.transport, { checked: true, status: 'reachable' })
  assert.equal(sent, false)
  assert.equal(closed, true)
})

test('absent DNS, invalid configuration and transport failures remain actionable without disclosing secrets', async () => {
  const result = await inspectEmailDeliveryPreflight({
    emailFrom: smtp.from,
    dkimSelector: 's1',
    smtp: { ...smtp, pass: '' },
    verifyTransport: true,
    resolveTxt: async () => { throw Object.assign(new Error('resolver unavailable'), { code: 'ETIMEOUT' }) },
  })
  assert.equal(result.ready, false)
  assert.equal(result.verified, false)
  assert.equal(result.smtp.configured, false)
  assert.deepEqual(result.smtp.missing, ['SMTP_PASS'])
  assert.equal(result.spf.status, 'unavailable')
  assert.equal(result.dmarc.status, 'unavailable')
  assert.equal(result.dkim.status, 'unavailable')
  assert.equal(result.transport.status, 'not_configured')
  assert.equal(JSON.stringify(result).includes('super-secret-password'), false)
})
