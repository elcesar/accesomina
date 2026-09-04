import 'dotenv/config';
import path from 'node:path';
import { validateRuntimeEnvironment } from './runtime-validation.js';

validateRuntimeEnvironment(process.env);

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  serviceName: 'nexo-klar',
  version: '7.7.0',
  port: Number(process.env.PORT || 8088),
  origin: (process.env.APP_ORIGIN || 'http://localhost:8088').replace(/\/$/, ''),
  // HTML remains available as the verified fallback. Production containers serve
  // the React build, while local development can select either interface.
  frontendMode: process.env.FRONTEND_MODE || (process.env.NODE_ENV === 'production' ? 'react' : 'html'),
  frontendDistDir: path.resolve(process.env.FRONTEND_DIST_DIR || './nexo-v2/dist'),
  legacyPublicDir: path.resolve(process.env.LEGACY_PUBLIC_DIR || './public'),
  databaseUrl: process.env.DATABASE_URL,
  sessionTtlHours: Math.max(1, Number(process.env.SESSION_TTL_HOURS || 8)),
  jobPollSeconds: Math.max(15, Number(process.env.JOB_POLL_SECONDS || 60)),
  metricsToken: process.env.METRICS_TOKEN || '',
  registrationEnabled: process.env.REGISTRATION_ENABLED === 'true',
  registrationInviteCode: process.env.REGISTRATION_INVITE_CODE || '',
  mfaRequired: process.env.MFA_REQUIRED === 'true' || process.env.NODE_ENV === 'production',
  tenantSecretKey: process.env.TENANT_SECRET_KEY || process.env.REGISTRATION_INVITE_CODE || 'development-only-secret',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  fileStorage: process.env.FILE_STORAGE === 's3' ? 's3' : 'local',
  uploadDir: path.resolve(process.env.LOCAL_UPLOAD_DIR || './uploads'),
  aws: { region: process.env.AWS_REGION || 'us-east-1', bucket: process.env.AWS_S3_BUCKET || '' },
  virusScan: { url: process.env.VIRUS_SCAN_API_URL || '', healthUrl: process.env.VIRUS_SCAN_HEALTH_URL || '', token: process.env.VIRUS_SCAN_API_TOKEN || '' },
  documentAi: { url: process.env.DOCUMENT_AI_API_URL || '', token: process.env.DOCUMENT_AI_API_TOKEN || '' },
  smtp: {
    host: process.env.SMTP_HOST || '', port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '', from: process.env.EMAIL_FROM || 'Nexo Klar <no-reply@nexoklar.cl>'
  },
  whatsapp: {
    version: process.env.WHATSAPP_GRAPH_VERSION || 'v23.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    token: process.env.WHATSAPP_ACCESS_TOKEN || ''
  },
  integrations: {
    signature: { url: process.env.SIGNATURE_API_URL || '', token: process.env.SIGNATURE_API_TOKEN || '', webhookSecret: process.env.SIGNATURE_WEBHOOK_SECRET || '' },
    erp: { url: process.env.ERP_WEBHOOK_URL || '', token: process.env.ERP_WEBHOOK_TOKEN || '' },
    accreditation: { url: process.env.ACCREDITATION_WEBHOOK_URL || '', token: process.env.ACCREDITATION_WEBHOOK_TOKEN || '' }
  }
});
