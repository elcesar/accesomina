import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeBranding,validLogoObject,tenantLogoObject,INACTIVE_INTEGRATIONS} from '../branding.js'
import {accessibleBrandText} from '../../nexo-v2/src/services/theme.js'
test('branding validates primary color and uploaded file identifiers without dropping legacy logos',()=>{
 assert.equal(normalizeBranding({logoUrl:'https://example.com/logo.png'}).logoUrl,'https://example.com/logo.png')
 assert.equal(normalizeBranding({primaryColor:'#112233'}).primaryColor,'#112233')
 assert.throws(()=>normalizeBranding({primaryColor:'red; color:white'}),e=>e.code==='INVALID_PRIMARY_COLOR')
 assert.throws(()=>normalizeBranding({logoFileId:'arbitrary-path'}),e=>e.code==='INVALID_LOGO_FILE')
})
test('only small clean raster logo objects qualify',()=>{
 const file={malware_status:'clean',content_type:'image/png',byte_size:1024}
 assert.equal(validLogoObject(file),true)
 for(const patch of [{deleted_at:'2026-01-01'},{malware_status:'blocked'},{content_type:'image/svg+xml'},{byte_size:3*1024*1024},{byte_size:0}])assert.equal(validLogoObject({...file,...patch}),false)
})
test('WhatsApp and signature are explicitly unavailable pending activation',()=>{
 assert.deepEqual([...INACTIVE_INTEGRATIONS],['whatsapp','signature'])
 assert.equal(INACTIVE_INTEGRATIONS.has('smtp'),false)
})
test('brand text chooses black or white for at least 4.5 contrast',()=>{
 const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)
 for(const color of ['#000000','#FFFFFF','#2A2A8C','#FFFF00','#777777','#00CFC1']){
  const foreground=accessibleBrandText(color);const a=luminance(color),b=luminance(foreground);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5)
 }
})


test('logo lookup is isolated by tenant and excludes deleted objects',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite()
 try{
  await db.exec('CREATE TABLE file_objects (id text,tenant_id text,deleted_at text)')
  await db.query('INSERT INTO file_objects VALUES ($1,$2,NULL)',['qa-logo','tenant-a'])
  assert.equal((await tenantLogoObject(db,'tenant-a','qa-logo')).id,'qa-logo')
  assert.equal(await tenantLogoObject(db,'tenant-b','qa-logo'),null)
  await db.query('UPDATE file_objects SET deleted_at=$1',['2026-10-19'])
  assert.equal(await tenantLogoObject(db,'tenant-a','qa-logo'),null)
 }finally{await db.close()}
})
test('backend rejects pending integration changes before accessing credentials',async()=>{
 const {settingsRouter,tenantIntegration}=await import('../routes/settings.js')
 const route=settingsRouter.stack.find(layer=>layer.route?.path==='/integrations/:provider').route
 for(const provider of ['whatsapp','signature']){
  const response={status(code){this.code=code;return this},json(body){this.body=body;return this}}
  await route.stack.at(-1).handle({params:{provider},auth:{role:'client_admin'},body:{enabled:true}},response)
  assert.equal(response.code,409);assert.equal(response.body.error,'INTEGRATION_NOT_AVAILABLE')
  assert.equal((await tenantIntegration('qa-tenant',provider)).enabled,false)
 }
})
