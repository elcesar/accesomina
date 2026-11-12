import { test, expect } from '@playwright/test'

const allCapabilities = ['read', 'catalog.manage', 'requests.create', 'requests.review', 'requests.approve', 'requests.reject', 'requests.schedule', 'requests.cancel', 'requests.documents', 'requests.execute', 'services.manage', 'operators.manage', 'policies.manage']
const profileCapabilities = { SUPER_ADMIN: allCapabilities, COMMERCIAL: allCapabilities.filter(value => value === 'read' || value.startsWith('requests.') && value !== 'requests.execute'), OPERATIONS: ['read', 'requests.execute', 'services.manage'] }
const catalogFixture = () => ({
  plans: [['FREE', 'Free', 15, 0], ['LA_UNION', 'La Unión', 60, 1000], ['PURRANQUE', 'Purranque', 180, 2000], ['FRUTILLAR', 'Frutillar', 360, 3000], ['PUERTO_OCTAY', 'Puerto Octay', 720, 4000]].map(([code, name, workerLimit, monthlyPrice], index) => ({ code, name, workerLimit, monthlyPrice, versionId: `${code}-1`, isFree: code === 'FREE', trialMonths: code === 'FREE' ? 6 : 0, currency: 'CLP', taxRate: .19, state: 'PUBLISHED', active: true, publicVisible: true, displayOrder: index + 10, description: `Descripción vigente de ${name}`, publicFeatures: [`Beneficio configurado ${name}`], ctaText: code === 'FREE' ? 'Comenzar gratis' : `Solicitar ${name}`, allowedUpgradeTargets: [['LA_UNION'], ['PURRANQUE'], ['FRUTILLAR'], ['PUERTO_OCTAY'], []][index], graceDays: code === 'FREE' ? 0 : 30, warningPercent: 80, criticalPercent: 90 })),
  packages: [100, 200, 500].map((quantity, index) => ({ code: `EXTRA_${quantity}`, name: `Paquete ${quantity}`, workersQuantity: quantity, monthlyPrice: [50000, 100000, 300000][index], versionId: `EXTRA_${quantity}-1`, state: 'PUBLISHED', active: true, displayOrder: index, currency: 'CLP', taxRate: .19, repeatable: false, stackable: true, maxQuantity: 1 })),
})
function summaryFixture(code = 'PURRANQUE') {
  const plan = catalogFixture().plans.find(item => item.code === code)
  return { legacy: false, managed: true, canOperate: true, daysRemaining: code === 'FREE' ? 120 : 40, daysUsed: code === 'FREE' ? 61 : null, totalTrialDays: code === 'FREE' ? 181 : null, contract: { id: 'contract-qa', planCode: code, planName: plan.name, monthlyNetPrice: plan.monthlyPrice, currency: 'CLP', startsAt: '2026-11-05T10:00:00Z', endsAt: code === 'FREE' ? '2027-05-05T10:00:00Z' : '2026-12-05T10:00:00Z', status: 'ACTIVE', snapshot: { plan: structuredClone(plan), totalCapacity: plan.workerLimit } }, capacity: { base: plan.workerLimit, additional: 0, total: plan.workerLimit, used: 12, available: plan.workerLimit - 12, overCapacity: 0 }, packages: [], requests: [], audit: [], separateServices: {} }
}
async function fixture(page, { role = 'domian_admin', profile = 'SUPER_ADMIN', summary = summaryFixture(), initiallyLoggedIn = true } = {}) {
  const state = { catalog: catalogFixture(), summary, loggedIn: initiallyLoggedIn, calls: [], uploads: 0, companies: [{ id: 'company-qa', name: 'Empresa QA', rut: '11.111.111-1', managed: true }] }
  const session = () => ({ user: { id: 'user-qa', name: 'Persona QA', email: 'qa@ejemplo.test', role, permissions: { modules: {} } }, tenant: { id: 'company-qa', name: 'Empresa QA', rut: '11.111.111-1' }, csrfToken: 'qa-csrf' })
  await page.route('**/api/**', async route => {
    const request = route.request(), method = request.method(), path = new URL(request.url()).pathname
    const payload = request.headers()['content-type']?.includes('application/json') && request.postData() ? request.postDataJSON() : null
    state.calls.push({ path, method, payload })
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/config') return json({ registrationEnabled: false, registrationTermsVersion: '2026-11-05' })
    if (path === '/api/auth/me') return state.loggedIn ? json(session()) : json({ error: 'AUTH_REQUIRED' }, 401)
    if (path === '/api/auth/login') { if (!payload.mfaCode) return json({ error: 'MFA_REQUIRED' }, 401); state.loggedIn = true; return json(session()) }
    if (path === '/api/auth/logout') { state.loggedIn = false; return json({ ok: true }) }
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [], prospectos: [] } })
    if (path === '/api/subscriptions/admin/access') return state.loggedIn && profile ? json({ profile, capabilities: profileCapabilities[profile] }) : json({ error: 'FORBIDDEN' }, 403)
    if (path === '/api/plans') return json(state.catalog)
    if (path === '/api/subscription') return json(state.summary)
    if (path.endsWith('/audit')) return json({ events: [], nextCursor: null })
    if (path === '/api/subscription/notifications') return json({ notifications: [] })
    if (path === '/api/subscription/requests') { state.summary.requests.push({ id: 'request-private', ...payload, status: 'REQUESTED' }); return json({ request: state.summary.requests.at(-1) }, 201) }
    if (path === '/api/subscriptions/admin/catalog') {
      if (method === 'GET') return json(state.catalog)
      if (!profileCapabilities[profile]?.includes('catalog.manage')) return json({ error: 'FORBIDDEN' }, 403)
      const list = payload.kind === 'plan' ? state.catalog.plans : state.catalog.packages, original = list.find(item => item.code === payload.code)
      const next = { ...original, ...payload, versionId: `${payload.code}-2`, state: payload.action === 'publish' ? 'PUBLISHED' : 'DRAFT' }
      list.splice(list.indexOf(original), 1, next); return json(next, 201)
    }
    if (path === '/api/subscriptions/admin/companies') return json({ companies: state.companies })
    if (path === '/api/subscriptions/admin/requests') return json({ requests: state.summary.requests, commercialRequests: [] })
    if (path === '/api/subscriptions/admin/companies/company-qa') return json(state.summary)
    if (path === '/api/subscriptions/admin/companies/company-other') return json(summaryFixture('LA_UNION'))
    if (path.endsWith('/company-qa/documents') && method === 'POST') return json({ id: `qa-file-${++state.uploads}`, original_name: 'Documento QA.pdf' }, 201)
    if (path.includes('/company-qa/requests/') && method === 'PATCH') {
      const item = state.summary.requests.find(row => row.id === path.split('/').at(-1)); if (payload.documents) item.documents = payload.documents
      item.status = ({ documents: item.status, review: 'UNDER_REVIEW', approve: 'APPROVED', schedule: 'SCHEDULED', execute: 'EXECUTED' })[payload.action] || item.status
      return json({ request: item })
    }
    return json({})
  })
  return state
}
async function openEditor(page, name) { await page.goto('/app/administracion-planes?vista=catalogo'); await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click() }
async function publish(page) { await page.getByRole('button', { name: 'Publicar versión', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Publicar versión', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Nueva versión publicada' })).toBeVisible() }

