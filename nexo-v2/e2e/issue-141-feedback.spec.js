import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = path === '/api/auth/me'
      ? { user: { id: 'qa', role: 'client_admin', permissions: { modules: {} } }, tenant: { id: 'qa', name: 'QA' } }
      : path === '/api/settings'
        ? { settings: { modules: {}, branding: {}, alerts: { warningDays: 30, criticalDays: 7 }, catalogs: {} } }
        : path === '/api/users' ? [] : path === '/api/state' ? { state: {}, moduleVersions: {} } : {}
    await route.fulfill({ status: request.headerValue('x-qa-fail') ? 503 : 200, json: body })
  })
})

test('Configuración usa una sola confirmación local, accesible y sin duplicado global', async ({ page }) => {
  await page.goto('/app/configuracion')
  await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click()
  await expect(page.locator('.nk-form-message[role="status"]')).toContainText('Configuración guardada correctamente.')
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
  await page.goto('/app/turnos')
  await expect(page.locator('.nk-form-message')).toHaveCount(0)
})

test('Una mutación explícita de jornadas anuncia un solo éxito y lo limpia al navegar', async ({ page }) => {
  await page.goto('/app/turnos')
  await page.evaluate(async () => {
    const { api } = await import('/src/services/api.js')
    await api.put('/state/modules', { changes: {}, reason: 'QA feedback' }, {
      feedback: true,
      successMessage: 'Jornada guardada correctamente.',
    })
  })
  const notification = page.locator('.nk-operation-feedback[role="status"]')
  await expect(notification).toHaveCount(1)
  await expect(notification).toContainText('Jornada guardada correctamente.')
  await page.goto('/app/configuracion')
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
})

test('Una operación fallida no anuncia éxito anterior ni nuevo', async ({ page }) => {
  await page.route('**/api/state/modules', route => route.fulfill({ status: 503, json: { error: 'SERVER_ERROR' } }))
  await page.goto('/app/turnos')
  await page.evaluate(async () => {
    const { api } = await import('/src/services/api.js')
    try { await api.put('/state/modules', {}, { feedback: true, successMessage: 'Jornada guardada correctamente.' }) }
    catch { /* El error pertenece al formulario; no debe publicarse éxito global. */ }
  })
  await expect(page.locator('.nk-operation-feedback[role="status"]')).toHaveCount(0)
})
