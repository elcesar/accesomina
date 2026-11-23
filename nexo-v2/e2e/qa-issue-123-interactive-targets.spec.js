import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Derive routes from the actual application router rather than a stale list.
const router = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const privateRoutes = router.split('<Route path="/app"')[1]?.split('</Route>')[0] || ''
const routePaths = [...new Set([...privateRoutes.matchAll(/<Route path="([^"]+)" element={<([A-Z][A-Za-z0-9]*)/g)]
  .filter(([, path, component]) => !path.includes(':') && path !== '*' && component !== 'Navigate')
  .map(([, path]) => '/app/' + path))]
const batches = Array.from({ length: Math.ceil(routePaths.length / 10) }, (_, i) => routePaths.slice(i * 10, (i + 1) * 10))

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/auth/me'
      ? { user: { id: 'qa', name: 'QA Accesibilidad', role: 'domian_admin' }, tenant: { id: 'qa-company', name: 'Empresa QA' } }
      : path === '/api/settings' ? { settings: {} }
      : path === '/api/state' ? { state: {}, moduleVersions: {} }
      : ['/api/users','/api/audit','/api/work-books/entries'].includes(path) ? []
      : path === '/api/tenants' ? { tenants: [] }
      : {}
    return route.fulfill({ json: data })
  })
})

test('rutas de portal auditadas desde el router', () => {
  expect(routePaths.length).toBeGreaterThanOrEqual(45)
  expect(routePaths).toContain('/app/reportes')
  expect(routePaths).toContain('/app/configuracion')
  expect(routePaths).toContain('/app/auditoria')
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  batches.forEach((batch, index) => {
    test(`controles >=40px y targets >=44px · ${viewport.width}px · lote ${index + 1}`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize(viewport)
      for (const path of batch) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        const main = page.locator('.nk-app-main')
        await expect(main, path).toBeVisible({ timeout: 10_000 })
        const results = await main.evaluate(root => {
          const interactive = root.querySelectorAll('button,input,select,textarea,[role="button"],[role="tab"],[role="combobox"],[role="spinbutton"],[role="checkbox"],[role="radio"],[role="switch"],.nk-breadcrumb a,.nk-breadcrumbs a')
          let counted = 0
          const violations = []
          for (const el of interactive) {
            if (el.closest('[hidden], [aria-hidden="true"], [inert]')) continue
            const styles = getComputedStyle(el)
            if (styles.display === 'none' || styles.visibility === 'hidden' || el.getClientRects().length === 0) continue
            if (el.matches('input[type="hidden"],input[type="file"]')) continue
            if (styles.pointerEvents === 'none' && styles.opacity === '0') continue
            let target = el
            if (el.matches('input[type="checkbox"],input[type="radio"]')) {
              // Standard input glyphs may be small; their associated label carries hit area.
              const label = el.closest('label') || (el.id ? root.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null)
              if (!label) continue // Explicit unlabelled control is a separate accessibility audit.
              target = label
            }
            const rect = target.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            counted++
            if (rect.height < 39.5 || rect.height < 43.5 || (
              (el.matches('.nk-icon-button,.nk-report-download,[role="checkbox"],[role="radio"],[role="switch"]')) && rect.width < 43.5
            )) {
              violations.push({
                tag: el.tagName.toLowerCase(),
                className: String(el.className || '').slice(0, 90),
                text: String(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
                height: Math.round(rect.height * 10) / 10,
                width: Math.round(rect.width * 10) / 10,
              })
            }
          }
          return { counted, violations: violations.slice(0, 20) }
        })
        expect(results.violations, `${path} ${viewport.width}px measured ${results.counted} controls`).toEqual([])
      }
    })
  })
}

test('teclado: navegación por tab y foco visible', async ({ page }) => {
  await page.goto('/app/reportes')
  await expect(page.locator('.nk-app-main')).toBeVisible()
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, visible: Boolean(document.activeElement?.getClientRects().length) }))
  expect(focused.visible).toBeTruthy()
  expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused.tag)
})