test('metadatos y precio publicados aparecen en público y privado sin alterar el contrato histórico', async ({ page }) => {
  const state = await fixture(page)
  await openEditor(page, 'Frutillar')
  await page.getByLabel('Precio mensual neto CLP', { exact: true }).fill('3500')
  await page.getByLabel('Descripción pública', { exact: true }).fill('Descripción comercial editada QA')
  await page.getByLabel('Beneficios públicos', { exact: true }).fill('Primer beneficio editable\nSegundo beneficio editable')
  await page.getByLabel('Texto del botón de solicitud', { exact: true }).fill('Elegir Frutillar QA')
  await page.getByLabel('Orden de presentación', { exact: true }).fill('0'); await publish(page)
  expect(state.catalog.plans[3]).toMatchObject({ monthlyPrice: 3500, description: 'Descripción comercial editada QA', publicFeatures: ['Primer beneficio editable', 'Segundo beneficio editable'], ctaText: 'Elegir Frutillar QA', displayOrder: 0, active: true, trialMonths: 0 })
  await page.goto('/planes'); await expect(page.locator('[data-plan-code]').first()).toHaveAttribute('data-plan-code', 'FRUTILLAR')
  const card = page.locator('[data-plan-code=FRUTILLAR]'); await expect(card).toContainText('3.500'); await expect(card).toContainText('Descripción comercial editada QA')
  await expect(card.getByRole('listitem')).toHaveText(['Primer beneficio editable', 'Segundo beneficio editable'])
  await card.getByRole('button', { name: 'Elegir Frutillar QA' }).click(); await expect(page.locator('.nk-plan-request .nk-plan-total')).toContainText('3.500')
  await page.goto('/app/mi-plan'); await expect(page.locator('#subscription-request-plan')).toHaveValue('FRUTILLAR')
  await expect(page.getByText('Descripción comercial editada QA', { exact: true })).toBeVisible(); await expect(page.locator('.nk-subscription-overview')).toContainText('2.000')
  await expect(page.locator('.nk-subscription-overview')).toContainText('Descripción vigente de Purranque'); expect(state.summary.contract.monthlyNetPrice).toBe(2000)
})

