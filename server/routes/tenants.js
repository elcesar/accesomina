import { Router } from 'express';
import { query, withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { hashPassword, randomToken } from '../security.js';

export const tenantsRouter=Router();
tenantsRouter.use(allowRoles('domian_admin'));

tenantsRouter.get('/',async(req,res)=>{const result=await query(`SELECT t.id,t.company_name,t.rut,t.admin_email,t.phone,t.status,t.is_domian_admin,t.created_at,t.updated_at,
  count(u.id) FILTER (WHERE u.active) AS active_users FROM tenants t LEFT JOIN app_users u ON u.tenant_id=t.id GROUP BY t.id ORDER BY t.is_domian_admin DESC,t.created_at DESC`);res.json(result.rows);});

tenantsRouter.patch('/:id',async(req,res)=>{
  const status=req.body.status;if(!['active','suspended'].includes(status))return res.status(400).json({error:'INVALID_STATUS'});
  const before=(await query('SELECT id,company_name,status,is_domian_admin FROM tenants WHERE id=$1',[req.params.id])).rows[0];if(!before)return res.status(404).json({error:'TENANT_NOT_FOUND'});if(before.is_domian_admin&&status!=='active')return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});
  const result=(await query('UPDATE tenants SET status=$2,updated_at=now() WHERE id=$1 RETURNING id,company_name,rut,admin_email,status,is_domian_admin,updated_at',[req.params.id,status])).rows[0];
  await withTenant(req.params.id,client=>appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant',entityId:req.params.id,action:`tenant.${status}`,oldValue:before,newValue:result}));
  if(status==='suspended')await query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);res.json(result);
});

tenantsRouter.delete('/:id',async(req,res)=>{
  const before=(await query('SELECT id,company_name,status,is_domian_admin FROM tenants WHERE id=$1',[req.params.id])).rows[0];if(!before)return res.status(404).json({error:'TENANT_NOT_FOUND'});if(before.is_domian_admin)return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});
  const row=(await query("UPDATE tenants SET status='deleted',updated_at=now() WHERE id=$1 RETURNING id,company_name,status,updated_at",[req.params.id])).rows[0];await query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);
  await withTenant(req.params.id,client=>appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'tenant',entityId:req.params.id,action:'tenant.deleted',oldValue:before,newValue:row}));res.json(row);
});

tenantsRouter.post('/:id/reset-admin-password',async(req,res)=>{
  const tenant=(await query('SELECT id,company_name,status,is_domian_admin FROM tenants WHERE id=$1',[req.params.id])).rows[0];if(!tenant)return res.status(404).json({error:'TENANT_NOT_FOUND'});if(tenant.status==='deleted')return res.status(409).json({error:'TENANT_DELETED'});
  const temporary=`${randomToken(12)}Aa1`,credentials=await hashPassword(temporary);
  const user=await withTenant(req.params.id,async client=>{const before=(await client.query("SELECT id,email,full_name,role FROM app_users WHERE tenant_id=$1 AND active=true AND role IN ('client_admin','domian_admin') ORDER BY role='client_admin' DESC,created_at LIMIT 1",[req.params.id])).rows[0];if(!before)return null;const updated=(await client.query('UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=true,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$3 RETURNING id,email,full_name,role',[credentials.hash,credentials.salt,before.id])).rows[0];await client.query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'user',entityId:updated.id,action:'user.password_reset_by_domian',oldValue:{email:before.email},newValue:{mustChangePassword:true}});return updated;});
  if(!user)return res.status(404).json({error:'TENANT_ADMIN_NOT_FOUND'});res.json({tenant:{id:tenant.id,name:tenant.company_name},user,temporaryPassword:temporary,mustChangePassword:true});
});
