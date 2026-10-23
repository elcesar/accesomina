import { test, expect } from '@playwright/test'
const state={trabajadores:[{id:'qa-person',nombre:'José Peña QA',rut:'11.111.111-1',tipo:'permanente',workerItems:[],mineras:[]}],minas:[],mantenciones:[]}
test.beforeEach(async({page})=>{
 await page.route('**/api/**',route=>{
 const path=new URL(route.request().url()).pathname
 return route.fulfill({json:path==='/api/auth/me'?{user:{role:'client_admin'},tenant:{id:'qa'}}:path==='/api/settings'?{settings:{}}:path==='/api/state'?{state,moduleVersions:{}}:{}})
 })
})
test('underage validation has one associated error, and leaving through global actions is guarded',async({page})=>{
 await page.goto('/app/trabajadores/nuevo')
 await expect(page.getByText('Ingresa un RUT chileno válido.',{exact:true})).toHaveCount(0)
 await page.locator('#worker-name').fill('Persona QA')
 await page.locator('#worker-birth-date').fill('2012-05-10')
 await page.getByRole('button',{name:'Siguiente'}).click()
 await expect(page.getByText('La persona es menor de edad. Debe tener al menos 18 años para ser registrada.',{exact:true})).toHaveCount(1)
 await page.getByRole('button',{name:'+ Cliente',exact:true}).click()
 await expect(page.getByRole('alertdialog',{name:'Salir sin guardar'})).toBeVisible()
 await page.getByRole('button',{name:'Seguir editando'}).click()
 await expect(page.locator('#worker-name')).toHaveValue('Persona QA')
 await page.getByRole('button',{name:'+ Cliente',exact:true}).click()
 await page.getByRole('button',{name:'Salir y descartar'}).click()
 await expect(page).toHaveURL(/\/app\/clientes\/nuevo$/)
})
test('person document form has one type selector and no redundant classification',async({page})=>{
 await page.goto('/app/trabajadores/qa-person')
 await page.getByRole('button',{name:'Documentos y aptitudes',exact:true}).click()
 await expect(page.getByRole('combobox',{name:'Tipo',exact:true})).toHaveCount(1)
 await expect(page.getByText('Clasificación documental',{exact:true})).toHaveCount(0)
})
test('person search matches accented names with normalized spaces and case',async({page})=>{
 await page.goto('/app/trabajadores')
 const search=page.locator('.nk-app-main input').first()
 await search.fill('JOSE   PEÑA')
 await expect(page.locator('tbody')).toContainText('José Peña QA')
 await search.fill('JOSE PENA')
 await expect(page.locator('tbody')).not.toContainText('José Peña QA')
})