test('validación accesible del catálogo muestra todos los campos inválidos y enfoca el primero', async ({ page }) => {
  const state = await fixture(page); await openEditor(page, 'Free')
  for (const [label, value] of [['Nombre público', ''], ['Precio mensual neto CLP', '1'], ['Duración gratuita (meses calendario)', '0'], ['Texto del botón de solicitud', '']]) await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByLabel('Beneficios públicos', { exact: true }).fill(Array.from({ length: 31 }, (_, i) => `Beneficio ${i}`).join('\n'))
  await page.getByRole('button', { name: 'Guardar borrador' }).click(); await expect(page.getByLabel('Nombre público', { exact: true })).toBeFocused()
  for (const id of ['name', 'monthlyPrice', 'trialMonths', 'ctaText', 'featuresText']) { await expect(page.locator(`#catalog-${id}`)).toHaveAttribute('aria-invalid', 'true'); await expect(page.locator(`#catalog-${id}-error`)).toBeVisible() }
  expect(state.calls.filter(item => item.path.endsWith('/catalog') && item.method === 'POST')).toHaveLength(0)
})

test('la nueva duración Free no cambia el contrato existente de seis meses', async ({ page }) => {
  const state = await fixture(page, { summary: summaryFixture('FREE') }); await page.goto('/app'); await page.getByRole('dialog').getByRole('button', { name: 'Continuar', exact: true }).click()
  await openEditor(page, 'Free'); await page.getByLabel('Duración gratuita (meses calendario)', { exact: true }).fill('9'); await publish(page)
  await page.goto('/planes'); await expect(page.locator('[data-plan-code=FREE]')).toContainText('9 meses calendario gratis')
  await page.goto('/app/mi-plan'); await expect(page.locator('.nk-subscription-overview')).toContainText('6 meses calendario, sin renovación automática'); expect(state.summary.contract.snapshot.plan.trialMonths).toBe(6)
})

