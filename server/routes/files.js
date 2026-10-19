import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { verifyFileAvailability } from '../file-availability.js';
import { canAccessEntityType, assertEntityTypeAccess } from '../module-access.js';

export const filesRouter = Router();
const allowedMime=/^(application\/pdf|image\/(jpeg|png)|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)))$/;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 }, fileFilter: (req,file,cb) => {
  if(allowedMime.test(file.mimetype))return cb(null,true);
  const error=Object.assign(new Error('Unsupported file type'),{status:400,code:'FILE_TYPE_NOT_ALLOWED'});
  return cb(error);
} });
const s3 = new S3Client({ region: config.aws.region });
const safeName = value => path.basename(String(value || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);

function storageReadiness() {
  if (config.fileStorage === 's3' && !config.aws.bucket) return { ready:false, code:'STORAGE_NOT_CONFIGURED' };
  if (config.env === 'production' && !config.virusScan.url && config.virusScan.enabled) return { ready:false, code:'VIRUS_SCAN_REQUIRED' };
  return { ready:true, provider:config.fileStorage, scan:config.virusScan.url ? 'configured' : 'disabled' };
}

function requireFileInfrastructure(req, res, next) {
  const readiness = storageReadiness();
  if (!readiness.ready) return res.status(503).json({ error: readiness.code });
  next();
}

async function scanFile(file) {
  if (!config.virusScan.url) {
  if(config.env==='production' && config.virusScan.enabled)throw Object.assign(new Error('Virus scanning must be configured before accepting files'),{status:503,code:'VIRUS_SCAN_REQUIRED'});return 'clean';}
  const body = new FormData(); body.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  const response = await fetch(config.virusScan.url, { method:'POST', headers: config.virusScan.token ? { authorization:`Bearer ${config.virusScan.token}` } : {}, body });
  if (!response.ok) throw Object.assign(new Error('Virus scanning service unavailable'),{status:503,code:'VIRUS_SCAN_UNAVAILABLE'}); const result = await response.json(); return result.clean === true ? 'clean' : 'blocked';
}
async function storeFile(storageKey, file) {
  if (config.fileStorage === 's3') {
    if (!config.aws.bucket) throw Object.assign(new Error('AWS_S3_BUCKET is required'), { status: 503, code:'STORAGE_NOT_CONFIGURED' });
    await s3.send(new PutObjectCommand({ Bucket:config.aws.bucket,Key:storageKey,Body:file.buffer,ContentType:file.mimetype,ServerSideEncryption:'AES256',Metadata:{originalname:safeName(file.originalname)} }));
  } else { const target=path.join(config.uploadDir,storageKey);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,file.buffer,{mode:0o600}); }
}
export async function readStoredFile(file){if(file.storage_provider==='s3'){const object=await s3.send(new GetObjectCommand({Bucket:config.aws.bucket,Key:file.storage_key}));return Buffer.from(await object.Body.transformToByteArray());}return fs.readFile(path.join(config.uploadDir,file.storage_key));}

filesRouter.get('/status', allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion'), (req,res) => {
  const status=storageReadiness();
  res.status(status.ready ? 200 : 503).json(status);
});

