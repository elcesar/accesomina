import { test, expect } from '@playwright/test'

async function mockNewWorker(page, { rejectSave = false } = {}) {
  const state = {
    trabajadores: [],
    minas: [],
    mantenciones: [],
    asignaciones: [],
    contratos: [],
    restricted: [],
    eppDeliveries: [],
  }
  const writes = []

  await page.route('**/api/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state, moduleVersions: { trabajadores: 1, asignaciones: 1 } })
    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      writes.push(body)
      if (rejectSave && writes.length === 1) return json({ error: 'INVALID_WORKER_EMAIL' }, 409)
      state.trabajadores = body.changes.trabajadores.data
      state.asignaciones = body.changes.asignaciones?.data || state.asignaciones
      return json({ ok: true })
    }

    return json({})
  })

  await page.goto('/app/trabajadores/nuevo')
  await expect(page.locator('#worker-name')).toBeVisible()
  return { state, writes }
}

async function fillIdentity(page, email = 'persona+qa@example.com') {
  await page.locator('#worker-name').fill('Persona alta QA')
  await page.locator('#worker-rut').fill('14.507.215-8')
  const emailInput = page.locator('#worker-email')
  await emailInput.fill(email)
  await emailInput.blur()
  return emailInput
}

async function completeRequiredSteps(page) {
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Vinculación', exact: true })).toBeVisible()
  await page.locator('#worker-role').fill('Mecánico QA')
  await page.locator('#worker-specialty').selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Salud', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'EPP', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Guardar persona', exact: true })).toBeVisible()
}

for (const width of [1440, 480, 375]) {
  test(`asistente: correo inválido muestra un único aviso y permite dejarlo vacío a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockNewWorker(page)
    const email = await fillIdentity(page, 'persona@dominio')

    await expect(email).toHaveAttribute('maxlength', '254')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAttribute('aria-describedby', 'worker-email-error')
    await expect(page.locator('#worker-email-error')).toHaveCount(1)
    await expect(page.locator('#worker-email-error')).toHaveText('Ingresa un correo electrónico válido.')

    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(email).toBeFocused()
    await expect(page.locator('#worker-email-error')).toHaveCount(1)
    await expect(page.locator('html')).toEvaluate(element => element.scrollWidth <= window.innerWidth)

    await email.fill('')
    await email.blur()
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Vinculación', exact: true })).toBeVisible()
    await expect(page.locator('#worker-email-error')).toHaveCount(0)
  })
}

test('asistente: acepta el límite, normaliza y conserva el correo tras recargar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const { state, writes } = await mockNewWorker(page)
  const email = await fillIdentity(page, ' persona+qa@example.com ')
  await expect(email).toHaveValue('persona+qa@example.com')
  await expect(email).toHaveAttribute('aria-invalid', 'false')

  await completeRequiredSteps(page)
  await page.getByRole('button', { name: 'Guardar persona', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/trabajadores\/t_\d+$/)
  expect(writes).toHaveLength(1)
  expect(state.trabajadores).toHaveLength(1)
  expect(state.trabajadores[0].email).toBe('persona+qa@example.com')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Persona alta QA', exact: true })).toBeVisible()
})

test('asistente: el rechazo INVALID_WORKER_EMAIL vuelve al campo y conserva un único aviso', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 })
  const { state, writes } = await mockNewWorker(page, { rejectSave: true })
  const email = await fillIdentity(page)
  await completeRequiredSteps(page)

  await page.getByRole('button', { name: 'Guardar persona', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Identidad', exact: true })).toBeVisible()
  await expect(email).toBeFocused()
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  await expect(email).toHaveAttribute('aria-describedby', 'worker-email-error')
  await expect(page.locator('#worker-email-error')).toHaveCount(1)
  await expect(page.locator('#worker-email-error')).toHaveText('Ingresa un correo electrónico válido.')
  await expect(page.locator('.nk-person-create-error')).toHaveCount(0)
  expect(writes).toHaveLength(1)
  expect(state.trabajadores).toHaveLength(0)
})
