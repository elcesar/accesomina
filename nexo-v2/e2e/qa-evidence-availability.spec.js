import{test,expect}from'@playwright/test'
test('physical file verification updates document status without treating a missing object as current',async({page})=>{
 let availability='unavailable',checks=0
 const worker={id:'qa',nombre:'Persona QA',rut:'11.111.111-1',workerItems:[{id:'doc',type:'documento',name:'Certificado AFP',fileId:'11111111-1111-4111-8111-111111111111',vence:'2030-01-01'}]}
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/files/availability'){checks++;return route.fulfill({json:{files:[{fileId:worker.workerItems[0].fileId,availability}]}})}
  if(path.startsWith('/api/state/records/trabajadores/'))return route.fulfill({json:{record:worker,revision:'qa-revision'}})
  return route.fulfill({json:path==='/api/auth/me'?{user:{role:'client_admin'},tenant:{id:'qa'}}:path==='/api/settings'?{settings:{}}:path==='/api/state'?{state:{trabajadores:[worker]},moduleVersions:{}}:{}})
 })
 await page.goto('/app/trabajadores/qa')
 await page.getByRole('button',{name:'Documentos y aptitudes',exact:true}).click()
 await expect(page.locator('.nk-badge').filter({hasText:/^Archivo no disponible$/})).toBeVisible()
 availability='available'
 await page.getByRole('button',{name:'Verificar archivos nuevamente'}).click()
 await expect(page.getByRole('row').filter({hasText:'Certificado AFP'}).last().locator('.nk-badge').filter({hasText:/^Vigente$/})).toBeVisible()
 expect(checks).toBeGreaterThanOrEqual(2)
})
