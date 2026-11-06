import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { BACKUP_FORMAT, dataTransferRouter, definitions, csvRows } from '../routes/data-transfer.js';
import { validateTenantState } from '../validation.js';
import { opportunityRows, opportunityFields, OPPORTUNITY_COLLECTIONS } from '../../nexo-v2/src/services/opportunity-collections.js';

const legacy = { id:'legacy', empresa:'Empresa histórica QA', tipo:'cliente', etapa:'contactado', monto:25, probabilidad:0 };
const current = { id:'current', company:'Empresa actual QA', type:'nuevo_cliente', stage:'prospecto', amount:100, probability:20 };
let db, rejectAuditFor;
before(async()=>{
 db=new PGlite();await db.exec(`CREATE TABLE tenant_module_state (tenant_id text,module_key text,data jsonb,version bigint DEFAULT 1,updated_by text,updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,module_key));CREATE TABLE audit_log (tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);CREATE TABLE tenant_settings(tenant_id text PRIMARY KEY,branding jsonb,modules jsonb,alerts jsonb,catalogs jsonb,updated_by text,updated_at timestamptz DEFAULT now());`);
 mock.method(pool,'connect',async()=>({query:(sql,params)=>{
  if(rejectAuditFor&&sql.includes('INSERT INTO audit_log')&&params[2]===rejectAuditFor)throw new Error('QA audit unavailable');
  return db.query(sql,params);
 },release(){}}));
});
after(async()=>{mock.restoreAll();await db?.close();});
beforeEach(async()=>{rejectAuditFor=null;await db.exec('TRUNCATE tenant_module_state,audit_log,tenant_settings');});
async function seed(modules){for(const[key,data]of Object.entries(modules))await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,3)',['qa-tenant',key,JSON.stringify(data)]);}
async function invoke(path,method,{type='oportunidades',role='client_admin',file,mode,confirmReplace}={}){
 const route=dataTransferRouter.stack.find(l=>l.route?.path===path&&l.route.methods[method]).route;
 const req={auth:{tenantId:'qa-tenant',userId:'qa-user',role},params:{type},body:{mode,confirmReplace},file:file?{buffer:Buffer.from(file),originalname:'QA.csv'}:undefined};
 const res={statusCode:200,status(n){this.statusCode=n;return this},json(body){this.body=body;return this},set(headers){this.headers=headers;return this},send(body){this.body=body;return this}};
 let allowed=false;dataTransferRouter.stack[0].handle(req,res,()=>{allowed=true});if(allowed)await route.stack.at(-1).handle(req,res);
 return res;
}
async function stored(){return Object.fromEntries((await db.query("SELECT module_key,data FROM tenant_module_state WHERE tenant_id='qa-tenant'")).rows.map(r=>[r.module_key,r.data]));}

