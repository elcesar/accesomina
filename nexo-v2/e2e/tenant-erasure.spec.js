import { test, expect } from '@playwright/test'

const erasureId = 'a'.repeat(64)
const tenant = { id: 'tenant-erasure-qa', company_name: 'Empresa ficticia QA', rut: '76.123.456-0', status: 'suspended', is_domian_admin: false }
const receipt = (count = 2) => ({ erasureId, deletedAt: '2026-10-29T10:00:00.000Z', reasonCode: 'cuenta_prueba', filesPending: count, lastError: 'STORAGE_DELETE_FAILED' })
const path = '/app/administracion-clientes'

async function backend(page, { role = 'domian_admin', deleted = false, initialPending = [], deleteResults = ['complete'], retryResults = ['complete'], cleanupUnavailable = false, loseStateRead = false } = {}) {
  let tenants = deleted ? [] : [{ ...tenant }], cleanups = structuredClone(initialPending), unavailable = cleanupUnavailable
  let tenantUnavailable = false
  let deleteGate = null, retryGate = null
  const calls = { deletes: [], retries: [], tenants: 0, cleanups: 0 }
  await page.route('**/api/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (pathname === '/api/auth/me') return json({ user: { id: 'global-admin-qa', name: 'Responsable QA', role }, tenant: { id: 'global-qa', name: 'Administración QA' }, csrfToken: 'qa-erasure-csrf' })
    if (pathname === '/api/settings') return json({ settings: {} })
    if (pathname === '/api/health') return json({ version: 'qa-local', commit: 'fixture' })
    if (pathname === '/api/tenants' && request.method() === 'GET') { calls.tenants++; return tenantUnavailable ? json({ error: 'SERVER_ERROR' }, 503) : json(tenants) }
    if (pathname === '/api/tenants/erasure-cleanups') { calls.cleanups++; return unavailable ? json({ error: 'SERVER_ERROR' }, 503) : json(cleanups) }
    if (pathname === `/api/tenants/${tenant.id}/data` && request.method() === 'DELETE') {
      const body = request.postData() ? request.postDataJSON() : null
      calls.deletes.push({ body, csrf: request.headers()['x-csrf-token'] })
      if (deleteGate) { const waiting = deleteGate; deleteGate = null; await waiting }
      if (body?.confirmation !== `ELIMINAR ${tenant.rut}` || body?.reasonCode !== 'cuenta_prueba') return json({ error: 'TENANT_ERASURE_CONFIRMATION_REQUIRED' }, 400)
      const result = deleteResults.shift() || 'complete'
      if (typeof result === 'number') return json({ error: 'TENANT_ERASURE_CONFIRMATION_REQUIRED' }, result)
      if (result === 'lost-no-commit') return route.abort('failed')
      tenants = []
      const pending = ['pending', 'unknown', 'lost-pending'].includes(result)
      cleanups = pending ? [receipt(result === 'unknown' ? null : 2)] : []
      if (result === 'unknown') unavailable = true
      if (result.startsWith('lost-')) { if (loseStateRead) tenantUnavailable = true; return route.abort('failed') }
      return json({ erased: true, erasureId, filesErased: pending ? 0 : 2, filesPending: result === 'unknown' ? null : pending ? 2 : 0, cleanupPending: pending }, pending ? 202 : 200)
    }
    if (pathname === `/api/tenants/erasure-cleanup/${erasureId}` && request.method() === 'POST') {
      calls.retries.push(request.postDataJSON())
      if (retryGate) { const waiting = retryGate; retryGate = null; await waiting }
      const result = retryResults.shift() || 'complete'
      if (typeof result === 'number') return json({ error: 'SERVER_ERROR' }, result)
      if (result === 'pending') { cleanups = [receipt(1)]; return json({ erasureId, filesErased: 1, filesPending: 1, cleanupPending: true }, 202) }
      cleanups = []
      return json({ erasureId, filesErased: 2, filesPending: 0, cleanupPending: false })
    }
    return json({})
  })
  return {
    calls,
    setCleanupUnavailable(value) { unavailable = value },
    setTenantUnavailable(value) { tenantUnavailable = value },
    pauseDelete() { let release; deleteGate = new Promise(resolve => { release = resolve }); return release },
    pauseRetry() { let release; retryGate = new Promise(resolve => { release = resolve }); return release },
  }
}

