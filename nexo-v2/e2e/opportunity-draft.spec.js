import { test, expect } from '@playwright/test'

async function mockPortal(page) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin' }, tenant: { id: 'qa', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state: { prospectos: [], minas: [], contratos: [], trabajadores: [], mantenciones: [] }, moduleVersions: { prospectos: 1 } })
    return json({})
  })
}

for (const width of [1440, 375]) {
  test(`opportunity draft is protected and labels email at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await mockPortal(page)
    await page.goto('/app/oportunidades')
    await page.getByRole('button', { name: 'Nueva oportunidad', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Nueva oportunidad', exact: true })
    const email = dialog.getByLabel('Correo electrónico', { exact: true })
    const phone = dialog.getByLabel('Teléfono', { exact: true })
    await expect(email).toBeVisible()
    await expect(dialog.locator('#opportunity-email + .nk-field-error')).toHaveCount(0)
    if (width >= 768) {
      const [emailBox, phoneBox] = await Promise.all([email.boundingBox(), phone.boundingBox()])
      expect(Math.abs((emailBox?.y || 0) - (phoneBox?.y || 0))).toBeLessThan(2)
    }
    await dialog.getByLabel('Empresa', { exact: true }).fill('Oportunidad de borrador QA')
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
    const confirm = page.getByRole('alertdialog', { name: 'Descartar cambios sin guardar', exact: true })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Seguir editando', exact: true }).click()
    await expect(dialog.getByLabel('Empresa', { exact: true })).toHaveValue('Oportunidad de borrador QA')
    await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click()
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Descartar cambios', exact: true }).click()
    await expect(dialog).toHaveCount(0)

    await page.getByRole('button', { name: 'Nueva oportunidad', exact: true }).click()
    await page.getByRole('dialog', { name: 'Nueva oportunidad', exact: true }).getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect(page.getByRole('alertdialog', { name: 'Descartar cambios sin guardar', exact: true })).toHaveCount(0)
  })
}
