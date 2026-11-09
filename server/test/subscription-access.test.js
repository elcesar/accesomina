import test from 'node:test';
import assert from 'node:assert/strict';
import { lockSubscriptionForWrite, subscriptionAccess } from '../subscription-access.js';

function response() {
  return {statusCode:200,status(code){this.statusCode=code;return this},json(body){this.body=body;return this}};
}
async function access({managed=true,role='client_admin',method='GET',path='/state',body,permissions={},summary={canOperate:false,legacy:false}}={}) {
  const res=response();let passed=false,error;
  const middleware=subscriptionAccess({readSummary:async tenantId=>{assert.equal(tenantId,'company-a');return summary}});
  await middleware({auth:{tenantId:'company-a',role,subscriptionManaged:managed,permissions},method,path,body},res,e=>{error=e;passed=!e});
  return {res,passed,error};
}

test('legacy contracts remain outside the subscription gate',async()=>{
  let read=false,passed=false;
  await subscriptionAccess({readSummary:async()=>{read=true;throw new Error('unexpected read')}})(
    {auth:{subscriptionManaged:false},method:'POST',path:'/state/modules'},response(),()=>{passed=true});
  assert.equal(passed,true);assert.equal(read,false);
});
test('an active commercial contract allows operations without replacing role permissions',async()=>{
  const result=await access({role:'consulta',method:'PUT',path:'/state/modules',summary:{canOperate:true}});
  assert.equal(result.passed,true); // downstream state editors still reject consulta
});
test('suspension denies operative reads and writes to non administrators',async()=>{
  for(const method of ['GET','POST','PUT','PATCH','DELETE']){
    const result=await access({role:'rrhh',method,path:'/state/modules'});
    assert.equal(result.passed,false);assert.equal(result.res.statusCode,403);
    assert.equal(result.res.body.error,'SUBSCRIPTION_SUSPENDED');
  }
});
test('suspended company administrators keep controlled tenant reads and exports',async()=>{
  for(const path of ['/state','/state/records/trabajadores','/data-transfer/export','/data-transfer/export/trabajadores','/files/qa-id','/settings','/privacy']){
    assert.equal((await access({path})).passed,true,path);
  }
  for(const path of ['/operations/notifications','/data-transfer/export-evil','/users','/integrations']){
    assert.equal((await access({path})).res.statusCode,403,path);
  }
});
test('suspended administrator cannot mutate records or files through any allowed read path',async()=>{
  for(const path of ['/state/modules','/data-transfer/export','/files/qa-id','/settings','/privacy']){
    assert.equal((await access({path,method:'POST'})).res.statusCode,403,path);
  }
});
test('managed contract missing or unreadable fails closed',async()=>{
  assert.equal((await access({role:'rrhh',summary:{legacy:true}})).res.statusCode,403);
  let nextError;
  await subscriptionAccess({readSummary:async()=>{throw new Error('database unavailable')}})(
    {auth:{subscriptionManaged:true,tenantId:'company-a'},path:'/state',method:'POST'},response(),error=>{nextError=error});
  assert.match(nextError.message,/database unavailable/);
});
test('write lock reads fresh management state after a concurrent opt-in',async()=>{
  const client={};const calls=[];
  const tenant={id:'company-a',status:'active',subscription_managed:true};
  const result=await lockSubscriptionForWrite(client,{tenantId:'company-a',subscriptionManaged:false},{
    lockTenant:async(c,id)=>{assert.equal(c,client);assert.equal(id,'company-a');calls.push('lock');return tenant},
    assertOperational:async(c,id)=>{assert.equal(c,client);assert.equal(id,'company-a');calls.push('operational')},
  });
  assert.deepEqual(calls,['lock','operational']);assert.equal(result,tenant);
});
test('write lock preserves unmanaged tenants and independently rejects administrative suspension',async()=>{
  let checked=false;
  const deps={lockTenant:async()=>({id:'company-a',status:'active',subscription_managed:false}),assertOperational:async()=>{checked=true}};
  assert.equal(await lockSubscriptionForWrite({}, {tenantId:'company-a',subscriptionManaged:false},deps),null);
  assert.equal(checked,false);
  await assert.rejects(()=>lockSubscriptionForWrite({}, {tenantId:'company-a',subscriptionManaged:true},{...deps,lockTenant:async()=>({status:'suspended',subscription_managed:true})}),e=>e.code==='ACCOUNT_DISABLED');
});
test('write lock rechecks expiration even for edits that consume no extra capacity',async()=>{
  await assert.rejects(()=>lockSubscriptionForWrite({}, {tenantId:'company-a',subscriptionManaged:true},{
    lockTenant:async()=>({status:'active',subscription_managed:true}),
    assertOperational:async()=>{throw Object.assign(new Error('expired'),{code:'SUBSCRIPTION_SUSPENDED',status:403})},
  }),e=>e.code==='SUBSCRIPTION_SUSPENDED');
});
test('independent service access survives principal expiry without opening operational writes',async()=>{
  const summary={canOperate:false,separateServices:{oportunidades:{enabled:true}}};
  const body={changes:{prospectos:{data:[]}}};
  assert.equal((await access({method:'PUT',path:'/state/modules',body,summary})).passed,true);
  assert.equal((await access({method:'PUT',path:'/state/modules',body:{changes:{...body.changes,trabajadores:{data:[]}}},summary})).res.statusCode,403);
  assert.equal((await access({method:'POST',path:'/work-books/entries',summary})).error.code,'SUBSCRIPTION_SERVICE_REQUIRED');
});
test('separate services remain unavailable without a license even during an active principal contract',async()=>{
  const result=await access({path:'/work-books/entries',method:'POST',summary:{canOperate:true,separateServices:{}}});
  assert.equal(result.error.code,'SUBSCRIPTION_SERVICE_REQUIRED');
});
test('a separate service license does not override an explicit user module denial',async()=>{
  const result=await access({path:'/work-books/entries',method:'POST',role:'rrhh',permissions:{modules:{libroObra:false}},summary:{canOperate:true,separateServices:{libroObra:{enabled:true}}}});
  assert.equal(result.error.code,'MODULE_PERMISSION_DENIED');
});
