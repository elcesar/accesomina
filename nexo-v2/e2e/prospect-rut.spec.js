import { test, expect } from '@playwright/test'
import { validateTenantState } from '../../server/validation.js'
import { canonicalizeOpportunityState } from '../../shared/opportunity-domain.js'

const legacy = { id: 'qa-legacy', company: 'Empresa histórica QA', type: 'nuevo_cliente', stage: 'perdida', rut: " 'RUT histórico inválido' " }
const current = { id: 'qa-current', company: 'Empresa actual QA', type: 'nuevo_cliente', stage: 'prospecto', rut: '13.848.379-7' }

async function backend(page, { initial = { prospectos: [legacy, current] }, rejectFirst = false } = {}) {
  let state = initial
  const writes = []
  const versions = { prospectos: 1, oportunidades: 0, opportunities: 0 }
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', name: 'Responsable QA', role: 'client_admin' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'fixture-qa' })
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state, moduleVersions: versions })
    if (path === '/api/state/modules' && req.method() === 'PUT') {
      const body = req.postDataJSON()
      writes.push(body)
      if (rejectFirst && writes.length === 1) return json({ error: 'INVALID_OPPORTUNITY_RUT' }, 409)
      try {
        const proposed = canonicalizeOpportunityState({ ...state, ...Object.fromEntries(Object.entries(body.changes).map(([key, value]) => [key, value.data])) })
        state = validateTenantState(proposed, { previousState: state })
        for (const key of Object.keys(versions)) versions[key] += 1
        return json({ moduleVersions: versions })
      } catch (error) { return json({ error: error.code }, error.status || 409) }
    }
    return json({})
  })
  await page.goto('/app/oportunidades')
  await expect(page.getByRole('heading', { name: 'Prospectos y oportunidades', exact: true })).toBeVisible()
  return { writes, stored: () => state.prospectos }
}

async function edit(page, name) {
  await page.locator('tbody tr').filter({ hasText: name }).getByRole('button', { name: 'Abrir', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

for (const width of [1440, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    test('new invalid RUT has contextual blur/save errors, then one corrected click persists and reloads', async ({ page }) => {
      const api = await backend(page)
      await page.getByRole('button', { name: 'Nueva oportunidad', exact: true }).click()
      const dialog = page.getByRole('dialog'), rut = dialog.getByLabel('RUT (opcional)', { exact: true })
      await dialog.getByLabel('Empresa', { exact: true }).fill('Nueva empresa ficticia QA')
      await rut.fill('11.111.111-2')
      await rut.press('Tab')
      await expect(rut).toHaveAttribute('aria-invalid', 'true')
      await expect(rut).toHaveAttribute('aria-describedby', /opportunity-rut-error/)
      await expect(dialog.locator('#opportunity-rut-error')).toHaveText('Ingresa un RUT chileno válido o deja el campo vacío.')
      await dialog.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(rut).toBeFocused()
      expect(api.writes).toHaveLength(0)
      await rut.fill('145072158')
      await expect(rut).toHaveAttribute('aria-invalid', 'false')
      await dialog.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      expect(api.writes).toHaveLength(1)
      expect(api.stored().find(row => row.company === 'Nueva empresa ficticia QA').rut).toBe('14.507.215-8')
      await page.reload()
      await edit(page, 'Nueva empresa ficticia QA')
      await expect(page.getByLabel('RUT (opcional)', { exact: true })).toHaveValue('14.507.215-8')
    })

    test('new opportunity retains an optional empty RUT', async ({ page }) => {
      const api = await backend(page)
      await page.getByRole('button', { name: 'Nueva oportunidad', exact: true }).click()
      await page.getByRole('dialog').getByLabel('Empresa', { exact: true }).fill('Empresa sin RUT QA')
      await page.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(api.stored().find(row => row.company === 'Empresa sin RUT QA').rut).toBe('')
    })

    test('focusing and blurring a historical RUT does not rewrite it or block another edit', async ({ page }) => {
      const api = await backend(page)
      await edit(page, legacy.company)
      const rut = page.getByLabel('RUT (opcional)', { exact: true })
      await expect(rut).toHaveValue(legacy.rut)
      await rut.focus()
      await rut.press('Tab')
      await expect(rut).toHaveValue(legacy.rut)
      await expect(rut).toHaveAttribute('aria-invalid', 'false')
      await page.getByRole('dialog').getByLabel('Teléfono', { exact: true }).fill('Dato ficticio QA')
      await page.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(api.stored().find(row => row.id === legacy.id).rut).toBe(legacy.rut)
      await page.reload()
      await edit(page, legacy.company)
      await expect(page.getByLabel('RUT (opcional)', { exact: true })).toHaveValue(legacy.rut)
    })

    test('changing a historical RUT to another invalid value is blocked and clearing it is allowed', async ({ page }) => {
      const api = await backend(page)
      await edit(page, legacy.company)
      const rut = page.getByLabel('RUT (opcional)', { exact: true })
      await rut.fill('11.111.111-2')
      await page.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(rut).toBeFocused()
      await expect(rut).toHaveAttribute('aria-invalid', 'true')
      expect(api.writes).toHaveLength(0)
      await rut.fill('')
      await page.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
      expect(api.stored().find(row => row.id === legacy.id).rut).toBe('')
    })

    test('server rejection maps to RUT with focus, keeps the dialog and permits a corrected retry', async ({ page }) => {
      const api = await backend(page, { rejectFirst: true })
      await edit(page, current.company)
      const dialog = page.getByRole('dialog'), rut = page.getByLabel('RUT (opcional)', { exact: true })
      await rut.fill('145072158')
      await dialog.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(rut).toBeFocused()
      await expect(rut).toHaveAttribute('aria-invalid', 'true')
      await expect(dialog.locator('#opportunity-rut-error')).toBeVisible()
      await expect(dialog.locator('.nk-form-error')).toHaveCount(0)
      expect(api.stored().find(row => row.id === current.id).rut).toBe(current.rut)
      await rut.fill('138483797')
      await expect(rut).toHaveAttribute('aria-invalid', 'false')
      await dialog.getByRole('button', { name: 'Guardar oportunidad', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      expect(api.writes).toHaveLength(2)
    })
  })
}