test('ofertas inactivas, ocultas y borradores se retiran sin modificar contratos existentes', async ({ page }) => {
  const state = await fixture(page); await openEditor(page, 'Frutillar'); await page.getByLabel('Activa para nuevas ofertas', { exact: true }).uncheck(); await publish(page)
  state.catalog.plans[0].active = false; state.catalog.plans[1].publicVisible = false; state.catalog.plans[4].state = 'DRAFT'; state.catalog.packages[0].active = false
  await page.goto('/planes'); await expect(page.locator('[data-plan-code]')).toHaveCount(1); await expect(page.locator('.nk-plans-hero')).not.toContainText('Comienza gratis'); await expect(page.locator('.nk-plans-hero').getByRole('link', { name: 'Comenzar gratis', exact: true })).toHaveCount(0)
  await page.goto('/app/mi-plan'); await expect(page.locator('.nk-subscription-overview')).toContainText('Purranque'); await expect(page.locator('#subscription-request-plan option[value=FRUTILLAR]')).toHaveCount(0)
  await expect(page.getByText('No hay una oferta vigente disponible', { exact: false })).toBeVisible()
})

test('paquetes usan cantidad real configurable, permiten 120 unidades y rechazan 151 con máximo150', async ({ page }) => {
  const state = await fixture(page, { summary: summaryFixture('PUERTO_OCTAY') }); await openEditor(page, 'Paquete 100')
  await page.getByLabel('Trabajadores por paquete', { exact: true }).fill('150'); await page.getByLabel('Precio mensual neto CLP', { exact: true }).fill('55000')
  await page.getByLabel('Permitir repetir el mismo paquete', { exact: true }).check(); await page.getByLabel('Máximo de unidades del mismo paquete', { exact: true }).fill('150'); await publish(page)
  await page.goto('/app/mi-plan?tipo=PACKAGES'); const quantity = page.getByLabel('Cantidad de Paquete 100', { exact: true }); await quantity.fill('1')
  await expect(page.getByText('Paquete 100 · +150 trabajadores', { exact: true })).toBeVisible(); await expect(page.locator('.nk-plan-total')).toContainText('870 cupos'); await expect(page.locator('.nk-plan-total')).toContainText('59.000')
  await quantity.fill('151'); await page.locator('#subscription-request-reason').fill('Cantidad parametrizada QA'); await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  await expect(quantity).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByText('Ingresa una cantidad entera entre 0 y 150.', { exact: true })).toBeVisible(); expect(state.summary.requests).toHaveLength(0)
  await quantity.fill('120'); await expect(quantity).toHaveAttribute('aria-invalid', 'false'); await expect(page.locator('.nk-plan-total')).toContainText('18.720 cupos'); await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click()
  expect(state.summary.requests[0].packages).toEqual([{ code: 'EXTRA_100', quantity: 120, versionId: 'EXTRA_100-2' }]); expect(state.catalog.packages[0].workersQuantity).toBe(150)
})

