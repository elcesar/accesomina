import { Router } from 'express';
import { withTenant } from '../db.js';
import { appendAudit } from '../audit.js';
import { allowRoles } from '../middleware.js';
import { assertModuleAccess } from '../module-access.js';
import { enforceStateScope, removeWorkerDocument, sanitizeJson, summarizeChanges, validateAppendChanges, validateTenantState, validateWorkerDocumentAppend } from '../validation.js';

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

function normalizeLegacyEppDeliveries(state){
  if(!Array.isArray(state?.eppDeliveries))return state;
  const projectIds=new Set((Array.isArray(state.mantenciones)?state.mantenciones:[]).map(project=>String(project?.id||'')).filter(Boolean));
  const conditionAliases={
    buen_estado:'reutilizado-inspeccionado',
    'buen estado':'reutilizado-inspeccionado',
    usado:'reutilizado-inspeccionado',
    reutilizado:'reutilizado-inspeccionado',
    observado:'no_registrada',
    observacion:'no_registrada',
  };
  const deliveries=state.eppDeliveries.map(delivery=>{
    if(!delivery||typeof delivery!=='object'||Array.isArray(delivery))return delivery;
    const itemName=String(delivery.itemName||delivery.nombre||delivery.epp||'').trim();
    const createdDate=typeof delivery.createdAt==='string'?delivery.createdAt.slice(0,10):'';
    const projectReference=delivery.mantId||delivery.orderId||delivery.projectId||'';
    const mantId=projectIds.has(String(projectReference))?String(projectReference):undefined;
    return {
      ...delivery,
      workerId:delivery.workerId||delivery.trabId||'',
      mantId,
      legacyProjectReference:mantId?delivery.legacyProjectReference||'':delivery.legacyProjectReference||String(projectReference||''),
      itemName,
      itemId:delivery.itemId||delivery.inventoryId||delivery.eppId||(itemName&&delivery.id?`manual:${delivery.id}`:''),
      qty:delivery.qty??delivery.quantity??delivery.cantidad,
      deliveredAt:delivery.deliveredAt||delivery.fechaEntrega||delivery.fecha||createdDate,
      condition:conditionAliases[String(delivery.condition||'').toLowerCase()]||delivery.condition||'no_registrada',
      deliveryStatus:delivery.deliveryStatus||'no_registrado',
    };
  });
  return {...state,eppDeliveries:deliveries};
}

export function normalizeTenantState(state){
  state=normalizeLegacyEppDeliveries(state);
  const items=Array.isArray(state?.inventoryItems)?state.inventoryItems:null;
  if(!items)return state;
  const locations=Array.isArray(state.inventoryLocations)?state.inventoryLocations:[];
  const warehouses=Array.isArray(state.warehouses)&&state.warehouses.length?state.warehouses:Array.isArray(state.bodegas)?state.bodegas:[];
  const warehouseIds=warehouses.map(warehouse=>String(warehouse?.id||'')).filter(Boolean);
  const locationWarehouse=new Map(locations.map(location=>[
    String(location?.id||''),
    String(location?.warehouseId||location?.bodegaId||location?.parentId||'')
  ]));
  const normalizedItems=items.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))return item;
    const sourceMap=item.stockByLocation&&typeof item.stockByLocation==='object'&&!Array.isArray(item.stockByLocation)?item.stockByLocation:{};
    const stockByLocation={};
    for(const [warehouseId,value] of Object.entries(sourceMap)){
      const qty=Number(value);
      if(!warehouseId||!Number.isFinite(qty))continue;
      stockByLocation[warehouseId]=Math.max(0,qty);
    }

    const legacyStock=Math.max(0,Number(item.stock||0));
    let warehouseId=String(item.warehouseId||'');
    const hasMappedWarehouse=Boolean(warehouseId||Object.keys(stockByLocation).length);
    if(!Object.keys(stockByLocation).length&&warehouseId&&legacyStock>0){
      stockByLocation[warehouseId]=legacyStock;
    }
    if(hasMappedWarehouse){
      for(const id of warehouseIds){
        if(!Object.prototype.hasOwnProperty.call(stockByLocation,id))stockByLocation[id]=0;
      }
    }

    const positiveWarehouses=Object.entries(stockByLocation).filter(([,qty])=>Number(qty)>0);
    if((!warehouseId||Number(stockByLocation[warehouseId]||0)<=0)&&positiveWarehouses.length){
      warehouseId=positiveWarehouses[0][0];
    }

    const values=Object.values(stockByLocation);
    const stock=values.length?values.reduce((sum,value)=>sum+Number(value||0),0):legacyStock;
    let locationId=String(item.locationId||'');
    if(locationId){
      const ownerWarehouse=locationWarehouse.get(locationId);
      if(ownerWarehouse&&warehouseId&&ownerWarehouse!==warehouseId)locationId='';
    }

    return {
      ...item,
      stock,
      stockByLocation,
      warehouseId,
      locationId,
    };
  });
  return {...state,inventoryItems:normalizedItems};
}

