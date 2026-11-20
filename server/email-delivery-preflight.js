import { resolveTxt as resolveSystemTxt } from 'node:dns/promises'
import nodemailer from 'nodemailer'

const MISSING_DNS_CODES = new Set(['ENODATA', 'ENOTFOUND', 'NXDOMAIN'])
const CONNECTION_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'ESOCKET', 'ETIMEDOUT'])
const DEFAULT_TIMEOUT_MS = 10_000

const hasValue = value => Boolean(String(value || '').trim())
const compactTxtRecords = records => (records || [])
  .map(record => Array.isArray(record) ? record.join('') : String(record || ''))
  .map(record => record.trim())
  .filter(Boolean)

function isDomain(domain) {
  if (!domain || domain.length > 253) return false
  return domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
}

function timeout(milliseconds) {
  const value = Number(milliseconds)
  if (!Number.isFinite(value)) return DEFAULT_TIMEOUT_MS
  return Math.min(30_000, Math.max(1_000, Math.round(value)))
}

function secureValue(value) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

export function senderDomain(emailFrom = '') {
  const raw = String(emailFrom || '').trim()
  const bracketed = raw.match(/<([^<>]+)>$/)?.[1]
  const address = (bracketed || raw).trim().toLowerCase()
  const domain = address.match(/^[^\s@]+@([^\s@]+)$/)?.[1]?.replace(/\.$/, '')
  return isDomain(domain) ? domain : null
}

export function dkimRecordName(domain, selector = '') {
  const normalizedDomain = String(domain || '').trim().toLowerCase().replace(/\.$/, '')
  const normalizedSelector = String(selector || '').trim().toLowerCase()
  if (!isDomain(normalizedDomain) || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(normalizedSelector)) return null
  return `${normalizedSelector}._domainkey.${normalizedDomain}`
}

export function smtpTransportConfiguration(smtp = {}) {
  const missing = []
  const invalid = []
  if (!hasValue(smtp.host)) missing.push('SMTP_HOST')
  const port = Number(smtp.port)
  if (!hasValue(smtp.port)) missing.push('SMTP_PORT')
  else if (!Number.isInteger(port) || port < 1 || port > 65_535) invalid.push('SMTP_PORT')
  if (secureValue(smtp.secure) === null) invalid.push('SMTP_SECURE')
  if (!hasValue(smtp.user)) missing.push('SMTP_USER')
  if (!hasValue(smtp.pass)) missing.push('SMTP_PASS')
  if (!senderDomain(smtp.from)) invalid.push('EMAIL_FROM')
  return { configured: missing.length === 0 && invalid.length === 0, missing, invalid }
}

function smtpOptions(smtp) {
  return {
    host: String(smtp.host).trim(),
    port: Number(smtp.port),
    secure: secureValue(smtp.secure) === true,
    auth: { user: String(smtp.user), pass: String(smtp.pass) },
    connectionTimeout: timeout(smtp.timeoutMs),
    greetingTimeout: timeout(smtp.timeoutMs),
    socketTimeout: timeout(smtp.timeoutMs),
  }
}

function transportFailureStatus(error) {
  const code = String(error?.code || '').toUpperCase()
  if (code === 'EAUTH' || Number(error?.responseCode) === 535) return 'authentication_failed'
  if (CONNECTION_CODES.has(code)) return 'unreachable'
  return 'verification_failed'
}

async function lookupTxt(name, resolveTxt) {
  try {
    return { name, records: compactTxtRecords(await resolveTxt(name)), lookup: 'ok' }
  } catch (error) {
    const code = String(error?.code || '').toUpperCase()
    return { name, records: [], lookup: MISSING_DNS_CODES.has(code) ? 'not_found' : 'unavailable' }
  }
}

function dnsCheck(name, lookup, predicate) {
  return {
    name,
    status: lookup.lookup === 'ok'
      ? (lookup.records.some(predicate) ? 'present' : 'missing')
      : lookup.lookup,
  }
}

// The check authenticates and opens a transport only when explicitly requested.
// It never calls sendMail, never accepts a recipient, and never returns secrets.
export async function verifySmtpTransport({ smtp = {}, createTransport = nodemailer.createTransport, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const configuration = smtpTransportConfiguration(smtp)
  if (!configuration.configured) return { checked: false, status: 'not_configured' }

  let transport
  let timer
  try {
    transport = createTransport({ ...smtpOptions({ ...smtp, timeoutMs }), connectionTimeout: timeoutMs, greetingTimeout: timeoutMs, socketTimeout: timeoutMs })
    await Promise.race([
      Promise.resolve(transport.verify()),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error('SMTP verification timed out'), { code: 'ETIMEDOUT' })), timeout(timeoutMs))
      }),
    ])
    return { checked: true, status: 'reachable' }
  } catch (error) {
    return { checked: true, status: transportFailureStatus(error) }
  } finally {
    clearTimeout(timer)
    try { transport?.close?.() } catch {}
  }
}

export async function inspectEmailDeliveryPreflight({
  emailFrom,
  dkimSelector,
  smtp = {},
  verifyTransport = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  resolveTxt = resolveSystemTxt,
  createTransport = nodemailer.createTransport,
} = {}) {
  const domain = senderDomain(emailFrom)
  const smtpConfiguration = smtpTransportConfiguration({ ...smtp, from: emailFrom })
  if (!domain) {
    return {
      ready: false,
      verified: false,
      domain: null,
      smtp: smtpConfiguration,
      spf: { name: null, status: 'invalid_sender' },
      dmarc: { name: null, status: 'invalid_sender' },
      dkim: { name: null, status: 'invalid_sender' },
      transport: { checked: false, status: 'not_configured' },
    }
  }

  const dkimName = dkimRecordName(domain, dkimSelector)
  const [spfLookup, dmarcLookup, dkimLookup] = await Promise.all([
    lookupTxt(domain, resolveTxt),
    lookupTxt(`_dmarc.${domain}`, resolveTxt),
    dkimName ? lookupTxt(dkimName, resolveTxt) : Promise.resolve(null),
  ])
  const spf = dnsCheck(domain, spfLookup, record => /^v=spf1\b/i.test(record))
  const dmarc = dnsCheck(`_dmarc.${domain}`, dmarcLookup, record => /^v=dmarc1\b/i.test(record))
  const dkim = dkimLookup
    ? dnsCheck(dkimName, dkimLookup, record => /^v=dkim1\b/i.test(record))
    : { name: null, status: 'selector_required' }
  const dnsReady = [spf, dmarc, dkim].every(check => check.status === 'present')
  const transport = verifyTransport
    ? await verifySmtpTransport({ smtp: { ...smtp, from: emailFrom }, createTransport, timeoutMs })
    : { checked: false, status: smtpConfiguration.configured ? 'not_checked' : 'not_configured' }
  const ready = dnsReady && smtpConfiguration.configured
  const verified = ready && Boolean(verifyTransport) && transport.status === 'reachable'

  return { ready, verified, domain, smtp: smtpConfiguration, spf, dmarc, dkim, transport }
}
