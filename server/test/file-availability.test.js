import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyFileAvailability} from '../file-availability.js'
import {withEvidenceAvailability,stripEvidenceAvailability,evidenceFileIds} from '../../nexo-v2/src/services/evidence-availability.js'
import {hasRequiredEvidence,documentEvidenceMessage} from '../../nexo-v2/src/services/worker-document-rules.js'
const file=(id,patch={})=>({id,tenant_id:'tenant-a',malware_status:'clean',storage_key:`tenants/tenant-a/objects/${id}`,entity_type:'worker',...patch})
test('available, removed, cross-tenant, inaccessible and pending objects fail closed consistently',async()=>{
 const files=[file('ok'),file('deleted',{deleted_at:'2026-10-19'}),file('foreign',{tenant_id:'tenant-b'}),file('denied',{entity_type:'private'}),file('missing'),file('pending')]
 const result=await verifyFileAvailability({tenantId:'tenant-a',ids:[...files.map(file=>file.id),'unknown'],files,canAccess:f=>f.entity_type==='worker',exists:async f=>f.id==='pending'?null:f.id!=='missing'})
 assert.deepEqual(Object.fromEntries(result.map(file=>[file.fileId,file.availability])),{ok:'available',deleted:'unavailable',foreign:'unavailable',denied:'unavailable',missing:'unavailable',pending:'pending',unknown:'unavailable'})
})
test('legitimate references shared in one tenant are checked once with bounded storage concurrency',async()=>{
 let running=0,peak=0,calls=0
 const files=[...Array.from({length:20},(_,i)=>file(`file-${i}`)),file('same-content',{storage_key:'tenants/tenant-a/objects/file-0'})]
 const result=await verifyFileAvailability({tenantId:'tenant-a',ids:files.map(file=>file.id),files,canAccess:()=>true,concurrency:4,exists:async()=>{calls++;running++;peak=Math.max(peak,running);await new Promise(resolve=>setTimeout(resolve,1));running--;return true}})
 assert.equal(calls,20);assert.ok(peak<=4);assert.ok(result.every(file=>file.availability==='available'))
})
test('pending and missing physical evidence do not count; transient availability is stripped before saving',()=>{
 const raw={id:'worker',workerItems:[{type:'cv',name:'CV',fileId:'file-1'}]}
 assert.deepEqual(evidenceFileIds([raw]),['file-1'])
 for(const status of ['pending','unavailable']){
  const worker=withEvidenceAvailability(raw,{'file-1':status})
  assert.equal(hasRequiredEvidence(worker.workerItems[0]),false)
  assert.match(documentEvidenceMessage(worker.workerItems[0]),status==='pending'?/pendiente/:/no disponible/)
 }
 const worker=withEvidenceAvailability(raw,{'file-1':'available'})
 assert.equal(hasRequiredEvidence(worker.workerItems[0]),true)
 assert.deepEqual(stripEvidenceAvailability(worker.workerItems),raw.workerItems)
 assert.equal(raw.workerItems[0].fileAvailability,undefined)
})
test('two-sided evidence requires both physical sides and expiry; old filenames are not evidence',()=>{
 const worker={workerItems:[{type:'documento',name:'Cédula de identidad',vence:'2030-01-01',files:[{fileId:'a',side:'front'},{fileId:'b',side:'back'}]}]}
 assert.equal(hasRequiredEvidence(withEvidenceAvailability(worker,{a:'available',b:'unavailable'}).workerItems[0]),false)
 assert.equal(hasRequiredEvidence(withEvidenceAvailability(worker,{a:'available',b:'available'}).workerItems[0]),true)
 assert.equal(hasRequiredEvidence({type:'cv',fileName:'antiguo.pdf'}),false)
})

test('server sanitization strips client verification flags without altering unrelated availability fields',async()=>{
 const {sanitizeJson}=await import('../validation.js')
 const result=sanitizeJson({trabajadores:[{id:'qa',workerItems:[{fileId:'id',fileAvailability:'available',files:[{fileId:'id',availability:'available'}]}]}],inventory:[{availability:'disponible'}]})
 assert.equal(result.trabajadores[0].workerItems[0].fileAvailability,undefined)
 assert.equal(result.trabajadores[0].workerItems[0].files[0].availability,undefined)
 assert.equal(result.inventory[0].availability,'disponible')
})
