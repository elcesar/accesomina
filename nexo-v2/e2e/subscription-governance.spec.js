import { test, expect } from '@playwright/test'

const allCapabilities = ['read', 'catalog.manage', 'operators.manage', 'policies.manage', 'requests.create', 'requests.review', 'requests.approve', 'requests.reject', 'requests.schedule', 'requests.cancel', 'requests.documents', 'requests.execute', 'services.manage']
async function fixture(page, { profile = 'SUPER_ADMIN', capped = false, policiesUnavailable = false } = {}) {
  const state = { calls: [], policiesUnavailable, operators: [
    { userId: 'self', name: 'Responsable QA', email: 'responsable@ejemplo.test', role: 'domian_admin', active: true, profile: null },
    { userId: 'delegated', name: 'Persona QA', email: 'persona@ejemplo.test', role: 'consulta', active: true, profile: null },
  ], policies: capped ? Array.from({ length: 200 }, (_, index) => ({ id: `cancel-${203 - index}`, kind: 'CANCELLATION', version: 203 - index, status: 'DRAFT', noticeDays: null, retentionDays: null, reference: '', reason: 'Versión histórica QA' })) : [], latestVersions: { CANCELLATION: capped ? 203 : 0, RETENTION: capped ? 7 : 0 } }
  const capabilities = profile === 'SUPER_ADMIN' ? allCapabilities : ['read', 'commercial', 'requests.review', 'requests.approve', 'requests.documents']
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method()
    const payload = request.postData() && request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : null
    state.calls.push({ path, method, payload })
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return json({ user: { id: 'self', name: 'Responsable QA', role: profile === 'SUPER_ADMIN' ? 'domian_admin' : 'consulta', permissions: { modules: {} } }, tenant: { id: 'global-qa', name: 'Nexo QA' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [], prospectos: [] } })
    if (path === '/api/subscription') return json({ legacy: true, managed: false, canOperate: true, capacity: { base: 15, additional: 0, total: 15, used: 0, available: 15 }, requests: [], packages: [], separateServices: {} })
    if (path === '/api/subscriptions/admin/access') return json({ profile, capabilities })
    if (path === '/api/subscriptions/admin/operators') return json({ operators: state.operators })
    if (path === '/api/subscriptions/admin/operators/delegated' && method === 'PATCH') {
      state.operators[1].profile = payload.profile
      return json(state.operators[1])
    }
    if (path === '/api/subscriptions/admin/policies') {
      if (method === 'GET' && state.policiesUnavailable) return json({ error: 'SERVER_ERROR' }, 503)
      if (method === 'GET') return json({ policies: state.policies, latestVersions: state.latestVersions, current: { cancellation: null, retention: null }, automaticDeletion: false })
      if (payload.expectedVersion !== state.latestVersions[payload.kind]) return json({ error: 'SUBSCRIPTION_POLICY_VERSION_CONFLICT' }, 409)
      const policy = { ...payload, id: `policy-${state.calls.length}`, version: ++state.latestVersions[payload.kind] }
      state.policies.unshift(policy)
      return json({ policy, automaticDeletion: false }, 201)
    }
    if (path === '/api/subscriptions/admin/companies') return json({ companies: [] })
    if (path === '/api/subscriptions/admin/requests') return json({ requests: [], commercialRequests: [] })
    if (path === '/api/subscriptions/admin/catalog') return json({ plans: [], packages: [] })
    return json({})
  })
  return state
}

