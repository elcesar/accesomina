import { query, withTenant, closeDatabase } from '../db.js';
import { hashPassword, validatePassword } from '../security.js';
const password=process.env.ADMIN_INITIAL_PASSWORD;
if(!validatePassword(password)){console.error('ADMIN_INITIAL_PASSWORD must have at least 12 characters, uppercase, lowercase and a number.');process.exit(1);}
const tenantResult=await query("SELECT id FROM tenants WHERE is_domian_admin=true OR rut='78.425.213-2' ORDER BY is_domian_admin DESC LIMIT 1");
if(!tenantResult.rows[0])throw new Error('Run migrations first; Nexo Klar administrator tenant not found.');
const tenantId=tenantResult.rows[0].id,credentials=await hashPassword(password,'nexo-klar-admin-bootstrap-2026');
await withTenant(tenantId,async client=>client.query(`UPDATE app_users SET password_hash=$1,password_salt=$2,active=true,must_change_password=true,updated_at=now()
  WHERE tenant_id=$3 AND role='domian_admin'`,[credentials.hash,credentials.salt,tenantId]));
console.log('Nexo Klar administrator password initialized. Rotate it after first login.');
await closeDatabase();