for (const width of [375, 1440]) test(`comparación y catálogo caben a ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 1000 }); await fixture(page); await page.goto('/planes')
  await expect(page.locator('.nk-plan-comparison-table')).toBeVisible(); await expect(page.getByRole('region', { name: 'Comparación de planes vigentes' })).toHaveAttribute('tabindex', '0')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: testInfo.outputPath(`planes-catalogo-${width}.png`), fullPage: true })
  await openEditor(page, 'Purranque'); await expect(page.getByLabel('Beneficios públicos', { exact: true })).toBeVisible(); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const profile of ['COMMERCIAL', 'OPERATIONS']) test(`perfil${profile} sólo ofrece acciones autorizadas`, async ({ page }) => {
  const summary = summaryFixture(); summary.requests = [{ id: 'qa-request', type: 'UPGRADE', planCode: 'FRUTILLAR', status: profile === 'OPERATIONS' ? 'SCHEDULED' : 'REQUESTED', documents: {}, proposal: { plan: catalogFixture().plans[3] }, workersAtRequest: 12 }]
  const state = await fixture(page, { role: 'rrhh', profile, summary }); await page.goto('/app/administracion-planes?empresa=company-qa')
  await expect(page.getByRole('heading', { name: 'Empresa QA', exact: true })).toBeVisible(); const action = page.getByLabel('Acción autorizada'); await expect(action).toHaveValue(profile === 'COMMERCIAL' ? 'review' : 'execute')
  await expect(action.locator(`option[value=${profile === 'COMMERCIAL' ? 'execute' : 'review'}]`)).toHaveCount(0); await expect(page.getByText('Crear solicitud de contratación o cambio', { exact: true })).toHaveCount(profile === 'COMMERCIAL' ? 1 : 0)
  await expect(page.getByText('Contrataciones independientes', { exact: true })).toHaveCount(profile === 'OPERATIONS' ? 1 : 0)
  await page.goto('/app/administracion-planes?vista=catalogo'); const edit = page.getByRole('button', { name: 'Editar Purranque', exact: true }); await expect(edit).toBeDisabled(); await edit.evaluate(button => { button.disabled = false; button.click() })
  await expect(page.getByLabel('Precio mensual neto CLP', { exact: true })).toHaveCount(0); expect(state.calls.filter(item => item.path.endsWith('/catalog') && item.method === 'POST')).toHaveLength(0)
})

test('documentos comerciales validan metadatos y los conservan tras recargar', async ({ page }) => {
  const summary = summaryFixture(); summary.requests = [{ id: 'qa-request', tenantId: 'company-qa', type: 'UPGRADE', planCode: 'FRUTILLAR', status: 'REQUESTED', documents: {}, workersAtRequest: 12, reason: 'Solicitud QA', proposal: { plan: catalogFixture().plans[3] } }]
  const state = await fixture(page, { summary }); await page.goto('/app/administracion-planes?empresa=company-qa'); await page.getByLabel('Acción autorizada').selectOption('documents')
  await page.locator('#request-qa-request-quote-number').fill('QA-COT-001'); await page.locator('#request-qa-request-quote-file').setInputFiles({ name: 'Documento QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocumento QA ficticio') }); await expect.poll(() => state.uploads).toBe(1)
  await page.locator('#request-qa-request-reason').fill('Guardar cotización QA documentada'); await page.getByRole('button', { name: 'Guardar documentación', exact: true }).click()
  for (const field of ['netAmount', 'issuedAt', 'status', 'responsible']) await expect(page.locator(`#request-qa-request-quote-${field}`)).toHaveAttribute('aria-invalid', 'true')
  for (const [field, value] of [['netAmount', '3500'], ['issuedAt', '2026-11-12'], ['responsible', 'Responsable QA'], ['observations', 'Condiciones revisadas QA'], ['acceptedAt', '2026-11-12T12:00'], ['validUntil', '2026-12-12T23:59']]) await page.locator(`#request-qa-request-quote-${field}`).fill(value)
  await page.locator('#request-qa-request-quote-status').selectOption('ACCEPTED'); await page.getByRole('button', { name: 'Guardar documentación', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Guardar documentación', exact: true }).click()
  await expect.poll(() => state.summary.requests[0].documents.quote.netAmount).toBe(3500); expect(state.summary.requests[0].documents.quote).toMatchObject({ number: 'QA-COT-001', fileId: 'qa-file-1', status: 'ACCEPTED', responsible: 'Responsable QA', observations: 'Condiciones revisadas QA' })
  await page.reload(); await expect(page.locator('#request-qa-request-quote-netAmount')).toHaveValue('3500'); await expect(page.locator('#request-qa-request-quote-responsible')).toHaveValue('Responsable QA'); await expect(page.getByRole('link', { name: 'Ver cotización', exact: true })).toHaveAttribute('href', '/api/subscriptions/admin/companies/company-qa/documents/qa-file-1')
})

test('quien solicita no aprueba su contratación aunque sea administrador global', async ({ page }) => {
  const summary = summaryFixture(); summary.requests = [{ id: 'qa-request', type: 'UPGRADE', planCode: 'FRUTILLAR', status: 'UNDER_REVIEW', requestedBy: 'user-qa', documents: {}, proposal: { plan: catalogFixture().plans[3] } }]
  const state = await fixture(page, { summary }); await page.goto('/app/administracion-planes?empresa=company-qa'); await expect(page.getByText('La aprobación requiere otra persona autorizada.', { exact: false })).toBeVisible(); await expect(page.getByText('Sin registro histórico', { exact: true })).toBeVisible(); await expect(page.getByLabel('Acción autorizada').locator('option[value=approve]')).toHaveCount(0); expect(state.calls.filter(item => item.method === 'PATCH')).toHaveLength(0)
})

test('historial paginado conserva datos tras fallos y descarta respuestas de otra empresa', async ({ page }) => {
  const state = await fixture(page); state.companies.push({ id: 'company-other', name: 'Empresa distinta QA', rut: '22.222.222-2', managed: true })
  let failed = false, release
  const event = id => ({ id, action: 'subscription.catalog.publish', reason: `Evento ${id}`, createdAt: '2026-11-12T10:00:00Z', actorName: 'Responsable QA', requesterName: 'Persona solicitante QA', oldValue: { monthlyPrice: 2000, description: 'Descripción anterior' }, newValue: { monthlyPrice: 2500, description: 'Descripción actualizada' } })
  await page.route('**/api/subscriptions/admin/companies/*/audit*', async route => {
    const url = new URL(route.request().url()), cursor = url.searchParams.get('cursor')
    if (url.pathname.includes('company-other')) return route.fulfill({ json: { events: [event('empresa-B')], nextCursor: null } })
    if (!cursor) return route.fulfill({ json: { events: [event('empresa-A1')], nextCursor: 'page-two' } })
    if (cursor === 'page-two' && !failed) { failed = true; return route.fulfill({ status: 503, json: { error: 'SERVICE_UNAVAILABLE' } }) }
    if (cursor === 'page-two') return route.fulfill({ json: { events: [event('empresa-A2')], nextCursor: 'page-three' } })
    await new Promise(resolve => { release = resolve }); return route.fulfill({ json: { events: [event('empresa-A3')], nextCursor: null } })
  })
  await page.goto('/app/administracion-planes?empresa=company-qa'); await page.getByText('Historial de auditoría', { exact: true }).click()
  const first = page.locator('.nk-subscription-audit-list > li').first(); await expect(first).toContainText('Versión del catálogo publicada'); await expect(first).toContainText('Solicitada por: Persona solicitante QA'); await first.getByText('Ver cambios', { exact: true }).click()
  const priceRow = first.getByRole('row', { name: /Precio mensual neto CLP/ }); await expect(priceRow.getByRole('cell')).toHaveText(['$2.000', '$2.500']); await expect(first.getByRole('row', { name: /Descripción pública/ })).toContainText('Descripción anterior'); await expect(first.getByRole('row', { name: /Descripción pública/ })).toContainText('Descripción actualizada')
  await page.getByRole('button', { name: 'Cargar más eventos', exact: true }).click(); await expect(page.getByRole('button', { name: 'Reintentar historial', exact: true })).toBeVisible(); await expect(first).toContainText('Evento empresa-A1')
  await page.getByRole('button', { name: 'Reintentar historial', exact: true }).click(); await expect(page.locator('.nk-subscription-audit-list > li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Cargar más eventos', exact: true }).click(); await expect.poll(() => typeof release).toBe('function')
  await page.getByRole('button', { name: /Empresa distinta QA/ }).click(); await expect(page.getByRole('heading', { name: 'Empresa distinta QA', exact: true })).toBeVisible(); await page.getByText('Historial de auditoría', { exact: true }).click(); await expect(page.getByText('Evento empresa-B', { exact: true })).toBeVisible()
  const obsolete = page.waitForResponse(response => response.url().includes('cursor=page-three')); release(); await (await obsolete).finished()
  await expect(page.locator('.nk-subscription-audit-list > li')).toHaveCount(1); await expect(page.getByText('Evento empresa-B', { exact: true })).toBeVisible(); await expect(page.getByText('Evento empresa-A3', { exact: true })).toHaveCount(0)
})

for (const lateStatus of [200, 503]) test(`selección de empresa descarta el resumen tardío ${lateStatus} de otra cuenta`, async ({ page }) => {
  const state = await fixture(page); state.companies.push({ id: 'company-other', name: 'Empresa distinta QA', rut: '22.222.222-2', managed: true })
  let release
  await page.route('**/api/subscriptions/admin/companies/company-qa', async route => { await new Promise(resolve => { release = resolve }); return route.fulfill({ status: lateStatus, json: lateStatus === 200 ? state.summary : { error: 'COMPANY_A_QA_FAILED' } }) })
  await page.goto('/app/administracion-planes?empresa=company-qa'); await expect.poll(() => typeof release).toBe('function')
  await page.getByRole('button', { name: /Empresa distinta QA/ }).click(); await expect(page.getByRole('heading', { name: 'Empresa distinta QA', exact: true })).toBeVisible()
  await expect(page.locator('.nk-subscription-company-header')).toContainText('La Unión'); await expect(page.locator('.nk-subscription-company-header')).not.toContainText('Purranque')
  const obsolete = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/companies/company-qa')); release(); await (await obsolete).finished()
  await expect(page.locator('.nk-subscription-company-header')).toContainText('La Unión'); await expect(page.locator('.nk-subscription-company-header')).not.toContainText('Purranque'); await expect(page.getByText('COMPANY_A_QA_FAILED', { exact: true })).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('empresa')).toBe('company-other')
})

