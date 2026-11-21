import { inspectEmailDeliveryPreflight } from '../email-delivery-preflight.js'

const verifyTransport = process.argv.includes('--verify-smtp') || process.env.EMAIL_PREFLIGHT_VERIFY_SMTP === 'true'
const result = await inspectEmailDeliveryPreflight({
  emailFrom: process.env.EMAIL_FROM,
  dkimSelector: process.env.EMAIL_DKIM_SELECTOR,
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  verifyTransport,
})

console.log(JSON.stringify({
  status: result.verified ? 'verified' : result.ready ? 'ready_pending_transport_verification' : 'not_ready',
  senderDomain: result.domain,
  verificationRequested: verifyTransport,
  checks: {
    smtp: result.smtp,
    spf: result.spf,
    dmarc: result.dmarc,
    dkim: result.dkim,
    transport: result.transport,
  },
}, null, 2))

if (!result.ready || (verifyTransport && !result.verified)) process.exitCode = 1
