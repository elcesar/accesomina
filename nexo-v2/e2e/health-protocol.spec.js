import { test, expect } from '@playwright/test'
import { validateTenantState } from '../../server/validation.js'

async function backend(page, protocols = []) {
  let state = { trabajadores: [{ id: 'qa-person', nombre: 'Persona QA', rut: '11.111.111-1' }], protocolosSalud: protocols }
  let version = 1
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Responsable QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'fixture-qa' })
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state, moduleVersions: { protocolosSalud: version } })
    if (path === '/api/files/qa-file') return route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="QA-evidencia.pdf"' }, body: '%PDF-1.4 QA' })
    if (path === '/api/files') return json({ id: 'qa-file', original_name: 'QA-evidencia.pdf', content_type: 'application/pdf', byte_size: 100 })
    if (path === '/api/state/modules' && req.method() === 'PUT') {
      try { state = validateTenantState({ ...state, protocolosSalud: req.postDataJSON().changes.protocolosSalud.data }); version++; return json({ moduleVersions: { protocolosSalud: version } }) }
      catch (error) { return json({ error: error.code }, error.status || 409) }
    }
    return json({})
  })
}
async function create(page, name) {
  await page.getByRole('button', { name: 'Gestionar protocolo' }).click()
  const dialog = page.locator('.nk-dialog')
  await dialog.locator('select').first().selectOption('qa-person')
  await dialog.getByRole('textbox').first().fill(name)
  return dialog
}
test('saves two distinct protocols for one person and preserves attachment after reload', async ({ page }) => {
  await backend(page); await page.goto('/app/salud')
  let dialog = await create(page, 'Seguimiento ruido QA')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'QA-evidencia.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 QA') })
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(page.locator('tbody')).toContainText('Seguimiento ruido QA')
  dialog = await create(page, 'Seguimiento altura QA')
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('tbody')).toContainText('Seguimiento ruido QA')
  await expect(page.locator('tbody')).toContainText('Seguimiento altura QA')
  const evidenceLink = page.locator('tbody a[href="/api/files/qa-file"]')
  await expect(evidenceLink).toHaveCount(1)
  const download = page.waitForEvent('download')
  await evidenceLink.click()
  await expect((await download).suggestedFilename()).resolves.toBe('QA-evidencia.pdf')
})
test('shows the historical type and rejects an equivalent current protocol', async ({ page }) => {
  await backend(page, [{ id: 'legacy', trabId: 'qa-person', tipo: 'Hipobaria QA', estado: 'seguimiento' }]); await page.goto('/app/salud')
  await expect(page.locator('tbody')).toContainText('Hipobaria QA')
  const dialog = await create(page, ' hipobaria qa ')
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(dialog).toContainText('Ya existe un protocolo de salud equivalente para esta persona.')
  await expect(page.locator('tbody tr')).toHaveCount(1)
})
