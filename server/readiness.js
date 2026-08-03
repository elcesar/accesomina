import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const timeoutSignal = milliseconds => AbortSignal.timeout(milliseconds);

async function probe(name, required, action) {
  const started = Date.now();
  try {
    const detail = await action();
    return { name, ok:true, required, latencyMs:Date.now()-started, detail };
  } catch (error) {
    return { name, ok:false, required, latencyMs:Date.now()-started, error:String(error.message||error).slice(0,300) };
  }
}

export async function evaluateReadiness(config,{query,s3Client,fetchFn=fetch}={}) {
  const checks=[];
  checks.push(await probe('database',true,async()=>{await query('SELECT 1');return 'connected';}));
  if(config.fileStorage==='s3'){
    const client=s3Client||new S3Client({region:config.aws.region});
    checks.push(await probe('storage',true,async()=>{await client.send(new HeadBucketCommand({Bucket:config.aws.bucket}));return 's3-accessible';}));
  }else checks.push({name:'storage',ok:config.env!=='production',required:config.env==='production',latencyMs:0,detail:'local-development'});
  if(config.env==='production'){
    if(config.virusScan.healthUrl){
      checks.push(await probe('antivirus',true,async()=>{const response=await fetchFn(config.virusScan.healthUrl,{method:'GET',headers:config.virusScan.token?{authorization:`Bearer ${config.virusScan.token}`}:{},signal:timeoutSignal(5000)});if(!response.ok)throw new Error(`health returned ${response.status}`);return 'reachable';}));
    }else checks.push({name:'antivirus',ok:Boolean(config.virusScan.url),required:true,latencyMs:0,detail:config.virusScan.url?'configured-scan-endpoint':'not-configured'});
  }else checks.push({name:'antivirus',ok:true,required:false,latencyMs:0,detail:config.virusScan.url?'configured':'optional-development'});
  checks.push({name:'documentAi',ok:true,required:false,latencyMs:0,detail:config.documentAi.url?'configured':'manual-review-mode'});
  const ready=checks.every(check=>!check.required||check.ok);
  return {status:ready?'ready':'not_ready',service:config.serviceName,version:config.version,checks};
}
