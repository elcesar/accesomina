import fs from 'node:fs';
import crypto from 'node:crypto';

const strict=process.env.STRICT_RELEASE_VALIDATION==='true';
const errors=[],warnings=[];
const read=file=>fs.readFileSync(file,'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const local=read('AccesoMina_v6.html'),publicHtml=read('public/index.html');

if(hash(local)!==hash(publicHtml))errors.push('AccesoMina_v6.html and public/index.html are not synchronized');
for(const [file,html] of [['AccesoMina_v6.html',local],['public/index.html',publicHtml]]){
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
  scripts.forEach((source,index)=>{try{new Function(source);}catch(error){errors.push(`${file} inline script ${index}: ${error.message}`);}});
}
const pkg=JSON.parse(read('package.json'));
if(pkg.name!=='nexo-klar-cloud')errors.push('package name is not normalized to nexo-klar-cloud');
const task=JSON.parse(read('infra/aws/ecs-task-definition.json'));
const taskText=JSON.stringify(task);
const placeholders=[...taskText.matchAll(/<[^>]+>/g)].map(match=>match[0]);
if(placeholders.length)(strict?errors:warnings).push(`AWS task definition has unresolved placeholders: ${[...new Set(placeholders)].join(', ')}`);
const container=task.containerDefinitions?.find(item=>item.name==='nexo-klar-api');
if(!container)errors.push('ECS container nexo-klar-api is missing');
for(const required of ['DATABASE_URL','TENANT_SECRET_KEY','METRICS_TOKEN','VIRUS_SCAN_API_URL','VIRUS_SCAN_API_TOKEN','VIRUS_SCAN_HEALTH_URL']){
  if(!container?.secrets?.some(secret=>secret.name===required))errors.push(`ECS secret ${required} is missing`);
}
if(!container?.healthCheck)errors.push('ECS health check is missing');
const result={ok:errors.length===0,strict,frontendHash:hash(local),errors,warnings};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exit(1);
