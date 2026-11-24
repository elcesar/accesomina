import { test, expect } from '@playwright/test'
import { PUBLIC_PAGES, PUBLIC_PLANS_APPROVED } from '../src/config/public-pages.js'

const publicPages = Object.values(PUBLIC_PAGES).filter(page => (
  page.path !== '/crear-empresa' && (PUBLIC_PLANS_APPROVED || page.path !== '/planes')
))

async function installPrivatePlanApi(page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'layout-admin', name: 'Administradora QA', role: 'client_admin', permissions: { modules: {} } }, tenant: { id: 'layout-tenant', name: 'Empresa QA' }, csrfToken: 'layout-csrf' })
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' }, modules: {} } })
    if (path === '/api/state') return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [], prospectos: [] } })
    if (path === '/api/subscription') return json({ legacy: true, managed: false, canOperate: true, capacity: { used: 0, total: 15, available: 15 }, requests: [], packages: [], separateServices: {} })
    if (path === '/api/subscription/catalog') return json({ plans: [], packages: [] })
    if (path === '/api/subscription/notifications') return json({ notifications: [] })
    if (path === '/api/subscriptions/admin/access') return json({ capabilities: [] })
    return json({})
  })
}

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

  test(`public navigation meets readable text and touch targets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.route('**/api/**', route => route.fulfill({ json: {} }))
    await page.goto('/contacto')

    const access = page.getByRole('link', { name: 'Acceso', exact: true })
    const brand = page.getByRole('link', { name: 'Ir al inicio', exact: true })
    for (const element of [access, brand]) {
      const box = await element.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }

    const sectionLinks = page.locator('.nk-public-section-tabs a:visible')
    if (await sectionLinks.count()) {
      for (const link of await sectionLinks.all()) {
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
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test(`Mi plan preserves the content gutter at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await installPrivatePlanApi(page)
    await page.goto('/app/mi-plan')
    await expect(page.getByRole('heading', { name: 'Mi plan Nexo Klar', exact: true })).toBeVisible()
    const metrics = await page.locator('.nk-subscription-page').evaluate(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return { paddingLeft: parseFloat(style.paddingLeft), x: rect.x }
    })
    expect(metrics.paddingLeft).toBeGreaterThanOrEqual(16)
    expect(metrics.x).toBeGreaterThanOrEqual(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('el menú móvil conserva la sección activa y se desplaza dentro de una pantalla baja', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 375 })
  await page.route('**/api/**', route => route.fulfill({ json: {} }))
  await page.goto('/contacto')
  await page.getByRole('button', { name: 'Abrir menú de secciones' }).click()

  const menu = page.locator('.nk-public-mobile-menu')
  const active = menu.locator('a[aria-current="page"]')
  await expect(active).toHaveClass(/is-active/)
  const metrics = await menu.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      bottom: rect.bottom,
      overflowY: style.overflowY,
      viewportHeight: window.innerHeight,
    }
  })
  expect(['auto', 'scroll']).toContain(metrics.overflowY)
  expect(metrics.clientHeight).toBeLessThanOrEqual(metrics.viewportHeight)
  expect(metrics.scrollHeight).toBeGreaterThanOrEqual(metrics.clientHeight)
  expect(metrics.bottom).toBeLessThanOrEqual(metrics.viewportHeight + 1)
})

test('las grillas de soluciones e industrias cierran filas equilibradas en escritorio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 975 })
  await page.route('**/api/**', route => route.fulfill({ json: {} }))

  for (const [path, selector] of [['/soluciones', '.nk-solutions-grid'], ['/industrias', '.nk-industries-grid']]) {
    await page.goto(path)
    const columns = await page.locator(selector).evaluate(element => getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length)
    expect(columns).toBe(3)
  }
})