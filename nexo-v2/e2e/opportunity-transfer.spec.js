import { test, expect } from '@playwright/test'
import { validateTenantState } from '../../server/validation.js'
import { csvRows } from '../../server/routes/data-transfer.js'

async function backend(page, initial) {
  let state=initial
  const puts=[]
  await page.route('**/api/**', async route=>{
    const req=route.request(),path=new URL(req.url()).pathname
    const json=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
    if(path==='/api/auth/me')return json({user:{id:'qa-admin',name:'Responsable QA',role:'client_admin'},tenant:{id:'qa-tenant',name:'Empresa QA'},csrfToken:'fixture-qa'})
    if(path==='/api/settings')return json({settings:{branding:{theme:'light'}}})
    if(path==='/api/state')return json({state,moduleVersions:{prospectos:1}})
    if(path==='/api/state/modules'&&req.method()==='PUT'){
      const changes=req.postDataJSON().changes;puts.push(changes)
      try{state=validateTenantState({...state,...Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,v.data]))});return json({moduleVersions:{prospectos:2}})}catch(e){return json({error:e.code},e.status||409)}
    }
    return json({})
  })
  return {puts,exportRows:()=>csvRows('oportunidades',state)}
}
test('an opportunity imported in the historical server module is visible, editable and exported once',async({page})=>{
 const api=await backend(page,{opportunities:[{id:'qa-import',company:'Importación QA',type:'nuevo_cliente',stage:'prospecto',amount:50,probability:25}]})
 await page.goto('/app/oportunidades');await expect(page.locator('tbody')).toContainText('Importación QA')
 await page.locator('tbody').getByRole('button',{name:'Abrir',exact:true}).click()
 const dialog=page.locator('.nk-dialog');await dialog.locator('input').first().fill('Importación QA corregida')
 await dialog.getByRole('button',{name:'Guardar oportunidad'}).click()
 await expect(page.locator('tbody')).toContainText('Importación QA corregida');await expect(page.locator('tbody tr')).toHaveCount(1)
 await page.reload();await expect(page.locator('tbody')).toContainText('Importación QA corregida')
 expect(api.puts[0].prospectos.data[0].id).toBe('qa-import');expect(api.exportRows()).toHaveLength(1);expect(api.exportRows()[0].empresa).toBe('Importación QA corregida')
})
test('current and historical collections remain visible together while the current ID wins',async({page})=>{
 await backend(page,{prospectos:[{id:'same',company:'Empresa actual QA',stage:'prospecto'}],oportunidades:[{id:'legacy',empresa:'Empresa histórica QA',etapa:'contactado'}],opportunities:[{id:'same',company:'Copia obsoleta QA'},{id:'csv',company:'CSV QA',stage:'prospecto'}]})
 await page.goto('/app/oportunidades');await expect(page.locator('tbody tr')).toHaveCount(3)
 await expect(page.locator('tbody')).toContainText('Empresa actual QA');await expect(page.locator('tbody')).toContainText('Empresa histórica QA');await expect(page.locator('tbody')).toContainText('CSV QA');await expect(page.locator('tbody')).not.toContainText('Copia obsoleta QA')
})
