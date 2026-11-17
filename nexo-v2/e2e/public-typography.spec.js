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

for (const width of [1440, 375]) {
  test(`public navigation is readable and touch-friendly at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.goto('/planes')

    const plansHeader = page.locator('.nk-plans-hero')
    const planGrid = page.locator('.nk-plan-grid')
    const [headerBox, gridBox] = await Promise.all([plansHeader.boundingBox(), planGrid.boundingBox()])
    expect(headerBox?.x).toBeGreaterThan(0)
    expect(headerBox?.x).toBeGreaterThanOrEqual(Math.min(16, gridBox?.x || 0))

    const access = page.getByRole('link', { name: 'Acceso', exact: true })
    const accessBox = await access.boundingBox()
    expect(accessBox?.height).toBeGreaterThanOrEqual(44)

    const visibleSectionLinks = page.locator('.nk-public-section-tabs a:visible')
    if (await visibleSectionLinks.count()) {
      for (const link of await visibleSectionLinks.all()) {
        const metrics = await link.evaluate(element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return { fontSize: parseFloat(style.fontSize), height: rect.height }
        })
        expect(metrics.fontSize).toBeGreaterThanOrEqual(13)
        expect(metrics.height).toBeGreaterThanOrEqual(44)
      }
    }

    const menuToggle = page.getByRole('button', { name: 'Abrir menú de secciones' })
    if (width <= 1024 && await menuToggle.isVisible()) {
      const toggleBox = await menuToggle.boundingBox()
      expect(toggleBox?.width).toBeGreaterThanOrEqual(44)
      expect(toggleBox?.height).toBeGreaterThanOrEqual(44)
      await menuToggle.click()
      const mobileLink = page.locator('.nk-public-mobile-menu a').first()
      const metrics = await mobileLink.evaluate(element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return { fontSize: parseFloat(style.fontSize), height: rect.height }
      })
      expect(metrics.fontSize).toBeGreaterThanOrEqual(13)
      expect(metrics.height).toBeGreaterThanOrEqual(44)
    }
  })
}
