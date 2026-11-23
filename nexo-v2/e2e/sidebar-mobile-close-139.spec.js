import { test, expect } from '@playwright/test'

async function mockSession(page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/auth/me'
      ? { user: { id: 'sidebar-qa', nombre: 'QA', role: 'client_admin' }, tenant: { id: 'sidebar-tenant', name: 'Empresa QA' }, csrfToken: 'sidebar-qa-csrf' }
      : path === '/api/settings'
        ? { settings: { branding: { theme: 'light' }, modules: {} }, integrations: [] }
        : path === '/api/state'
          ? { state: { minas: [], clientes: [], trabajadores: [], contratos: [], mantenciones: [], alertas: [] } }
          : path === '/api/subscription'
            ? { legacy: true, canOperate: true }
            : {}
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
  })
}

test('NK-R01-067: cerrar menú solo existe cuando el cajón móvil está abierto', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockSession(page)
  await page.goto('/app')
  const sidebar = page.locator('#nk-primary-sidebar')
  const close = sidebar.getByRole('button', { name: 'Cerrar menú' })
  const toggle = page.getByRole('button', { name: 'Abrir navegación' })

  await expect(close).toHaveCount(0)
  await toggle.click()
  await expect(sidebar).toHaveClass(/nk-sidebar-mobile-open/)
  await expect(close).toBeVisible()
  await expect(close).toBeFocused()
  await close.click()
  await expect(sidebar).not.toHaveClass(/nk-sidebar-mobile-open/)
  await expect(close).toHaveCount(0)
  await expect(toggle).toBeFocused()

  await toggle.click()
  await expect(close).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(close).toHaveCount(0)
  await expect(toggle).toBeFocused()
})

test('NK-R01-067: escritorio no muestra botón X al lado del logo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await mockSession(page)
  await page.goto('/app')
  await expect(page.locator('#nk-primary-sidebar')).toBeVisible()
  await expect(page.locator('.nk-sidebar-brand-link')).toBeVisible()
  await expect(page.locator('.nk-sidebar-mobile-close')).toHaveCount(0)
})
