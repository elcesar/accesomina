import test from 'node:test'
import assert from 'node:assert/strict'
import {patchWorkerProfile,recordRevision} from '../worker-records.js'
const first={id:'qa-a',nombre:'Persona QA A',rut:'11.111.111-1',email:'qa@example.com',workerItems:[{id:'legacy',name:'Documento histórico'}]}
const second={id:'qa-b',nombre:'Persona QA B',rut:'12.345.678-5'}
test('another record changing does not cause a false module-wide conflict',()=>{
 const initial=[first,second],revision=recordRevision(first)
 const changed=patchWorkerProfile(initial,second.id,{nombre:'Otro nombre QA'},recordRevision(second))
 const result=patchWorkerProfile(changed.records,first.id,{nombre:'Nombre actualizado QA'},revision)
 assert.equal(result.records[1].nombre,'Otro nombre QA')
 assert.equal(result.record.nombre,'Nombre actualizado QA')
 assert.deepEqual(result.record.workerItems,first.workerItems)
})
test('same-record stale writes are rejected and do not overwrite the newer value',()=>{
 const revision=recordRevision(first),result=patchWorkerProfile([first],first.id,{nombre:'Edición A'},revision)
 assert.throws(()=>patchWorkerProfile(result.records,first.id,{nombre:'Edición B'},revision),e=>e.code==='RECORD_VERSION_CONFLICT')
 assert.equal(result.record.nombre,'Edición A')
})
test('legacy defects in another record do not block a valid profile update',()=>{
 const result=patchWorkerProfile([first,{id:'legacy',nombre:'Incompleto',rut:'incorrecto'}],first.id,{tel:'+56912345678'},recordRevision(first))
 assert.equal(result.record.tel,'+56912345678')
})
test('operational fields, documents and identifiers cannot be altered through profile patches',()=>{
 for(const patch of [{id:'otro'},{bloqueado:false},{workerItems:[]},{mineras:['foreign']}])assert.throws(()=>patchWorkerProfile([first],first.id,patch,recordRevision(first)),e=>e.status===403)
})
test('validation reports a specific field and checks duplicate RUT against the current collection',()=>{
 assert.throws(()=>patchWorkerProfile([first],first.id,{email:'incorrecto'},recordRevision(first)),e=>e.code==='INVALID_WORKER_EMAIL'&&e.field==='email')
 assert.throws(()=>patchWorkerProfile([first,second],first.id,{rut:second.rut},recordRevision(first)),e=>e.code==='DUPLICATE_WORKER_RUT'&&e.field==='rut')
 const valid=patchWorkerProfile([first],first.id,{email:"o'connor@example.com"},recordRevision(first))
 assert.equal(valid.record.email,"o'connor@example.com")
})
test('revisions are stable under object-key ordering',()=>{
 assert.equal(recordRevision({nombre:'QA',epp:{a:1,b:2}}),recordRevision({epp:{b:2,a:1},nombre:'QA'}))
})

test('independent evidence changes are preserved without a false profile conflict',()=>{
 const revision=recordRevision(first),current={...first,workerItems:[...first.workerItems,{id:'new-evidence'}]}
 const result=patchWorkerProfile([current],first.id,{nombre:'Perfil QA actualizado'},revision)
 assert.equal(result.record.workerItems.length,2)
 assert.notEqual(result.revision,revision)
})
