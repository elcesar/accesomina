import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { query, withTenant, closeDatabase } from './db.js';
import { authenticate, errorHandler, requireCsrf, requireMfa, requireOrigin } from './middleware.js';
import { authRouter } from './routes/auth.js';
import { stateRouter } from './routes/state.js';
import { usersRouter } from './routes/users.js';
import { filesRouter } from './routes/files.js';
import { integrationsRouter } from './routes/integrations.js';
import { auditRouter } from './routes/audit.js';
import { tenantsRouter } from './routes/tenants.js';
import { settingsRouter } from './routes/settings.js';
import { dataTransferRouter } from './routes/data-transfer.js';
import { privacyRouter } from './routes/privacy.js';
import { operationsRouter } from './routes/operations.js';
import { startJobRunner } from './jobs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],scriptSrcAttr:["'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:','https:'],connectSrc:["'self'",'https://graph.facebook.com'],fontSrc:["'self'",'data:'],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"]}}, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use(requireOrigin);
app.use('/api', (req,res,next)=>{res.set('Cache-Control','no-store');next();});

app.get('/api/health', async (req, res) => { await query('SELECT 1'); res.json({ status:'ok', version:'7.6.0', uptimeSeconds:Math.round(process.uptime()) }); });
app.get('/api/ready',async(req,res)=>{await query('SELECT 1');const checks={database:true,storage:config.fileStorage!=='s3'||Boolean(config.aws.bucket),virusScan:config.env!=='production'||Boolean(config.virusScan.url),tenantEncryption:Boolean(config.tenantSecretKey)};const ready=Object.values(checks).every(Boolean);res.status(ready?200:503).json({status:ready?'ready':'not_ready',version:'7.6.0',checks});});
app.get('/api/metrics',async(req,res)=>{if(!config.metricsToken||req.get('authorization')!==`Bearer ${config.metricsToken}`)return res.status(401).end();const [tenants,sessions]=await Promise.all([query("SELECT id FROM tenants WHERE status='active'"),query('SELECT count(*)::int total FROM user_sessions WHERE revoked_at IS NULL AND expires_at>now()')]);let failedJobs=0,errors=0;for(const tenant of tenants.rows){const counts=await withTenant(tenant.id,client=>Promise.all([client.query("SELECT count(*)::int total FROM notification_jobs WHERE tenant_id=$1 AND status='failed'",[tenant.id]),client.query("SELECT count(*)::int total FROM operational_events WHERE tenant_id=$1 AND severity IN ('error','critical') AND resolved_at IS NULL",[tenant.id])]));failedJobs+=counts[0].rows[0].total;errors+=counts[1].rows[0].total;}res.type('text/plain').send(`accesomina_up 1\naccesomina_active_tenants ${tenants.rows.length}\naccesomina_active_sessions ${sessions.rows[0].total}\naccesomina_failed_jobs ${failedJobs}\naccesomina_unresolved_errors ${errors}\n`);});
app.use('/api/auth', authRouter);
app.use('/api', authenticate, requireCsrf, requireMfa);
app.use('/api/state', stateRouter);
app.use('/api/users', usersRouter);
app.use('/api/files', filesRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/data-transfer', dataTransferRouter);
app.use('/api/privacy', privacyRouter);
app.use('/api/operations', operationsRouter);
app.use('/api', (req,res)=>res.status(404).json({error:'API_ROUTE_NOT_FOUND'}));

app.use(express.static(path.resolve(__dirname, '../public'), { etag:true, maxAge:config.env==='production'?'1h':0, index:'index.html' }));
app.use((req,res,next)=>req.method==='GET'?res.sendFile(path.resolve(__dirname,'../public/index.html')):next());
app.use(errorHandler);

const stopJobs=startJobRunner();
const server=app.listen(config.port,()=>console.log(`AccesoMina cloud listening on :${config.port}`));
async function shutdown(signal){console.log(`${signal}: shutting down`);stopJobs();server.close(async()=>{await closeDatabase();process.exit(0)});setTimeout(()=>process.exit(1),10_000).unref();}
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
