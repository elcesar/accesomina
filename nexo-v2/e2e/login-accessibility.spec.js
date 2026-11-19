import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') {
      return route.fulfill({ status: 401, json: { error: 'AUTH_REQUIRED' } })
    }
    return route.fulfill({ json: {} })
  })
})

for (const width of [360, 390, 768, 1440]) {
  test(`el acceso usa una jerarquía clara y texto comprensible a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/login')

    const headings = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements =>
      elements.map(element => ({ tagName: element.tagName, text: element.textContent?.trim() })),
    )
    expect(headings).toEqual([{ tagName: 'H1', text: 'Acceso al sistema' }])
    await expect(page.locator('.nk-login-brand-title')).toHaveJSProperty('tagName', 'P')

    await expect(page.locator('.nk-login-footer')).toHaveText('Conexión segura')
    await expect(page.locator('.nk-login-footer')).not.toContainText(/cookie|HTTPS/i)
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)
  })
}
