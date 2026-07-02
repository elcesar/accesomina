import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';

export const filesRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 }, fileFilter: (req,file,cb) => cb(null, /^(application\/pdf|image\/(jpeg|png)|application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)))$/.test(file.mimetype)) });
const s3 = new S3Client({ region: config.aws.region });
const safeName = value => path.basename(String(value || 'file')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180);

async function scanFile(file) {
  if (!config.virusScan.url) {if(config.env==='production')throw Object.assign(new Error('Virus scanning must be configured before accepting files'),{status:503,code:'VIRUS_SCAN_REQUIRED'});return 'clean';}
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

filesRouter.post('/', allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion'), upload.single('file'), async (req,res) => {
  if(!req.file)return res.status(400).json({error:'FILE_REQUIRED'});
  const entityType=String(req.body.entityType||'general').replace(/[^a-z0-9_-]/gi,'').slice(0,50),entityId=String(req.body.entityId||'general').replace(/[^a-z0-9_-]/gi,'').slice(0,100);
  const id=crypto.randomUUID(),storageKey=`tenants/${req.auth.tenantId}/${entityType}/${entityId}/${id}-${safeName(req.file.originalname)}`,sha=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const malwareStatus=await scanFile(req.file);if(malwareStatus==='blocked')return res.status(422).json({error:'MALWARE_DETECTED'});
  await storeFile(storageKey,req.file);
  const row=await withTenant(req.auth.tenantId,async client=>{const result=await client.query(`INSERT INTO file_objects (id,tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,original_name,content_type,byte_size,malware_status,created_at`,[id,req.auth.tenantId,req.auth.userId,entityType,entityId,safeName(req.file.originalname),req.file.mimetype,req.file.size,config.fileStorage,storageKey,sha,malwareStatus]);await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:id,action:'file.uploaded',newValue:{entityType,entityId,name:safeName(req.file.originalname),sha256:sha,malwareStatus}});return result.rows[0];});
  res.status(201).json(row);
});

filesRouter.get('/:id', async (req,res) => {
  const result=await withTenant(req.auth.tenantId,client=>client.query('SELECT * FROM file_objects WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',[req.params.id,req.auth.tenantId]));const file=result.rows[0];
  if(!file)return res.status(404).json({error:'FILE_NOT_FOUND'});if(file.malware_status!=='clean')return res.status(423).json({error:'FILE_NOT_CLEARED',status:file.malware_status});
  res.set({'Content-Type':file.content_type,'Content-Disposition':`attachment; filename="${safeName(file.original_name)}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  if(file.storage_provider==='s3'){const object=await s3.send(new GetObjectCommand({Bucket:config.aws.bucket,Key:file.storage_key}));object.Body.pipe(res);}else res.sendFile(path.join(config.uploadDir,file.storage_key));
});

filesRouter.delete('/:id',allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion'),async(req,res)=>{const row=await withTenant(req.auth.tenantId,async client=>{const result=await client.query('UPDATE file_objects SET deleted_at=now() WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL RETURNING id,original_name',[req.params.id,req.auth.tenantId]);if(result.rows[0])await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:req.params.id,action:'file.deleted',oldValue:result.rows[0]});return result.rows[0];});if(!row)return res.status(404).json({error:'FILE_NOT_FOUND'});res.status(204).end();});
