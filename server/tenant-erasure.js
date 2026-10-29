import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetBucketVersioningCommand, ListObjectVersionsCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from './config.js';
import { normalizeRut } from './security.js';

const s3 = new S3Client({ region: config.aws.region });

export const ERASURE_REASONS = new Set(['solicitud_cliente', 'cuenta_prueba', 'alta_incorrecta', 'termino_servicio']);

export function erasureConfirmation(tenant) {
  return `ELIMINAR ${normalizeRut(tenant?.rut || '')}`;
}

export function validErasureConfirmation(value, tenant) {
  const confirmation = String(value || '').trim().toUpperCase();
  return confirmation === erasureConfirmation(tenant).toUpperCase()
    || confirmation === `ELIMINAR ${String(tenant?.rut || '').trim()}`.toUpperCase();
}

export function tenantFingerprint(tenant) {
  return crypto.createHash('sha256').update(`${tenant.id}|${tenant.tenant_code}|${normalizeRut(tenant.rut || '')}`).digest('hex');
}

function localPath(storageKey, uploadDir = config.uploadDir) {
  const root = path.resolve(uploadDir);
  const target = path.resolve(root, String(storageKey || ''));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Invalid tenant storage key'), { code: 'INVALID_STORAGE_KEY' });
  return target;
}

async function safeLocalPath(storageKey, uploadDir = config.uploadDir) {
  const target = localPath(storageKey, uploadDir);
  try {
    const [root, parent] = await Promise.all([fs.realpath(path.resolve(uploadDir)), fs.realpath(path.dirname(target))]);
    if (parent !== root && !parent.startsWith(`${root}${path.sep}`)) throw Object.assign(new Error('Invalid tenant storage key'), { code: 'INVALID_STORAGE_KEY' });
  } catch (error) {
    // An absent parent means the object is already gone. Preserve force-delete idempotence.
    if (error.code !== 'ENOENT') throw error;
  }
  return target;
}

async function exactObjectVersions(client, bucket, key) {
  const versions = new Map(), markers = new Set();
  let keyMarker, versionMarker;
  for (;;) {
    const page = await client.send(new ListObjectVersionsCommand({ Bucket: bucket, Prefix: key, MaxKeys: 1000,
      ...(keyMarker !== undefined ? { KeyMarker: keyMarker } : {}),
      ...(versionMarker !== undefined ? { VersionIdMarker: versionMarker } : {}) }));
    for (const version of [...(page.Versions || []), ...(page.DeleteMarkers || [])]) {
      // Prefix may also return neighbouring keys; only this exact object belongs to the manifest entry.
      if (version.Key !== key) continue;
      if (typeof version.VersionId !== 'string' || !version.VersionId.length) throw Object.assign(new Error('Missing S3 version identifier'), { code: 'STORAGE_VERSION_ID_MISSING' });
      versions.set(version.VersionId, { Key: key, VersionId: version.VersionId });
    }
    if (!page.IsTruncated) return [...versions.values()];
    const marker = JSON.stringify([page.NextKeyMarker, page.NextVersionIdMarker]);
    if (typeof page.NextKeyMarker !== 'string' || !page.NextKeyMarker || markers.has(marker)) {
      throw Object.assign(new Error('Incomplete S3 version listing'), { code: 'STORAGE_LISTING_INCOMPLETE' });
    }
    markers.add(marker);
    keyMarker = page.NextKeyMarker;
    versionMarker = page.NextVersionIdMarker;
  }
}

async function eraseS3Object(file, client) {
  const bucket = config.aws.bucket, key = file.storage_key;
  if (!bucket) throw Object.assign(new Error('AWS_S3_BUCKET is required'), { code: 'STORAGE_NOT_CONFIGURED' });
  const versioning = await client.send(new GetBucketVersioningCommand({ Bucket: bucket }));
  if (!versioning.Status) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  if (!['Enabled', 'Suspended'].includes(versioning.Status)) throw Object.assign(new Error('Unknown S3 versioning status'), { code: 'STORAGE_VERSIONING_UNKNOWN' });
  // Enumerate before deleting so pagination markers cannot disappear while listing.
  const versions = await exactObjectVersions(client, bucket, key);
  for (const version of versions) await client.send(new DeleteObjectCommand({ Bucket: bucket, ...version }));
  if (versions.length && (await exactObjectVersions(client, bucket, key)).length) {
    throw Object.assign(new Error('S3 object versions remain'), { code: 'STORAGE_VERSIONS_REMAIN' });
  }
}

async function eraseObject(file, dependencies = {}) {
  if ((file.storage_provider || config.fileStorage) === 's3') {
    await eraseS3Object(file, dependencies.s3 || s3);
    return;
  }
  await (dependencies.removeFile || fs.rm)(await safeLocalPath(file.storage_key, dependencies.uploadDir), { force: true });
}

// The erasure service calls this only after committing the durable manifest.
export async function eraseTenantFiles(files, dependencies = {}) {
  const unique = new Map();
  for (const file of files || []) if (file?.storage_key) unique.set(`${file.storage_provider || config.fileStorage}:${file.storage_key}`, file);
  for (const file of unique.values()) await eraseObject(file, dependencies);
  return unique.size;
}
