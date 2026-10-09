import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from './config.js';
import { normalizeRut } from './security.js';

const s3 = new S3Client({ region: config.aws.region });

export const ERASURE_REASONS = new Set(['solicitud_cliente', 'cuenta_prueba', 'alta_incorrecta', 'termino_servicio']);

export function erasureConfirmation(tenant) {
  return `ELIMINAR ${normalizeRut(tenant?.rut || '')}`;
}

export function validErasureConfirmation(value, tenant) {
  return String(value || '').trim().toUpperCase() === erasureConfirmation(tenant).toUpperCase();
}

export function tenantFingerprint(tenant) {
  return crypto.createHash('sha256').update(`${tenant.id}|${tenant.tenant_code}|${normalizeRut(tenant.rut || '')}`).digest('hex');
}

function localPath(storageKey) {
  const root = path.resolve(config.uploadDir);
  const target = path.resolve(root, String(storageKey || ''));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Invalid tenant storage key'), { code: 'INVALID_STORAGE_KEY' });
  return target;
}

async function eraseObject(file, dependencies = {}) {
  if ((file.storage_provider || config.fileStorage) === 's3') {
    if (!config.aws.bucket) throw Object.assign(new Error('AWS_S3_BUCKET is required'), { code: 'STORAGE_NOT_CONFIGURED' });
    await (dependencies.s3 || s3).send(new DeleteObjectCommand({ Bucket: config.aws.bucket, Key: file.storage_key }));
    return;
  }
  await (dependencies.removeFile || fs.rm)(localPath(file.storage_key), { force: true });
}

// The database is only removed after all physical objects have been erased.
export async function eraseTenantFiles(files, dependencies = {}) {
  const unique = new Map();
  for (const file of files || []) if (file?.storage_key) unique.set(`${file.storage_provider || config.fileStorage}:${file.storage_key}`, file);
  for (const file of unique.values()) await eraseObject(file, dependencies);
  return unique.size;
}
