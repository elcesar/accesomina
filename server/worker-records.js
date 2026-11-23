import crypto from 'node:crypto'
import {sanitizeJson,validateTenantState} from './validation.js'
import {normalizeRut} from './security.js'
export const WORKER_PROFILE_FIELDS=['nombre','rut','nacimiento','tel','email','region','ciudad','cargo','rol','especialidad','afp','salud','epp']
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
export const recordRevision=record=>crypto.createHash('sha256').update(JSON.stringify(canonical(Object.fromEntries(['id',...WORKER_PROFILE_FIELDS].filter(key=>Object.hasOwn(record,key)).map(key=>[key,record[key]]))))).digest('hex')
const conflict=(message,code,status=409,field)=>{throw Object.assign(new Error(message),{code,status,field})}
export function patchWorkerProfile(workers,id,patch,revision){
 const index=workers.findIndex(worker=>String(worker.id)===id)
 if(index<0)conflict('No encontramos la persona.', 'WORKER_NOT_FOUND',404)
 const current=workers[index]
 if(recordRevision(current)!==revision)conflict('Esta persona cambió mientras la editabas. Recarga su ficha antes de guardar.','RECORD_VERSION_CONFLICT')
 if(!patch||typeof patch!=='object'||Array.isArray(patch))conflict('Revisa los datos del perfil.','INVALID_RECORD_PATCH',400)
 if(Object.keys(patch).some(key=>!WORKER_PROFILE_FIELDS.includes(key)))conflict('Sólo se pueden modificar los datos del perfil desde esta operación.','FIELD_PERMISSION_DENIED',403)
 const next={...current,...sanitizeJson({trabajadores:[patch]}).trabajadores[0]}
 // Documents and operational links have separate endpoints and are immutable here.
 const profile={...next,mineras:[],workerItems:[]},previous={...current,mineras:[],workerItems:[]}
 try{
  const clean=validateTenantState({trabajadores:[profile]},{previousState:{trabajadores:[previous]}}).trabajadores[0]
  for(const key of WORKER_PROFILE_FIELDS)if(Object.hasOwn(clean,key))next[key]=clean[key]
 }catch(error){error.field={INCOMPLETE_WORKER:'nombre',INVALID_WORKER_RUT:'rut',INVALID_WORKER_EMAIL:'email',INVALID_WORKER_PHONE:'tel',INVALID_WORKER_BIRTH_DATE:'nacimiento',WORKER_UNDERAGE:'nacimiento'}[error.code];throw error}
 if(workers.some((worker,i)=>i!==index&&normalizeRut(worker.rut)===normalizeRut(next.rut)))conflict('Ya existe una persona registrada con ese RUT.','DUPLICATE_WORKER_RUT',409,'rut')
 return {record:next,records:workers.map((worker,i)=>i===index?next:worker),revision:recordRevision(next)}
}
