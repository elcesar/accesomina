import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Route inventory is tied to App.jsx, not a hand-maintained count.
const router = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const privateRoutes = router.split('<Route path="/app"')[1]?.split('</Route>')[0] || ''
const routes = [...new Set([...privateRoutes.matchAll(/<Route path="([^"]+)" element={<([A-Z][A-Za-z0-9]*)/g)]
  .filter(([, path, component]) => !path.includes(':') && path !== '*' && component !== 'Navigate')
  .map(([, path]) => '/app/' + path))]
const batches = Array.from({ length: Math.ceil(routes.length / 10) }, (_, i) => routes.slice(i * 10, (i + 1) * 10))

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

async function audit(page) {
  return page.locator('.nk-app-main').evaluate(root => {
    const visible = element => {
      const style = getComputedStyle(element)
      return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('[hidden],[inert],[aria-hidden="true"]')
    }
    const name = element => {
      const label = element.getAttribute('aria-label')?.trim()
      if (label) return label
      const ids = element.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) || []
      const labelled = ids.map(id => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(' ')
      if (labelled) return labelled
      const labels = element.labels ? Array.from(element.labels) : []
      if (labels.some(item => item.textContent.trim())) return labels.map(item => item.textContent.trim()).join(' ')
      return element.getAttribute('title')?.trim() || ''
    }
    const fields = [...root.querySelectorAll('input:not([type="hidden"]),select,textarea')]
      .filter(el => visible(el) && getComputedStyle(el).opacity !== '0' && !['submit','reset','button'].includes(el.type))
      .filter(el => !name(el))
      .slice(0, 15)
      .map(el => ({ tag: el.tagName, type: el.type, placeholder: el.getAttribute('placeholder'), html: el.outerHTML.slice(0, 180) }))
    const tables = [...root.querySelectorAll('table')].filter(visible).flatMap((table, index) => {
      const caption = table.querySelector(':scope > caption')
      const invalid = [...table.querySelectorAll('th')].filter(th => !['col','row','colgroup','rowgroup'].includes(th.getAttribute('scope')))
      return !caption || !caption.textContent.trim() || invalid.length ? [{ index, caption: caption?.textContent?.trim() || null, headersWithoutScope: invalid.length }] : []
    })
    return { fields, tables }
  })
}

test('cobertura de rutas relevantes para hallazgo #124', () => {
  expect(routes.length).toBeGreaterThanOrEqual(45)
  expect(routes).toContain('/app/turnos')
  expect(routes).toContain('/app/operaciones')
  expect(routes).toContain('/app/trabajadores/nuevo')
})

batches.forEach((batch, index) => {
  test(`etiquetas y semántica de tablas · lote ${index + 1}`, async ({ page }) => {
    test.setTimeout(180_000)
    const findings = []
    for (const path of batch) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('.nk-app-main'), path).toBeVisible({ timeout: 10_000 })
      const result = await audit(page)
      if (result.tables.length || result.fields.length) findings.push({ path, ...result })
    }
    expect(findings, 'Hallazgos de accesibilidad por ruta').toEqual([])
  })
})

test('Programar jornada: labels asociados y nombre accesible de filtros', async ({ page }) => {
  await page.goto('/app/turnos')
  await expect(page.locator('.nk-app-main')).toBeVisible()
  const filters = page.locator('.nk-turnos-filters select')
  await expect(filters).toHaveCount(4)
  for (const select of await filters.all()) await expect(select).toHaveAccessibleName(/.+/)
  const button = page.getByRole('button', { name: /programar jornada/i }).first()
  if (await button.count()) {
    await button.click()
    const dialog = page.getByRole('dialog', { name: /programar jornada/i })
    if (await dialog.count()) {
      for (const control of await dialog.locator('input,select,textarea').all()) await expect(control).toHaveAccessibleName(/.+/)
    }
  }
})

test('Centro Operativo: formularios de Libro diario y acciones correctivas tienen nombres accesibles', async ({ page }) => {
  await page.goto('/app/operaciones')
  await expect(page.locator('.nk-app-main')).toBeVisible()
  for (const tab of ['Libro diario', 'Acciones correctivas y preventivas']) {
    await page.getByRole('tab', { name: tab }).click()
    const result = await audit(page)
    expect(result.fields, tab).toEqual([])
    expect(result.tables, tab).toEqual([])
  }
})
