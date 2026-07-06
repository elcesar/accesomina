import { Router } from 'express';
import { pool, query, withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { hashPassword, isValidRut, normalizeEmail, normalizeRut, randomToken } from '../security.js';

export const tenantsRouter=Router();
tenantsRouter.use(allowRoles('domian_admin'));

tenantsRouter.get('/',async(req,res)=>{const result=await query(`SELECT t.id,t.company_name,t.rut,t.admin_email,t.phone,t.status,t.is_domian_admin,t.created_at,t.updated_at,
  count(u.id) FILTER (WHERE u.active) AS active_users FROM tenants t LEFT JOIN app_users u ON u.tenant_id=t.id GROUP BY t.id ORDER BY t.is_domian_admin DESC,t.created_at DESC`);res.json(result.rows);});

tenantsRouter.post('/',async(req,res)=>{const companyName=String(req.body.companyName||'').trim(),rut=String(req.body.rut||'').trim(),adminName=String(req.body.adminName||'').trim(),email=normalizeEmail(req.body.email),phone=String(req.body.phone||'').trim();if(companyName.length<3||adminName.length<3||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'INVALID_TENANT_DATA'});if(!isValidRut(rut))return res.status(400).json({error:'INVALID_COMPANY_RUT'});const temporary=`${randomToken(12)}Aa1`,credentials=await hashPassword(temporary),client=await pool.connect();try{await client.query('BEGIN');const tenant=(await client.query(`INSERT INTO tenants(tenant_code,company_name,rut,admin_email,phone,status) VALUES($1,$2,$3,$4,$5,'active') RETURNING id,company_name,rut,status`,[normalizeRut(rut),companyName,rut,email,phone])).rows[0];await client.query("SELECT set_config('app.current_tenant_id',$1,true)",[tenant.id]);const user=(await client.query(`INSERT INTO app_users(tenant_id,email,full_name,role,password_hash,password_salt,must_change_password) VALUES($1,$2,$3,'client_admin',$4,$5,true) RETURNING id,email,full_name,role`,[tenant.id,email,adminName,credentials.hash,credentials.salt])).rows[0];const state={empresa:{nombre:companyName,rut,representante:adminName,email,tel:phone},minas:[],contratos:[],mantenciones:[],hoteles:[],firmas:[],callouts:[],trabajadores:[],asignaciones:[],hotelAsig:[],waGroups:[],contractTemplates:[],tenantUsers:[]};await client.query('INSERT INTO tenant_state(tenant_id,state,updated_by) VALUES($1,$2::jsonb,$3)',[tenant.id,JSON.stringify(state),user.id]);await client.query("INSERT INTO tenant_module_state(tenant_id,module_key,data,updated_by) SELECT $1,e.key,e.value,$3 FROM jsonb_each($2::jsonb) AS e",[tenant.id,JSON.stringify(state),user.id]);await client.query('INSERT INTO tenant_settings(tenant_id,branding,updated_by) VALUES($1,$2::jsonb,$3)',[tenant.id,JSON.stringify({displayName:companyName,accent:'#f07d36'}),user.id]);await appendAudit(client,{tenantId:tenant.id,userId:req.auth.userId,entityType:'tenant',entityId:tenant.id,action:'tenant.created_by_domian_admin',newValue:{companyName,rut,adminEmail:email,mfaRequired:true}});await client.query('COMMIT');res.status(201).json({tenant,user,temporaryPassword:temporary,mustChangePassword:true,mfaEnrollmentRequired:true});}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}});

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
  const tenant=(await query('SELECT id,company_name,status,is_domian_admin FROM tenants WHERE id=$1',[req.params.id])).rows[0];if(!tenant)return res.status(404).json({error:'TENANT_NOT_FOUND'});if(tenant.is_domian_admin)return res.status(409).json({error:'DOMIAN_ACCOUNT_PROTECTED'});if(tenant.status==='deleted')return res.status(409).json({error:'TENANT_DELETED'});
  const temporary=`${randomToken(12)}Aa1`,credentials=await hashPassword(temporary);
  const user=await withTenant(req.params.id,async client=>{const before=(await client.query("SELECT id,email,full_name,role,active FROM app_users WHERE tenant_id=$1 AND role='client_admin' ORDER BY active DESC,created_at LIMIT 1",[req.params.id])).rows[0];if(!before)return null;const updated=(await client.query('UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=true,active=true,failed_login_count=0,locked_until=NULL,updated_at=now() WHERE id=$3 RETURNING id,email,full_name,role,active',[credentials.hash,credentials.salt,before.id])).rows[0];await client.query('UPDATE user_sessions SET revoked_at=now() WHERE tenant_id=$1',[req.params.id]);await appendAudit(client,{tenantId:req.params.id,userId:req.auth.userId,entityType:'user',entityId:updated.id,action:'user.password_reset_by_domian',oldValue:{email:before.email,active:before.active},newValue:{mustChangePassword:true,active:true,sessionsRevoked:true}});return updated;});
  if(!user)return res.status(404).json({error:'TENANT_ADMIN_NOT_FOUND'});res.json({tenant:{id:tenant.id,name:tenant.company_name},user,temporaryPassword:temporary,mustChangePassword:true});
});
