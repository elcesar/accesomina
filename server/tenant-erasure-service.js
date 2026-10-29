import { pool, query } from './db.js';
import { eraseTenantFiles, ERASURE_REASONS, tenantFingerprint, validErasureConfirmation } from './tenant-erasure.js';

const failure = (status, code) => Object.assign(new Error(code), { status, code });
const text = value => String(value ?? '').trim();

// Dependencies permit database and storage failures to be exercised without
// touching a real company or bucket. No recovery state lives in this process.
export function createTenantErasureService({ connect = () => pool.connect(), runQuery = query, eraseFiles = eraseTenantFiles } = {}) {
  async function cleanup(erasureId) {
    if (!/^[a-f0-9]{64}$/.test(erasureId || '')) throw failure(400, 'INVALID_ERASURE_ID');
    const receipt = (await runQuery('SELECT 1 FROM tenant_erasure_log WHERE tenant_fingerprint=$1', [erasureId])).rows[0];
    if (!receipt) throw failure(404, 'ERASURE_NOT_FOUND');
    const rows = (await runQuery('SELECT id,storage_key,storage_provider FROM tenant_erasure_objects WHERE tenant_fingerprint=$1 ORDER BY id', [erasureId])).rows;
    let removed = 0;
    for (const file of rows) {
      try {
        await eraseFiles([file]);
        // Completed entries must not retain storage keys indefinitely. Revisit
        // legacy entries marked deleted_at as well, leaving only the receipt.
        await runQuery('DELETE FROM tenant_erasure_objects WHERE id=$1', [file.id]);
        removed++;
      } catch (error) {
        // A database outage after deleting a physical object must leave its
        // manifest pending. Deleting an already missing object is idempotent.
        await runQuery('UPDATE tenant_erasure_objects SET last_error=$2 WHERE id=$1', [file.id, String(error?.code || 'STORAGE_DELETE_FAILED').slice(0, 200)]).catch(() => {});
      }
    }
    return { erasureId, filesErased: removed, filesPending: rows.length - removed, cleanupPending: removed < rows.length };
  }

  async function erase({ tenantId, actorId, reasonCode, confirmation }) {
    const client = await connect();
    let erasureId, transactionError, commitAttempted = false;
    try {
      await client.query('BEGIN');
      const tenant = (await client.query('SELECT id,tenant_code,company_name,rut,status,is_domian_admin FROM tenants WHERE id=$1 FOR UPDATE', [tenantId])).rows[0];
      if (!tenant) throw failure(404, 'TENANT_NOT_FOUND');
      if (tenant.is_domian_admin) throw failure(409, 'DOMIAN_ACCOUNT_PROTECTED');
      if (tenant.status !== 'suspended') throw failure(409, 'TENANT_MUST_BE_SUSPENDED');
      if (!ERASURE_REASONS.has(text(reasonCode)) || !validErasureConfirmation(confirmation, tenant)) throw failure(400, 'TENANT_ERASURE_CONFIRMATION_REQUIRED');
      erasureId = tenantFingerprint(tenant);
      await client.query("SELECT set_config('app.current_tenant_id',$1,true)", [tenant.id]);
      const files = (await client.query(`SELECT storage_key,storage_provider FROM file_objects WHERE tenant_id=$1
        UNION SELECT s3_key,'s3' FROM worker_documents WHERE tenant_id=$1 AND s3_key IS NOT NULL
        UNION SELECT s3_key,'s3' FROM occupational_exams WHERE tenant_id=$1 AND s3_key IS NOT NULL
        UNION SELECT s3_key,'s3' FROM courses WHERE tenant_id=$1 AND s3_key IS NOT NULL
        UNION SELECT s3_key,'s3' FROM worker_items WHERE tenant_id=$1 AND s3_key IS NOT NULL
        UNION SELECT s3_key,'s3' FROM digital_signatures WHERE tenant_id=$1 AND s3_key IS NOT NULL`, [tenant.id])).rows;
      for (const file of files) if (file.storage_key) await client.query('INSERT INTO tenant_erasure_objects(tenant_fingerprint,storage_provider,storage_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [erasureId, file.storage_provider || 'local', file.storage_key]);
      await client.query('SELECT hard_delete_tenant($1,$2,$3,$4)', [tenant.id, actorId, text(reasonCode), erasureId]);
      commitAttempted = true;
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (!commitAttempted) throw error;
      transactionError = error;
    } finally {
      client.release();
    }
    if (transactionError) {
      // A driver can lose COMMIT's response after PostgreSQL has committed.
      // Release its connection before checking the durable outcome on another.
      let confirmed = false;
      try {
        const row = (await runQuery(`SELECT EXISTS(SELECT 1 FROM tenant_erasure_log WHERE tenant_fingerprint=$1) AS recorded,
          EXISTS(SELECT 1 FROM tenants WHERE id=$2) AS tenant_present`, [erasureId, tenantId])).rows[0];
        confirmed = row?.recorded === true && row.tenant_present === false;
      } catch { /* The client will reconcile the durable queue when available. */ }
      if (!confirmed) throw transactionError;
      return { erased: true, erasureId, filesErased: 0, filesPending: null, cleanupPending: true, message: 'Cuenta eliminada; limpieza de archivos pendiente.' };
    }
    let result;
    try {
      result = await cleanup(erasureId);
    } catch {
      // The company is already gone. Reporting a failed deletion would invite
      // an impossible retry by tenant ID; its durable receipt enables recovery.
      result = { erasureId, filesErased: 0, filesPending: null, cleanupPending: true };
    }
    return { erased: true, ...result, message: result.cleanupPending ? 'Cuenta eliminada; limpieza de archivos pendiente.' : 'Cuenta y archivos eliminados.' };
  }

  async function listPending() {
    return (await runQuery(`SELECT l.tenant_fingerprint AS "erasureId",max(l.deleted_at) AS "deletedAt",
      max(l.reason_code) AS "reasonCode",count(o.id)::int AS "filesPending",max(o.last_error) AS "lastError"
      FROM tenant_erasure_log l JOIN tenant_erasure_objects o ON o.tenant_fingerprint=l.tenant_fingerprint
      GROUP BY l.tenant_fingerprint ORDER BY max(l.deleted_at) DESC`)).rows;
  }

  return { erase, cleanup, listPending };
}

export const tenantErasureService = createTenantErasureService();
