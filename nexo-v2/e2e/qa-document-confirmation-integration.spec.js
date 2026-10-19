import { test, expect } from '@playwright/test'

test('document deletion preserves confirmation, cancel and retry with verified evidence', async ({ page }) => {
  let deletions = 0
  const worker = { id: 'qa', nombre: 'Persona QA', rut: '11.111.111-1', workerItems: [{ id: 'doc', type: 'documento', name: 'Certificado AFP', fileId: '11111111-1111-4111-8111-111111111111', vence: '2030-01-01' }] }
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname
    if (request.method() === 'DELETE') {
      deletions++
      return deletions === 1 ? route.fulfill({ status: 503, json: { error: 'No se pudo eliminar. Intenta nuevamente.' } }) : route.fulfill({ json: { ok: true } })
    }
    if (path === '/api/files/availability') return route.fulfill({ json: { files: [{ fileId: worker.workerItems[0].fileId, availability: 'available' }] } })
    if (path.startsWith('/api/state/records/trabajadores/')) return route.fulfill({ json: { record: worker, revision: 'qa-revision' } })
    return route.fulfill({ json: path === '/api/auth/me' ? { user: { role: 'client_admin' }, tenant: { id: 'qa' } } : path === '/api/settings' ? { settings: {} } : path === '/api/state' ? { state: {}, moduleVersions: {} } : {} })
  })
  await page.goto('/app/trabajadores/qa')
  await page.getByRole('button', { name: 'Documentos y aptitudes', exact: true }).click()
  const remove = page.getByRole('button', { name: 'Eliminar', exact: true })
  await remove.click()
  const dialog = page.getByRole('alertdialog', { name: 'Eliminar documento' })
  await expect(dialog).toContainText('Certificado AFP')
  expect(deletions).toBe(0)
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(remove).toBeFocused()
  expect(deletions).toBe(0)
  await remove.click()
  await dialog.getByRole('button', { name: 'Eliminar documento', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Inténtalo nuevamente')
  expect(deletions).toBe(1)
  await dialog.getByRole('button', { name: 'Eliminar documento', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(remove).toHaveCount(0)
  expect(deletions).toBe(2)
})
