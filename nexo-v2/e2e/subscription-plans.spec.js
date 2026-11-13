import { test, expect } from '@playwright/test'

const fixtureCatalog = () => ({
  plans: [
    { code: 'FREE', name: 'Free', workerLimit: 15, monthlyPrice: 0, isFree: true, trialMonths: 6 },
    { code: 'LA_UNION', name: 'La Unión', workerLimit: 60, monthlyPrice: 1000 },
    { code: 'PURRANQUE', name: 'Purranque', workerLimit: 180, monthlyPrice: 2000, recommended: true },
    { code: 'FRUTILLAR', name: 'Frutillar', workerLimit: 360, monthlyPrice: 3000 },
    { code: 'PUERTO_OCTAY', name: 'Puerto Octay', workerLimit: 720, monthlyPrice: 4000 },
  ].map(plan => ({ ...plan, versionId: `${plan.code}-v1`, currency: 'CLP', taxRate: .19, status: 'PUBLISHED' })),
  packages: [
    { code: 'EXTRA_100', name: '100 trabajadores adicionales', workersQuantity: 100, monthlyPrice: 50000 },
    { code: 'EXTRA_200', name: '200 trabajadores adicionales', workersQuantity: 200, monthlyPrice: 100000 },
    { code: 'EXTRA_500', name: '500 trabajadores adicionales', workersQuantity: 500, monthlyPrice: 300000 },
  ].map(pack => ({ ...pack, versionId: `${pack.code}-v1`, currency: 'CLP', taxRate: .19, repeatable: false, stackable: true, maxQuantity: 1, status: 'PUBLISHED' })),
})
const fixtureSummary = ({ code = 'LA_UNION', status = 'ACTIVE', legacy = false, used = 12 } = {}) => {
  const plan = fixtureCatalog().plans.find(item => item.code === code)
  return { legacy, managed: !legacy, canOperate: legacy || status !== 'SUSPENDED', freeEligible: !legacy, daysRemaining: code === 'FREE' ? 120 : null, contract: legacy ? null : { id: 'contract-qa', planCode: plan.code, planName: plan.name, status, workerLimit: plan.workerLimit, monthlyNetPrice: plan.monthlyPrice, currency: 'CLP', startsAt: '2026-11-05T10:00:00Z', endsAt: code === 'FREE' ? '2027-05-05T10:00:00Z' : '2026-12-05T10:00:00Z' }, capacity: { base: plan.workerLimit, additional: 0, total: plan.workerLimit, used, available: plan.workerLimit - used, overCapacity: 0 }, packages: [], requests: [], separateServices: { libroObra: { enabled: false }, oportunidades: { enabled: false } } }
}
async function fixture(page, { role = null, summary = fixtureSummary(), stalePrice = false } = {}) {
  const state = { catalog: fixtureCatalog(), summary, requests: [], commercial: [], calls: [], uploads: 0 }
  const company = { id: 'company-qa', name: 'Empresa de pruebas QA', rut: '11.111.111-1', managed: !summary.legacy }
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    const method = request.method(); const payload = request.postData() && request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : null
    state.calls.push({ path, method, payload })
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return role ? json({ user: { id: 'user-qa', name: 'Persona QA', email: 'persona@ejemplo.test', role, permissions: { modules: {} } }, tenant: { id: 'company-qa', name: company.name }, csrfToken: 'qa-csrf' }) : json({ error: 'AUTH_REQUIRED' }, 401)
    if (path === '/api/auth/config') return json({ registrationEnabled: false, registrationTermsVersion: '2026-11-05' })
    if (path === '/api/subscriptions/admin/access') return role === 'domian_admin' ? json({ profile: 'SUPER_ADMIN', capabilities: ['read', 'catalog.manage', 'requests.create', 'requests.review', 'requests.approve', 'requests.reject', 'requests.schedule', 'requests.cancel', 'requests.documents', 'requests.execute', 'services.manage', 'operators.manage', 'policies.manage'] }) : json({ error: 'FORBIDDEN' }, 403)
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [], prospectos: [] } })
    if (path === '/api/plans') return json(state.catalog)
    if (path === '/api/plans/recommend') return json({ planCode: 'PUERTO_OCTAY', workers: payload.workers, baseCapacity: 720, packages: [{ code: 'EXTRA_200', quantity: 1, workersQuantity: 200, monthlyPrice: 100000 }], totalCapacity: 920, available: 70, monthlyNetPrice: 104000, currency: 'CLP' })
    if (path === '/api/commercial-requests') {
      if (stalePrice && !state.commercial.length) { stalePrice = false; const plan = state.catalog.plans.find(item => item.code === 'PURRANQUE'); plan.monthlyPrice = 2500; plan.versionId = 'PURRANQUE-v2'; return json({ error: 'SUBSCRIPTION_OFFER_CHANGED' }, 409) }
      state.commercial.push(payload); return json({ requestId: 'public-request-qa' }, 201)
    }
    if (path === '/api/subscription') return json(state.summary)
    if (path === '/api/subscription/requests') { state.summary.requests.push({ id: 'request-qa', ...payload, status: 'REQUESTED', createdAt: '2026-11-05T10:00:00Z' }); return json({ request: state.summary.requests.at(-1) }, 201) }
    if (path === '/api/subscriptions/admin/catalog') {
      if (method === 'GET') return json(state.catalog)
      const records = payload.kind === 'plan' ? state.catalog.plans : state.catalog.packages
      const record = records.find(item => item.code === payload.code); Object.assign(record, payload, { versionId: `${payload.code}-v2`, status: payload.action === 'publish' ? 'PUBLISHED' : 'DRAFT' }); return json(record, 201)
    }
    if (path === '/api/subscriptions/admin/companies') return json({ companies: [company] })
    if (path === '/api/subscriptions/admin/requests') return json({ requests: state.summary.requests, commercialRequests: state.commercial })
    if (path === '/api/subscriptions/admin/companies/company-qa') return json(state.summary)
    if (path === '/api/subscriptions/admin/companies/company-qa/requests' && method === 'POST') { state.summary.requests.push({ id: 'request-qa', ...payload, status: 'REQUESTED' }); return json({ request: state.summary.requests.at(-1) }, 201) }
    if (path === '/api/subscriptions/admin/companies/company-qa/documents') { state.uploads++; return json({ id: `file-qa-${state.uploads}`, original_name: 'Documento QA.pdf' }, 201) }
    if (/\/api\/subscriptions\/admin\/companies\/company-qa\/requests\//.test(path)) {
      const item = state.summary.requests.find(row => row.id === path.split('/').at(-1)); Object.assign(item, { documents: payload.documents, effectiveAt: payload.effectiveAt, status: ({ review: 'UNDER_REVIEW', approve: 'APPROVED', schedule: 'SCHEDULED', execute: 'EXECUTED', reject: 'REJECTED', cancel: 'CANCELLED' })[payload.action] || item.status }); return json({ request: item })
    }
    if (path === '/api/subscriptions/admin/companies/company-qa/services') { state.summary.separateServices = payload.services; return json({ services: payload.services }) }
    return json({})
  })
  return state
}
async function fillCommercial(page) {
  for (const [field, value] of Object.entries({ companyName: 'Empresa QA Planes', rut: '11.111.111-1', contactName: 'Persona', contactLastName: 'Ficticia', email: 'qa@ejemplo.test', phone: '+56912345678', workers: '137' })) await page.locator(`#commercial-${field}`).fill(value)
  await page.locator('#commercial-acceptedTerms').check()
}

