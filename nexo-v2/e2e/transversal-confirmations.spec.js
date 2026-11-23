import { test, expect } from '@playwright/test'

async function mockPortal(page, { role = 'client_admin', kind = 'nuevo_cliente', tenantStatus = 'active' } = {}) {
  let state = {
    minas: [{ id: 'client-qa', nombre: 'Cliente QA', contactos: [{ id: 'contact-qa', nombre: 'Contacto QA' }], requisitos: [{ id: 'requirement-qa', nombre: 'Requisito QA' }] }],
    contratos: [{ id: 'contract-qa', minaId: 'client-qa', nombre: 'Contrato QA' }],
    prospectos: [{ id: 'opportunity-qa', company: 'Oportunidad QA', type: kind, stage: 'ganada', clientId: 'client-qa', contractId: 'contract-qa', service: 'Servicio QA' }],
    mantenciones: [],
  }
  let users = [{ id: 'user-qa', full_name: 'Usuario QA', email: 'usuario@ejemplo.test', role: 'consulta', active: true, mfa_enabled: true }]
  let tenants = [{ id: 'tenant-qa', company_name: 'Empresa QA', status: tenantStatus, admin_email: 'admin@ejemplo.test' }]
  const calls = []
  let fail = false, pause = null, nativeDialogs = 0
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss() })
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (request.method() === 'GET') {
      if (path === '/api/auth/me') return json({ user: { id: 'session-qa', role }, tenant: { id: 'session-tenant-qa', name: 'Empresa QA' }, csrfToken: 'fixture-qa' })
      if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
      if (path === '/api/state') return json({ state, moduleVersions: { minas: 1, contratos: 1, mantenciones: 1, prospectos: 1 } })
      if (path === '/api/users') return json(users)
      if (path === '/api/tenants') return json(tenants)
      return json({})
    }
    calls.push({ path, method: request.method(), body: request.postDataJSON() })
    if (pause) { const waiting = pause; pause = null; await waiting }
    if (fail) { fail = false; return json({ error: 'QA_TEMPORARY_FAILURE' }, 503) }
    if (path === '/api/state/modules') {
      state = { ...state, ...Object.fromEntries(Object.entries(request.postDataJSON().changes).map(([key, value]) => [key, value.data])) }
      return json({ moduleVersions: { minas: 2, contratos: 2, mantenciones: 2, prospectos: 2 } })
    }
    if (path.endsWith('/reset-mfa')) { users = users.map(user => ({ ...user, mfa_enabled: false })); return json({ user: users[0], message: 'Verificación adicional restablecida.' }) }
    if (path.includes('/users/')) return json({ message: 'Acceso restablecido.' })
    if (path.endsWith('/reset-admin-password')) return json({ message: 'Acceso restablecido.' })
    if (path === '/api/tenants/tenant-qa') {
      const status = request.method() === 'DELETE' ? 'deleted' : request.postDataJSON().status
      tenants = tenants.map(tenant => ({ ...tenant, status }))
      return json(tenants[0])
    }
    return json({})
  })
  return {
    calls,
    state: () => state,
    nativeDialogs: () => nativeDialogs,
    failAndPauseNext() {
      fail = true
      let release
      pause = new Promise(resolve => { release = resolve })
      return release
    },
  }
}

async function cancelAndReopen(page, opener, api, name, role = 'alertdialog') {
  await opener.click()
  const dialog = page.getByRole(role, { name, exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  const box = await dialog.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width)
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button').last()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  expect(api.calls).toHaveLength(0)
  await opener.click()
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  expect(api.calls).toHaveLength(0)
  await opener.click()
  return dialog
}

async function failThenRetry(page, dialog, api, confirmLabel) {
  const release = api.failAndPauseNext()
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await expect.poll(() => api.calls.length).toBe(1)
  await expect(dialog).toHaveAttribute('aria-busy', 'true')
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Procesando…', exact: true })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Procesando…', exact: true }).dispatchEvent('click')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  expect(api.calls).toHaveLength(1)
  release()
  await expect(dialog.getByRole('alert')).toContainText('Inténtalo nuevamente')
  await expect(dialog).toHaveAttribute('data-state', 'error')
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(api.calls).toHaveLength(2)
  expect(api.nativeDialogs()).toBe(0)
}

