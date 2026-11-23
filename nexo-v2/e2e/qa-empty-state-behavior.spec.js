import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const body = path === '/api/auth/me'
      ? { user: { id: 'qa', name: 'Responsable QA', role: 'domian_admin' }, tenant: { id: 'qa-company', name: 'Empresa QA' } }
      : path === '/api/settings' ? { settings: {} }
      : path === '/api/state' ? { state: {}, moduleVersions: {} }
      : path === '/api/users' || path === '/api/work-books/entries' || path === '/api/audit' ? []
      : path === '/api/tenants' ? { tenants: [] } : {}
    return route.fulfill({ json: body })
  })
})

test('clientes diferencia catálogo vacío de resultados filtrados', async ({ page }) => {
  await page.goto('/app/clientes')
  await expect(page.getByText('Todavía no hay clientes registrados.')).toBeVisible()
  await expect(page.getByText('Usa + Cliente en el encabezado para crear el primero.')).toBeVisible()

  await page.route('**/api/state', route => route.fulfill({ json: {
    state: { minas: [{ id: 'qa-client', nombre: 'Cliente QA', estado: 'activo' }] },
    moduleVersions: {},
  } }))
  await page.goto('/app/clientes')
  const search = page.getByRole('textbox', { name: 'Buscar cliente' })
  await search.fill('sin coincidencia')
  await expect(page.getByText('No encontramos resultados con esos criterios.')).toBeVisible()
  await search.fill('')
  await expect(page.getByText('Cliente QA')).toBeVisible()
})

test('convocatoria sin especialidades conserva el borrador y orienta a Personas', async ({ page }) => {
  await page.route('**/api/state', route => route.fulfill({ json: {
    state: {
      trabajadores: [{ id: 'qa-worker', nombre: 'Persona QA', especialidad: '' }],
      callouts: [], mantenciones: [], asignaciones: [], restricted: [],
    },
    moduleVersions: {},
  } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/comunicaciones')
  await page.locator('.nk-comms-header').getByRole('button', { name: 'Nueva comunicación' }).click()
  const title = page.getByPlaceholder('Convocatoria a turno')
  await title.fill('Convocatoria de prueba')
  const area = page.locator('.nk-comms-specialties')
  await expect(area).toContainText('Todavía no hay especialidades registradas.')
  await expect(area).toContainText('Primero registra las especialidades desde Personas')
  await expect(area.getByRole('button')).toHaveCount(0)
  await expect(title).toHaveValue('Convocatoria de prueba')
})
