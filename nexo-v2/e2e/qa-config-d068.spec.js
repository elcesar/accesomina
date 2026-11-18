import { test, expect } from '@playwright/test'

async function mockConfiguration(page, role = 'client_admin') {
  const state = {
    settings: {
      branding: { displayName: 'Empresa QA', theme: 'light', primaryColor: '#2A2A8C' },
      modules: { epp: true },
      alerts: { warningDays: 30, criticalDays: 7 },
      catalogs: { operationalTimeZone: 'America/Santiago', specialties: [] },
    },
    writes: [],
  }
  await page.route('**/api/**', async route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    const method = request.method()
    const json = (body, status = 200) => route.fulfill({ status, json: body })

    if (pathname === '/api/auth/me') return json({
      user: { id: 'qa-user', name: 'Responsable QA', email: 'qa@example.test', role, permissions: { modules: {} }, mfaEnabled: true },
      tenant: { id: 'qa-tenant', name: 'Empresa QA', subscriptionManaged: false },
      csrfToken: 'qa-csrf',
    })
    if (pathname === '/api/auth/config') return json({ registrationEnabled: false, mfaRequired: false })
    if (pathname === '/api/settings' && method === 'GET') return json({ settings: state.settings, integrations: [] })
    if (pathname === '/api/settings' && method === 'PUT') {
      const payload = request.postDataJSON()
      state.writes.push(payload)
      state.settings = {
        ...state.settings,
        ...payload,
        branding: { ...state.settings.branding, ...(payload.branding || {}) },
      }
      return json(state.settings)
    }
    if (pathname === '/api/users') return json([])
    if (pathname === '/api/subscription') return json({ managed: false, legacy: true, canOperate: true, separateServices: {}, capacity: { total: 15, used: 0 } })
    if (pathname === '/api/subscriptions/admin/access') return json({ capabilities: [] })
    if (pathname === '/api/state') return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [], prospectos: [] }, version: 1 })
    return json({})
  })
  return state
}

test('configuración separa permisos de módulos de la identidad visual privada', async ({ page }) => {
  const state = await mockConfiguration(page, 'client_admin')
  await page.goto('/app/configuracion')

  await expect(page.getByRole('heading', { name: 'Módulos habilitados' })).toBeVisible()
  await expect(page.getByLabel('Logo de la empresa (PNG o JPG, hasta 2 MB)')).toHaveAttribute('type', 'file')
  await expect(page.getByRole('button', { name: 'Guardar WhatsApp' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar firma' })).toBeDisabled()

  await page.getByLabel('Color principal').fill('#005577')
  await expect.poll(() => page.locator('.nk-app-shell').evaluate(node => getComputedStyle(node).getPropertyValue('--nk-primary').trim())).toBe('#005577')

  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.writes[0].branding.primaryColor).toBe('#005577')
  expect(state.writes[0].modules.epp).toBe(true)

  await page.goto('/app/libro-obra')
  await expect(page.getByText('Este módulo aún no está disponible.', { exact: false })).toBeVisible()
})

test('administración global conserva identidad y vistas, pero no recibe el control de módulos', async ({ page }) => {
  const state = await mockConfiguration(page, 'domian_admin')
  await page.goto('/app/configuracion')

  await expect(page.getByRole('heading', { name: 'Módulos habilitados' })).toHaveCount(0)
  await expect(page.getByLabel('Color principal')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar configuración' }).click()
  await expect.poll(() => state.writes.length).toBe(1)
  expect(state.writes[0].modules).toBeUndefined()
})
