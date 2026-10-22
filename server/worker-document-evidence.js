import { isDeepStrictEqual } from 'node:util';
import { documentRule } from '../nexo-v2/src/services/worker-document-rules.js';
import { canAccessEntityType } from './module-access.js';

const rows = value => Array.isArray(value) ? value : [];
const fail = (code, message) => { throw Object.assign(new Error(message), { status: 409, code }); };
const reference = value => typeof value === 'string' && value.trim() && value === value.trim() ? value : null;
export function workerDocumentFileIds(item) {
  return [...new Set([reference(item?.fileId), ...rows(item?.files).map(file => reference(file?.fileId))].filter(Boolean))];
}

export function requireWorkerDocumentEvidence(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item) || !reference(item.id) || typeof item.name !== 'string' || !item.name.trim()) {
    fail('INCOMPLETE_WORKER_DOCUMENT', 'El documento requiere identificador y nombre.');
  }
  const rule = documentRule(item.type, item.name, item.documentType);
  if (!workerDocumentFileIds(item).length) fail('WORKER_DOCUMENT_FILE_REQUIRED', 'Adjunta el archivo del documento antes de guardarlo.');
  if (rule.twoSided) {
    const sides = new Set(rows(item.files).filter(file => reference(file?.fileId)).map(file => file.side));
    if (!sides.has('front') || !sides.has('back')) fail('WORKER_DOCUMENT_SIDES_REQUIRED', 'Adjunta el anverso y reverso del documento.');
  }
  if (rule.expiration === 'required' && (!/^\d{4}-\d{2}-\d{2}$/.test(item.vence || '') || !Number.isFinite(Date.parse(item.vence)) || new Date(item.vence).toISOString().slice(0, 10) !== item.vence)) {
    fail('WORKER_DOCUMENT_EXPIRY_REQUIRED', 'Ingresa una fecha de vencimiento válida para este documento.');
  }
  if ((item.fileId != null && item.fileId !== '' && !reference(item.fileId)) || rows(item.files).some(file => !reference(file?.fileId))) {
    fail('WORKER_DOCUMENT_FILE_UNAVAILABLE', 'El archivo no está disponible para adjuntarlo. Vuelve a cargarlo.');
  }
}

// Preserve only matching persisted evidence. Anonymous legacy items are matched
// once by their complete value, so adding another invalid copy cannot borrow it.
export function changedWorkerDocuments(beforeWorkers, afterWorkers, normalizePrevious = value => value) {
  const previousWorkers = new Map(rows(beforeWorkers).filter(worker => worker?.id != null).map(worker => [String(worker.id), worker]));
  const changed = [];
  for (const worker of rows(afterWorkers)) {
    const previous = previousWorkers.get(String(worker?.id));
    const oldItems = rows(previous?.workerItems).map(item => normalizePrevious(item));
    const consumed = new Set();
    for (const item of rows(worker?.workerItems)) {
      const index = oldItems.findIndex((old, candidate) => !consumed.has(candidate)
        && (item?.id != null ? String(old?.id) === String(item.id) : old?.id == null)
        && isDeepStrictEqual(old, item));
      if (index >= 0) consumed.add(index);
      else changed.push(item);
    }
  }
  return changed;
}

// Logical existence/access is enforced when writing. Physical object availability
// remains the separate read-side contract of #277 / PR305.
export async function assertWorkerDocumentFileReferences(client, auth, items) {
  for (const item of items) requireWorkerDocumentEvidence(item);
  const ids = [...new Set(items.flatMap(workerDocumentFileIds))];
  if (!ids.length) return;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (ids.some(id => !uuid.test(id))) fail('WORKER_DOCUMENT_FILE_UNAVAILABLE', 'El archivo no está disponible para adjuntarlo. Vuelve a cargarlo.');
  const files = (await client.query(`SELECT id,tenant_id,entity_type,storage_key,malware_status,deleted_at
    FROM file_objects WHERE tenant_id=$1 AND id=ANY($2::uuid[]) FOR SHARE`, [auth.tenantId, ids])).rows;
  const available = new Set(files.filter(file => String(file.tenant_id) === String(auth.tenantId)
    && !file.deleted_at && file.malware_status === 'clean'
    && String(file.storage_key || '').startsWith(`tenants/${auth.tenantId}/`)
    && canAccessEntityType(auth, file.entity_type)).map(file => String(file.id).toLowerCase()));
  if (ids.some(id => !available.has(id.toLowerCase()))) fail('WORKER_DOCUMENT_FILE_UNAVAILABLE', 'El archivo no está disponible para adjuntarlo. Vuelve a cargarlo.');
}
