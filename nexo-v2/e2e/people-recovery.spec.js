import { test, expect } from '@playwright/test'

test('conserva Personas filtradas y recupera relaciones después de un 503 sin recargar', async ({ page }) => {
  const initialState = {
    minas: [{ id: 'qa-client', nombre: 'Cliente inicial QA' }],
    contratos: [],
    restricted: [],
    mantenciones: [{ id: 'qa-order', nombre: 'Orden inicial QA', minaId: 'qa-client', estado: 'activo' }],
    trabajadores: [
      { id: 'qa-person', nombre: 'QA recuperable inicial', rut: '11.111.111-1', tipo: 'permanente', especialidad: 'Mecánico Industrial', disponibilidad: 'disponible', workerItems: [] },
      { id: 'qa-other', nombre: 'QA otra persona', rut: '14.507.215-8', tipo: 'permanente', disponibilidad: 'disponible', workerItems: [] },
    ],
    asignaciones: [{ id: 'qa-assignment', trabId: 'qa-person', mantId: 'qa-order', estado: 'confirmado' }],
  }
  const recoveredState = {
    ...initialState,
    minas: [{ id: 'qa-client', nombre: 'Cliente recuperado QA' }],
    mantenciones: [{ id: 'qa-order', nombre: 'Orden recuperada QA', minaId: 'qa-client', estado: 'activo' }],
    trabajadores: [
      { ...initialState.trabajadores[0], nombre: 'QA recuperable actualizada' },
      initialState.trabajadores[1],
    ],
  }
  let unavailable = false
  let recovered = false

  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') {
      if (unavailable) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'SERVER_ERROR' }) })
      return json({ state: recovered ? recoveredState : initialState, moduleVersions: { trabajadores: 1 } })
    }
    return json({})
  })

  await page.goto('/app/trabajadores')
  const search = page.getByRole('textbox', { name: 'Buscar persona por nombre o RUT' })
  const clientFilter = page.getByLabel('Filtrar por cliente')
  await expect(page.locator('.nk-people-row').filter({ hasText: 'QA recuperable inicial' })).toBeVisible()
  await search.fill('QA recuperable')
  await clientFilter.selectOption('qa-client')
  await expect(page.locator('.nk-people-row')).toHaveCount(1)

  unavailable = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  const failure = page.getByRole('alert')
  await expect(failure).toContainText('El servicio no está disponible temporalmente')
  await expect(page.locator('.nk-people-row').filter({ hasText: 'QA recuperable inicial' })).toBeVisible()
  await expect(search).toHaveValue('QA recuperable')
  await expect(clientFilter).toHaveValue('qa-client')
  await expect(page.getByRole('tab', { name: /Trabajador fijo/ })).toHaveAttribute('aria-selected', 'true')

  unavailable = false
  recovered = true
  await page.getByRole('button', { name: 'Volver a intentar' }).click()
  const refreshed = page.locator('.nk-people-row').filter({ hasText: 'QA recuperable actualizada' })
  await expect(refreshed).toBeVisible()
  await expect(refreshed).toContainText('Cliente recuperado QA')
  await expect(page.locator('.nk-people-row').filter({ hasText: 'QA recuperable inicial' })).toHaveCount(0)
  await expect(search).toHaveValue('QA recuperable')
  await expect(clientFilter).toHaveValue('qa-client')
})
