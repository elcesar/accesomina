import { test, expect } from '@playwright/test'

const session = {
  user: { id: 'settings-admin', nombre: 'Administradora QA', role: 'client_admin' },
  tenant: { id: 'settings-tenant', name: 'Empresa QA' },
  csrfToken: 'settings-qa-csrf',
}

const settings = {
  branding: { displayName: 'Empresa QA', theme: 'light', logoUrl: '' },
  modules: {},
  alerts: { warningDays: 30, criticalDays: 7 },
  catalogs: { specialties: ['Mecánico Industrial'], operationalTimeZone: 'America/Santiago' },
}

const integrations = [
  { provider: 'smtp', enabled: false, public_config: {}, configured: false },
  { provider: 'whatsapp', enabled: false, public_config: {}, configured: false },
  { provider: 'signature', enabled: false, public_config: {}, configured: false },
]

const user = {
  id: 'settings-user',
  full_name: 'Consulta QA',
  email: 'consulta@ejemplo.test',
  role: 'consulta',
  active: true,
  permissions: { modules: {} },
}

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

async function mockSettingsApi(page, outcomes = {}) {
  const calls = []
  const queues = {
    settings: [...(outcomes.settings || [])],
    integrations: [...(outcomes.integrations || [])],
    views: [...(outcomes.views || [])],
  }
  const next = (key, fallback) => queues[key].shift() || fallback
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      if (path === '/api/auth/me') return json(route, session)
      if (path === '/api/settings') return json(route, { settings, integrations })
      if (path === '/api/users') return json(route, [user])
      if (path === '/api/subscription') return json(route, { legacy: true, canOperate: true })
      if (path === '/api/subscriptions/admin/access') return json(route, { capabilities: [] })
      return json(route, {})
    }

    calls.push({ method: request.method(), path, body: request.postDataJSON() })
    const key = path === '/api/settings'
      ? 'settings'
      : path.startsWith('/api/settings/integrations/')
        ? 'integrations'
        : path === `/api/users/${user.id}`
          ? 'views'
          : ''
    const fallback = key === 'settings'
      ? { status: 200, body: settings }
      : key === 'integrations'
        ? { status: 200, body: { enabled: false, public_config: {}, configured: false } }
        : { status: 200, body: user }
    const outcome = next(key, fallback)
    if (outcome.waitFor) await outcome.waitFor
    return json(route, outcome.body, outcome.status)
  })

  return { calls }
}

const localFeedback = page => page.locator('.nk-form-message')
const globalFeedback = page => page.locator('.nk-operation-feedback')

test('Configuración muestra una sola confirmación local y conserva sólo el error ante fallo', async ({ page }) => {
  const api = await mockSettingsApi(page, {
    settings: [
      { status: 200, body: settings },
      { status: 500, body: { error: 'SERVER_ERROR' } },
    ],
  })

  await page.goto('/app/configuracion')
  const save = page.getByRole('button', { name: 'Guardar configuración', exact: true })
  await expect(save).toBeEnabled()

  await save.click()
  await expect(localFeedback(page)).toHaveCount(1)
  await expect(localFeedback(page)).toHaveAttribute('role', 'status')
  await expect(localFeedback(page)).toContainText('Configuración guardada correctamente.')
  await expect(globalFeedback(page)).toHaveCount(0)
  expect(api.calls.filter(call => call.path === '/api/settings')).toHaveLength(1)

  await save.click()
  await expect(localFeedback(page)).toHaveCount(1)
  await expect(localFeedback(page)).toHaveAttribute('role', 'alert')
  await expect(localFeedback(page)).toContainText('Ocurrió un problema')
  await expect(localFeedback(page)).not.toContainText('Configuración guardada correctamente.')
  await expect(globalFeedback(page)).toHaveCount(0)
  expect(api.calls.filter(call => call.path === '/api/settings')).toHaveLength(2)
})

test('Integraciones y vistas por persona muestran feedback local correcto en éxito y error', async ({ page }) => {
  const api = await mockSettingsApi(page, {
    integrations: [
      { status: 200, body: { enabled: false, public_config: {}, configured: false } },
      { status: 500, body: { error: 'SERVER_ERROR' } },
    ],
    views: [
      { status: 200, body: user },
      { status: 500, body: { error: 'SERVER_ERROR' } },
    ],
  })

  await page.goto('/app/configuracion')
  await expect(page.getByRole('button', { name: 'Guardar correo', exact: true })).toBeEnabled()

  await page.getByRole('button', { name: 'Guardar correo', exact: true }).click()
  await expect(localFeedback(page)).toHaveAttribute('role', 'status')
  await expect(localFeedback(page)).toContainText('Integración de correo guardada.')
  await expect(globalFeedback(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Guardar WhatsApp', exact: true }).click()
  await expect(localFeedback(page)).toHaveAttribute('role', 'alert')
  await expect(localFeedback(page)).toContainText('Ocurrió un problema')
  await expect(localFeedback(page)).not.toContainText('Integración de correo guardada.')
  await expect(globalFeedback(page)).toHaveCount(0)

  const saveViews = page.getByRole('button', { name: 'Guardar vistas', exact: true })
  await expect(saveViews).toBeEnabled()
  await saveViews.click()
  await expect(localFeedback(page)).toHaveAttribute('role', 'status')
  await expect(localFeedback(page)).toContainText('Vistas guardadas para Consulta QA.')
  await expect(globalFeedback(page)).toHaveCount(0)

  await saveViews.click()
  await expect(localFeedback(page)).toHaveAttribute('role', 'alert')
  await expect(localFeedback(page)).toContainText('Ocurrió un problema')
  await expect(localFeedback(page)).not.toContainText('Vistas guardadas para Consulta QA.')
  await expect(globalFeedback(page)).toHaveCount(0)

  expect(api.calls.filter(call => call.path.startsWith('/api/settings/integrations/'))).toHaveLength(2)
  expect(api.calls.filter(call => call.path === `/api/users/${user.id}`)).toHaveLength(2)
})

test('Guardar bloquea acciones concurrentes e informa el motivo mientras espera', async ({ page }) => {
  const pendingSave = deferred()
  const api = await mockSettingsApi(page, {
    settings: [{ status: 200, body: settings, waitFor: pendingSave.promise }],
  })

  await page.goto('/app/configuracion')
  await expect(page.getByRole('button', { name: 'Guardar configuración', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Guardar configuración', exact: true }).click()
  await expect.poll(() => api.calls.filter(call => call.path === '/api/settings').length).toBe(1)

  const savingButton = page.locator('.nk-config-header-actions .nk-button-primary')
  await expect(savingButton).toBeDisabled()
  const descriptionId = await savingButton.getAttribute('aria-describedby')
  expect(descriptionId).toBeTruthy()
  await expect(page.locator(`[id="${descriptionId}"]`)).toContainText('Esta operación se está guardando')
  await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Guardar correo', exact: true })).toBeDisabled()

  pendingSave.resolve()
  await expect(localFeedback(page)).toHaveAttribute('role', 'status')
  await expect(page.getByRole('button', { name: 'Guardar configuración', exact: true })).toBeEnabled()
})
