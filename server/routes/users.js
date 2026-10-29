import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { hashPassword, normalizeEmail, randomToken, validatePassword } from '../security.js';
import { sanitizeJson, userSchema } from '../validation.js';
import { createUserInvitation, invitationSummary, sendAndRecordUserInvitation } from '../user-invitations.js';

export const usersRouter = Router();
usersRouter.get('/', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const result = await withTenant(req.auth.tenantId, client => client.query(`SELECT u.id,u.email,u.full_name,u.role,u.permissions,u.active,u.must_change_password,u.mfa_enabled,u.mfa_enrolled_at,u.last_login_at,u.created_at,
    i.status AS invitation_status,i.expires_at AS invitation_expires_at,i.last_sent_at AS invitation_last_sent_at,i.failure_code AS invitation_failure_code
    FROM app_users u LEFT JOIN user_invitations i ON i.user_id=u.id AND i.tenant_id=u.tenant_id WHERE u.tenant_id=$1 ORDER BY u.full_name`, [req.auth.tenantId]));
  res.json(result.rows.map(({invitation_status,invitation_expires_at,invitation_last_sent_at,invitation_failure_code,...user})=>({...user,invitation:invitationSummary({status:invitation_status,expires_at:invitation_expires_at,last_sent_at:invitation_last_sent_at,failure_code:invitation_failure_code})})));
});
usersRouter.post('/', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const body = userSchema.parse(req.body);
  if (body.password && !validatePassword(body.password)) return res.status(400).json({ error: 'WEAK_PASSWORD' });
  // Existing API clients may still provide a password. New UI accounts establish
  // their own password through the invitation; no temporary secret is returned.
  const credentials = body.password ? await hashPassword(body.password) : null, email = normalizeEmail(body.email), permissions = body.role === 'client_admin' ? { modules: {} } : (body.permissions || { modules: {} });
  let created;
  try { created = await withTenant(req.auth.tenantId, async client => {
    const result = await client.query(`INSERT INTO app_users (tenant_id,email,full_name,role,password_hash,password_salt,must_change_password,permissions)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id,email,full_name,role,permissions,active,created_at`, [req.auth.tenantId,email,body.fullName,body.role,credentials?.hash || null,credentials?.salt || null,!body.password,JSON.stringify(permissions)]);
    await appendAudit(client, { tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:result.rows[0].id,action:'user.created',newValue:{email,role:body.role} });
    const invitation = await createUserInvitation(client,{tenantId:req.auth.tenantId,userId:result.rows[0].id,requestedBy:req.auth.userId});
    return {user:result.rows[0],invitation};
  }); } catch(error) {
    if(error.code==='23505')return res.status(409).json({error:'USER_ALREADY_EXISTS'});
    throw error;
  }
  const invitation = await sendAndRecordUserInvitation({tenantId:req.auth.tenantId,...created,companyName:req.auth.companyName,companyRut:req.auth.rut,requestedBy:req.auth.userId,requestId:req.requestId});
  res.status(201).json({user:created.user,invitation});
});
usersRouter.post('/:id/resend-invitation',allowRoles('domian_admin','client_admin'),async(req,res)=>{
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))return res.status(404).json({error:'USER_NOT_FOUND'});
  const created = await withTenant(req.auth.tenantId,async client=>{
    const user = (await client.query('SELECT id,email,full_name,role,permissions,active FROM app_users WHERE id=$1 AND tenant_id=$2 FOR UPDATE',[req.params.id,req.auth.tenantId])).rows[0];
    if(!user)return null;
    if(!user.active)throw Object.assign(new Error('La cuenta está desactivada.'),{status:409,code:'ACCOUNT_DISABLED'});
    const previous = (await client.query('SELECT status,accepted_at FROM user_invitations WHERE user_id=$1 AND tenant_id=$2 FOR UPDATE',[user.id,req.auth.tenantId])).rows[0];
    if(!previous || previous.accepted_at || previous.status==='accepted')throw Object.assign(new Error('La cuenta ya estableció su contraseña o no tiene una invitación pendiente.'),{status:409,code:'INVITATION_ALREADY_ACCEPTED'});
    return {user,invitation:await createUserInvitation(client,{tenantId:req.auth.tenantId,userId:user.id,requestedBy:req.auth.userId})};
  });
  if(!created)return res.status(404).json({error:'USER_NOT_FOUND'});
  const invitation = await sendAndRecordUserInvitation({tenantId:req.auth.tenantId,...created,companyName:req.auth.companyName,companyRut:req.auth.rut,requestedBy:req.auth.userId,requestId:req.requestId});
  res.json({user:created.user,invitation});
});
usersRouter.patch('/:id', allowRoles('domian_admin','client_admin'), async (req, res) => {
  const role = req.body.role, active = req.body.active,permissions=req.body.permissions&&typeof req.body.permissions==='object'?req.body.permissions:null;
  if (role && !['client_admin','rrhh','prevencion','acreditacion','consulta'].includes(role)) return res.status(400).json({ error:'INVALID_ROLE' });
  if (req.params.id === req.auth.userId && active === false) return res.status(409).json({ error:'CANNOT_DISABLE_SELF' });
  const row = await withTenant(req.auth.tenantId, async client => {
    const before = await client.query('SELECT id,email,role,active,permissions FROM app_users WHERE id=$1 AND tenant_id=$2', [req.params.id,req.auth.tenantId]);
    if (!before.rows[0]) return null;
    if (permissions && ['client_admin','domian_admin'].includes(before.rows[0].role)) throw Object.assign(new Error('Administrators always retain complete access to the company views'),{status:409,code:'ADMIN_MODULE_ACCESS_PROTECTED'});
    if(before.rows[0].role==='domian_admin'&&((role&&role!=='domian_admin')||active===false))throw Object.assign(new Error('The Domian global administrator account is protected'),{status:409,code:'DOMIAN_ADMIN_PROTECTED'});
    const removingAdmin=before.rows[0].active&&before.rows[0].role==='client_admin'&&(active===false||(role&&role!=='client_admin'));
    if(removingAdmin){const admins=await client.query("SELECT count(*)::int AS count FROM app_users WHERE tenant_id=$1 AND active=true AND role='client_admin'",[req.auth.tenantId]);if(admins.rows[0].count<=1)throw Object.assign(new Error('The company must keep at least one active administrator'),{status:409,code:'LAST_ADMIN_REQUIRED'});}
    const nextRole=role||before.rows[0].role;
    const nextPermissions=nextRole==='client_admin'?{modules:{}}:permissions?sanitizeJson(permissions):null;
    const result = await client.query('UPDATE app_users SET role=COALESCE($3,role),active=COALESCE($4,active),permissions=COALESCE($5::jsonb,permissions),updated_at=now() WHERE id=$1 AND tenant_id=$2 RETURNING id,email,full_name,role,permissions,active', [req.params.id,req.auth.tenantId,role,typeof active==='boolean'?active:null,nextPermissions?JSON.stringify(nextPermissions):null]);
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
