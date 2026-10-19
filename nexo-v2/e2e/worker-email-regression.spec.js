import { test, expect } from '@playwright/test'

async function mockWorker(page, rejectSave = false) {
  const state = {
    trabajadores: [
      { id: 'qa-person', nombre: 'Persona QA correo', rut: '14.567.890-0', email: 'original@example.com', tipo: 'permanente', mineras: [], workerItems: [] },
      { id: 'qa-legacy', nombre: 'Persona antigua QA', rut: '14.507.215-8', email: 'correo-invalido', tipo: 'permanente', mineras: [], workerItems: [] },
    ],
    minas: [], contratos: [], mantenciones: [], asignaciones: [], restricted: [], eppDeliveries: [],
  }
  const writes = []
  await page.route('**/api/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state/records/trabajadores/qa-person' && request.method()==='GET') return json({record:state.trabajadores[0],revision:'fixture-revision'})
    if (path === '/api/state/records/trabajadores/qa-person' && request.method()==='PATCH') {
      const body=request.postDataJSON();writes.push(body)
      if(rejectSave&&writes.length===1)return json({error:'INVALID_WORKER_EMAIL'},409)
      state.trabajadores[0]={...state.trabajadores[0],...body.patch}
      return json({record:state.trabajadores[0],revision:'fixture-revision'})
    }
    if (path === '/api/state') return json({ state, moduleVersions: { trabajadores: 1 } })
    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      writes.push(body)
      if (rejectSave && writes.length === 1) return json({ error: 'INVALID_WORKER_EMAIL' }, 409)
      state.trabajadores = body.changes.trabajadores.data
      return json({ ok: true })
    }
    return json({})
  })
  await page.goto('/app/trabajadores/qa-person')
  await expect(page.getByRole('heading', { name: 'Persona QA correo' })).toBeVisible()
  return { state, writes }
}

for (const width of [1440, 375]) {
  test(`correo inválido bloquea el guardado y señala el campo a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const { state, writes } = await mockWorker(page)
    const email = page.getByLabel('Correo electrónico', { exact: true })
    for (const invalid of ['correo-invalido', 'persona@dominio', 'a..b@example.com']) {
      await email.fill(invalid)
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(email).toHaveAttribute('aria-describedby', 'worker-email-error')
      await expect(email).toBeFocused()
      await expect(page.locator('#worker-email-error')).toBeVisible()
      expect(writes).toHaveLength(0)
      expect(state.trabajadores[0].email).toBe('original@example.com')
    }
    await email.fill(" o'connor+prueba@example.com ")
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.getByText('Cambios guardados correctamente', { exact: true })).toBeVisible()
    expect(writes).toHaveLength(1)
    expect(state.trabajadores[0].email).toBe("o'connor+prueba@example.com")
    await expect(email).toHaveAttribute('aria-invalid', 'false')
    await expect(page.locator('#worker-email-error')).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveValue("o'connor+prueba@example.com")
  })
}

test('el correo es opcional y puede vaciarse sin bloquear el guardado', async ({ page }) => {
  const { state, writes } = await mockWorker(page)
  await page.getByLabel('Correo electrónico', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByText('Cambios guardados correctamente', { exact: true })).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(state.trabajadores[0].email).toBe('')
})

test('la validación del correo también protege el guardado desde EPP', async ({ page }) => {
  const { writes } = await mockWorker(page)
  await page.getByLabel('Correo electrónico', { exact: true }).fill('correo-invalido')
  await page.getByRole('button', { name: 'Operación y EPP', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.locator('#worker-email-error')).toBeVisible()
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeFocused()
  expect(writes).toHaveLength(0)
})

for (const width of [1440, 375]) {
  for (const fromEpp of [false, true]) {
    test(`rechazo del servidor señala el campo y permite corregir desde ${fromEpp ? 'EPP' : 'Resumen'} a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const { state, writes } = await mockWorker(page, true)
      if (fromEpp) await page.getByRole('button', { name: 'Operación y EPP', exact: true }).click()
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      const email = page.getByLabel('Correo electrónico', { exact: true })
      await expect(page.locator('#worker-email-error')).toHaveText('Ingresa un correo electrónico válido.')
      await expect(email).toHaveAttribute('aria-invalid', 'true')
      await expect(email).toHaveAttribute('aria-describedby', 'worker-email-error')
      await expect(email).toBeFocused()
      await expect(page.locator('.nk-person-feedback.error')).toHaveCount(0)
      await expect(page.getByText('Cambios guardados correctamente', { exact: true })).toHaveCount(0)
      expect(writes).toHaveLength(1)
      expect(state.trabajadores[0].email).toBe('original@example.com')
      await email.fill('corregido@example.com')
      await expect(email).toHaveAttribute('aria-invalid', 'false')
      await expect(page.locator('#worker-email-error')).toHaveCount(0)
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(page.getByText('Cambios guardados correctamente', { exact: true })).toBeVisible()
      expect(state.trabajadores[0].email).toBe('corregido@example.com')
      await page.reload()
      await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveValue('corregido@example.com')
    })
  }
}

test('el guardado de una persona válida conserva intacta otra con correo antiguo inválido', async ({ page }) => {
  const { state, writes } = await mockWorker(page)
  const historical = structuredClone(state.trabajadores[1])
  await page.getByLabel('Correo electrónico', { exact: true }).fill('corregido@ejemplo.test')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByText('Cambios guardados correctamente', { exact: true })).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(writes[0].changes).toBeUndefined()
  expect(writes[0].patch.id).toBeUndefined()
  expect(state.trabajadores[1]).toEqual(historical)
  await page.reload()
  await expect(page.getByLabel('Correo electrónico', { exact: true })).toHaveValue('corregido@ejemplo.test')
})
