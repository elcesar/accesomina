import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function mockReports(page, { failInitially = false } = {}) {
  let fail = failInitially
  const state = {
    trabajadores: [], minas: [], contratos: [], mantenciones: [], asignaciones: [],
    restricted: [{ id: 'qa-restriction', workerId: 'qa-person', estado: 'vigente', activa: true }],
  }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') {
      if (fail) { fail = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'SERVER_ERROR' }) }) }
      return json({ state })
    }
    if (path === '/api/work-books/entries') return json([])
    return json({})
  })
}

test('Reportes abre y todas las categorías conservan la navegación', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await mockReports(page)
  await page.goto('/app/reportes')
  await expect(page.getByRole('heading', { name: 'Reportes y analítica' })).toBeVisible()
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(7)
  for (let index = 0; index < 7; index++) {
    await tabs.nth(index).click()
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('link', { name: 'Panel de control', exact: true })).toBeVisible()
  }
  expect(errors).toEqual([])
})

test('las restricciones se cuentan y se exportan en personas y cumplimiento', async ({ page }) => {
  await mockReports(page)
  await page.goto('/app/reportes')
  for (const category of ['Reportes de trabajadores', 'Reportes de auditoría y cumplimiento']) {
    await page.getByRole('tab', { name: new RegExp(category) }).click()
    const card = page.locator('.nk-report-card').filter({ hasText: 'No habilitaciones' })
    await expect(card.locator('strong')).toHaveText('1')
    const downloadPromise = page.waitForEvent('download')
    await card.getByTitle('Descargar No habilitaciones').click()
    const download = await downloadPromise
    const csv = await readFile(await download.path(), 'utf8')
    expect(csv).toContain('qa-restriction')
    expect(csv).toContain('No habilitaciones')
  }
})

test('un fallo de carga muestra el error y permite reintentar sin perder el menú', async ({ page }) => {
  await mockReports(page, { failInitially: true })
  await page.goto('/app/reportes')
  await expect(page.locator('.nk-form-message')).toBeVisible()
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
  await expect(page.locator('.nk-form-message')).toHaveCount(0)
  await page.getByRole('tab', { name: /Reportes de trabajadores/ }).click()
  await expect(page.locator('.nk-report-card').filter({ hasText: 'No habilitaciones' }).locator('strong')).toHaveText('1')
})
