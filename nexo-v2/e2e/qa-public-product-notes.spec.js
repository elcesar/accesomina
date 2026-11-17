import { test, expect } from '@playwright/test'

const notes = [
  ['Estado operativo', 'Identifica qué servicios están listos y cuáles tienen brechas.'],
  ['Alertas prioritarias', 'Concentra pendientes y vencimientos que requieren acción.'],
  ['Información conectada', 'Accede desde el cliente hasta cada persona, recurso y documento.'],
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    return route.fulfill({ json: path === '/api/auth/config' ? { registrationEnabled: true } : {} })
  })
})

for (const width of [375, 768, 1440]) {
  test(`los tres indicadores de producto separan título y descripción a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/')

    const cards = page.locator('.nk-hero-product-notes > article')
    await expect(cards).toHaveCount(notes.length)

    for (const [index, [title, description]] of notes.entries()) {
      const card = cards.nth(index)
      await expect(card.locator('h3')).toHaveText(title)
      await expect(card.locator('p')).toHaveText(description)
      await expect(card.locator('> b, > span')).toHaveCount(0)

      const layout = await card.evaluate(element => {
        const heading = element.querySelector('h3')
        const body = element.querySelector('p')
        if (!heading || !body) return null
        const headingRect = heading.getBoundingClientRect()
        const bodyRect = body.getBoundingClientRect()
        return {
          headingDisplay: getComputedStyle(heading).display,
          bodyDisplay: getComputedStyle(body).display,
          headingBottom: headingRect.bottom,
          bodyTop: bodyRect.top,
        }
      })

      expect(layout).not.toBeNull()
      expect(layout.headingDisplay).not.toBe('inline')
      expect(layout.bodyDisplay).not.toBe('inline')
      expect(layout.bodyTop).toBeGreaterThan(layout.headingBottom)
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}
