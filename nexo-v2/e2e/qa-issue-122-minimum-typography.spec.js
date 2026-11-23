import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Se obtiene del router real para no dejar vistas del portal fuera del retest.
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const protectedRoutes = app.split('<Route path="/app"')[1]?.split('</Route>')[0] || ''
const paths = [...protectedRoutes.matchAll(/<Route path="([^"]+)" element={<([A-Z][A-Za-z0-9]*)/g)]
  .filter(([, path, component]) => !path.includes(':') && component !== 'Navigate' && !['LegacyOrderServiceRedirect', 'LegacyClientAccreditationRedirect'].includes(component))
  .map(([, path]) => '/app/' + path)
const unique = [...new Set(paths)]
const groups = Array.from({ length: Math.ceil(unique.length / 10) }, (_, i) => unique.slice(i * 10, i * 10 + 10))

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname
    const body = pathname === '/api/auth/me'
      ? { user: { id: 'qa', name: 'Responsable QA', role: 'domian_admin' }, tenant: { id: 'qa-company', name: 'Empresa QA' } }
      : pathname === '/api/settings' ? { settings: {} }
      : pathname === '/api/state' ? { state: {}, moduleVersions: {} }
      : ['/api/users', '/api/audit', '/api/work-books/entries'].includes(pathname) ? []
      : pathname === '/api/tenants' ? { tenants: [] }
      : {}
    return route.fulfill({ json: body })
  })
})

test('la auditoría cubre los módulos declarados por el router', () => {
  expect(unique.length).toBeGreaterThanOrEqual(40)
  expect(unique).toContain('/app/auditoria')
  expect(unique).toContain('/app/acreditacion-empresa')
  expect(unique).toContain('/app/configuracion')
})

// Evalúa tipografía COMPUTADA, incluso cuando CSS usa rem, em, calc o herencia.
// Solo nodos visibles con texto propio y controles textuales; SVG/íconos no aplican.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  groups.forEach((batch, index) => {
    test(`contenido >= 13px · ${viewport.width}px · lote ${index + 1}`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize(viewport)
      for (const path of batch) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('.nk-app-main').first(), path).toBeVisible({ timeout: 10_000 })
        const offenders = await page.locator('.nk-app-main').evaluate(root => {
          const elements = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,strong,small,em,b,li,a,label,button,input,select,textarea,th,td,summary,caption')
          return [...elements].filter(el => {
            if (el.getClientRects().length === 0) return false
            const style = getComputedStyle(el)
            if (style.visibility === 'hidden' || style.display === 'none') return false
            const text = [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
            const control = ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
            if (!text && !control) return false
            return parseFloat(style.fontSize) < 12.99
          }).slice(0, 12).map(el => ({
            element: el.tagName.toLowerCase(),
            className: String(el.className || '').slice(0, 90),
            text: (el.innerText || el.value || el.getAttribute('placeholder') || '').slice(0, 65),
            fontSize: getComputedStyle(el).fontSize,
          }))
        })
        expect(offenders, `${path} (${viewport.width}px) contains text below 13px`).toEqual([])
      }
    })
  })
}