for (const width of [375, 768, 1024, 1440]) {
  test(`planes públicos, formulario y recomendador a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const state = await fixture(page)
    await page.goto('/planes')
    await expect(page.getByRole('heading', { name: 'Un plan para cada etapa de tu empresa' })).toBeVisible()
    await expect(page.locator('[data-plan-code]')).toHaveCount(5)
    await expect(page.locator('[data-plan-code=FREE]')).toContainText('6 meses calendario')
    await expect(page.locator('[data-plan-code=LA_UNION]')).toContainText('1.000')
    await expect(page.getByText('El registro de nuevas empresas requiere una invitación')).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Solicitar Purranque', exact: true }).click()
    await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
    await expect(page.locator('#commercial-companyName')).toBeFocused()
    await expect(page.locator('#commercial-email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#commercial-rut-error')).toBeVisible()
    await fillCommercial(page)
    await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
    await expect(page.getByText('Hemos recibido tu solicitud. Nuestro equipo revisará')).toBeVisible()
    expect(state.commercial).toHaveLength(1)
    expect(state.commercial[0]).toMatchObject({ planCode: 'PURRANQUE', workers: 137, versionId: 'PURRANQUE-v1', displayedMonthlyNetPrice: 2000, acceptedTerms: true })
    await page.locator('#plans-workers').fill('850')
    await page.getByRole('button', { name: 'Recomendar plan' }).click()
    await expect(page.locator('.nk-plan-recommendation')).toContainText('920 cupos')
    await expect(page.locator('.nk-plan-recommendation')).toContainText('70 disponibles')
    await page.getByRole('button', { name: 'Solicitar esta selección' }).click()
    await expect(page.locator('#plan-request-title')).toHaveText('Solicitar plan Puerto Octay')
    await expect(page.getByLabel('Cantidad de 200 trabajadores adicionales')).toHaveValue('1')
    await expect(page.locator('.nk-plan-request .nk-plan-total')).toContainText('104.000')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('una oferta modificada requiere revisión y segundo envío explícito', async ({ page }) => {
  const state = await fixture(page, { stalePrice: true })
  await page.goto('/planes')
  await page.getByRole('button', { name: 'Solicitar Purranque', exact: true }).click()
  await fillCommercial(page)
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'La oferta cambió' })).toBeVisible()
  expect(state.calls.filter(item => item.path === '/api/commercial-requests')).toHaveLength(1)
  expect(state.commercial).toHaveLength(0)
  await expect(page.locator('.nk-plan-request .nk-plan-total')).toContainText('2.500')
  await expect(page.locator('#commercial-companyName')).toHaveValue('Empresa QA Planes')
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  await expect(page.getByText('Hemos recibido tu solicitud. Nuestro equipo revisará')).toBeVisible()
  expect(state.commercial[0]).toMatchObject({ versionId: 'PURRANQUE-v2', displayedMonthlyNetPrice: 2500 })
})

test('empresa existente conserva condiciones y puede solicitar sin inventar Free', async ({ page }) => {
  const state = await fixture(page, { role: 'client_admin', summary: fixtureSummary({ legacy: true }) })
  await page.goto('/app/mi-plan')
  await expect(page.getByRole('heading', { name: 'Condiciones actuales' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Fin de gratuidad', { exact: true })).toHaveCount(0)
  await page.locator('#subscription-request-plan').selectOption('PURRANQUE')
  await page.locator('#subscription-request-reason').fill('Ampliar la dotación QA autorizada.')
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  await expect(page.getByText('Solicitud registrada. Nexo Klar revisará')).toBeVisible()
  expect(state.summary.requests[0]).toMatchObject({ type: 'UPGRADE', planCode: 'PURRANQUE', status: 'REQUESTED' })
})

test('aviso Free aparece una vez por acceso y no se repite al navegar o recargar', async ({ page }) => {
  await fixture(page, { role: 'client_admin', summary: fixtureSummary({ code: 'FREE' }) })
  await page.goto('/app')
  await expect(page.getByRole('dialog', { name: 'Estás utilizando el Plan Free de Nexo Klar' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('link', { name: 'Ver mi plan', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mi plan Nexo Klar', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('Fin de gratuidad', { exact: true })).toBeVisible()
})

test('suspensión mantiene Mi plan accesible y no salta por rutas directas', async ({ page }) => {
  await fixture(page, { role: 'client_admin', summary: fixtureSummary({ status: 'SUSPENDED' }) })
  await page.goto('/app/trabajadores')
  await expect(page.getByRole('heading', { name: 'Tu plan requiere renovación' })).toBeVisible()
  await page.getByRole('link', { name: 'Ir a Mi plan' }).click()
  await expect(page.getByRole('heading', { name: 'Mi plan Nexo Klar', exact: true })).toBeVisible()
  await page.goto('/app/administracion-planes')
  await expect(page.getByRole('heading', { name: 'Acceso reservado a Nexo Klar' })).toBeVisible()
})

test('una contratación independiente conserva acceso con principal suspendido', async ({ page }) => {
  const summary = fixtureSummary({ status: 'SUSPENDED' }); summary.separateServices.oportunidades = { enabled: true, reference: 'ACUERDO-QA', endsAt: '2099-01-01T00:00:00Z' }
  await fixture(page, { role: 'client_admin', summary })
  await page.goto('/app/oportunidades')
  await expect(page.getByRole('heading', { name: 'Tu plan requiere renovación' })).toHaveCount(0)
  await expect(page.locator('main')).toContainText('Oportunidades')
  await page.goto('/app/libro-obra')
  await expect(page.getByRole('heading', { name: 'Este servicio requiere contratación independiente' })).toBeVisible()
})

test('usuario operativo consulta su estado sin solicitar ni administrar planes', async ({ page }) => {
  await fixture(page, { role: 'consulta' })
  await page.goto('/app/mi-plan')
  await expect(page.getByRole('heading', { name: 'Mi plan Nexo Klar', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar solicitud', exact: true })).toHaveCount(0)
  await page.goto('/app/administracion-planes')
  await expect(page.getByRole('heading', { name: 'Acceso reservado a Nexo Klar' })).toBeVisible()
})

test('administración publica versión sin reescribir contrato y valida documentación completa', async ({ page }) => {
  const summary = fixtureSummary({ code: 'PURRANQUE', used: 45 })
  summary.requests = [{ id: 'request-qa', tenantId: 'company-qa', type: 'DOWNGRADE', planCode: 'LA_UNION', status: 'APPROVED', reason: 'Ajustar dotación QA', documents: {} }]
  const state = await fixture(page, { role: 'domian_admin', summary })
  await page.goto('/app/administracion-planes?vista=catalogo')
  await page.getByRole('button', { name: 'Editar Purranque', exact: true }).click()
  await page.getByLabel('Precio mensual neto CLP').fill('2500')
  await page.getByRole('button', { name: 'Publicar versión', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar versión', exact: true }).click()
  await expect(page.getByText('Nueva versión publicada. Las ofertas vigentes se actualizan')).toBeVisible()
  expect(state.summary.contract.monthlyNetPrice).toBe(2000)
  await page.goto('/app/administracion-planes?empresa=company-qa')
  await expect(page.getByRole('heading', { name: 'Empresa de pruebas QA', exact: true })).toBeVisible()
  await page.locator('#request-request-qa-reason').fill('Programación QA aprobada.')
  await page.getByRole('button', { name: 'Programar', exact: true }).click()
  await expect(page.locator('#request-request-qa-quote-number')).toBeFocused()
  expect(state.calls.filter(item => item.method === 'PATCH')).toHaveLength(0)
  for (const kind of ['quote', 'purchaseOrder', 'invoice']) {
    await page.locator(`#request-request-qa-${kind}-number`).fill(`${kind}-QA-001`)
    await page.locator(`#request-request-qa-${kind}-netAmount`).fill('1000')
    await page.locator(`#request-request-qa-${kind}-issuedAt`).fill('2026-11-05')
    await page.locator(`#request-request-qa-${kind}-status`).selectOption(kind === 'quote' ? 'ACCEPTED' : 'ISSUED')
    await page.locator(`#request-request-qa-${kind}-responsible`).fill('Responsable QA')
    await page.locator(`#request-request-qa-${kind}-file`).setInputFiles({ name: 'Documento QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocumento ficticio QA') })
    await expect.poll(() => state.uploads).toBe(['quote', 'purchaseOrder', 'invoice'].indexOf(kind) + 1)
  }
  await page.locator('#request-request-qa-quote-acceptedAt').fill('2026-11-05T10:00')
  await page.locator('#request-request-qa-effectiveAt').fill('2026-12-05T10:00')
  await page.getByRole('button', { name: 'Programar', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Programar', exact: true }).click()
  await expect(page.getByText('Estado:', { exact: false }).filter({ hasText: 'Programada' })).toBeVisible()
  expect(state.summary.requests[0].documents.quote.fileId).toBe('file-qa-1')
  expect(state.summary.requests[0].status).toBe('SCHEDULED')
})

