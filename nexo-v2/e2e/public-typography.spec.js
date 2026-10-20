import { test, expect } from '@playwright/test'
import { PUBLIC_PAGES } from '../src/config/public-pages.js'

const publicPages = Object.values(PUBLIC_PAGES).filter(page => page.path !== '/crear-empresa')

for (const width of [1440, 375]) {
  test(`public section overlines meet the minimum text size at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.route('**/api/**', route => route.fulfill({ json: {} }))

    for (const section of publicPages) {
      await test.step(section.path, async () => {
        await page.goto(section.path)
        const overlines = page.locator('main .nk-eyebrow')
        await expect(overlines.first()).toBeVisible()
        for (const overline of await overlines.all()) {
          await expect(overline).toBeVisible()
          const style = await overline.evaluate(element => {
            const computed = getComputedStyle(element)
            return { fontSize: parseFloat(computed.fontSize), token: getComputedStyle(document.documentElement).getPropertyValue('--nk-text-base').trim() }
          })
          expect(style.fontSize).toBeGreaterThanOrEqual(13)
          expect(style.fontSize).toBe(parseFloat(style.token))
        }
      })
    }
  })
}
