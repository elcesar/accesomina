import { test, expect } from '@playwright/test'

const adminSession = {
  user: { id: 'layout-admin', nombre: 'Administradora QA', role: 'client_admin' },
  tenant: { id: 'layout-tenant', name: 'Empresa QA de navegación' },
  csrfToken: 'layout-csrf-token',
}

function initialState() {
  return {
    minas: [{ id: 'cliente-qa', nombre: 'Cliente QA', estado: 'activo' }],
    contratos: [{ id: 'contrato-qa', nombre: 'Contrato QA', minaId: 'cliente-qa', estado: 'vigente' }],
    mantenciones: [],
    trabajadores: [],
    asignaciones: [],
    restricted: [],
    eppDeliveries: [],
  }
}

async function mockPortal(page) {
  const state = initialState()
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/api/auth/me') return json(adminSession)
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' }, modules: {} } })
    if (path === '/api/state') return json({ state, moduleVersions: {} })
    if (path === '/api/subscriptions/summary') return json({ managed: false })
    return json({})
  })
}

async function expectNoHorizontalOverflow(page, sidebar) {
  const metrics = await sidebar.evaluate(element => {
    const nav = element.querySelector('.nk-sidebar-nav')
    const longLabel = [...element.querySelectorAll('.nk-side-link-label')]
      .find(node => node.textContent?.trim() === 'Inventario de equipos de protección personal')
    const longLink = longLabel?.closest('.nk-side-link')
    const style = longLabel ? getComputedStyle(longLabel) : null

    return {
      sidebarClientWidth: element.clientWidth,
      sidebarScrollWidth: element.scrollWidth,
      navClientWidth: nav?.clientWidth || 0,
      navScrollWidth: nav?.scrollWidth || 0,
      labelClientWidth: longLabel?.clientWidth || 0,
      labelScrollWidth: longLabel?.scrollWidth || 0,
      linkClientWidth: longLink?.clientWidth || 0,
      linkScrollWidth: longLink?.scrollWidth || 0,
      labelWhiteSpace: style?.whiteSpace,
      documentScrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }
  })

  expect(metrics.sidebarScrollWidth).toBeLessThanOrEqual(metrics.sidebarClientWidth)
  expect(metrics.navScrollWidth).toBeLessThanOrEqual(metrics.navClientWidth)
  expect(metrics.linkScrollWidth).toBeLessThanOrEqual(metrics.linkClientWidth)
  expect(metrics.labelScrollWidth).toBeLessThanOrEqual(metrics.labelClientWidth)
  expect(metrics.labelWhiteSpace).toBe('normal')
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth)
}

async function openLongNavigationGroup(page, sidebar) {
  const group = sidebar.getByRole('button', { name: 'Activos, Equipos e Inventario', exact: true })
  await expect(group).toBeVisible()
  if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  await expect(sidebar.getByRole('link', { name: 'Inventario de equipos de protección personal', exact: true })).toBeVisible()
}

for (const width of [1440, 1024]) {
  test(`la barra lateral y acciones del encabezado se adaptan a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await mockPortal(page)
    await page.goto('/app')

    const sidebar = page.locator('#nk-primary-sidebar')
    await expect(sidebar).toBeVisible()
    await openLongNavigationGroup(page, sidebar)
    await expectNoHorizontalOverflow(page, sidebar)

    const actions = page.locator('.nk-global-create')
    await expect(actions).toHaveCount(4)
    const actionMetrics = await actions.evaluateAll(buttons => buttons.map(button => ({
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
      inlineSize: getComputedStyle(button).inlineSize,
    })))

    expect(actionMetrics.every(item => item.scrollWidth <= item.clientWidth)).toBe(true)
    expect(new Set(actionMetrics.map(item => Math.round(item.clientWidth))).size).toBeGreaterThan(1)
    expect(actionMetrics.every(item => item.inlineSize !== 'auto')).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  })
}

test('el cajón móvil conserva navegación y acciones sin desborde lateral', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockPortal(page)
  await page.goto('/app')

  await page.getByRole('button', { name: 'Abrir navegación', exact: true }).click()
  const sidebar = page.locator('#nk-primary-sidebar')
  await expect(sidebar).toBeVisible()
  await openLongNavigationGroup(page, sidebar)
  await expectNoHorizontalOverflow(page, sidebar)

  await page.getByRole('button', { name: 'Mostrar acciones de creación', exact: true }).click()
  const visibleActions = page.locator('.nk-global-actions-open .nk-global-create')
  await expect(visibleActions).toHaveCount(4)
  const actionMetrics = await visibleActions.evaluateAll(buttons => buttons.map(button => ({
    clientWidth: button.clientWidth,
    scrollWidth: button.scrollWidth,
  })))
  expect(actionMetrics.every(item => item.scrollWidth <= item.clientWidth)).toBe(true)
  await expect(page.getByRole('button', { name: 'Abrir navegación', exact: true })).toHaveCSS('min-height', '44px')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
