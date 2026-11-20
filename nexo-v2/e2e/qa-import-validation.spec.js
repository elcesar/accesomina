import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'

function json(route, body, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function installApi(page, result) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/data-transfer/import/trabajadores') return json(route, result.current.body, result.current.status)
    if (path === '/api/auth/me') return json(route, { user: { id: 'qa-admin', role: 'client_admin' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json(route, { settings: {} })
    if (path === '/api/state') return json(route, { state: {}, moduleVersions: {} })
    if (path === '/api/subscription') return json(route, {})
    return json(route, {})
  })
}

test('CSV validation shows each supplied cell error, a safe report and the imported count', async ({ page }) => {
  const result = {
    current: {
      status: 400,
      body: {
        error: 'IMPORT_VALIDATION_FAILED',
        persisted: false,
        totalIssues: 2,
        truncated: false,
        issues: [
          { row: 2, column: 'rut', value: '\u00A0\t=1+1', code: 'INVALID_RUT', message: 'El RUT no tiene un dígito verificador válido.', suggestion: 'Corrige el RUT chileno y vuelve a cargar el archivo.' },
          { row: 3, column: 'nombre', value: '', code: 'REQUIRED', message: 'Este dato es obligatorio.', suggestion: 'Completa el valor antes de volver a cargar el archivo.' },
        ],
      },
    },
  }
  await installApi(page, result)
  await page.goto('/app/transferencia')
  await page.locator('input[type="file"]').setInputFiles({ name: 'personas-qa.csv', mimeType: 'text/csv', buffer: Buffer.from('nombre,rut\nQA,=1+1\n,11.111.111-1') })
  await page.getByRole('button', { name: 'Validar e importar' }).click()

  const report = page.getByRole('region', { name: 'Informe de validación' })
  await expect(report).toBeFocused()
  await expect(report.getByRole('table')).toContainText('Fila 2')
  await expect(report.getByRole('table')).toContainText('rut')
  await expect(report.getByRole('table')).toContainText('El RUT no tiene un dígito verificador válido.')
  await expect(report.getByRole('table')).toContainText('Completa el valor antes de volver a cargar el archivo.')
  await expect(page.getByText('No se guardó ningún registro: corrige el archivo y vuelve a validarlo.')).toBeVisible()

  // A retry can return the same number of issues. The report still needs to
  // receive focus so keyboard and screen-reader users hear the new result.
  await page.getByRole('button', { name: 'Validar e importar' }).click()
  await expect(report).toBeFocused()

  const downloadPromise = page.waitForEvent('download')
  await report.getByRole('button', { name: 'Descargar informe de errores' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('informe-validacion-importacion.csv')
  const savedPath = await download.path()
  expect(savedPath).not.toBeNull()
  const csv = await fs.readFile(savedPath, 'utf8')
  expect(csv).toContain("\"'\u00A0\t=1+1\"")

  await page.setViewportSize({ width: 375, height: 760 })
  await expect(report.getByRole('table')).toBeVisible()

  result.current = { status: 200, body: { imported: 2, rows: 2, mode: 'append' } }
  await page.getByRole('button', { name: 'Validar e importar' }).click()
  await expect(page.getByRole('status')).toContainText('Importación completada: se agregaron 2 registros.')
  await expect(page.getByRole('region', { name: 'Informe de validación' })).toHaveCount(0)
})

test('an uncertain import never claims that no records were saved', async ({ page }) => {
  const result = { current: { status: 503, body: { error: 'SERVER_ERROR' } } }
  await installApi(page, result)
  await page.goto('/app/transferencia')
  await page.locator('input[type="file"]').setInputFiles({ name: 'personas-qa.csv', mimeType: 'text/csv', buffer: Buffer.from('nombre,rut\nQA,11.111.111-1') })
  await page.getByRole('button', { name: 'Validar e importar' }).click()
  await expect(page.getByText('No se pudo confirmar si la importación se completó. Revisa los registros antes de volver a intentarlo para evitar duplicados.')).toBeVisible()
  await expect(page.getByText('No se guardó ningún registro: corrige el archivo y vuelve a validarlo.')).toHaveCount(0)
})
