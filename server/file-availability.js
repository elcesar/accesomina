export async function verifyFileAvailability({tenantId,ids,files,canAccess,exists,concurrency=6}) {
 const byId=new Map(files.filter(file=>String(file.tenant_id)===String(tenantId)).map(file=>[String(file.id),file]))
 const objects=new Map(),results=new Map();let index=0
 const unique=[...new Set(ids)]
 async function worker(){while(index<unique.length){const id=unique[index++],file=byId.get(id)
  if(!file||file.deleted_at||file.malware_status!=='clean'||!canAccess(file)||!String(file.storage_key).startsWith(`tenants/${tenantId}/`)){results.set(id,'unavailable');continue}
  if(!objects.has(file.storage_key))objects.set(file.storage_key,Promise.resolve().then(()=>exists(file)).catch(()=>null))
  const found=await objects.get(file.storage_key);results.set(id,found===true?'available':found===false?'unavailable':'pending')
 }}
 await Promise.all(Array.from({length:Math.min(concurrency,unique.length)},worker))
 return unique.map(fileId=>({fileId,availability:results.get(fileId)||'pending'}))
}