test('the portal, CSV and reports resolve the three collections with canonical ID precedence',()=>{
 const state={prospectos:[current],oportunidades:[legacy],opportunities:[{...current,company:'Copia antigua QA'},{id:'other',company:'Otro registro QA'}]};
 assert.equal(opportunityRows(state).length,3);assert.equal(opportunityRows(state).find(r=>r.id==='current').company,'Empresa actual QA');
 const exported=csvRows('oportunidades',state);assert.equal(exported.length,3);assert.ok(exported.some(r=>r.empresa==='Empresa histórica QA'&&r.monto===25&&r.probabilidad===0));
 assert.equal(state.opportunities[0].company,'Copia antigua QA');
});
test('shared field normalization preserves zero amounts, legacy stage and commercial references',()=>{
 const row=opportunityFields({...legacy,monto:0,minaId:'qa-client',contratoId:'qa-contract'});
 assert.equal(row.amount,0);assert.equal(row.probability,0);assert.equal(row.stage,'contactada');assert.equal(row.type,'nuevo_cliente');assert.equal(row.clientId,'qa-client');
});
test('all opportunity collections enforce references, finite amounts and probability limits',()=>{
 for(const key of OPPORTUNITY_COLLECTIONS){
  for(const row of [{...current,clientId:'missing'},{...current,contractId:'missing'},{...current,amount:-1},{...current,amount:'abc'},{...current,probability:101}]){
   assert.throws(()=>validateTenantState({[key]:[row]}),e=>['INVALID_REFERENCE','INVALID_OPPORTUNITY'].includes(e.code));
  }
 }
});
test('the real CSV endpoint includes records created by the current portal and legacy names',async()=>{
 await seed({prospectos:[current],opportunities:[legacy]});const res=await invoke('/export/:type','get');
 assert.equal(res.statusCode,200);const parsed=Papa.parse(res.body.replace(/^\uFEFF/,''),{header:true});assert.equal(parsed.data.length,2);assert.ok(parsed.data.some(r=>r.empresa==='Empresa actual QA'));assert.ok(parsed.data.some(r=>r.empresa==='Empresa histórica QA'));
});
test('all twelve empty export endpoints preserve their declared CSV headers',async()=>{
 for(const type of Object.keys(definitions)){
  const res=await invoke('/export/:type','get',{type});assert.equal(res.statusCode,200);assert.ok(res.body.startsWith('\uFEFF'));
  assert.deepEqual(Papa.parse(res.body.slice(1),{header:true}).meta.fields,definitions[type].headers,type);
 }
});
test('opportunity CSV import writes the portal module, retains history and can be exported again',async()=>{
 await seed({opportunities:[legacy]});const res=await invoke('/import/:type','post',{file:'tipo,empresa,etapa,monto,probabilidad\nnuevo_cliente,Empresa importada QA,prospecto,50,25\n',mode:'append'});
 assert.equal(res.statusCode,200);assert.deepEqual(res.body.modules,['prospectos','oportunidades','opportunities']);const state=await stored();assert.deepEqual(state.opportunities,[]);assert.deepEqual(state.oportunidades,[]);assert.equal(state.prospectos.some(item=>item.id==='legacy'),true);assert.equal(state.prospectos.some(item=>item.company==='Empresa importada QA'),true);assert.equal(opportunityRows(state).length,2);
 const exported=await invoke('/export/:type','get');assert.match(exported.body,/Empresa importada QA/);assert.match(exported.body,/Empresa histórica QA/);
 const log=await db.query('SELECT * FROM audit_log');assert.equal(log.rows.length,3);assert.deepEqual(log.rows.map(row=>row.entity_type).sort(),[...OPPORTUNITY_COLLECTIONS].sort());
});
test('explicit replacement clears historical aliases atomically instead of showing deleted old rows',async()=>{
 await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{id:'other',company:'Otro QA'}]});
 const res=await invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,Reemplazo QA,prospecto\n',mode:'replace',confirmReplace:'REEMPLAZAR'});assert.equal(res.statusCode,200);
 const state=await stored();assert.deepEqual(state.oportunidades,[]);assert.deepEqual(state.opportunities,[]);assert.equal(opportunityRows(state).length,1);assert.equal(opportunityRows(state)[0].company,'Reemplazo QA');
});
test('invalid references roll back CSV import and audit without affecting existing opportunities',async()=>{
 await seed({prospectos:[current]});await assert.rejects(()=>invoke('/import/:type','post',{file:'tipo,empresa,etapa,cliente\nnuevo_cliente,Importación QA,prospecto,missing\n',mode:'append'}),e=>e.code==='INVALID_REFERENCE');
 assert.deepEqual((await stored()).prospectos,[current]);assert.equal((await db.query('SELECT * FROM audit_log')).rows.length,0);
});
test('read-only accounts cannot access the export or import administrative routes',async()=>{
 assert.equal((await invoke('/export/:type','get',{role:'consulta'})).statusCode,403);assert.equal((await invoke('/import/:type','post',{role:'consulta',file:'tipo,empresa,etapa\nnuevo_cliente,QA,prospecto'})).statusCode,403);
});
test('CSV output preserves order, accents, commas and multiline notes',async()=>{
 await seed({prospectos:[{...current,company:'Empresa QA, Sur',notes:'Línea uno\nLínea dos'}]});const res=await invoke('/export/:type','get');const parsed=Papa.parse(res.body.slice(1),{header:true});assert.equal(parsed.data[0].empresa,'Empresa QA, Sur');assert.equal(parsed.data[0].notas,'Línea uno\nLínea dos');assert.deepEqual(parsed.meta.fields,definitions.oportunidades.headers);
});


