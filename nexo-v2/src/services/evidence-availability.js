export function evidenceFileIds(workers=[]) {
 return [...new Set(workers.flatMap(worker=>(worker?.workerItems||[]).flatMap(item=>[item.fileId,...(item.files||[]).map(file=>file.fileId)]).filter(Boolean)))].sort()
}
export function withEvidenceAvailability(worker,availability={}) {
 if(!worker)return worker
 return {...worker,workerItems:(worker.workerItems||[]).map(item=>({...item,fileAvailability:item.fileId?(availability[item.fileId]||'pending'):'unavailable',...(Array.isArray(item.files)?{files:item.files.map(file=>({...file,availability:availability[file.fileId]||'pending'}))}:{})}))}
}
export function stripEvidenceAvailability(items=[]) {
 return items.map(({fileAvailability,...item})=>({...item,...(item.files?{files:item.files.map(({availability,...file})=>file)}:{})}))
}
