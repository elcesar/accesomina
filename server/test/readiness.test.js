import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateReadiness } from '../readiness.js';

const base={env:'production',serviceName:'nexo-klar',version:'7.7.0',fileStorage:'s3',aws:{region:'us-east-1',bucket:'private'},virusScan:{url:'https://scanner.example/scan',healthUrl:'https://scanner.example/health',token:'token'},documentAi:{url:''}};

test('production readiness probes database, S3 and antivirus',async()=>{
  const calls=[];
  const result=await evaluateReadiness(base,{query:async()=>{},s3Client:{send:async()=>calls.push('s3')},fetchFn:async()=>({ok:true,status:200})});
  assert.equal(result.status,'ready');assert.deepEqual(calls,['s3']);assert.equal(result.checks.filter(x=>x.required).every(x=>x.ok),true);
});

test('production readiness fails when private storage is unavailable',async()=>{
  const result=await evaluateReadiness(base,{query:async()=>{},s3Client:{send:async()=>{throw new Error('denied')}},fetchFn:async()=>({ok:true,status:200})});
  assert.equal(result.status,'not_ready');assert.equal(result.checks.find(x=>x.name==='storage').ok,false);
});

test('legacy antivirus configuration remains explicit when no health endpoint exists',async()=>{
  const result=await evaluateReadiness({...base,virusScan:{url:'https://scanner.example/scan',healthUrl:'',token:''}},{query:async()=>{},s3Client:{send:async()=>{}}});
  assert.equal(result.status,'ready');assert.equal(result.checks.find(x=>x.name==='antivirus').detail,'configured-scan-endpoint');
});
