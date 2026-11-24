import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    return path === '/api/auth/me'
      ? route.fulfill({ status: 401, json: { error: 'UNAUTHENTICATED' } })
      : route.fulfill({ json: {} })
  })
})

for (const width of [1440, 375]) {
  test(`benefit cards retain their shared typography and spacing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/')
    const cards = page.locator('.nk-hero-points article')
    await expect(cards).toHaveCount(3)

    for (const card of await cards.all()) {
      const heading = card.locator('h3')
      const description = card.locator('p')
      await expect(heading).toBeVisible()
      await expect(description).toBeVisible()
      await expect(heading).toHaveCSS('font-size', '18px')
      await expect(description).toHaveCSS('font-size', '13px')
      await expect(heading).toHaveCSS('margin', '0px')
      await expect(description).toHaveCSS('margin', '0px')
      const [titleBox, bodyBox, cardBox] = await Promise.all([heading.boundingBox(), description.boundingBox(), card.boundingBox()])
      const spacing = await card.evaluate(element => parseFloat(getComputedStyle(element).rowGap))
      expect(bodyBox.y - titleBox.y - titleBox.height).toBeCloseTo(spacing, 0)
      expect(cardBox.x).toBeGreaterThanOrEqual(0)
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(width)
    }

    await expect(page.locator('.nk-hero-product-notes b')).toHaveCount(3)
    await expect(page.locator('.nk-hero-product-notes span')).toHaveCount(3)
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)
  })

  test(`login exposes one main heading and concise connection copy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Acceso al sistema', exact: true })).toBeVisible()
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h2')).toHaveCount(0)
    await expect(page.locator('p.nk-login-brand-title')).toHaveCount(1)
    await expect(page.locator('.nk-login-footer')).toHaveText('Conexión segura')
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)
  })
}
