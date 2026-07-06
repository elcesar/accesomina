import { query, withTenant } from './db.js';
import { config } from './config.js';
import { sha256 } from './security.js';

export const SESSION_COOKIE = '__Host-accesomina_session';
export const DEV_SESSION_COOKIE = 'accesomina_session';
export function cookieName() { return config.cookieSecure ? SESSION_COOKIE : DEV_SESSION_COOKIE; }

export function setSessionCookie(res, token) {
  res.cookie(cookieName(), token, { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/', maxAge: config.sessionTtlHours * 3600_000 });
}
export function clearSessionCookie(res) { res.clearCookie(cookieName(), { httpOnly: true, secure: config.cookieSecure, sameSite: 'strict', path: '/' }); }

export async function authenticate(req, res, next) {
  try {
    const raw = req.cookies?.[cookieName()];
    if (!raw) return res.status(401).json({ error: 'AUTH_REQUIRED' });
    const sessionResult = await query(`SELECT id,tenant_id,user_id,csrf_token,expires_at,revoked_at,mfa_verified FROM user_sessions
      WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`, [sha256(raw)]);
    const session = sessionResult.rows[0];
    if (!session) { clearSessionCookie(res); return res.status(401).json({ error: 'SESSION_INVALID' }); }
    const identity = await withTenant(session.tenant_id, client => client.query(`SELECT u.id,u.tenant_id,u.email,u.full_name,u.role,u.active,u.permissions,t.company_name,t.rut,t.status
      FROM app_users u JOIN tenants t ON t.id=u.tenant_id WHERE u.id=$1 AND u.tenant_id=$2`, [session.user_id, session.tenant_id]));
    const user = identity.rows[0];
    if (!user?.active || user.status !== 'active') { clearSessionCookie(res); return res.status(403).json({ error: 'ACCOUNT_DISABLED' }); }
    req.auth = { sessionId: session.id, csrfToken: session.csrf_token, mfaVerified:session.mfa_verified===true, tenantId: user.tenant_id, userId: user.id, email: user.email, name: user.full_name, role: user.role, permissions:user.permissions||{modules:{}}, companyName: user.company_name, rut: user.rut };
    query('UPDATE user_sessions SET last_seen_at=now() WHERE id=$1', [session.id]).catch(() => {});
    next();
  } catch (error) { next(error); }
}

export function requireMfa(req,res,next){if(config.mfaRequired&&!req.auth?.mfaVerified)return res.status(403).json({error:'MFA_ENROLLMENT_REQUIRED',message:'Debe configurar la doble autenticación antes de continuar.'});next();}

export function requireCsrf(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  if (req.get('x-csrf-token') !== req.auth?.csrfToken) return res.status(403).json({ error: 'CSRF_INVALID' });
  next();
}

export function requireOrigin(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (config.env === 'production' && !origin) return res.status(403).json({ error: 'ORIGIN_REQUIRED' });
  if (origin && origin !== config.origin) return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' });
  next();
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.auth?.role) ? next() : res.status(403).json({ error: 'PERMISSION_DENIED' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  console.error(error);
  const status = Number(error.status || (error.name === 'ZodError' ? 400 : error.code === '23505' ? 409 : 500));
  if(status>=500&&req.auth?.tenantId)withTenant(req.auth.tenantId,client=>client.query(`INSERT INTO operational_events(tenant_id,source,severity,event_type,message,context) VALUES($1,'api','error',$2,$3,$4::jsonb)`,[req.auth.tenantId,'request.failed',String(error.message||'Unexpected server error').slice(0,1000),JSON.stringify({method:req.method,path:req.path,code:error.code||null,userId:req.auth.userId})])).catch(()=>{});
  res.status(status).json({ error: error.code || 'SERVER_ERROR', message: status < 500 ? error.message : 'Unexpected server error' });
}