test('seleccionar dos veces la misma empresa preserva la consulta en curso y el detalle ya cargado', async ({ page }) => {
  await fixture(page); let release; let reads = 0
  await page.route('**/api/subscriptions/admin/companies/company-qa', async route => { reads++; await new Promise(resolve => { release = resolve }); return route.fulfill({ json: summaryFixture() }) })
  await page.goto('/app/administracion-planes')
  const company = page.getByRole('button', { name: /Empresa QA.*Suscripción parametrizada/ })
  await company.click(); await expect.poll(() => typeof release).toBe('function')
  await company.dblclick(); expect(reads).toBe(1); release()
  await expect(page.getByRole('heading', { name: 'Empresa QA', exact: true })).toBeVisible(); await expect(page.locator('.nk-subscription-company-header')).toContainText('Purranque')
  await company.click(); await expect(page.getByRole('heading', { name: 'Empresa QA', exact: true })).toBeVisible(); await expect(page.locator('.nk-subscription-company-header')).toContainText('Purranque')
  expect(reads).toBe(1); await expect(page.getByText('Cargando la suscripción de la empresa…', { exact: true })).toHaveCount(0)
})

for (const days of [30, 15, 7, 3, 1]) test(`dashboard anuncia vencimiento a ${days} días y mantiene precio en formato compacto`, async ({ page }) => {
  const summary = summaryFixture(); summary.daysRemaining = days; await fixture(page, { role: 'client_admin', profile: null, summary }); await page.goto('/app')
  await expect(page.locator('.nk-subscription-card .nk-subscription-expiry')).toContainText(`Quedan ${days} días`); await expect(page.locator('.nk-subscription-card .nk-subscription-expiry')).toContainText(`Aviso de vencimiento: ${days} días`)
  for (const name of ['Inicio del contrato', 'Capacidad base', 'Capacidad adicional', 'Capacidad total']) await expect(page.locator('.nk-subscription-card').getByText(name, { exact: true })).toBeVisible()
  await expect(page.locator('.nk-subscription-card')).toContainText('2.000 netos + IVA'); await expect(page.getByRole('link', { name: 'Renovar plan', exact: true })).toHaveAttribute('href', '/app/mi-plan?tipo=RENEWAL')
})

