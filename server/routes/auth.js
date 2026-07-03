import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query, withTenant } from '../db.js';
import { config } from '../config.js';
import { loginSchema, registerSchema } from '../validation.js';
import { clientIp, hashPassword, normalizeEmail, normalizeRut, randomToken, sha256, validatePassword, verifyPassword } from '../security.js';
import { appendAudit } from '../audit.js';
import { authenticate, clearSessionCookie, requireCsrf, setSessionCookie } from '../middleware.js';

export const authRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

authRouter.post('/register', limiter, async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (!config.registrationInviteCode || body.inviteCode !== config.registrationInviteCode) return res.status(403).json({ error: 'INVITE_CODE_INVALID' });
  if (!validatePassword(body.password)) return res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Use at least 12 characters with uppercase, lowercase and a number.' });
  const rutKey = normalizeRut(body.rut), email = normalizeEmail(body.email), credentials = await hashPassword(body.password);
  const client = await (await import('../db.js')).pool.connect();
  try {
    await client.query('BEGIN');
    const tenantResult = await client.query(`INSERT INTO tenants (tenant_code,company_name,rut,admin_email,phone,status)
      VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id,company_name,rut`, [rutKey, body.companyName, body.rut, email, body.phone]);
    const tenant = tenantResult.rows[0];
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenant.id]);
    const userResult = await client.query(`INSERT INTO app_users (tenant_id,email,full_name,role,password_hash,password_salt)
      VALUES ($1,$2,$3,'client_admin',$4,$5) RETURNING id,email,full_name,role`, [tenant.id, email, body.adminName, credentials.hash, credentials.salt]);
    const user = userResult.rows[0];
    const initialState = { empresa: { nombre: body.companyName, rut: body.rut, representante: body.adminName, email, tel: body.phone }, minas: [], contratos: [], mantenciones: [], hoteles: [], firmas: [], callouts: [], trabajadores: [], asignaciones: [], hotelAsig: [], waGroups: [], contractTemplates: [], tenantUsers: [] };
    await client.query('INSERT INTO tenant_state (tenant_id,state,updated_by) VALUES ($1,$2::jsonb,$3)', [tenant.id, JSON.stringify(initialState), user.id]);
    await client.query("INSERT INTO tenant_module_state(tenant_id,module_key,data,updated_by) SELECT $1,e.key,e.value,$3 FROM jsonb_each($2::jsonb) e",[tenant.id,JSON.stringify(initialState),user.id]);
    await client.query('INSERT INTO tenant_settings(tenant_id,branding,updated_by) VALUES($1,$2::jsonb,$3)',[tenant.id,JSON.stringify({displayName:body.companyName,accent:'#f07d36'}),user.id]);
    await appendAudit(client, { tenantId: tenant.id, userId: user.id, entityType: 'tenant', entityId: tenant.id, action: 'tenant.created', newValue: { companyName: body.companyName, rut: body.rut, adminEmail: email } });
    await client.query('COMMIT');
    res.status(201).json({ companyName: tenant.company_name, rut: tenant.rut, status:'pending', message:'Cuenta creada y pendiente de aprobación por Domian.' });
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
});

authRouter.post('/login', limiter, async (req, res) => {
  const body = loginSchema.parse(req.body), rutKey = normalizeRut(body.rut), email = normalizeEmail(body.email);
  const tenantResult = await query(`SELECT id,company_name,status FROM tenants WHERE regexp_replace(lower(rut),'[^0-9k]','','g')=$1`, [rutKey]);
  const tenant = tenantResult.rows[0];
  if (!tenant || tenant.status !== 'active') return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  const userResult = await withTenant(tenant.id, client => client.query('SELECT * FROM app_users WHERE tenant_id=$1 AND lower(email)=$2', [tenant.id, email]));
  const user = userResult.rows[0];
  if (!user?.active || (user.locked_until && new Date(user.locked_until) > new Date()) || !user.password_hash || !await verifyPassword(body.password, user.password_salt, user.password_hash)) {
    if (user) await withTenant(tenant.id, client => client.query(`UPDATE app_users SET failed_login_count=failed_login_count+1,
      locked_until=CASE WHEN failed_login_count>=4 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=$1`, [user.id]));
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }
  const token = randomToken(), csrf = randomToken(24), expires = new Date(Date.now() + config.sessionTtlHours * 3600_000);
  await query(`INSERT INTO user_sessions (tenant_id,user_id,token_hash,csrf_token,ip_address,user_agent,expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`, [tenant.id, user.id, sha256(token), csrf, clientIp(req), req.get('user-agent')?.slice(0, 500), expires]);
  await withTenant(tenant.id, async client => {
    await client.query('UPDATE app_users SET failed_login_count=0,locked_until=NULL,last_login_at=now() WHERE id=$1', [user.id]);
    await appendAudit(client, { tenantId: tenant.id, userId: user.id, entityType: 'session', action: 'session.login', newValue: { ip: clientIp(req) } });
  });
  setSessionCookie(res, token);
  res.json({ csrfToken: csrf, user: { id: user.id, email: user.email, name: user.full_name, role: user.role, permissions:user.permissions||{modules:{}}, mustChangePassword:user.must_change_password }, tenant: { id: tenant.id, name: tenant.company_name } });
});

authRouter.get('/me', authenticate, async (req, res) => {const result=await withTenant(req.auth.tenantId,client=>client.query('SELECT must_change_password,permissions FROM app_users WHERE id=$1',[req.auth.userId]));res.json({ csrfToken: req.auth.csrfToken, user: { id: req.auth.userId, email: req.auth.email, name: req.auth.name, role: req.auth.role, permissions:result.rows[0]?.permissions||{modules:{}}, mustChangePassword:result.rows[0]?.must_change_password||false }, tenant: { id: req.auth.tenantId, name: req.auth.companyName, rut: req.auth.rut } });});

authRouter.post('/change-password', authenticate, requireCsrf, async(req,res)=>{const {currentPassword,newPassword}=req.body||{};if(!validatePassword(newPassword))return res.status(400).json({error:'WEAK_PASSWORD'});const result=await withTenant(req.auth.tenantId,client=>client.query('SELECT password_hash,password_salt FROM app_users WHERE id=$1',[req.auth.userId]));const user=result.rows[0];if(!user||!await verifyPassword(currentPassword,user.password_salt,user.password_hash))return res.status(401).json({error:'INVALID_CREDENTIALS'});const credentials=await hashPassword(newPassword);await withTenant(req.auth.tenantId,async client=>{await client.query('UPDATE app_users SET password_hash=$1,password_salt=$2,must_change_password=false,updated_at=now() WHERE id=$3',[credentials.hash,credentials.salt,req.auth.userId]);await client.query('UPDATE user_sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2',[req.auth.userId,req.auth.sessionId]);await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'user',entityId:req.auth.userId,action:'user.password_changed'});});res.status(204).end();});

authRouter.post('/logout', authenticate, async (req, res) => {
  await query('UPDATE user_sessions SET revoked_at=now() WHERE id=$1', [req.auth.sessionId]);
  await withTenant(req.auth.tenantId, client => appendAudit(client, { tenantId: req.auth.tenantId, userId: req.auth.userId, entityType: 'session', action: 'session.logout' }));
  clearSessionCookie(res); res.status(204).end();
});