stateRouter.get('/', async (req, res) => {
  let rows = await withTenant(req.auth.tenantId,async client=>{await ensureModules(client,req.auth.tenantId,req.auth.userId);return (await client.query('SELECT module_key,data,version,updated_at FROM tenant_module_state WHERE tenant_id=$1 ORDER BY module_key',[req.auth.tenantId])).rows;});
  rows=rows.filter(row=>{try{assertModuleAccess(req.auth,row.module_key);return true;}catch{return false;}});
  const state=normalizeTenantState(rowsToState(rows));
  res.json({state,moduleVersions:rowsToVersions(rows),updated_at:rows.reduce((v,r)=>!v||r.updated_at>v?r.updated_at:v,null)});
});

// Document evidence is appended independently from the full worker profile.
// This prevents legacy data elsewhere from blocking a valid new evidence item.
stateRouter.post('/workers/:workerId/documents',editors,async(req,res)=>{
  assertModuleAccess(req.auth,'trabajadores');
  const workerId=String(req.params.workerId||'');
  const result=await withTenant(req.auth.tenantId,async client=>{
    await ensureModules(client,req.auth.tenantId,req.auth.userId);
    const row=(await client.query(`SELECT data,version FROM tenant_module_state
      WHERE tenant_id=$1 AND module_key='trabajadores' FOR UPDATE`,[req.auth.tenantId])).rows[0];
    const workers=Array.isArray(row?.data)?row.data:[];
    const workerIndex=workers.findIndex(worker=>String(worker?.id||'')===workerId);
    if(workerIndex<0)return null;
    const item=sanitizeJson(req.body?.item);
    validateWorkerDocumentAppend(workers[workerIndex],item);
    const nextWorkers=[...workers];
    nextWorkers[workerIndex]={...workers[workerIndex],workerItems:[...(Array.isArray(workers[workerIndex].workerItems)?workers[workerIndex].workerItems:[]),item]};
    const updated=(await client.query(`UPDATE tenant_module_state
      SET data=$3::jsonb,version=version+1,updated_by=$4,updated_at=now()
      WHERE tenant_id=$1 AND module_key='trabajadores' RETURNING version`,[req.auth.tenantId,'trabajadores',JSON.stringify(nextWorkers),req.auth.userId])).rows[0];
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'worker_document',entityId:String(item.id),action:'worker.document_added',newValue:{workerId,item,reason:String(req.body?.reason||'Documento agregado').slice(0,500)}});
    return {item,moduleVersion:Number(updated.version)};
  });
  if(!result)return res.status(404).json({error:'WORKER_NOT_FOUND'});
  res.status(201).json(result);
});

export function documentFileIds(item) {
  const ids = [item?.fileId, ...(Array.isArray(item?.files) ? item.files.map(file => file?.fileId) : [])];
  return [...new Set(ids.map(id => String(id || '')).filter(Boolean))];
}

// Files are deduplicated per tenant. A reference can therefore live in another
// module or in an operational verification, not only in a worker document.
export function referencedFileIds(value) {
  const ids = new Set();
  const visit = current => {
    if (Array.isArray(current)) return current.forEach(visit);
    if (!current || typeof current !== 'object') return;
    for (const [key, nested] of Object.entries(current)) {
      if ((key === 'fileId' || key === 'file_id') && nested) ids.add(String(nested));
      else visit(nested);
    }
  };
  visit(value);
  return ids;
}

export async function referencedFileIdsOutsideRemovedDocument(client, tenantId, nextWorkers, candidateFileIds) {
  const referenced = referencedFileIds(nextWorkers);
  const moduleRows = (await client.query(`SELECT data FROM tenant_module_state
    WHERE tenant_id=$1 AND module_key <> 'trabajadores'`, [tenantId])).rows;
  for (const id of referencedFileIds(moduleRows.map(row => row.data))) referenced.add(id);

  if (candidateFileIds.length) {
    const verificationRows = (await client.query(`SELECT file_id FROM document_verifications
      WHERE tenant_id=$1 AND file_id = ANY($2::uuid[])`, [tenantId, candidateFileIds])).rows;
    for (const row of verificationRows) referenced.add(String(row.file_id));
  }
  return referenced;
}