test('gracia y vencimiento Free describen su estado real', async ({ page }) => {
  const summary = summaryFixture(); summary.contract.status = 'GRACE_PERIOD'; summary.daysInGraceRemaining = 12; summary.graceDaysUsed = 18
  const state = await fixture(page, { role: 'client_admin', profile: null, summary }); await page.goto('/app'); await expect(page.locator('.nk-subscription-expiry')).toContainText('12 días de gracia restantes'); await expect(page.locator('.nk-subscription-expiry')).toContainText('18 días de gracia utilizados')
  state.summary = summaryFixture('FREE'); state.summary.canOperate = false; state.summary.contract.status = 'EXPIRED'; state.summary.daysRemaining = 0
  await page.goto('/app/mi-plan'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByText('El período gratuito terminó.', { exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: 'Ver planes', exact: true }).first()).toHaveAttribute('href', '/planes')
})

for (const status of ['SUSPENDED', 'EXPIRED']) test(`plan pagado ${status} ofrece renovar en vez de anunciar un vencimiento próximo`, async ({ page }) => {
  const summary = summaryFixture(); summary.contract.status = status; summary.canOperate = false; summary.daysRemaining = 0
  await fixture(page, { role: 'client_admin', profile: null, summary }); await page.goto('/app/mi-plan'); await expect(page.locator('.nk-subscription-expiry')).toContainText(status === 'SUSPENDED' ? 'Tu plan está suspendido.' : 'El período contratado terminó.')
  await expect(page.locator('.nk-subscription-expiry')).not.toContainText('próximo a vencer'); await expect(page.getByRole('link', { name: 'Gestionar renovación', exact: true })).toHaveAttribute('href', '/app/mi-plan?tipo=RENEWAL')
})

