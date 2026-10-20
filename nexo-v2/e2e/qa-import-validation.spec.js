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

test('global consistency errors state that no rows were saved and show supplied metadata', async ({ page }) => {
 await page.route('**/api/data-transfer/import/**', route => route.fulfill({
  status:409,
  json:{error:'INVALID_REFERENCE',message:'El cliente relacionado no existe en esta empresa.',row:2,column:'cliente',value:'Cliente QA no importado'},
 }))
 await page.goto('/app/transferencia')
 await page.locator('input[type=file]').setInputFiles({name:'qa.csv',mimeType:'text/csv',buffer:Buffer.from('nombre,rut\\nPersona QA,11.111.111-1')})
 await page.getByRole('button',{name:'Validar e importar'}).click()
 await expect(page.getByRole('alert')).toContainText('El cliente relacionado no existe')
 await expect(page.getByRole('status')).toContainText('No se guardó ninguna fila')
 await expect(page.getByRole('table')).toContainText('Cliente QA no importado')
 await expect(page.getByRole('table')).toContainText('Fila')
})
