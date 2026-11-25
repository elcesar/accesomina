import { test, expect } from '@playwright/test'

const session = {
  user: { id: 'client-qa-admin', nombre: 'Administradora QA', role: 'client_admin' },
  tenant: { id: 'client-qa-tenant', name: 'Empresa QA' },
  csrfToken: 'client-qa-csrf',
}

test('NK-R01-064: alta de cliente distingue título, acción, unidad y foco inicial', async ({ page }) => {
  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return json(route, session)
    if (path === '/api/state') return json(route, { state: { minas: [], clientes: [], contratos: [], mantenciones: [], proyectos: [], trabajadores: [], asignaciones: [], alertas: [] } })
    if (path === '/api/settings') return json(route, { settings: { branding: {}, modules: {} }, integrations: [] })
    if (path === '/api/subscription') return json(route, { legacy: true, canOperate: true })
    if (path === '/api/subscriptions/admin/access') return json(route, { capabilities: [] })
    return json(route, {})
  })

  await page.goto('/app/clientes/nuevo')
  await expect(page.locator('.nk-client-header h1')).toHaveText('Nuevo cliente')
  await expect(page.getByRole('button', { name: 'Guardar cliente', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toHaveCount(0)
  const nombre = page.getByRole('textbox', { name: 'Nombre o razón social' })
  await expect(nombre).toBeFocused()
  await expect(page.getByText('Altura de operación (msnm)')).toBeVisible()

  await page.goto('/app/clientes')
  await expect(page.locator('.nk-client-header h1')).toHaveText('Clientes')
  await expect(page.getByRole('button', { name: 'Guardar cliente', exact: true })).toHaveCount(0)
})