for (const width of [1440, 1024, 768, 480, 375]) {
  test.describe(`confirmaciones a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })
    for (const [field, text, openerLabel, dialogTitle] of [
      ['contactos', 'Contacto QA', 'Eliminar contacto Contacto QA', 'Eliminar contacto'],
      ['requisitos', 'Requisito QA', 'Quitar requisito Requisito QA', 'Quitar requisito'],
    ]) {
      test(`Cliente: ${field} sólo cambia el borrador después de confirmar`, async ({ page }) => {
        const api = await mockPortal(page)
        await page.goto('/app/clientes/client-qa')
        const opener = page.getByRole('button', { name: openerLabel, exact: true })
        const dialog = await cancelAndReopen(page, opener, api, dialogTitle)
        await expect(dialog).toContainText('Guarda los cambios del cliente')
        await dialog.getByRole('button', { name: dialogTitle, exact: true }).click()
        await expect(dialog).toBeHidden()
        await expect(opener).toHaveCount(0)
        expect(api.calls).toHaveLength(0)
        expect(api.state().minas[0][field][0].nombre).toBe(text)
        await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
        await expect.poll(() => api.calls.length).toBe(1)
        expect(api.state().minas[0][field]).toEqual([])
        await page.reload()
        await expect(page.getByRole('heading', { name: 'Cliente QA', exact: true }).first()).toBeVisible()
        await expect(opener).toHaveCount(0)
        expect(api.nativeDialogs()).toBe(0)
      })
    }
    for (const [kind, target, module] of [['nuevo_cliente', 'Cliente', 'minas'], ['nuevo_contrato', 'Contrato', 'contratos'], ['nuevo_servicio', 'Orden de servicio', 'mantenciones']]) {
      test(`Oportunidad: convertir a ${target} confirma, conserva errores y permite reintentar`, async ({ page }) => {
        const api = await mockPortal(page, { kind })
        await page.goto('/app/oportunidades')
        const opener = page.locator('tbody').getByRole('button', { name: 'Convertir', exact: true })
        const dialog = await cancelAndReopen(page, opener, api, 'Convertir oportunidad', 'dialog')
        await expect(dialog).toContainText(`Oportunidad QA” en ${target}`)
        await failThenRetry(page, dialog, api, `Convertir a ${target}`)
        const changes = api.calls[1].body.changes
        expect(changes[module].data.some(row => row.createdFromLead === 'opportunity-qa')).toBe(true)
        expect(changes.prospectos.data[0].convertedId).toBeTruthy()
        await expect(page.locator('tbody')).toContainText('Convertida')
      })
    }
    for (const [openerLabel, title, endpoint] of [['Restablecer acceso', 'Restablecer acceso', 'reset-password'], ['Restablecer MFA', 'Restablecer verificación adicional', 'reset-mfa']]) {
      test(`Usuario: ${openerLabel} requiere confirmación y conserva el diálogo ante error`, async ({ page }) => {
        const api = await mockPortal(page)
        await page.goto('/app/usuarios')
        const opener = page.locator('tbody').getByRole('button', { name: openerLabel, exact: true })
        const dialog = await cancelAndReopen(page, opener, api, title)
        await expect(dialog).toContainText('usuario@ejemplo.test')
        await failThenRetry(page, dialog, api, openerLabel)
        expect(api.calls.every(call => call.path === `/api/users/user-qa/${endpoint}`)).toBe(true)
        await expect(page.locator('.nk-form-message')).toContainText('restablecid')
      })
    }
    for (const [openerLabel, title, confirmLabel, status, role, method, endpoint] of [
      ['Activar', 'Activar cuenta', 'Activar cuenta', 'suspended', 'dialog', 'PATCH', '/api/tenants/tenant-qa'],
      ['Suspender', 'Suspender cuenta', 'Suspender cuenta', 'active', 'alertdialog', 'PATCH', '/api/tenants/tenant-qa'],
      ['Restablecer acceso', 'Restablecer acceso del administrador', 'Restablecer acceso', 'active', 'alertdialog', 'POST', '/api/tenants/tenant-qa/reset-admin-password'],
      ['Eliminar', 'Eliminar cuenta de cliente', 'Eliminar cuenta', 'active', 'alertdialog', 'DELETE', '/api/tenants/tenant-qa'],
    ]) {
      test(`Administración: ${openerLabel} bloquea cambios antes de confirmar y permite reintentar`, async ({ page }) => {
        const api = await mockPortal(page, { role: 'domian_admin', tenantStatus: status })
        await page.goto('/app/administracion-clientes')
        const opener = page.locator('tbody').getByRole('button', { name: openerLabel, exact: true })
        const dialog = await cancelAndReopen(page, opener, api, title, role)
        await expect(dialog).toContainText('Empresa QA')
        await failThenRetry(page, dialog, api, confirmLabel)
        expect(api.calls.every(call => call.method === method && call.path === endpoint)).toBe(true)
        await expect(page.locator('.nk-form-message')).toBeVisible()
      })
    }
  })
}

test('Consulta no obtiene acciones para quitar contactos o requisitos', async ({ page }) => {
  const api = await mockPortal(page, { role: 'consulta' })
  await page.goto('/app/clientes/client-qa')
  await expect(page.getByRole('heading', { name: 'Cliente QA', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Eliminar contacto|^Quitar requisito/ })).toHaveCount(0)
  expect(api.calls).toHaveLength(0)
})

test('un administrador de empresa no puede abrir la administración global', async ({ page }) => {
  const api = await mockPortal(page)
  await page.goto('/app/administracion-clientes')
  await expect(page.getByRole('alert')).toContainText('Sin acceso a administración Nexo Klar')
  await expect(page.getByRole('button', { name: /^Eliminar$|^Restablecer acceso$/ })).toHaveCount(0)
  expect(api.calls).toHaveLength(0)
})
