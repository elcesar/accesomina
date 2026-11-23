import test,{before,after,beforeEach,mock} from 'node:test'
import assert from 'node:assert/strict'
import {PGlite}from'@electric-sql/pglite'
import {pool}from'../db.js'
import {stateRouter}from'../routes/state.js'
import {recordRevision}from'../worker-records.js'
let db,rejectAudit=false
const worker={id:'qa-a',nombre:'Persona QA',rut:'11.111.111-1'}
before(async()=>{
 db=new PGlite();await db.exec('CREATE TABLE tenant_module_state(tenant_id text,module_key text,data jsonb,version int DEFAULT 1,updated_by text,updated_at timestamptz DEFAULT now(),PRIMARY KEY(tenant_id,module_key));CREATE TABLE audit_log(tenant_id text,user_id text,entity_type text,entity_id text,action text,old_value jsonb,new_value jsonb);')
 mock.method(pool,'connect',async()=>({query:(sql,params)=>{if(rejectAudit&&sql.includes('INSERT INTO audit_log'))throw new Error('audit unavailable');return db.query(sql,params)},release(){}}))
})
after(async()=>{mock.restoreAll();await db.close()})
beforeEach(async()=>{
 rejectAudit=false;await db.exec('TRUNCATE tenant_module_state,audit_log')
 for(const[tenant,module,data]of [['a','trabajadores',[worker,{id:'invalid',nombre:'Legado QA',rut:'incorrecto'}]],['a','minas',[{id:'qa-client',nombre:'Cliente QA'}]],['b','trabajadores',[{id:'foreign',nombre:'Otra empresa QA',rut:'12.345.678-5'}]]])await db.query('INSERT INTO tenant_module_state(tenant_id,module_key,data)VALUES($1,$2,$3::jsonb)',[tenant,module,JSON.stringify(data)])
})
async function invoke(path,method,{tenant='a',id='qa-a',body={},query={}}={}){
 const layer=stateRouter.stack.find(layer=>layer.route?.path===path&&layer.route.methods[method])
 const res={statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}}
 await layer.route.stack.at(-1).handle({auth:{tenantId:tenant,userId:'qa-user',role:'client_admin'},params:{workerId:id},body,query},res)
 return res
}
test('scoped and paginated reads return only authorized requested information',async()=>{
 const scoped=await invoke('/','get',{query:{modules:'minas'}});assert.deepEqual(Object.keys(scoped.body.state),['minas'])
 const page=await invoke('/records/trabajadores','get',{query:{limit:'1',offset:'0'}});assert.equal(page.body.total,2);assert.equal(page.body.records.length,1)
 assert.equal((await invoke('/records/trabajadores/:workerId','get',{tenant:'b'})).statusCode,404)
})
test('profile patch updates one person despite invalid legacy peers, with audit and tenant isolation',async()=>{
 const result=await invoke('/records/trabajadores/:workerId','patch',{body:{patch:{nombre:'Nombre QA actualizado'},revision:recordRevision(worker)}})
 assert.equal(result.statusCode,200);assert.equal(result.body.record.nombre,'Nombre QA actualizado')
 const rows=(await db.query("SELECT data FROM tenant_module_state WHERE tenant_id='a' AND module_key='trabajadores'")).rows[0].data
 assert.equal(rows[1].rut,'incorrecto')
 assert.equal((await db.query("SELECT data FROM tenant_module_state WHERE tenant_id='b'")).rows[0].data[0].nombre,'Otra empresa QA')
 assert.equal((await db.query('SELECT * FROM audit_log')).rows.length,1)
 const stale=await invoke('/records/trabajadores/:workerId','patch',{body:{patch:{nombre:'Edición obsoleta'},revision:recordRevision(worker)}})
 assert.equal(stale.statusCode,409);assert.equal(stale.body.error,'RECORD_VERSION_CONFLICT')
})
test('audit failure rolls back the profile update',async()=>{
 rejectAudit=true
 await assert.rejects(()=>invoke('/records/trabajadores/:workerId','patch',{body:{patch:{nombre:'No debe persistir'},revision:recordRevision(worker)}}),/audit unavailable/)
 const row=(await db.query("SELECT data FROM tenant_module_state WHERE tenant_id='a' AND module_key='trabajadores'")).rows[0]
 assert.equal(row.data[0].nombre,worker.nombre)
})