test('the backend rejects duplicate active opportunities without RUT across legacy and canonical collections',async()=>{
  await seed({opportunities:[{id:'legacy-without-rut',company:'Empresa Sur QA',type:'nuevo_cliente',stage:'prospecto'}]});
  await assert.rejects(
    ()=>invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,Empresa Sur QA,prospecto\n',mode:'append'}),
    error=>error.code==='DUPLICATE_OPPORTUNITY'
  );
  assert.deepEqual((await stored()).opportunities,[{id:'legacy-without-rut',company:'Empresa Sur QA',type:'nuevo_cliente',stage:'prospecto'}]);
});

test('replace requires explicit confirmation and reports its operational impact without writing',async()=>{
  await seed({prospectos:[current],opportunities:[legacy]});
  const res=await invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,Reemplazo QA,prospecto\n',mode:'replace'});
  assert.equal(res.statusCode,409);
  assert.equal(res.body.error,'OPPORTUNITY_REPLACE_CONFIRMATION_REQUIRED');
  assert.equal(res.body.existingRows,2);
  assert.equal(res.body.incomingRows,1);
  const state=await stored();
  assert.deepEqual(state.prospectos,[current]);
  assert.deepEqual(state.opportunities,[legacy]);
});

test('legacy records without type or stage remain visibly incomplete instead of being silently classified',()=>{
  const row=opportunityFields({id:'legacy-incomplete',company:'Sin clasificación QA'});
  assert.equal(row.type,'');
  assert.equal(row.stage,'');
  assert.deepEqual(row.dataQuality,{missingType:true,missingStage:true});
});


test('canonical imports retain archived records in the audit log for restoration',async()=>{
  await seed({opportunities:[legacy]});
  await invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,Empresa nueva QA,prospecto\n',mode:'append'});
  const audit=(await db.query("SELECT old_value,new_value FROM audit_log WHERE entity_type='opportunities'")).rows[0];
  assert.deepEqual(audit.old_value.records,[legacy]);
  assert.equal(audit.new_value.canonicalStore,'prospectos');
});

test('successive CSV appends merge existing canonical records and both aliases exactly once',async()=>{
 const older={id:'older',company:'Empresa antigua QA',type:'nuevo_cliente',stage:'prospecto'};
 const client={id:'qa-client',nombre:'Cliente sin cambios QA'};
 await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{...current,company:'Copia obsoleta QA'},older],minas:[client]});
 for(const name of ['Primera importación QA','Segunda importación QA']){
  const res=await invoke('/import/:type','post',{file:`tipo,empresa,etapa\nnuevo_cliente,${name},prospecto\n`,mode:'append'});
  assert.equal(res.statusCode,200);
 }
 const state=await stored();
 assert.deepEqual(state.oportunidades,[]);assert.deepEqual(state.opportunities,[]);
 assert.equal(state.prospectos.length,5);
 assert.equal(new Set(state.prospectos.map(row=>row.id)).size,5);
 assert.equal(state.prospectos.find(row=>row.id===current.id).company,current.company);
 for(const name of [current.company,'Empresa histórica QA',older.company,'Primera importación QA','Segunda importación QA'])assert.equal(state.prospectos.filter(row=>row.company===name).length,1);
 assert.deepEqual(state.minas,[client]);
 const versions=(await db.query("SELECT module_key,version FROM tenant_module_state WHERE tenant_id='qa-tenant' ORDER BY module_key")).rows;
 assert.ok(versions.filter(row=>OPPORTUNITY_COLLECTIONS.includes(row.module_key)).every(row=>Number(row.version)===5));
 assert.equal(Number(versions.find(row=>row.module_key==='minas').version),3);
 assert.equal((await db.query('SELECT * FROM audit_log')).rows.length,6);
});

