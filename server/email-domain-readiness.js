import { resolveTxt as resolveSystemTxt } from 'node:dns/promises';

const missingRecordErrors = new Set(['ENODATA', 'ENOTFOUND', 'NXDOMAIN']);

function compactRecords(records = []) {
  return records.map(record => Array.isArray(record) ? record.join('') : String(record || '')).map(record => record.trim()).filter(Boolean);
}

function recordStatus(records, predicate) {
  return records.some(predicate) ? 'present' : 'missing';
}

export function senderDomain(emailFrom = '') {
  const value = String(emailFrom || '').trim();
  const bracketed = value.match(/<([^<>]+)>$/)?.[1];
  const address = (bracketed || value).trim().toLowerCase();
  const domain = address.match(/^[^\s@]+@([a-z0-9.-]+\.[a-z]{2,})$/i)?.[1];
  return domain ? domain.replace(/\.$/, '') : null;
}

export function dkimRecordName(domain, selector = '') {
  const normalized = String(selector || '').trim().toLowerCase();
  if (!domain || !/^[a-z0-9](?:[a-z0-9._-]{0,61}[a-z0-9])?$/i.test(normalized) || normalized.includes('..')) return null;
  return `${normalized}._domainkey.${domain}`;
}

async function lookupTxt(name, resolveTxt) {
  try {
    return { name, records:compactRecords(await resolveTxt(name)), lookup:'ok' };
  } catch (error) {
    return { name, records:[], lookup:missingRecordErrors.has(String(error?.code || '').toUpperCase()) ? 'not_found' : 'unavailable' };
  }
}

function check(name, lookup, predicate) {
  const status = lookup.lookup === 'ok' ? recordStatus(lookup.records, predicate) : lookup.lookup;
  return { name, status };
}

// This checks public DNS configuration only. It deliberately does not send a
// message, expose SMTP configuration, or claim inbox placement.
export async function inspectEmailDomainAuthentication({ emailFrom, dkimSelector, resolveTxt = resolveSystemTxt } = {}) {
  const domain = senderDomain(emailFrom);
  if (!domain) {
    return {
      ready:false,
      domain:null,
      spf:{ name:null, status:'invalid_sender' },
      dmarc:{ name:null, status:'invalid_sender' },
      dkim:{ name:null, status:'invalid_sender' },
    };
  }
  const dkimName = dkimRecordName(domain, dkimSelector);
  const [spfLookup, dmarcLookup, dkimLookup] = await Promise.all([
    lookupTxt(domain, resolveTxt),
    lookupTxt(`_dmarc.${domain}`, resolveTxt),
    dkimName ? lookupTxt(dkimName, resolveTxt) : Promise.resolve(null),
  ]);
  const spf = check(domain, spfLookup, record => /^v=spf1\b/i.test(record));
  const dmarc = check(`_dmarc.${domain}`, dmarcLookup, record => /^v=dmarc1\b/i.test(record));
  const dkim = dkimLookup
    ? check(dkimName, dkimLookup, record => /\bv=dkim1\b/i.test(record))
    : { name:null, status:'selector_required' };
  return { ready:[spf,dmarc,dkim].every(result => result.status === 'present'), domain, spf, dmarc, dkim };
}
