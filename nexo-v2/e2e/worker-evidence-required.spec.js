import { test, expect } from '@playwright/test'
import { validateWorkerDocumentAppend } from '../../server/validation.js'

const FILE = '11111111-1111-4111-8111-111111111111'
const BACK = '22222222-2222-4222-8222-222222222222'
const file = name => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('Evidencia ficticia QA') })

async function backend(page, { reject = false, reused = false } = {}) {
  const legacy = { id: 'qa-old', name: 'Currículum vitae QA', type: 'cv', documentType: 'CV', fileId: FILE }
  const worker = { id: 'qa-person', nombre: 'Persona ficticia QA', rut: '13.848.379-7', tipo: 'permanente', mineras: [], workerItems: reused ? [legacy] : [] }
  const state = { trabajadores: [worker], minas: [], contratos: [], mantenciones: [], asignaciones: [], restricted: [] }
  const uploads = [], documents = [], removed = []
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state, moduleVersions: { trabajadores: 1 } })
    if (path === '/api/files' && req.method() === 'POST') {
      const id = uploads.length ? BACK : FILE
      uploads.push(id)
      return json({ id, original_name: 'Evidencia QA.pdf', content_type: 'application/pdf', byte_size: 20, deduplicated: reused })
    }
    if (path.startsWith('/api/files/') && req.method() === 'DELETE') { removed.push(path.split('/').at(-1)); return route.fulfill({ status: 204 }) }
    if (path === '/api/state/workers/qa-person/documents' && req.method() === 'POST') {
      const item = req.postDataJSON().item
      documents.push(item)
      if (reject) return json({ error: 'WORKER_DOCUMENT_FILE_UNAVAILABLE' }, 409)
      try { validateWorkerDocumentAppend(worker, item) } catch (error) { return json({ error: error.code }, 409) }
      worker.workerItems.push(item)
      return json({ item, moduleVersion: 2 }, 201)
    }
    return json({})
  })
  await page.goto('/app/trabajadores/qa-person')
  await page.getByRole('button', { name: 'Documentos y aptitudes', exact: true }).click()
  return { worker, uploads, documents, removed }
}

for (const width of [1440, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    test('a contract cannot be saved without a file and persists after attaching it', async ({ page }) => {
      const api = await backend(page)
      await page.getByLabel('Tipo', { exact: true }).selectOption('EMPLOYMENT_CONTRACT')
      const save = page.getByRole('button', { name: 'Guardar registro', exact: true })
      await expect(save).toBeDisabled()
      await expect(save).toHaveAttribute('aria-describedby', 'worker-document-evidence-hint')
      await expect(page.locator('#worker-document-evidence-hint')).toHaveText('Adjunta el archivo del documento antes de guardar.')
      expect(api.uploads).toHaveLength(0)
      expect(api.documents).toHaveLength(0)
      await page.getByLabel('Archivo', { exact: true }).setInputFiles(file('Contrato QA.pdf'))
      await expect(save).toBeEnabled()
      await save.click()
      await expect(page.getByText('Documentación actualizada', { exact: true })).toBeVisible()
      expect(api.documents).toHaveLength(1)
      expect(api.worker.workerItems[0].fileId).toBe(FILE)
      await page.reload()
      await page.getByRole('button', { name: 'Documentos y aptitudes', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Documentos cargados (1)', exact: true })).toBeVisible()
    })

    test('identity requires both sides and expiry before enabling save', async ({ page }) => {
      const api = await backend(page)
      await page.getByLabel('Tipo', { exact: true }).selectOption('IDENTITY_CARD')
      await page.getByLabel('Nombre / referencia', { exact: true }).fill('Cédula de identidad QA')
      const save = page.getByRole('button', { name: 'Guardar registro', exact: true })
      await page.getByLabel('Archivo anverso', { exact: true }).setInputFiles(file('Anverso QA.pdf'))
      await expect(save).toBeDisabled()
      await page.getByLabel('Archivo reverso', { exact: true }).setInputFiles(file('Reverso QA.pdf'))
      await expect(save).toBeDisabled()
      await page.getByLabel('Fecha de vencimiento obligatoria', { exact: true }).fill('2030-01-01')
      await expect(save).toBeEnabled()
      await save.click()
      await expect(page.getByText('Documentación actualizada', { exact: true })).toBeVisible()
      expect(api.documents[0].files.map(entry => entry.side)).toEqual(['front', 'back'])
      expect(api.documents[0].files.every(entry => !Object.hasOwn(entry, 'deduplicated'))).toBe(true)
    })

    for (const reused of [false, true]) {
      test(`a rejected save ${reused ? 'preserves reused evidence' : 'cleans only the new upload'}`, async ({ page }) => {
        const api = await backend(page, { reject: true, reused })
        await page.getByLabel('Tipo', { exact: true }).selectOption('EMPLOYMENT_CONTRACT')
        await page.getByLabel('Archivo', { exact: true }).setInputFiles(file('Contrato QA.pdf'))
        await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
        await expect(page.getByText('El archivo no está disponible para adjuntarlo. Vuelve a cargarlo.', { exact: true })).toBeVisible()
        expect(api.documents).toHaveLength(1)
        expect(api.removed).toEqual(reused ? [] : [FILE])
        expect(api.worker.workerItems).toHaveLength(reused ? 1 : 0)
        if (reused) expect(api.worker.workerItems[0].fileId).toBe(FILE)
        await expect(page.getByText('Documentación actualizada', { exact: true })).toHaveCount(0)
      })
    }
  })
}
