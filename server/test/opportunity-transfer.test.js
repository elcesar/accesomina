import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { PGlite } from '@electric-sql/pglite';
import { pool } from '../db.js';
import { dataTransferRouter, definitions, csvRows } from '../routes/data-transfer.js';
import { validateTenantState } from '../validation.js';
import { opportunityRows, opportunityFields, OPPORTUNITY_COLLECTIONS } from '../../nexo-v2/src/services/opportunity-collections.js';

const legacy = { id:'legacy', empresa:'Empresa histórica QA', tipo:'cliente', etapa:'contactado', monto:25, probabilidad:0 };
const current = { id:'current', company:'Empresa actual QA', type:'nuevo_cliente', stage:'prospecto', amount:100, probability:20 };
let db;
before(async()=>{
 db=new PGlite();await db.exec(`CREATE TABLE tenant_module_state (tenant_id text,module_key text,data jsonb,version bigint DEFAULT 1,updated_by text,updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,module_key));CREATE TABLE audit_log (tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);`);
 mock.method(pool,'connect',async()=>({query:(sql,params)=>db.query(sql,params),release(){}}));
});
after(async()=>{mock.restoreAll();await db?.close();});
beforeEach(async()=>{await db.exec('TRUNCATE tenant_module_state,audit_log');});
async function seed(modules){for(const[key,data]of Object.entries(modules))await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data,version) VALUES($1,$2,$3::jsonb,3)',['qa-tenant',key,JSON.stringify(data)]);}
async function invoke(path,method,{type='oportunidades',role='client_admin',file,mode}={}){
 const route=dataTransferRouter.stack.find(l=>l.route?.path===path&&l.route.methods[method]).route;
 const req={auth:{tenantId:'qa-tenant',userId:'qa-user',role},params:{type},body:{mode},file:file?{buffer:Buffer.from(file),originalname:'QA.csv'}:undefined};
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
 assert.equal(res.statusCode,200);assert.deepEqual(res.body.modules,['prospectos']);const state=await stored();assert.equal(state.opportunities[0].id,'legacy');assert.equal(state.prospectos[0].company,'Empresa importada QA');assert.equal(opportunityRows(state).length,2);
 const exported=await invoke('/export/:type','get');assert.match(exported.body,/Empresa importada QA/);assert.match(exported.body,/Empresa histórica QA/);
 const log=await db.query('SELECT * FROM audit_log');assert.equal(log.rows.length,1);assert.equal(log.rows[0].entity_type,'prospectos');
});
test('explicit replacement clears historical aliases atomically instead of showing deleted old rows',async()=>{
 await seed({prospectos:[current],oportunidades:[legacy],opportunities:[{id:'other',company:'Otro QA'}]});
 const res=await invoke('/import/:type','post',{file:'tipo,empresa,etapa\nnuevo_cliente,Reemplazo QA,prospecto\n',mode:'replace'});assert.equal(res.statusCode,200);
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
