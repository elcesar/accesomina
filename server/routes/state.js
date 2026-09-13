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

function normalizeInventoryState(state){
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
  const modulePermissions=req.auth.permissions?.modules||{};rows=rows.filter(r=>modulePermissions[r.module_key]!==false);
  const state=normalizeInventoryState(rowsToState(rows));
  res.json({state,moduleVersions:rowsToVersions(rows),updated_at:rows.reduce((v,r)=>!v||r.updated_at>v?r.updated_at:v,null)});
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
    const normalized=normalizeInventoryState(proposed);
    const clean = validateTenantState(normalized);
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
