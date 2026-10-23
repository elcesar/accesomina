import {test,expect} from '@playwright/test'
test('D-068 disables pending integrations and permits file logo and primary color',async({page})=>{
 let saved
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/api/settings'&&route.request().method()==='PUT'){saved=route.request().postDataJSON();return route.fulfill({json:saved})}
  return route.fulfill({json:path==='/api/auth/me'?{user:{role:'client_admin'},tenant:{id:'qa'}}:path==='/api/users'?[]:path==='/api/settings'?{settings:{}}:{}})
 })
 await page.goto('/app/configuracion')
 await expect(page.getByRole('button',{name:'Guardar WhatsApp'})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Guardar firma'})).toBeDisabled()
 await expect(page.getByLabel('Logo de la empresa (PNG o JPG, hasta 2 MB)')).toHaveAttribute('type','file')
 await page.getByLabel('Color principal').fill('#005577')
 await page.getByRole('button',{name:'Guardar configuración'}).click()
 await expect.poll(()=>saved?.branding?.primaryColor).toBe('#005577')
 await expect(page.locator('.nk-app-shell')).toHaveCSS('--nk-primary','#005577')
 await page.goto('/app/libro-obra')
 await expect(page.getByText('Este módulo aún no está disponible.',{exact:false})).toBeVisible()
 await expect(page.getByRole('button',{name:'Nueva anotación'})).toHaveCount(0)
})