test('contrataciones independientes se guardan con referencia y auditoría requerida', async ({ page }) => {
  const state = await fixture(page, { role: 'domian_admin' })
  await page.goto('/app/administracion-planes?empresa=company-qa')
  await page.getByText('Contrataciones independientes', { exact: true }).click()
  const book = page.locator('fieldset').filter({ has: page.locator('legend', { hasText: 'Libro de Obra' }) })
  await book.getByLabel('Contratación habilitada').check()
  await book.getByLabel('Referencia del acuerdo').fill('LIBRO-QA-001')
  await page.getByLabel('Motivo del cambio').fill('Alta del servicio independiente QA autorizada.')
  await page.getByRole('button', { name: 'Guardar contrataciones independientes' }).click()
  await expect(page.getByText('Contrataciones independientes actualizadas y auditadas.')).toBeVisible()
  expect(state.summary.separateServices.libroObra).toMatchObject({ enabled: true, reference: 'LIBRO-QA-001' })
})

test('los avisos internos publicados se muestran en Mi plan', async ({ page }) => {
  await fixture(page, { role: 'client_admin', summary: fixtureSummary({ code: 'PURRANQUE' }) })
  await page.route('**/api/subscription/notifications', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [{ id: 'notice-qa', subject: 'Tu plan vence en 7 días', message: 'Gestiona la renovación con anticipación.', threshold: 7, scheduledAt: '2026-11-05T10:00:00Z' }] }) }))
  await page.goto('/app/mi-plan')
  await expect(page.getByRole('heading', { name: 'Avisos de mi plan' })).toBeVisible()
  await expect(page.getByText('Tu plan vence en 7 días', { exact: true })).toBeVisible()
  await expect(page.getByText('Gestiona la renovación con anticipación.', { exact: true })).toBeVisible()
})

test('una recomendación inferior prepara reducción en vez de una mejora inválida', async ({ page }) => {
  await fixture(page, { role: 'client_admin', summary: fixtureSummary({ code: 'PURRANQUE', used: 40 }) })
  await page.route('**/api/subscription/recommend', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ planCode: 'LA_UNION', plan: { name: 'La Unión' }, totalCapacity: 60, available: 10, monthlyNetPrice: 1000, currency: 'CLP', packages: [] }) }))
  await page.goto('/app/mi-plan')
  await page.locator('#my-plan-workers').fill('50')
  await page.getByRole('button', { name: 'Calcular recomendación' }).click()
  await page.getByRole('button', { name: 'Preparar solicitud con esta selección' }).click()
  await expect(page.getByLabel('Tipo de solicitud')).toHaveValue('DOWNGRADE')
  await expect(page.locator('#subscription-request-plan')).toHaveValue('LA_UNION')
})
