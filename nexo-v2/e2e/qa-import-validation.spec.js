import { test, expect } from '@playwright/test'
test('CSV errors display every row and successful import displays server count', async ({ page }) => {
 let payload={error:'IMPORT_VALIDATION_FAILED',issues:[{row:2,column:'rut',value:'incorrecto',message:'Revisa el RUT.'},{row:3,column:'email',value:'incompleto',message:'Ingresa un correo válido.'}]}
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  const body=path==='/api/auth/me'?{user:{id:'qa',role:'client_admin'},tenant:{name:'Empresa QA'}}:path==='/api/settings'?{settings:{}}:path.includes('/data-transfer/import/')?payload:{}
  return route.fulfill({status:path.includes('/data-transfer/import/')&&payload.error?400:200,json:body})
 })
 await page.goto('/app/transferencia')
 await page.locator('input[type=file]').setInputFiles({name:'qa.csv',mimeType:'text/csv',buffer:Buffer.from('nombre,rut\nQA,incorrecto')})
 await page.getByRole('button',{name:'Validar e importar'}).click()
 await expect(page.getByRole('table')).toContainText('Revisa el RUT.')
 await expect(page.getByRole('table')).toContainText('Ingresa un correo válido.')
 await expect(page.getByRole('button',{name:'Descargar informe de errores'})).toBeVisible()
 payload={rows:2}
 await page.getByRole('button',{name:'Validar e importar'}).click()
 await expect(page.getByRole('status')).toContainText('2 registros procesados')
 await expect(page.getByRole('table')).toHaveCount(0)
})
