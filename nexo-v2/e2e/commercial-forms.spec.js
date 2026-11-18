import { test, expect } from '@playwright/test'
const validRut = '14.507.215-8'

function initialState() {
  return {
    minas: [],
    contratos: [],
    subcontratos: [],
    trabajadores: [],
    mantenciones: [],
    asignaciones: [],
  }
}

async function mockPortal(page) {
  let state = initialState()
  const writes = []
  const moduleVersions = { minas: 0, subcontratos: 0 }

  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/api/auth/me') {
      return json({
        user: { id: 'qa-admin', name: 'Responsable QA', role: 'client_admin', permissions: { modules: {} } },
        tenant: { id: 'qa-tenant', name: 'Empresa ficticia QA' },
        csrfToken: 'qa-csrf',
      })
    }
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') return json({ state, moduleVersions })
    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      writes.push(body)
      const proposed = { ...state }
      for (const [key, change] of Object.entries(body.changes || {})) proposed[key] = change.data
      const client = Array.isArray(proposed.minas) ? proposed.minas.at(-1) : null
      const thirdParty = Array.isArray(proposed.subcontratos) ? proposed.subcontratos.at(-1) : null
      if (client?.rut && client.rut !== validRut) return json({ error: 'INVALID_CLIENT_RUT' }, 409)
      if (thirdParty) {
        if (!thirdParty.rut) return json({ error: 'INCOMPLETE_SUBCONTRACTOR_RUT' }, 409)
        if (thirdParty.rut !== validRut) return json({ error: 'INVALID_SUBCONTRACTOR_RUT' }, 409)
      }
      state = proposed
      for (const key of Object.keys(body.changes || {})) moduleVersions[key] = Number(moduleVersions[key] || 0) + 1
      return json({ moduleVersions })
    }
    return json({})
  })

  return { writes, state: () => state }
}

async function expectNoHorizontalOverflow(page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function openClientForm(page) {
  await page.goto('/app/clientes/nuevo')
  await expect(page.getByRole('heading', { name: 'Clientes', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Registra la relación comercial', exact: true })).toBeVisible()
}

async function openThirdPartyForm(page) {
  await page.goto('/app/subcontratos')
  await expect(page.getByRole('heading', { name: 'Terceros y subcontratos', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo tercero', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Registrar tercero', exact: true })).toBeVisible()
}

async function box(page, selector) {
  const value = await page.locator(selector).boundingBox()
  if (!value) throw new Error(`Missing layout box for ${selector}`)
  return value
}

for (const width of [1440, 1024, 768, 375]) {
  test(`Cliente y Tercero conservan la grilla comercial a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 })
    await mockPortal(page)

    await openClientForm(page)
    await expect(page.getByLabel('RUT', { exact: true })).toHaveAttribute('aria-describedby', /client-rut-rut-hint/)
    await expectNoHorizontalOverflow(page)

    const clientRut = await box(page, '#client-rut')
    const clientStatus = await box(page, '#client-status')
    if (width > 640) expect(Math.abs(clientRut.y - clientStatus.y)).toBeLessThanOrEqual(1)
    else expect(clientStatus.y).toBeGreaterThan(clientRut.y)

    if (width === 1440) {
      const phone = await box(page, '#client-central-phone')
      const email = await box(page, '#client-central-email')
      expect(Math.abs(phone.y - email.y)).toBeLessThanOrEqual(1)
    }

    await openThirdPartyForm(page)
    await expect(page.locator('form.nk-third-detail-form')).toHaveCount(1)
    await expect(page.getByLabel('RUT', { exact: true })).toHaveAttribute('aria-describedby', /third-party-rut-rut-hint/)
    await expectNoHorizontalOverflow(page)

    const thirdRut = await box(page, '#third-party-rut')
    const thirdStatus = await box(page, '#third-party-status')
    if (width > 640) expect(Math.abs(thirdRut.y - thirdStatus.y)).toBeLessThanOrEqual(1)
    else expect(thirdStatus.y).toBeGreaterThan(thirdRut.y)
  })
}

test('Cliente conserva RUT opcional y bloquea uno inválido sin desplazar su fila', async ({ page }) => {
  const api = await mockPortal(page)
  await openClientForm(page)
  await page.getByLabel('Nombre o razón social', { exact: true }).fill('Cliente ficticio QA')
  const rut = page.getByLabel('RUT', { exact: true })
  const statusBefore = await box(page, '#client-status')

  await rut.fill('11.111.111-2')
  await rut.press('Tab')
  await expect(rut).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Ingresa un RUT chileno válido o deja el campo vacío.', { exact: true })).toBeVisible()
  expect(Math.abs((await box(page, '#client-status')).y - statusBefore.y)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  expect(api.writes).toHaveLength(0)

  await rut.fill('')
  await rut.press('Tab')
  await expect(rut).toHaveAttribute('aria-invalid', 'false')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByText('Cliente creado y disponible para contratos y órdenes de servicio.')).toBeVisible()
  expect(api.state().minas).toEqual(expect.arrayContaining([expect.objectContaining({ nombre: 'Cliente ficticio QA', rut: '' })]))
})

test('Tercero exige RUT y permite una corrección válida sin salto de grilla', async ({ page }) => {
  const api = await mockPortal(page)
  await openThirdPartyForm(page)
  await page.getByLabel('Razón social', { exact: true }).fill('Tercero ficticio QA')
  const rut = page.getByLabel('RUT', { exact: true })
  const statusBefore = await box(page, '#third-party-status')

  await page.getByRole('button', { name: 'Registrar tercero', exact: true }).click()
  await expect(rut).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Ingresa el RUT.', { exact: true })).toBeVisible()
  expect(api.writes).toHaveLength(0)

  await rut.fill(validRut)
  await page.getByLabel('Razón social', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Registrar tercero', exact: true }).click()
  await expect(page.getByText('Ingresa la razón social.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Razón social', { exact: true })).toBeFocused()
  expect(api.writes).toHaveLength(0)

  await page.getByLabel('Razón social', { exact: true }).fill('Tercero ficticio QA')
  await rut.fill('11.111.111-2')
  await rut.press('Tab')
  await expect(page.getByText('Ingresa un RUT chileno válido.', { exact: true })).toBeVisible()
  expect(Math.abs((await box(page, '#third-party-status')).y - statusBefore.y)).toBeLessThanOrEqual(1)

  await rut.fill('145072158')
  await page.getByRole('button', { name: 'Registrar tercero', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tercero ficticio QA', exact: true })).toBeVisible()
  expect(api.state().subcontratos).toEqual(expect.arrayContaining([expect.objectContaining({ razon: 'Tercero ficticio QA', rut: validRut })]))
})
