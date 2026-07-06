import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { hashPassword, normalizeEmail, randomToken, validatePassword } from '../security.js';
import { sanitizeJson, userSchema } from '../validation.js';

export const usersRouter = Router();
usersRouter.get('/', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const result = await withTenant(req.auth.tenantId, client => client.query('SELECT id,email,full_name,role,permissions,active,must_change_password,mfa_enabled,mfa_enrolled_at,last_login_at,created_at FROM app_users WHERE tenant_id=$1 ORDER BY full_name', [req.auth.tenantId]));
  res.json(result.rows);
});
usersRouter.post('/', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const body = userSchema.parse(req.body); const temporary = body.password || `${randomToken(10)}Aa1`;
  if (!validatePassword(temporary)) return res.status(400).json({ error: 'WEAK_PASSWORD' });
  const credentials = await hashPassword(temporary), email = normalizeEmail(body.email);
  const row = await withTenant(req.auth.tenantId, async client => {
    const result = await client.query(`INSERT INTO app_users (tenant_id,email,full_name,role,password_hash,password_salt,must_change_password,permissions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id,email,full_name,role,permissions,active,created_at`, [req.auth.tenantId,email,body.fullName,body.role,credentials.hash,credentials.salt,!body.password,JSON.stringify(body.permissions||{modules:{}})]);
    await appendAudit(client, { tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:result.rows[0].id,action:'user.created',newValue:{email,role:body.role} });
    return result.rows[0];
  });
  res.status(201).json({ user: row, temporaryPassword: body.password ? undefined : temporary });
});
usersRouter.patch('/:id', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const role = req.body.role, active = req.body.active,permissions=req.body.permissions&&typeof req.body.permissions==='object'?req.body.permissions:null;
  if (role && !['client_admin','rrhh','prevencion','acreditacion','consulta'].includes(role)) return res.status(400).json({ error:'INVALID_ROLE' });
  if (req.params.id === req.auth.userId && active === false) return res.status(409).json({ error:'CANNOT_DISABLE_SELF' });
  const row = await withTenant(req.auth.tenantId, async client => {
    const before = await client.query('SELECT id,email,role,active FROM app_users WHERE id=$1 AND tenant_id=$2', [req.params.id,req.auth.tenantId]);
    if (!before.rows[0]) return null;
    if(before.rows[0].role==='domian_admin'&&((role&&role!=='domian_admin')||active===false))throw Object.assign(new Error('The Domian global administrator account is protected'),{status:409,code:'DOMIAN_ADMIN_PROTECTED'});
    const removingAdmin=before.rows[0].active&&before.rows[0].role==='client_admin'&&(active===false||(role&&role!=='client_admin'));
    if(removingAdmin){const admins=await client.query("SELECT count(*)::int AS count FROM app_users WHERE tenant_id=$1 AND active=true AND role='client_admin'",[req.auth.tenantId]);if(admins.rows[0].count<=1)throw Object.assign(new Error('The company must keep at least one active administrator'),{status:409,code:'LAST_ADMIN_REQUIRED'});}
    const result = await client.query('UPDATE app_users SET role=COALESCE($3,role),active=COALESCE($4,active),permissions=COALESCE($5::jsonb,permissions),updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING id,email,full_name,role,permissions,active', [req.params.id,req.auth.tenantId,role,typeof active==='boolean'?active:null,permissions?JSON.stringify(sanitizeJson(permissions)):null]);
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:req.params.id,action:'user.updated',oldValue:before.rows[0],newValue:result.rows[0]});return result.rows[0];
  });
  if(!row)return res.status(404).json({error:'USER_NOT_FOUND'});res.json(row);
});
usersRouter.post('/:id/reset-password', allowRoles('domian_admin','client_admin'), async (req, res) => {
  if(req.params.id===req.auth.userId)return res.status(409).json({error:'CANNOT_RESET_SELF',message:'Use the personal password change option for your own account.'});
  const temporary=`${randomToken(12)}Aa1`,credentials=await hashPassword(temporary);
  const user=await withTenant(req.auth.tenantId,async client=>{
    const before=(await client.query('SELECT id,email,full_name,role,active FROM app_users WHERE id=$1 AND tenant_id=$2',[req.params.id,req.auth.tenantId])).rows[0];
    if(!before)return null;
    if(before.role==='domian_admin'&&req.auth.role!=='domian_admin')throw Object.assign(new Error('The Domian global administrator account is protected'),{status:403,code:'DOMIAN_ADMIN_PROTECTED'});
    const updated=(await client.query(`UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=true,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$3 AND tenant_id=$4 RETURNING id,email,full_name,role,active,must_change_password`,[credentials.hash,credentials.salt,req.params.id,req.auth.tenantId])).rows[0];
    await client.query('UPDATE user_sessions SET revoked_at=now() WHERE user_id=$1 AND tenant_id=$2 AND revoked_at IS NULL',[req.params.id,req.auth.tenantId]);
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:req.params.id,action:'user.password_reset_by_company_admin',oldValue:{email:before.email},newValue:{mustChangePassword:true,sessionsRevoked:true}});
    return updated;
  });
  if(!user)return res.status(404).json({error:'USER_NOT_FOUND'});
  res.json({user,temporaryPassword:temporary,mustChangePassword:true});
});

usersRouter.post('/:id/reset-mfa',allowRoles('domian_admin','client_admin'),async(req,res)=>{if(req.params.id===req.auth.userId)return res.status(409).json({error:'CANNOT_RESET_SELF_MFA'});const user=await withTenant(req.auth.tenantId,async client=>{const before=(await client.query('SELECT id,email,full_name,role,mfa_enabled FROM app_users WHERE id=$1 AND tenant_id=$2',[req.params.id,req.auth.tenantId])).rows[0];if(!before)return null;if(before.role==='domian_admin'&&req.auth.role!=='domian_admin')throw Object.assign(new Error('The Domian global administrator account is protected'),{status:403,code:'DOMIAN_ADMIN_PROTECTED'});const updated=(await client.query("UPDATE app_users SET mfa_enabled=false,mfa_secret_encrypted=NULL,mfa_pending_secret_encrypted=NULL,mfa_recovery_code_hashes='[]'::jsonb,mfa_enrolled_at=NULL,updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING id,email,full_name,role,mfa_enabled",[req.params.id,req.auth.tenantId])).rows[0];await client.query('UPDATE user_sessions SET revoked_at=now() WHERE user_id=$1 AND tenant_id=$2 AND revoked_at IS NULL',[req.params.id,req.auth.tenantId]);await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:req.params.id,action:'user.mfa_reset_by_admin',oldValue:{mfaEnabled:before.mfa_enabled},newValue:{mfaEnabled:false,sessionsRevoked:true}});return updated;});if(!user)return res.status(404).json({error:'USER_NOT_FOUND'});res.json({user,mfaReset:true,message:'El usuario deberá configurar MFA nuevamente en su próximo ingreso.'});});
