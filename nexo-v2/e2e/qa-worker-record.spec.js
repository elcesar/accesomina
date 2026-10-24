import{test,expect}from'@playwright/test'
test('worker profile uses a scoped read and a record patch with its initial revision',async({page})=>{
 let submitted,wholeStateReads=0
 const worker={id:'qa',nombre:'Persona QA',rut:'11.111.111-1',email:'qa@example.com',workerItems:[]}
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname
  if(path==='/api/state'&&!url.searchParams.has('modules'))wholeStateReads++
  if(path==='/api/state/records/trabajadores/qa'&&route.request().method()==='PATCH'){submitted=route.request().postDataJSON();return route.fulfill({json:{record:{...worker,...submitted.patch},revision:'new-revision'}})}
  return route.fulfill({json:path==='/api/auth/me'?{user:{role:'client_admin'},tenant:{id:'qa'}}:path==='/api/settings'?{settings:{}}:path==='/api/state'?{state:{},moduleVersions:{}}:path==='/api/state/records/trabajadores/qa'?{record:worker,revision:'initial-revision'}:{}})
 })
 await page.goto('/app/trabajadores/qa')
 await page.locator('#worker-email').fill('nuevo@example.com')
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).first().click()
 await expect.poll(()=>submitted?.revision).toBe('initial-revision')
 expect(submitted.patch.email).toBe('nuevo@example.com')
 expect(submitted.patch.workerItems).toBeUndefined()
 expect(submitted.changes).toBeUndefined()
 expect(wholeStateReads).toBe(0)
})
