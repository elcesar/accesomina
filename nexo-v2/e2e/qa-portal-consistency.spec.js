import { test, expect } from '@playwright/test'
import { PORTAL_MODULES } from '../src/config/portal-modules.js'
test.beforeEach(async ({ page }) => {
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname
  const body=path==='/api/auth/me'?{user:{id:'qa',name:'Responsable QA',role:'domian_admin'},tenant:{id:'qa-company',name:'Empresa QA'}}:path==='/api/settings'?{settings:{}}:path==='/api/state'?{state:{},moduleVersions:{}}:path==='/api/users'||path==='/api/work-books/entries'||path==='/api/audit'?[]:path==='/api/tenants'?{tenants:[]}:{}
  return route.fulfill({json:body})
 })
})
test('module names agree with headings and titles on empty views', async ({ page }) => {
 test.setTimeout(90000)
 for(const module of PORTAL_MODULES) {
  if(module.path==='/app/administracion-clientes')continue
  await page.goto(module.path)
  await expect(page.locator('.nk-app-main h1').first(),module.path).toHaveText(module.label)
  await expect(page,module.path).toHaveTitle(`${module.label} · Nexo Klar`)
  const unlabelled=await page.locator('.nk-app-main input:not([hidden]):not([type=hidden]), .nk-app-main select, .nk-app-main textarea').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&![...el.labels||[]].some(label=>label.textContent.trim())).map(el=>el.outerHTML.slice(0,160)))
  expect(unlabelled,module.path).toEqual([])
  const invalidTables=await page.locator('.nk-app-main table').evaluateAll(tables=>tables.filter(table=>!table.caption||[...table.querySelectorAll('th')].some(th=>!th.scope)).length)
  expect(invalidTables,module.path).toBe(0)
 }
})
test('sort direction is announced and sidebar has no horizontal overflow', async ({ page }) => {
 await page.goto('/app/trabajadores')
 const heading=page.getByRole('columnheader',{name:'Persona',exact:true})
 await expect(heading).toHaveAttribute('aria-sort','ascending')
 await heading.getByRole('button').click()
 await expect(heading).toHaveAttribute('aria-sort','descending')
 expect(await page.locator('.nk-sidebar-nav').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1)
})
test('jornada controls have names and readable typography',async({page})=>{
 await page.route('**/api/state',route=>route.fulfill({json:{state:{trabajadores:[{id:'qa-person',nombre:'Persona QA'}],mantenciones:[{id:'qa-order',nombre:'Orden QA',estado:'activo'}]},moduleVersions:{}}}))
 await page.goto('/app/turnos')
 await page.getByRole('button',{name:'Programar turno',exact:true}).first().click()
 const dialog=page.getByRole('dialog')
 expect(await dialog.locator('input,select,textarea').evaluateAll(elements=>elements.filter(el=>!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&![...el.labels||[]].some(label=>label.textContent.trim())).length)).toBe(0)
 expect(await dialog.locator('label').evaluateAll(elements=>Math.min(...elements.map(el=>parseFloat(getComputedStyle(el).fontSize))))).toBeGreaterThanOrEqual(13)
})
test('main portal views fit a mobile viewport', async ({ page }) => {
 await page.setViewportSize({width:390,height:844})
 for(const path of ['/app/trabajadores','/app/turnos','/app/configuracion','/app/credenciales']) {
  await page.goto(path)
  await expect(page.locator('.nk-app-main h1').first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth),path).toBeLessThanOrEqual(391)
 }
})

test('empty states distinguish empty catalogs, filtered results, and person segments', async ({ page }) => {
  await page.goto('/app/clientes')
  await expect(page.getByText('Aún no hay clientes registrados.')).toBeVisible()
  await expect(page.getByText('Usa + Cliente en el encabezado para crear el primero.')).toBeVisible()

  await page.route('**/api/state', route => route.fulfill({json: {
    state: {
      minas: [{id: 'qa-client', nombre: 'Cliente QA', estado: 'activo'}],
      trabajadores: [{id: 'qa-worker', nombre: 'Persona QA', tipo: 'fijo', disponibilidad: 'disponible'}],
    },
    moduleVersions: {},
  }}))
  await page.goto('/app/clientes')
  const clientSearch=page.getByRole('textbox', {name: 'Buscar cliente'})
  await clientSearch.fill('sin coincidencia')
  await expect(page.getByText('No encontramos clientes que coincidan con tu búsqueda o los filtros seleccionados.')).toBeVisible()
  await clientSearch.fill('')
  await expect(page.getByText('Cliente QA')).toBeVisible()

  await page.goto('/app/trabajadores')
  await page.getByRole('tab', {name: /Trabajador disponible/}).click()
  await expect(page.getByText('No hay personas en trabajadores disponibles')).toBeVisible()
  await expect(page.getByText('Cambia de vista para revisar las personas registradas en otros segmentos.')).toBeVisible()
})
