import { query, withTenant, closeDatabase } from '../db.js';
import { hashPassword, validatePassword, verifyPassword } from '../security.js';
const password=process.env.ADMIN_INITIAL_PASSWORD;
if(!validatePassword(password)){console.error('ADMIN_INITIAL_PASSWORD must have at least 12 characters, uppercase, lowercase and a number.');process.exit(1);}
const tenantResult=await query("SELECT id FROM tenants WHERE rut='78.425.213-2'");
if(!tenantResult.rows[0])throw new Error('Run migrations first; Domian tenant not found.');
const tenantId=tenantResult.rows[0].id,credentials=await hashPassword(password,'domian-admin-salt-fixed-2026');
console.log('SEED_HASH:', credentials.hash);
console.log('SEED_SALT:', credentials.salt);
const verify=await verifyPassword(password, credentials.salt, credentials.hash);
console.log('VERIFY_SELF:', verify);
const updateResult=await withTenant(tenantId,async client=>client.query(`UPDATE app_users SET password_hash=$1,password_salt=$2,active=true,must_change_password=true,updated_at=now()
  WHERE tenant_id=$3 AND lower(email)='contacto@domian.cl'`,[credentials.hash,credentials.salt,tenantId]));
console.log('ROWS_UPDATED:', updateResult.rowCount);
console.log('Domian administrator password initialized. Rotate it after first login.');
await closeDatabase();
