import { test, expect } from '@playwright/test'

const allCapabilities = ['read', 'catalog.manage', 'operators.manage', 'policies.manage', 'requests.create', 'requests.review', 'requests.approve', 'requests.reject', 'requests.schedule', 'requests.cancel', 'requests.documents', 'requests.execute', 'services.manage', 'suspensions.suspend', 'suspensions.reactivate']
const readOnlyCapabilities = ['read']
async function fixture(page, { profile = 'SUPER_ADMIN', capped = false, policiesUnavailable = false, nonpayment = false, held = false } = {}) {
  const detailedHold = nonpayment && held ? { id: 'hold-qa', status: 'SUSPENDED_NONPAYMENT', effectiveAt: '2026-11-21T12:00:00.000Z', createdAt: '2026-11-21T12:00:00.000Z', reason: 'Factura vencida QA', billingReference: 'FAC-PRIVADA-QA-001' } : null
  const hold = profile === 'SUPER_ADMIN' ? detailedHold : detailedHold ? { id: detailedHold.id, status: detailedHold.status, effectiveAt: detailedHold.effectiveAt, createdAt: detailedHold.createdAt } : null
  const state = { calls: [], policiesUnavailable, companies: nonpayment ? [{ id: 'company-qa', name: 'Empresa QA', rut: '13.848.379-7', managed: true }] : [], summary: nonpayment ? { legacy: false, managed: true, canOperate: !hold, contract: { id: 'contract-qa', planName: 'La Unión', status: hold ? hold.status : 'ACTIVE', monthlyNetPrice: 1000, currency: 'CLP', startsAt: '2026-11-01T12:00:00.000Z', endsAt: '2026-12-01T12:00:00.000Z', graceEndsAt: '2026-12-31T12:00:00.000Z' }, capacity: { base: 60, additional: 0, total: 60, used: 3, available: 57 }, requests: [], packages: [], separateServices: {}, nonpaymentHold: hold, nonpaymentHolds: hold ? [hold] : [] } : null, operators: [
    { userId: 'self', name: 'Responsable QA', email: 'responsable@ejemplo.test', role: 'domian_admin', active: true, profile: null },
    { userId: 'delegated', name: 'Persona QA', email: 'persona@ejemplo.test', role: 'consulta', active: true, profile: null },
  ], policies: capped ? Array.from({ length: 200 }, (_, index) => ({ id: `cancel-${203 - index}`, kind: 'CANCELLATION', version: 203 - index, status: 'DRAFT', noticeDays: null, retentionDays: null, reference: '', reason: 'Versión histórica QA' })) : [], latestVersions: { CANCELLATION: capped ? 203 : 0, RETENTION: capped ? 7 : 0 } }
  const capabilities = profile === 'SUPER_ADMIN' ? allCapabilities : readOnlyCapabilities
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname, method = request.method()
    const payload = request.postData() && request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : null
    state.calls.push({ path, method, payload })
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return json({ user: { id: 'self', name: 'Responsable QA', role: profile === 'SUPER_ADMIN' ? 'domian_admin' : 'consulta', subscriptionAdminEligible: Boolean(profile), permissions: { modules: {} } }, tenant: { id: 'global-qa', name: 'Nexo QA' }, csrfToken: 'qa-csrf' })
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
    if (path === '/api/subscriptions/admin/companies') return json({ companies: state.companies })
    if (path === '/api/subscriptions/admin/companies/company-qa' && method === 'GET') return json(state.summary || {})
    if (path === '/api/subscriptions/admin/companies/company-qa/nonpayment-suspensions' && method === 'POST') {
      const created = { id: 'hold-qa', status: 'SUSPENDED_NONPAYMENT', effectiveAt: payload.effectiveAt, createdAt: payload.effectiveAt, reason: payload.reason, billingReference: payload.billingReference }
      state.summary = { ...state.summary, canOperate: false, contract: { ...state.summary.contract, status: 'SUSPENDED_NONPAYMENT' }, nonpaymentHold: created, nonpaymentHolds: [created] }
      return json({ hold: created }, 201)
    }
    if (path === '/api/subscriptions/admin/companies/company-qa/nonpayment-suspensions/hold-qa/reactivate' && method === 'POST') {
      const released = { ...(state.summary.nonpaymentHold || {}), status: 'REACTIVATED', releasedAt: '2026-11-21T13:00:00.000Z', reactivationReason: payload.reason, regularizationReference: payload.regularizationReference }
      state.summary = { ...state.summary, canOperate: true, contract: { ...state.summary.contract, status: 'ACTIVE' }, nonpaymentHold: null, nonpaymentHolds: [released] }
      return json({ hold: released })
    }
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


test('suspensión por no pago exige confirmación y reactivación separada en la administración comercial', async ({ page }) => {
  const state = await fixture(page, { nonpayment: true })
  await page.goto('/app/administracion-planes?vista=empresas&empresa=company-qa')
  await expect(page.getByRole('heading', { name: 'Empresa QA', exact: true })).toBeVisible()
  await page.getByText('Suspensión por no pago', { exact: true }).click()
  await page.getByLabel('Motivo de no pago *').fill('Factura vencida QA')
  await page.getByLabel('Referencia de cobranza o factura *').fill('FAC-PRIVADA-QA-001')
  await page.getByRole('button', { name: 'Suspender por no pago', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Los datos, contratos y documentos se conservarán.')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Registrar suspensión', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'suspensión comercial quedó registrada' })).toBeVisible()
  const suspension = state.calls.find(call => call.path.endsWith('/nonpayment-suspensions') && call.method === 'POST')
  expect(suspension.payload).toMatchObject({ reason: 'Factura vencida QA', billingReference: 'FAC-PRIVADA-QA-001', confirmation: 'SUSPENDER' })
  await page.getByLabel('Motivo de reactivación *').fill('Pago confirmado QA')
  await page.getByLabel('Referencia de pago o regularización *').fill('PAGO-QA-001')
  await page.getByRole('button', { name: 'Reactivar suscripción', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('No se extenderá el contrato.')
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar suscripción', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'reactivada sin extender su período' })).toBeVisible()
  const reactivation = state.calls.find(call => call.path.endsWith('/nonpayment-suspensions/hold-qa/reactivate') && call.method === 'POST')
  expect(reactivation.payload).toMatchObject({ reason: 'Pago confirmado QA', regularizationReference: 'PAGO-QA-001', confirmation: 'REACTIVAR' })
})

test('Operaciones sólo consulta el estado de no pago y no las referencias comerciales', async ({ page }) => {
  await fixture(page, { profile: 'OPERATIONS', nonpayment: true, held: true })
  await page.goto('/app/administracion-planes?vista=empresas&empresa=company-qa')
  await page.getByText('Suspensión por no pago', { exact: true }).click()
  await expect(page.getByText('FAC-PRIVADA-QA-001', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Factura vencida QA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Tu perfil sólo puede consultar el estado. La reactivación corresponde al Administrador de Nexo Klar.', { exact: true })).toBeVisible()
})
