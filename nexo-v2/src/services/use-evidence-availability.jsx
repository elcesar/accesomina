import { useEffect, useState } from 'react'
import { api } from './api.js'
import { evidenceFileIds } from './evidence-availability.js'
export function useEvidenceAvailability(workers) {
 const key=JSON.stringify(evidenceFileIds(workers))
 const [result,setResult]=useState({})
 const [revision,setRevision]=useState(0)
 useEffect(()=>{const refresh=()=>setRevision(value=>value+1);window.addEventListener('focus',refresh);window.addEventListener('nexo:refresh-file-availability',refresh);return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('nexo:refresh-file-availability',refresh)}},[])
 useEffect(()=>{
  let active=true
  const ids=JSON.parse(key),map={}
  setResult({})
  // One bounded request per batch, not one request per row/document.
  ;(async()=>{for(let i=0;i<ids.length;i+=100){
   if(!active)break
   try{const response=await api.get(`/files/availability?ids=${encodeURIComponent(ids.slice(i,i+100).join(','))}`);for(const file of response.files||[])map[file.fileId]=file.availability}
   catch{for(const id of ids.slice(i,i+100))map[id]='pending'}
   if(active)setResult({...map})
  }})()
  return ()=>{active=false}
 },[key,revision])
 return result
}
