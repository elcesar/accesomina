import { test, expect } from '@playwright/test'

test.use({ timezoneId: 'America/Santiago' })
const state = { trabajadores: [{ id:'qa-person', nombre:'Persona QA', rut:'11.111.111-1' }], minas:[{id:'qa-client',nombre:'Cliente QA'}], mantenciones:[{id:'qa-order',nombre:'Orden QA',minaId:'qa-client'}], inventoryItems:[{id:'qa-item',name:'Equipo QA',category:'equipos',stock:1,calibrationDue:'2026-10-13'}], bodegas:[{id:'qa-warehouse',name:'Bodega QA'}], asignaciones:[] }
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-14T00:36:00Z'))
  await page.route('**/api/**', route => {
    const path=new URL(route.request().url()).pathname
    const body=path==='/api/auth/me'?{user:{id:'qa-admin',name:'Responsable QA',role:'client_admin'},tenant:{id:'qa-tenant',name:'Empresa QA'},csrfToken:'fixture-qa'}:path==='/api/settings'?{settings:{branding:{theme:'light'},catalogs:{operationalTimeZone:'America/Santiago'}}}:path==='/api/state'?{state,moduleVersions:{}}:path==='/api/work-books/entries'?[]:{}
    return route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
  })
})
test('six operational forms default to the local day after UTC midnight', async ({ page }) => {
  for(const [path,action,scope] of [['turnos','Programar turno','.nk-dialog'],['movimientos-inventario','Nuevo movimiento','.nk-mov-editor'],['mantenimiento','Registrar mantenimiento','.nk-maint-editor'],['credenciales','Nueva credencial','.nk-credentials-workspace'],['incidentes','Registrar incidente','.nk-incident-editor'],['bloqueados','Registrar no habilitación','.nk-dialog']]){
    await page.goto('/app/'+path);await page.getByRole('button',{name:action,exact:true}).first().click()
    await expect(page.locator(scope).locator('input[type=date]').first()).toHaveValue('2026-10-13')
  }
})
test('a calibration expiring today remains current through the operational day', async ({ page }) => {
  await page.goto('/app/equipos-instrumentos')
  await expect(page.locator('tbody')).toContainText('Calibración vigente')
  await expect(page.locator('tbody')).not.toContainText('Calibración vencida')
})
test('the work-book form displays local time while submission preserves the UTC instant', async ({ page }) => {
  let submitted
  await page.route('**/api/work-books/entries',route=>{
    if(route.request().method()==='POST')submitted=route.request().postDataJSON()
    return route.fulfill({contentType:'application/json',body:JSON.stringify(route.request().method()==='POST'?{id:'qa-entry'}:[])})
  })
  await page.goto('/app/libro-obra');await page.getByRole('button',{name:'Nueva anotación'}).click()
  const form=page.locator('.nk-book-modal form')
  await expect(form.locator('input[type=datetime-local]')).toHaveValue('2026-10-13T21:36')
  await form.locator('select').nth(0).selectOption('qa-client');await form.locator('select').nth(2).selectOption('qa-order')
  await form.locator('input:not([type])').nth(0).fill('Anotación QA');await form.locator('textarea').fill('Detalle ficticio QA')
  await form.getByRole('button',{name:'Guardar anotación'}).click()
  await expect.poll(()=>submitted?.occurredAt).toBe('2026-10-14T00:36:00.000Z')
  await expect.poll(()=>submitted?.operationalTimeZone).toBe('America/Santiago')
})