// Delete one evidence independently from the complete worker profile. Legacy
// values such as an old phone or birth date must not prevent this operation.
stateRouter.delete('/workers/:workerId/documents/:documentId',editors,async(req,res)=>{
  assertModuleAccess(req.auth,'trabajadores');
  const workerId=String(req.params.workerId||''),documentId=String(req.params.documentId||'');
  const result=await withTenant(req.auth.tenantId,async client=>{
    await ensureModules(client,req.auth.tenantId,req.auth.userId);
    const row=(await client.query(`SELECT data,version FROM tenant_module_state
      WHERE tenant_id=$1 AND module_key='trabajadores' FOR UPDATE`,[req.auth.tenantId])).rows[0];
    const workers=Array.isArray(row?.data)?row.data:[];
    const workerIndex=workers.findIndex(worker=>String(worker?.id||'')===workerId);
    if(workerIndex<0)return null;
    const removed=removeWorkerDocument(workers[workerIndex],documentId);
    const nextWorkers=[...workers];
    nextWorkers[workerIndex]=removed.worker;
    const removedFileIds=documentFileIds(removed.item);
    const stillReferenced=await referencedFileIdsOutsideRemovedDocument(client,req.auth.tenantId,nextWorkers,removedFileIds);
    const removableFileIds=removedFileIds.filter(fileId=>!stillReferenced.has(fileId));
    const updated=(await client.query(`UPDATE tenant_module_state
      SET data=$3::jsonb,version=version+1,updated_by=$4,updated_at=now()
      WHERE tenant_id=$1 AND module_key='trabajadores' RETURNING version`,[req.auth.tenantId,'trabajadores',JSON.stringify(nextWorkers),req.auth.userId])).rows[0];
    const deletedFileIds=[];
    for(const fileId of removableFileIds){
      const file=(await client.query(`UPDATE file_objects SET deleted_at=now()
        WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL RETURNING id,original_name`,[fileId,req.auth.tenantId])).rows[0];
      if(file){
        deletedFileIds.push(file.id);
        await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'file',entityId:file.id,action:'file.deleted_with_worker_document',oldValue:file,newValue:{workerId,documentId}});
      }
    }
    await appendAudit(client,{tenantId:req.auth.tenantId,userId:req.auth.userId,entityType:'worker_document',entityId:documentId,action:'worker.document_removed',oldValue:{workerId,item:removed.item},newValue:{reason:'Documento eliminado',deletedFileIds}});
    return {item:removed.item,moduleVersion:Number(updated.version),deletedFileIds};
  });
  if(!result)return res.status(404).json({error:'WORKER_NOT_FOUND'});
  res.json(result);
});

stateRouter.put('/modules',editors,async(req,res,next)=>{
  const changes=req.body?.changes;
  if(!changes||typeof changes!=='object'||Array.isArray(changes))return res.status(400).json({error:'MODULE_CHANGES_REQUIRED'});
  const keys=Object.keys(changes);
  if(!keys.length||keys.some(k=>!MODULE_KEY.test(k))||keys.length>30)return res.status(400).json({error:'INVALID_MODULE_KEY'});
  try { keys.forEach(key=>assertModuleAccess(req.auth,key)); } catch (error) { return next(error); }
  const result=await withTenant(req.auth.tenantId,async client=>{
    await ensureModules(client,req.auth.tenantId,req.auth.userId);
    await client.query(`INSERT INTO tenant_module_state(tenant_id,module_key,data,version,updated_by)
      SELECT $1,key,'null'::jsonb,0,$3 FROM unnest($2::text[]) key ON CONFLICT(tenant_id,module_key) DO NOTHING`,[req.auth.tenantId,keys,req.auth.userId]);
    await client.query('SELECT module_key FROM tenant_module_state WHERE tenant_id=$1 AND module_key=ANY($2::text[]) FOR UPDATE',[req.auth.tenantId,keys]);
    const all=(await client.query('SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id=$1',[req.auth.tenantId])).rows;
    const current=rowsToState(all),versions=rowsToVersions(all),proposed={...current};
    for(const key of keys){const change=changes[key];if(!change||Number(change.version)!==Number(versions[key]||0))return null;proposed[key]=change.data;}
    const normalized=normalizeTenantState(proposed);
    let clean;
    try {
      clean = validateTenantState(normalized);
    } catch (error) {
      // Legacy data can contain stale links from before modular state validation.
      // Allow append-only creation only after validating the new records and their direct links.
      if (!validateAppendChanges(current, normalized, keys)) throw error;
      clean = sanitizeJson(normalized);
    }
      enforceStateScope(
      req.auth.role,
      Object.fromEntries(keys.map(k => [k, current[k]])),
      Object.fromEntries(keys.map(k => [k, clean[k]]))  // ← falta este )
    );
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
