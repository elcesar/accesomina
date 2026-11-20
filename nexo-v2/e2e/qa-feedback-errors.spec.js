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
 const confirmation=page.locator('.nk-form-message')
 await expect(confirmation).toHaveAttribute('role','status')
 await expect(confirmation).toContainText('Configuración guardada correctamente.')
 await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
 await page.goto('/app/turnos')
 await expect(confirmation).toHaveCount(0)
 await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
})
test('administration denial renders a clear 403 page with a return action',async({page})=>{
 role='consulta'
 await page.goto('/app/configuracion')
 await expect(page.getByText('Error 403',{exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Ir al panel',exact:true})).toBeVisible()
})
for(const code of [500,503])test(`state load failure shows a nonblocking ${code} alert without technical jargon and allows retry`,async({page})=>{
 // Load a valid snapshot first: Personas correctly renders a dedicated
 // initial-load error view when there is no prior state to preserve.
 await page.goto('/app/trabajadores')
 await expect(page.locator('.nk-people-page')).toBeVisible()
 status=code
 await page.evaluate(() => window.dispatchEvent(new Event('focus')))
 const alert=page.locator('.nk-operation-feedback-error')
 await expect(alert).toBeVisible()
 await expect(alert).toContainText(code===500?'No pudimos cargar la información':'El servicio no está disponible temporalmente')
 await expect(alert).not.toContainText(`Error ${code}`)
 await expect(alert).toHaveCSS('border-color', /rgb\(/)
 await expect(alert.getByRole('button',{name:'Volver a intentar'})).toBeVisible()
 await expect(alert.getByRole('button',{name:'Cerrar aviso'})).toBeVisible()
 // The module remains mounted; the error is an inline alert, not a full-page replacement.
 await expect(page.locator('.nk-people-page')).toBeVisible()
 status=200
 await alert.getByRole('button',{name:'Volver a intentar'}).click()
 await expect(alert).toHaveCount(0)
 await expect(page.locator('.nk-people-page')).toBeVisible()
})