test('popup Free espera MFA, no se repite al recargar y reaparece en un nuevo ingreso', async ({ page }) => {
  await fixture(page, { role: 'client_admin', profile: null, summary: summaryFixture('FREE'), initiallyLoggedIn: false })
  const login = async () => { await page.locator('#login-rut').fill('11.111.111-1'); await page.locator('#login-email').fill('qa@ejemplo.test'); await page.locator('#login-password').fill('Ficticia-QA-2026!'); await page.getByRole('button', { name: 'Ingresar', exact: true }).click(); await expect(page.locator('#login-mfa')).toBeVisible(); await expect(page.getByRole('dialog', { name: 'Estás utilizando el Plan Free de Nexo Klar' })).toHaveCount(0); await page.locator('#login-mfa').fill('123456'); await page.getByRole('button', { name: 'Verificar código', exact: true }).click() }
  await page.goto('/login'); await login(); const popup = page.getByRole('dialog', { name: 'Estás utilizando el Plan Free de Nexo Klar' }); await expect(popup).toBeVisible(); await expect(popup).toContainText('61 días utilizados'); await expect(popup).toContainText('120 días restantes'); await expect(popup).toContainText('12 de 15 trabajadores')
  const first = await page.evaluate(() => sessionStorage.getItem('nexo:login-instance')); await popup.getByRole('button', { name: 'Continuar', exact: true }).click(); await page.reload(); await expect(popup).not.toBeVisible(); expect(await page.evaluate(() => sessionStorage.getItem('nexo:login-instance'))).toBe(first)
  await page.getByRole('button', { name: 'Salir', exact: true }).click(); await expect(page.locator('#login-rut')).toBeVisible(); await login(); await expect(popup).toBeVisible(); expect(await page.evaluate(() => sessionStorage.getItem('nexo:login-instance'))).not.toBe(first)
})
