import test from 'node:test';
import assert from 'node:assert/strict';

test('error middleware calculates status before writing structured log',async()=>{
  process.env.DATABASE_URL||='postgres://test:test@localhost:5432/test';
  const {errorHandler}=await import('../middleware.js');
  const original=console.error;let logged='';
  console.error=value=>{logged=String(value);};
  const response={headersSent:false,statusCode:0,body:null,status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
  try{errorHandler(Object.assign(new Error('invalid request'),{status:400,code:'INVALID_REQUEST'}),{requestId:'req-1',method:'POST',path:'/api/test'},response,()=>{});}
  finally{console.error=original;}
  assert.equal(response.statusCode,400);assert.equal(response.body.error,'INVALID_REQUEST');
  const entry=JSON.parse(logged);assert.equal(entry.status,400);assert.equal(entry.requestId,'req-1');
});