for (const width of [375, 1440]) {
  test(`perfiles y políticas requieren confirmación y mantienen plazos vacíos a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const state = await fixture(page)
    await page.goto('/app/administracion-planes?vista=gobierno')
    await expect(page.getByRole('heading', { name: 'Permisos y políticas', exact: true })).toBeVisible()
    await page.getByLabel('Usuario existente').selectOption('delegated')
    await page.getByLabel('Motivo del cambio de permisos').fill('Delegación QA autorizada.')
    await page.getByRole('button', { name: 'Guardar permisos', exact: true }).click()
    expect(state.calls.filter(call => call.method === 'PATCH')).toHaveLength(0)
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Permisos de suscripciones actualizados' })).toBeVisible()
    expect(state.operators[1].profile).toBe('COMMERCIAL')
    await expect(page.getByLabel('Días de aviso')).toHaveValue('')
    await page.getByLabel('Motivo de la versión').fill('Borrador sin plazo definido.')
    await page.getByRole('button', { name: 'Guardar versión', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Versión registrada' })).toBeVisible()
    const policyCall = state.calls.find(call => call.path === '/api/subscriptions/admin/policies' && call.method === 'POST')
    expect(policyCall.payload).toMatchObject({ status: 'DRAFT', noticeDays: null, retentionDays: null, automaticDeletion: false, expectedVersion: 0 })
    expect(state.calls.filter(call => call.method === 'DELETE')).toHaveLength(0)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('aprobar política requiere plazo y referencia y guarda la última versión aunque no figure en historial', async ({ page }) => {
  const state = await fixture(page, { capped: true })
  await page.goto('/app/administracion-planes?vista=gobierno')
  await page.getByLabel('Tipo de política').selectOption('RETENTION')
  await page.getByLabel('Estado de la política').selectOption('APPROVED')
  await page.getByLabel('Motivo de la versión').fill('Aprobación QA documentada.')
  await page.getByRole('button', { name: 'Guardar versión', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Para aprobar' })).toBeVisible()
  expect(state.calls.filter(call => call.method === 'POST')).toHaveLength(0)
  await page.getByLabel('Días de retención').fill('45')
  await page.getByLabel('Referencia de aprobación').fill('ACTA-QA-2026')
  await page.getByRole('button', { name: 'Guardar versión', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Versión registrada' })).toBeVisible()
  const call = state.calls.find(item => item.path === '/api/subscriptions/admin/policies' && item.method === 'POST')
  expect(call.payload).toMatchObject({ kind: 'RETENTION', status: 'APPROVED', retentionDays: 45, reference: 'ACTA-QA-2026', automaticDeletion: false, expectedVersion: 7 })
  expect(state.latestVersions.RETENTION).toBe(8)
  expect(state.calls.filter(item => item.method === 'DELETE')).toHaveLength(0)
})

test('Comercial no muestra controles ni consulta operadores o políticas administrativas', async ({ page }) => {
  const state = await fixture(page, { profile: 'COMMERCIAL' })
  await page.goto('/app/administracion-planes?vista=gobierno')
  await expect(page.getByRole('heading', { name: 'Planes y suscripciones', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar permisos', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Guardar versión', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Permisos y políticas', exact: true })).toHaveCount(0)
  expect(state.calls.filter(call => /\/operators|\/policies/.test(call.path))).toHaveLength(0)
})

test('reintentar políticas después de503 recupera versiones y permite guardar sin perder el borrador', async ({ page }) => {
  const state = await fixture(page, { policiesUnavailable: true })
  await page.goto('/app/administracion-planes?vista=gobierno')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar versión', exact: true })).toBeDisabled()
  await page.getByLabel('Tipo de política').selectOption('RETENTION')
  await page.getByLabel('Motivo de la versión').fill('Borrador QA conservado después del error.')
  state.policiesUnavailable = false
  await page.getByRole('button', { name: 'Reintentar perfiles y políticas', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Guardar versión', exact: true })).toBeEnabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Tipo de política')).toHaveValue('RETENTION')
  await expect(page.getByLabel('Motivo de la versión')).toHaveValue('Borrador QA conservado después del error.')
  await expect(page.getByLabel('Días de retención')).toHaveValue('')
  await page.getByRole('button', { name: 'Guardar versión', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Versión registrada' })).toBeVisible()
  const saved = state.calls.find(call => call.path === '/api/subscriptions/admin/policies' && call.method === 'POST')
  expect(saved.payload).toMatchObject({ kind: 'RETENTION', status: 'DRAFT', retentionDays: null, automaticDeletion: false, expectedVersion: 0, reason: 'Borrador QA conservado después del error.' })
})
