import {test,expect} from '@playwright/test'
let role='client_admin',status=200
test.beforeEach(async({page})=>{
 role='client_admin';status=200
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  const body=path==='/api/auth/me'?{user:{role},tenant:{id:'qa'}}:path==='/api/settings'?{settings:{}}:path==='/api/users'?[]:path==='/api/state'?{state:{},moduleVersions:{}}:{}
  return route.fulfill({status:path==='/api/state'?status:200,json:body})
 })
})
test('disabled primary action explains its prerequisite',async({page})=>{
 await page.goto('/app/turnos')
 const button=page.getByRole('button',{name:'Programar turno',exact:true}).first()
 await expect(button).toBeDisabled()
 const id=await button.getAttribute('aria-describedby')
 expect(id).toBeTruthy()
 await expect(page.locator(`[id="${id}"]`)).toContainText('persona habilitada')
})
test('saving confirms success and route navigation clears feedback',async({page})=>{
 await page.goto('/app/configuracion')
 await page.getByRole('button',{name:'Guardar configuración',exact:true}).click()
 await expect(page.locator('.nk-operation-feedback')).toContainText('Información guardada correctamente.')
 await page.goto('/app/turnos')
 await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
})
test('administration denial renders a clear 403 page with a return action',async({page})=>{
 role='consulta'
 await page.goto('/app/configuracion')
 await expect(page.getByText('Error 403',{exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Ir al panel',exact:true})).toBeVisible()
})
for(const code of [500,503])test(`state load failure shows a nonblocking ${code} alert and allows retry`,async({page})=>{
 status=code
 await page.goto('/app/trabajadores')
 const alert=page.locator('.nk-operation-feedback-error')
 await expect(alert).toBeVisible()
 await expect(alert).toContainText(`Error ${code}`)
 await expect(page.getByRole('button',{name:'Volver a intentar'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Cerrar aviso'})).toBeVisible()
 // The module remains mounted; the error is an inline alert, not a full-page replacement.
 await expect(page.locator('.nk-people-page')).toBeVisible()
 status=200
 await page.getByRole('button',{name:'Volver a intentar'}).click()
 await expect(alert).toHaveCount(0)
 await expect(page.locator('.nk-people-page')).toBeVisible()
})
