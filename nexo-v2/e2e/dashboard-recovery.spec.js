import { test, expect } from '@playwright/test'

const session = {
  user: { id: 'dashboard-admin', nombre: 'Administradora QA', role: 'client_admin' },
  tenant: { id: 'dashboard-tenant', name: 'Empresa QA' },
  csrfToken: 'dashboard-qa-csrf',
}

const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

function stateWithWorkers(count) {
  return {
    trabajadores: Array.from({ length: count }, (_, index) => ({ id: 'worker-' + index, nombre: 'Persona QA ' + index })),
    restricted: [],
    mantenciones: [{ id: 'service-qa', nombre: 'Servicio QA', estado: 'activa' }],
    asignaciones: [],
    turnos: [],
    eppDeliveries: [],
  }
}

/**
 * The app mounts under React StrictMode, so its initial effect may request
 * state more than once. Keep that bootstrap phase stable, then explicitly
 * arm the next user-triggered refresh with the failure being exercised.
 */
async function mockDashboardApi(page, { failureStatus, failureWaitFor, retryStatus = 200 }) {
  let phase = 'bootstrap'
  let refreshRequests = 0
  let retryRequests = 0

  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/api/auth/me') return json(session)
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === '/api/subscription') return json({ legacy: true, canOperate: true })
    if (path === '/api/subscriptions/admin/access') return json({ capabilities: [] })
    if (path !== '/api/state') return json({})

    if (phase === 'bootstrap') return json({ state: stateWithWorkers(2), moduleVersions: {} })
    if (phase === 'refresh') {
      phase = 'retry'
      refreshRequests += 1
      if (failureWaitFor) await failureWaitFor
      return json({ error: 'QA_TEMPORARY_FAILURE' }, failureStatus)
    }

    retryRequests += 1
    if (retryStatus >= 500) return json({ error: 'QA_TEMPORARY_FAILURE' }, retryStatus)
    return json({ state: stateWithWorkers(3), moduleVersions: {} })
  })

  return {
    armRefreshFailure: () => { phase = 'refresh' },
    refreshRequests: () => refreshRequests,
    retryRequests: () => retryRequests,
  }
}

const metric = (page, label) => page.locator('.nk-dashboard-metric').filter({ hasText: label })

for (const status of [500, 503]) {
  test('Panel de control: 200 → ' + status + ' → 200 conserva datos y recupera una sola vez', async ({ page }) => {
    const pendingFailure = deferred()
    const api = await mockDashboardApi(page, { failureStatus: status, failureWaitFor: pendingFailure.promise })

    await page.goto('/app')
    await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
    await expect(metric(page, 'Personas registradas')).toContainText('2')
    await expect(page.locator('.nk-dashboard-updated')).toBeVisible()

    const update = page.getByRole('button', { name: 'Actualizar', exact: true })
    api.armRefreshFailure()
    await update.click()
    await expect.poll(() => api.refreshRequests()).toBe(1)
    await expect(update).toBeDisabled()
    const descriptionId = await update.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    await expect(page.locator('[id="' + descriptionId + '"]')).toContainText('Espera mientras se completa la operación')
    const updating = page.locator('.nk-dashboard-updating')
    await expect(updating).toHaveAttribute('role', 'status')
    await expect(updating).toHaveText('Actualizando indicadores…')
    await expect(metric(page, 'Personas registradas')).toContainText('2')

    pendingFailure.resolve()
    const globalAlert = page.locator('.nk-operation-feedback-error')
    await expect(globalAlert).toHaveCount(1)
    await expect(globalAlert).toContainText('Error ' + status)
    await expect(page.locator('.nk-control-feedback')).toHaveCount(0)
    await expect(metric(page, 'Personas registradas')).toContainText('2')

    await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
    await expect.poll(() => api.retryRequests()).toBe(1)
    await expect(globalAlert).toHaveCount(0)
    await expect(page.locator('.nk-control-feedback')).toHaveCount(0)
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
    await expect(metric(page, 'Personas registradas')).toContainText('3')
    await expect(page.locator('.nk-dashboard-updated')).toBeVisible()
    await expect(page.locator('.nk-dashboard-updating')).toHaveCount(0)
    await expect(update).toBeEnabled()
    await expect(page).toHaveURL(/\/app$/)
  })
}

test('Panel de control: 200 → 503 → 503 conserva datos y permite otro intento', async ({ page }) => {
  const api = await mockDashboardApi(page, { failureStatus: 503, retryStatus: 503 })

  await page.goto('/app')
  await expect(metric(page, 'Personas registradas')).toContainText('2')

  const update = page.getByRole('button', { name: 'Actualizar', exact: true })
  api.armRefreshFailure()
  await update.click()
  await expect.poll(() => api.refreshRequests()).toBe(1)
  const globalAlert = page.locator('.nk-operation-feedback-error')
  await expect(globalAlert).toHaveCount(1)
  await expect(metric(page, 'Personas registradas')).toContainText('2')

  const retry = page.getByRole('button', { name: 'Volver a intentar', exact: true })
  await retry.click()
  await expect.poll(() => api.retryRequests()).toBe(1)
  await expect(globalAlert).toHaveCount(1)
  await expect(globalAlert).toContainText('Error 503')
  await expect(retry).toBeEnabled()
  await expect(page.locator('.nk-control-feedback')).toHaveCount(0)
  await expect(metric(page, 'Personas registradas')).toContainText('2')
  await expect(page).toHaveURL(/\/app$/)
})