const pendingPanel = page => page.getByRole('region', { name: 'Limpiezas de archivos pendientes', exact: true })
async function openErasure(page) {
  await page.locator('tbody').getByRole('button', { name: 'Eliminar datos', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Eliminar cuenta y datos definitivamente', exact: true })
  await dialog.getByRole('combobox', { name: 'Motivo', exact: true }).selectOption('cuenta_prueba')
  await dialog.getByRole('textbox').fill(`ELIMINAR ${tenant.rut}`)
  return dialog
}
async function erase(page) { const dialog = await openErasure(page); await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click(); return dialog }

for (const width of [1440, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('200 confirma datos y archivos; envía motivo y RUT visibles como JSON una sola vez', async ({ page }) => {
      const api = await backend(page), release = api.pauseDelete()
      await page.goto(path)
      const dialog = await openErasure(page)
      await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click()
      await expect.poll(() => api.calls.deletes.length).toBe(1)
      await dialog.locator('form').dispatchEvent('submit')
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
      release()
      await expect(dialog).toBeHidden()
      await expect(page.getByText('La cuenta, sus datos y sus archivos fueron eliminados definitivamente.', { exact: true })).toBeVisible()
      expect(api.calls.deletes).toEqual([{ body: { confirmation: `ELIMINAR ${tenant.rut}`, reasonCode: 'cuenta_prueba' }, csrf: 'qa-erasure-csrf' }])
      await expect(pendingPanel(page).getByText('No hay limpiezas de archivos pendientes.', { exact: true })).toBeVisible()
      await expect(page.getByText('Registro eliminado correctamente.', { exact: true })).toHaveCount(0)
    })

    for (const mode of ['pending', 'unknown']) {
      test(`202 ${mode} nunca declara todos los archivos eliminados y conserva una referencia recuperable`, async ({ page }) => {
        await backend(page, { deleteResults: [mode] })
        await page.goto(path)
        const dialog = await erase(page)
        await expect(dialog).toBeHidden()
        await expect(page.getByText('La cuenta y sus datos fueron eliminados.', { exact: false })).toContainText('La limpieza de archivos sigue pendiente')
        await expect(page.getByText('La cuenta, sus datos y sus archivos fueron eliminados definitivamente.', { exact: true })).toHaveCount(0)
        await expect(pendingPanel(page).getByText(erasureId, { exact: true })).toBeVisible()
        await expect(pendingPanel(page).getByText(mode === 'unknown' ? 'Cantidad de archivos por confirmar' : '2 archivos pendientes', { exact: true })).toBeVisible()
        await expect(pendingPanel(page).getByRole('button', { name: 'Reintentar limpieza' })).toBeEnabled()
        await expect(page.locator('tbody')).not.toContainText(tenant.company_name)
      })
    }

    test('encuentra la cola después de recargar y reintenta202→200 sin una empresa existente', async ({ page }) => {
      const api = await backend(page, { deleted: true, initialPending: [receipt()], retryResults: ['pending', 'complete'] })
      await page.goto(path)
      const panel = pendingPanel(page)
      await expect(panel.getByText('2 archivos pendientes', { exact: true })).toBeVisible()
      await expect(panel).not.toContainText('STORAGE_DELETE_FAILED')
      await panel.getByRole('button', { name: 'Reintentar limpieza' }).click()
      await expect(panel.getByText('1 archivo pendiente', { exact: true })).toBeVisible()
      await page.reload()
      await expect(panel.getByText('1 archivo pendiente', { exact: true })).toBeVisible()
      await panel.getByRole('button', { name: 'Reintentar limpieza' }).click()
      await expect(panel.getByText('La limpieza de archivos se completó para la referencia seleccionada.', { exact: true })).toBeVisible()
      await expect(panel.getByText('No hay limpiezas de archivos pendientes.', { exact: true })).toBeVisible()
      expect(api.calls.deletes).toHaveLength(0)
      expect(api.calls.retries).toHaveLength(2)
      if (width === 375) expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })

    test('un error de lectura no se presenta como cola vacía y permite actualizar', async ({ page }) => {
      const api = await backend(page, { deleted: true, initialPending: [receipt()], cleanupUnavailable: true })
      await page.goto(path)
      const panel = pendingPanel(page)
      await expect(panel.getByRole('alert')).toContainText('No fue posible actualizar las limpiezas pendientes')
      await expect(panel.getByText('No hay limpiezas de archivos pendientes.', { exact: true })).toHaveCount(0)
      api.setCleanupUnavailable(false)
      await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
      await expect(panel.getByText(erasureId, { exact: true })).toBeVisible()
      await expect(panel.getByRole('alert')).toHaveCount(0)
    })

    test('un reintento fallido conserva la cola y bloquea doble clic antes de poder continuar', async ({ page }) => {
      const api = await backend(page, { deleted: true, initialPending: [receipt()], retryResults: [503, 'complete'] }), release = api.pauseRetry()
      await page.goto(path)
      const panel = pendingPanel(page), button = panel.getByRole('button', { name: 'Reintentar limpieza' })
      await button.click()
      await expect.poll(() => api.calls.retries.length).toBe(1)
      await panel.getByRole('button', { name: 'Reintentando…' }).dispatchEvent('click')
      expect(api.calls.retries).toHaveLength(1)
      release()
      await expect(panel.getByRole('alert')).toContainText('No pudimos confirmar que la limpieza se haya completado')
      await expect(button).toBeEnabled()
      await button.click()
      await expect(panel.getByText('No hay limpiezas de archivos pendientes.', { exact: true })).toBeVisible()
      expect(api.calls.retries).toHaveLength(2)
    })

    test('una respuesta DELETE perdida reconoce el borrado y recupera la limpieza pendiente sin repetirlo', async ({ page }) => {
      const api = await backend(page, { deleteResults: ['lost-pending'] })
      await page.goto(path)
      const dialog = await erase(page)
      await expect(dialog).toBeHidden()
      await expect(page.getByText('La actualización confirmó que la cuenta ya no está registrada.', { exact: false })).toBeVisible()
      await expect(pendingPanel(page).getByText(erasureId, { exact: true })).toBeVisible()
      await page.reload()
      await expect(pendingPanel(page).getByRole('button', { name: 'Reintentar limpieza' })).toBeVisible()
      await pendingPanel(page).getByRole('button', { name: 'Reintentar limpieza' }).click()
      await expect(pendingPanel(page).getByText('No hay limpiezas de archivos pendientes.', { exact: true })).toBeVisible()
      expect(api.calls.deletes).toHaveLength(1)
      expect(api.calls.retries).toHaveLength(1)
    })

    test('una respuesta perdida sin cola actualizada no se transforma en confirmación total de archivos', async ({ page }) => {
      const api = await backend(page, { deleteResults: ['lost-complete'] })
      await page.goto(path)
      const dialog = await erase(page)
      await expect(dialog).toBeHidden()
      await expect(page.getByText('La actualización confirmó que la cuenta ya no está registrada.', { exact: false })).toBeVisible()
      await expect(page.getByText('La cuenta, sus datos y sus archivos fueron eliminados definitivamente.', { exact: true })).toHaveCount(0)
      expect(api.calls.deletes).toHaveLength(1)
      expect(api.calls.retries).toHaveLength(0)
    })

    test('no repite DELETE si falla la comprobación y permite consultar el estado nuevamente', async ({ page }) => {
      const api = await backend(page, { deleteResults: ['lost-pending'], loseStateRead: true })
      await page.goto(path)
      const dialog = await erase(page)
      await expect(dialog.getByRole('alert')).toContainText('No pudimos confirmar el resultado de la eliminación')
      await expect(dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true })).toBeDisabled()
      expect(api.calls.deletes).toHaveLength(1)
      api.setTenantUnavailable(false)
      await dialog.getByRole('button', { name: 'Comprobar estado de eliminación', exact: true }).click()
      await expect(dialog).toBeHidden()
      await expect(pendingPanel(page).getByText(erasureId, { exact: true })).toBeVisible()
      expect(api.calls.deletes).toHaveLength(1)
    })

    test('si la cuenta sigue registrada tras perderse la respuesta, ofrece un reintento explícito', async ({ page }) => {
      const api = await backend(page, { deleteResults: ['lost-no-commit', 'complete'] })
      await page.goto(path)
      const dialog = await erase(page)
      await expect(dialog.getByRole('alert')).toContainText('La cuenta sigue registrada')
      await expect(dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true })).toBeEnabled()
      expect(api.calls.deletes).toHaveLength(1)
      await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(api.calls.deletes).toHaveLength(2)
    })

    test('una confirmación rechazada mantiene formulario y motivo, sin declarar borrado', async ({ page }) => {
      const api = await backend(page, { deleteResults: [400, 'complete'] })
      await page.goto(path)
      const dialog = await erase(page)
      await expect(dialog.getByRole('alert')).toBeVisible()
      await expect(dialog.getByRole('textbox')).toHaveValue(`ELIMINAR ${tenant.rut}`)
      await expect(dialog.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
      await expect(dialog.getByRole('textbox')).toHaveAttribute('aria-describedby', 'tenant-erasure-error')
      await expect(dialog.getByRole('textbox')).toBeFocused()
      await expect(dialog.getByRole('combobox', { name: 'Motivo', exact: true })).toHaveValue('cuenta_prueba')
      await expect(page.getByText('La cuenta, sus datos y sus archivos fueron eliminados definitivamente.', { exact: true })).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Eliminar definitivamente', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(api.calls.deletes).toHaveLength(2)
    })

    for (const role of ['client_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta']) {
      test(`${role} no consulta ni reintenta limpiezas de administración global`, async ({ page }) => {
        const api = await backend(page, { role, deleted: true, initialPending: [receipt()] })
        await page.goto(path)
        await expect(page.getByRole('heading', { name: 'Acceso reservado a Nexo Klar', exact: true })).toBeVisible()
        await expect(pendingPanel(page)).toHaveCount(0)
        expect(api.calls.tenants).toBe(0)
        expect(api.calls.cleanups).toBe(0)
        expect(api.calls.deletes).toHaveLength(0)
        expect(api.calls.retries).toHaveLength(0)
      })
    }
  })
}