filesRouter.post('/', allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion'), requireFileInfrastructure, upload.single('file'), async (req,res) => {
  if(!req.file)return res.status(400).json({error:'FILE_REQUIRED'});
  const entityType=String(req.body.entityType||'general').replace(/[^a-z0-9_-]/gi,'').slice(0,50),entityId=String(req.body.entityId||'general').replace(/[^a-z0-9_-]/gi,'').slice(0,100);
  assertEntityTypeAccess(req.auth,entityType);
  const id=crypto.randomUUID(),sha=crypto.createHash('sha256').update(req.file.buffer).digest('hex'),storageKey=`tenants/${req.auth.tenantId}/objects/${sha}`;
  const row=await withTenant(req.auth.tenantId,async client=>{
    // Serialize uploads of identical content, including restoration of soft-deleted objects.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[storageKey]);
    const existing=(await client.query(`SELECT id,original_name,content_type,byte_size,malware_status,created_at,deleted_at
      FROM file_objects WHERE tenant_id=$1 AND storage_key=$2 FOR UPDATE`,[req.auth.tenantId,storageKey])).rows[0];
    if(existing && !existing.deleted_at){
      await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:existing.id,action:'file.reused',newValue:{requestedEntityType:entityType,requestedEntityId:entityId,sha256:sha}});
      const {deleted_at,...active}=existing;
      return {...active,deduplicated:true};
    }
    const malwareStatus=await scanFile(req.file);
    if(malwareStatus==='blocked')throw Object.assign(new Error('Malware detected'),{status:422,code:'MALWARE_DETECTED'});
    await storeFile(storageKey,req.file);
    if(existing){
      // Keep the original ID: other historical references may still point to it.
      const restored=(await client.query(`UPDATE file_objects
        SET deleted_at=NULL,uploaded_by=$3,entity_type=$4,entity_id=$5,
            original_name=$6,content_type=$7,byte_size=$8,storage_provider=$9,
            sha256=$10,malware_status=$11
        WHERE id=$1 AND tenant_id=$2
        RETURNING id,original_name,content_type,byte_size,malware_status,created_at`,
        [existing.id,req.auth.tenantId,req.auth.userId,entityType,entityId,safeName(req.file.originalname),req.file.mimetype,req.file.size,config.fileStorage,sha,malwareStatus])).rows[0];
      await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:existing.id,action:'file.restored',newValue:{entityType,entityId,sha256:sha}});
      return restored;
    }
    const result=(await client.query(`INSERT INTO file_objects (id,tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id,original_name,content_type,byte_size,malware_status,created_at`,
      [id,req.auth.tenantId,req.auth.userId,entityType,entityId,safeName(req.file.originalname),req.file.mimetype,req.file.size,config.fileStorage,storageKey,sha,malwareStatus])).rows[0];
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:id,action:'file.uploaded',newValue:{entityType,entityId,name:safeName(req.file.originalname),sha256:sha,malwareStatus}});
    return result;
  });
  res.status(row.deduplicated?200:201).json(row);
});

filesRouter.get('/availability',async(req,res)=>{
 const ids=[...new Set(String(req.query.ids||'').split(',').filter(Boolean))]
 if(ids.length>100)return res.status(400).json({error:'TOO_MANY_FILE_REFERENCES'})
 const valid=ids.filter(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
 const files=valid.length?await withTenant(req.auth.tenantId,async client=>(await client.query('SELECT * FROM file_objects WHERE tenant_id=$1 AND id=ANY($2::uuid[])',[req.auth.tenantId,valid])).rows):[]
 const results=await verifyFileAvailability({tenantId:req.auth.tenantId,ids,files,canAccess:file=>canAccessEntityType(req.auth,file.entity_type),exists:async file=>{
  try{
   if(file.storage_provider==='s3'){
    if(!config.aws.bucket)return null
    await s3.send(new HeadObjectCommand({Bucket:config.aws.bucket,Key:file.storage_key}));return true
   }
   return (await fs.stat(path.join(config.uploadDir,file.storage_key))).isFile()
  }catch(error){if(error.code==='ENOENT'||error.name==='NotFound'||error.$metadata?.httpStatusCode===404)return false;return null}
 }})
 res.set('Cache-Control','private, no-store').json({files:results})
});

filesRouter.get('/:id', async (req,res) => {
  const result=await withTenant(req.auth.tenantId,client=>client.query('SELECT * FROM file_objects WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',[req.params.id,req.auth.tenantId]));const file=result.rows[0];
  if(!file)return res.status(404).json({error:'FILE_NOT_FOUND'});assertEntityTypeAccess(req.auth,file.entity_type);if(file.malware_status!=='clean')return res.status(423).json({error:'FILE_NOT_CLEARED',status:file.malware_status});
  res.set({'Content-Type':file.content_type,'Content-Disposition':`attachment; filename="${safeName(file.original_name)}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  if(file.storage_provider==='s3'){const object=await s3.send(new GetObjectCommand({Bucket:config.aws.bucket,Key:file.storage_key}));object.Body.pipe(res);}else res.sendFile(path.join(config.uploadDir,file.storage_key));
});

filesRouter.delete('/:id',allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion'),async(req,res)=>{const row=await withTenant(req.auth.tenantId,async client=>{const existing=(await client.query('SELECT id,original_name,entity_type FROM file_objects WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',[req.params.id,req.auth.tenantId])).rows[0];if(!existing)return null;assertEntityTypeAccess(req.auth,existing.entity_type);const result=await client.query('UPDATE file_objects SET deleted_at=now() WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL RETURNING id,original_name',[req.params.id,req.auth.tenantId]);if(result.rows[0])await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:req.params.id,action:'file.deleted',oldValue:result.rows[0]});return result.rows[0];});if(!row)return res.status(404).json({error:'FILE_NOT_FOUND'});res.status(204).end();});