test('an invalid reference leaves canonical records, both aliases, versions and audit untouched',async()=>{
 await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{id:'other',company:'Otra histórica QA'}]});
 const before=(await db.query("SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' ORDER BY module_key")).rows;
 await assert.rejects(()=>invoke('/import/:type','post',{file:'tipo,empresa,etapa,cliente\nnuevo_cliente,Referencia inexistente QA,prospecto,missing\n',mode:'append'}),error=>error.code==='INVALID_REFERENCE');
 assert.deepEqual((await db.query("SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' ORDER BY module_key")).rows,before);
 assert.equal((await db.query('SELECT * FROM audit_log')).rows.length,0);
});

test('an audit failure rolls back migration of all opportunity collections and their versions',async()=>{
 await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{id:'other',company:'Otra histórica QA'}]});
 const before=(await db.query("SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' ORDER BY module_key")).rows;
 rejectAuditFor='oportunidades';
 await assert.rejects(()=>invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,No debe guardarse QA,prospecto\n',mode:'append'}),/QA audit unavailable/);
 assert.deepEqual((await db.query("SELECT module_key,data,version FROM tenant_module_state WHERE tenant_id='qa-tenant' ORDER BY module_key")).rows,before);
 assert.equal((await db.query('SELECT * FROM audit_log')).rows.length,0);
});

test('ordinary CSV append preserves its own module behavior and does not migrate unrelated opportunities',async()=>{
 const client={id:'qa-client',nombre:'Cliente original QA'};
 await seed({minas:[client],opportunities:[legacy]});
 const res=await invoke('/import/:type','post',{type:'minas',file:'nombre,mandante\nCliente agregado QA,Mandante QA\n',mode:'append'});
 assert.equal(res.statusCode,200);
 const state=await stored();
 assert.equal(state.minas.length,2);assert.equal(state.minas[0].id,client.id);assert.equal(state.minas[0].nombre,client.nombre);
 assert.deepEqual(state.opportunities,[legacy]);
 assert.equal(state.prospectos,undefined);
 assert.deepEqual((await db.query('SELECT entity_type FROM audit_log')).rows,[{entity_type:'minas'}]);
});

for(const source of ['prospectos','opportunities']){
 test(`backup replacement canonicalizes incoming ${source} without resurrecting destination aliases`,async()=>{
  const client={id:'qa-client',nombre:'Cliente conservado QA'};
  await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{id:'destination-only',company:'No restaurar QA'}],minas:[client]});
  const incoming={id:'from-backup',company:'Empresa restaurada QA',type:'nuevo_cliente',stage:'prospecto'};
  const backup={format:BACKUP_FORMAT,modules:{[source]:[incoming]},settings:{branding:{displayName:'Marca restaurada QA'}}};
  const res=await invoke('/import/:type','post',{type:'backup',file:JSON.stringify(backup),mode:'append'});
  assert.equal(res.statusCode,200);assert.equal(res.body.mode,'replace');
  const state=await stored();
  assert.deepEqual(state.oportunidades,[]);assert.deepEqual(state.opportunities,[]);
  assert.equal(state.prospectos.length,1);assert.equal(state.prospectos[0].id,incoming.id);
  assert.deepEqual(state.minas,[client]);
  assert.equal((await db.query('SELECT branding FROM tenant_settings')).rows[0].branding.displayName,'Marca restaurada QA');
  const audit=(await db.query("SELECT old_value FROM audit_log WHERE entity_type='oportunidades'")).rows[0];
  assert.deepEqual(audit.old_value.records,[legacy]);
 });
}

test('an explicitly empty opportunity backup clears the logical store while retaining its audit history',async()=>{
 await seed({prospectos:[current],opportunities:[legacy]});
 const backup={format:BACKUP_FORMAT,modules:{prospectos:[]}};
 assert.equal((await invoke('/import/:type','post',{type:'backup',file:JSON.stringify(backup)})).statusCode,200);
 const state=await stored();
 for(const collection of OPPORTUNITY_COLLECTIONS)assert.deepEqual(state[collection],[]);
 const archived=(await db.query("SELECT old_value FROM audit_log WHERE entity_type='opportunities'")).rows[0];
 assert.deepEqual(archived.old_value.records,[legacy]);
});
