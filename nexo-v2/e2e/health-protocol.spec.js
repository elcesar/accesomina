import { test, expect } from '@playwright/test'
import { validateTenantState } from '../../server/validation.js'

async function backend(page, { protocols = [], fileStatus = 200 } = {}) {
  let state = {
    trabajadores: [{ id: 'qa-person', nombre: 'Persona QA', rut: '11.111.111-1' }],
    minas: [{ id: 'qa-client', nombre: 'Cliente QA' }],
    protocolosSalud: protocols,
  }
  let version = 1
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Responsable QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'fixture-qa' })
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state, moduleVersions: { protocolosSalud: version } })
    if (path === '/api/files/qa-file') {
      if (fileStatus !== 200) return json({ error: fileStatus === 403 ? 'FORBIDDEN' : 'NOT_FOUND' }, fileStatus)
      return route.fulfill({ status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="QA-evidencia.pdf"' }, body: '%PDF-1.4 QA' })
    }
    if (path === '/api/files') return json({ id: 'qa-file', original_name: 'QA-evidencia.pdf', content_type: 'application/pdf', byte_size: 100 })
    if (path === '/api/state/modules' && req.method() === 'PUT') {
      try {
        state = validateTenantState({ ...state, protocolosSalud: req.postDataJSON().changes.protocolosSalud.data })
        version++
        return json({ moduleVersions: { protocolosSalud: version } })
      } catch (error) {
        return json({ error: error.code }, error.status || 409)
      }
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

test('records a renewal as a separate evaluation and identifies the earlier evaluation as historical', async ({ page }) => {
  await backend(page)
  await page.goto('/app/salud')
  let dialog = await create(page, 'Seguimiento ruido QA')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'QA-evidencia.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 QA') })
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(page.locator('tbody')).toContainText('Seguimiento ruido QA')

  dialog = await create(page, 'Seguimiento ruido QA')
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.locator('tbody')).toContainText('Histórico')

  const evidenceButton = page.getByRole('button', { name: 'Descargar evidencia de Seguimiento ruido QA' }).first()
  const download = page.waitForEvent('download')
  await evidenceButton.click()
  expect((await download).suggestedFilename()).toBe('QA-evidencia.pdf')
})

test('requires a client when the evaluation is explicitly client-scoped', async ({ page }) => {
  await backend(page)
  await page.goto('/app/salud')
  const dialog = await create(page, 'Hipobaria QA')
  await dialog.getByLabel('Alcance').selectOption('cliente')
  await dialog.getByRole('button', { name: 'Guardar protocolo' }).click()
  await expect(dialog).toContainText('Selecciona el cliente al que aplica este protocolo.')
})

for (const [fileStatus, message] of [[404, 'La evidencia ya no está disponible.'], [403, 'No tienes permisos para descargar esta evidencia.']]) {
  test('makes unavailable evidence visible for HTTP ' + fileStatus, async ({ page }) => {
    await backend(page, {
      fileStatus,
      protocols: [{ id: 'stored', workerId: 'qa-person', protocolo: 'Ruido QA', estado: 'cerrado', fileId: 'qa-file', fileName: 'QA-evidencia.pdf', evaluatedOn: '2026-10-14' }],
    })
    await page.goto('/app/salud')
    await page.getByRole('button', { name: 'Descargar evidencia de Ruido QA' }).click()
    await expect(page.locator('.nk-compliance-feedback.error')).toContainText(message)
    await expect(page.locator('tbody')).toContainText('Evidencia no disponible')
  })
}
