import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { enforceStateScope, summarizeChanges, validateTenantState } from '../validation.js';

export const stateRouter = Router();
const editors = allowRoles('domian_admin','client_admin','rrhh','prevencion','acreditacion');
const MODULE_KEY=/^[A-Za-z][A-Za-z0-9_]{0,63}$/;

async function ensureModules(client,tenantId,userId=null){
  const count=await client.query('SELECT count(*)::int AS count FROM tenant_module_state WHERE tenant_id=$1',[tenantId]);
  if(count.rows[0].count)return;
  await client.query(`INSERT INTO tenant_module_state(tenant_id,module_key,data,updated_by)
    SELECT tenant_id,e.key,e.value,$2 FROM tenant_state CROSS JOIN LATERAL jsonb_each(state) e WHERE tenant_id=$1
    ON CONFLICT(tenant_id,module_key) DO NOTHING`,[tenantId,userId]);
}
function rowsToState(rows){return Object.fromEntries(rows.map(r=>[r.module_key,r.data]));}
function rowsToVersions(rows){return Object.fromEntries(rows.map(r=>[r.module_key,Number(r.version)]));}

stateRouter.get('/', async (req, res) => {
  let rows = await withTenant(req.auth.tenantId,async client=>{await ensureModules(client,req.auth.tenantId,req.auth.userId);return (await client.query('SELECT module_key,data,version,updated_at FROM tenant_module_state WHERE tenant_id=$1 ORDER BY module_key',[req.auth.tenantId])).rows;});
  const modulePermissions=req.auth.permissions?.modules||{};rows=rows.filter(r=>modulePermissions[r.module_key]!==false);
  res.json({state:rowsToState(rows),moduleVersions:rowsToVersions(rows),updated_at:rows.reduce((v,r)=>!v||r.updated_at>v?r.updated_at:v,null)});
});

stateRouter.put('/modules',editors,async(req,res)=>{
  const changes=req.body?.changes;
  if(!changes||typeof changes!=='object'||Array.isArray(changes))return res.status(400).json({error:'MODULE_CHANGES_REQUIRED'});
  const keys=Object.keys(changes);
  if(!keys.length||keys.some(k=>!MODULE_KEY.test(k))||keys.length>30)return res.status(400).json({error:'INVALID_MODULE_KEY'});
  if(keys.some(k=>req.auth.permissions?.modules?.[k]===false))return res.status(403).json({error:'MODULE_PERMISSION_DENIED'});
  const result=await withTenant(req.auth.tenantId,async client=>{
    await ensureModules(client,req.auth.tenantId,req.auth.userId);
    await client.query(`INSERT INTO tenant_module_state(tenant_id,module_key,data,version,updated_by)
      SELECT $1,key,'null'::jsonb,0,$3 FROM unnest($2::text[]) key ON CONFLICT(tenant_id,module_key) DO NOTHING`,[req.auth.tenantId,keys,req.auth.userId]);
    await client.query('SELECT module_key FROM tenant_module_state WHERE tenant_id=$1 AND module_key=ANY($2::text[]) FOR UPDATE',[req.auth.tenantId,keys]);
    const all=(await client.query('SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id=$1',[req.auth.tenantId])).rows;
    const current=rowsToState(all),versions=rowsToVersions(all),proposed={...current};
    for(const key of keys){const change=changes[key];if(!change||Number(change.version)!==Number(versions[key]||0))return null;proposed[key]=change.data;}
    const clean=validateTenantState(proposed);enforceStateScope(req.auth.role,Object.fromEntries(keys.map(k=>[k,current[k]])),Object.fromEntries(keys.map(k=>[k,clean[k]])));
    const output={};
    for(const key of keys){const previous=current[key];const row=(await client.query(`INSERT INTO tenant_module_state(tenant_id,module_key,data,version,updated_by)
      VALUES($1,$2,$3::jsonb,1,$4) ON CONFLICT(tenant_id,module_key) DO UPDATE SET data=EXCLUDED.data,version=tenant_module_state.version+1,updated_by=EXCLUDED.updated_by,updated_at=now()
      RETURNING version,updated_at`,[req.auth.tenantId,key,JSON.stringify(clean[key]),req.auth.userId])).rows[0];output[key]=Number(row.version);
      await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:key,action:'module.updated',oldValue:{version:versions[key]||0},newValue:{version:output[key],reason:String(req.body.reason||'Actualización operacional').slice(0,500),changes:summarizeChanges(previous,clean[key],`/${key}`)}});
    }
    return output;
  });
  if(!result)return res.status(409).json({error:'MODULE_VERSION_CONFLICT',message:'A changed module must be reloaded before saving.'});
  res.json({moduleVersions:result});
});

stateRouter.put('/',editors,(req,res)=>res.status(410).json({error:'MODULAR_STATE_REQUIRED',message:'Update individual modules through /api/state/modules.'}));
