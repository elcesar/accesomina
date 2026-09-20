import { test, expect } from '@playwright/test'

const clientAdmin = { user: { id: 'u-admin', nombre: 'Cliente QA', role: 'client_admin' }, tenant: { id: 'tenant-qa', name: 'Empresa QA' }, csrfToken: 'qa-csrf-token' }
const readOnlyUser = { ...clientAdmin, user: { id: 'u-readonly', nombre: 'Consulta QA', role: 'consulta' } }

function initialState() {
  return { minas: [{ id: 'cliente-qa', nombre: 'Cliente QA', mandante: 'Mandante QA', estado: 'activo' }], contratos: [{ id: 'contrato-qa', numero: 'CTR-QA-001', nombre: 'Contrato QA', minaId: 'cliente-qa', estado: 'vigente' }], mantenciones: [], trabajadores: [], asignaciones: [], restricted: [], eppDeliveries: [] }
}

async function mockApi(page, { session = clientAdmin, signedIn = true } = {}) {
  let state = initialState()
  const versions = new Proxy({}, { get: () => 1 })
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname.replace('/api', '')
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/auth/me') return signedIn ? json(session) : route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'AUTH_REQUIRED' }) })
    if (path === '/auth/login' && request.method() === 'POST') return json(clientAdmin)
    if (path === '/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === '/state' && request.method() === 'GET') return json({ state, moduleVersions: versions })
    if (path === '/state/modules' && request.method() === 'PUT') {
      for (const [module, change] of Object.entries(request.postDataJSON()?.changes || {})) state = { ...state, [module]: change.data }
      return json({ moduleVersions: versions })
    }
    if (path === '/files' && request.method() === 'POST') return json({ id: 'file-qa', original_name: 'respaldo-qa.pdf', content_type: 'application/pdf', byte_size: 24, created_at: new Date().toISOString() })
    return json({})
  })
}

test('la navegación pública muestra una sección distinta por opción', async ({ page }) => {
  await mockApi(page, { signedIn: false }); await page.goto('/')
  await expect(page.getByRole('heading', { name: /Convierte información dispersa/i })).toBeVisible()
  await page.getByRole('button', { name: 'Plataforma' }).click(); await expect(page.getByRole('heading', { name: /De la oportunidad al servicio cerrado/i })).toBeVisible()
  await page.getByRole('button', { name: 'Propósito' }).click(); await expect(page.getByRole('heading', { name: /Información clara que permanece/i })).toBeVisible()
})

test('un cliente puede iniciar sesión y llegar al panel de control', async ({ page }) => {
  await mockApi(page, { signedIn: false }); await page.goto('/login')
  await page.locator('input[name="rut"]').fill('76.123.456-7'); await page.locator('input[name="email"]').fill('cliente@empresa.cl'); await page.locator('input[name="password"]').fill('ClaveSegura123')
  await page.getByRole('button', { name: 'Ingresar' }).click(); await expect(page).toHaveURL(/\/app$/); await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
})

test('un Client Admin puede crear un cliente desde la ficha comercial', async ({ page }) => {
  await mockApi(page); await page.goto('/app/clientes/nuevo'); const fields = page.locator('.nk-client-form-grid')
  await fields.locator('input').nth(0).fill('Minera Automatizada QA'); await fields.locator('input').nth(1).fill('Mandante QA'); await fields.locator('input').nth(2).fill('76.345.678-5')
  await fields.locator('select').nth(1).selectOption({ label: 'Antofagasta' }); await fields.locator('select').nth(2).selectOption({ label: 'Antofagasta' }); await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('heading', { name: 'Minera Automatizada QA', level: 2 })).toBeVisible()
})

test('un Client Admin puede crear contrato y orden vinculados al cliente', async ({ page }) => {
  await mockApi(page); await page.goto('/app/contratos/nuevo?clienteId=cliente-qa'); const contract = page.locator('.nk-contract-form-grid')
  await contract.locator('input').nth(0).fill('CTR-QA-002'); await contract.locator('input').nth(1).fill('Contrato automatizado'); await contract.locator('select').nth(1).selectOption('cliente-qa'); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.getByRole('heading', { name: 'Contrato automatizado' })).toBeVisible()
  await page.goto('/app/servicios/nuevo?clienteId=cliente-qa'); const order = page.locator('.nk-orders-form-grid')
  await order.locator('input').nth(1).fill('OS automatizada'); await order.locator('select').nth(1).selectOption('cliente-qa'); await page.getByRole('button', { name: 'Guardar cambios' }).click(); await expect(page.getByRole('heading', { name: 'OS automatizada' })).toBeVisible()
})

test('un Client Admin puede adjuntar un documento contractual', async ({ page }) => {
  await mockApi(page); await page.goto('/app/contratos/contrato-qa')
  await page.locator('input[type="file"]').setInputFiles({ name: 'respaldo-qa.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 QA') })
  await expect(page.getByText('Documento cargado. Guarda los cambios para vincularlo definitivamente al contrato.')).toBeVisible(); await expect(page.getByText('respaldo-qa.pdf')).toBeVisible()
})

test('un usuario de consulta no recibe acciones de edición contractual', async ({ page }) => {
  await mockApi(page, { session: readOnlyUser }); await page.goto('/app/contratos/contrato-qa')
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0); await expect(page.getByRole('button', { name: /Adjuntar documento/i })).toHaveCount(0)
})
