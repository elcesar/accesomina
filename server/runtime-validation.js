function hasValue(value) {
  return Boolean(String(value || '').trim());
}

function isValidEmail(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/<([^<>]+)>$/);
  const address = (match ? match[1] : raw).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

function validateProductionSmtp(env, errors) {
  for (const name of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'SALES_CONTACT_EMAIL']) {
    if (!hasValue(env[name])) errors.push(`${name} is required in production for demo request delivery`);
  }

  const port = Number(env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) errors.push('SMTP_PORT must be an integer between 1 and 65535 in production');
  if (!['true', 'false'].includes(env.SMTP_SECURE)) errors.push('SMTP_SECURE must be explicitly true or false in production');
  if (hasValue(env.EMAIL_FROM) && !isValidEmail(env.EMAIL_FROM)) errors.push('EMAIL_FROM must contain a valid sender email address in production');
  if (hasValue(env.SALES_CONTACT_EMAIL) && !isValidEmail(env.SALES_CONTACT_EMAIL)) errors.push('SALES_CONTACT_EMAIL must be a valid commercial recipient email in production');
}

export function validateRuntimeEnvironment(env) {
  const errors = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (env.NODE_ENV === 'production') {
    let origin;
    try { origin = new URL(env.APP_ORIGIN); } catch { errors.push('APP_ORIGIN must be a valid HTTPS origin'); }
    if (origin && (origin.protocol !== 'https:' || origin.origin !== String(env.APP_ORIGIN).replace(/\/$/, ''))) errors.push('APP_ORIGIN must contain only the public HTTPS origin');
    if (!env.TENANT_SECRET_KEY || env.TENANT_SECRET_KEY.length < 32 || /^(replace|change|development)/i.test(env.TENANT_SECRET_KEY)) errors.push('TENANT_SECRET_KEY must be a strong secret of at least 32 characters');
    if (env.MFA_REQUIRED !== 'true') errors.push('MFA_REQUIRED must be true in production');
    if (env.REGISTRATION_ENABLED === 'true' && (!env.REGISTRATION_INVITE_CODE || env.REGISTRATION_INVITE_CODE.length < 16 || /^(replace|change)/i.test(env.REGISTRATION_INVITE_CODE))) errors.push('REGISTRATION_INVITE_CODE must contain at least 16 non-default characters');
    if (!env.METRICS_TOKEN || env.METRICS_TOKEN.length < 32) errors.push('METRICS_TOKEN must contain at least 32 characters');
    if (env.FILE_STORAGE !== 's3') errors.push('FILE_STORAGE must be s3 in production');
    if (!env.AWS_S3_BUCKET) errors.push('AWS_S3_BUCKET is required in production');
    // VIRUS_SCAN_ENABLED=false permite desactivar el antivirus en fase piloto
    if (env.VIRUS_SCAN_ENABLED !== 'false') {
      try {
        if (new URL(env.VIRUS_SCAN_API_URL).protocol !== 'https:')
          errors.push('VIRUS_SCAN_API_URL must use HTTPS in production');
      } catch {
        errors.push('VIRUS_SCAN_API_URL is required in production');
      }
    }
    if (env.DOCUMENT_AI_API_URL) {
      try {
        if (new URL(env.DOCUMENT_AI_API_URL).protocol !== 'https:') errors.push('DOCUMENT_AI_API_URL must use HTTPS in production');
      } catch { errors.push('DOCUMENT_AI_API_URL must be a valid HTTPS URL'); }
    }
    validateProductionSmtp(env, errors);
  }
  if (errors.length) throw new Error(`Invalid runtime configuration: ${errors.join('; ')}`);
}
