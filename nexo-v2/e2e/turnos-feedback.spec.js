import { test, expect } from '@playwright/test'

const person = { id: 'person-qa', nombre: 'Persona ficticia QA', rut: '11.111.111-1', disponibilidad: 'disponible' }
const order = { id: 'order-qa', nombre: 'Orden de servicio QA', estado: 'abierta', personalReq: 1 }

async function mockTurnos(page, { role = 'client_admin', people = [person], orders = [order], status = 200, hold = false, failLoad = false } = {}) {
  const fixture = { writes: [], turnos: [], version: 1, status, hold, failLoad, release: null, conflictNextWrite: false, failLoadAfterConflict: false, holdNextRead: false, releaseRead: null }
  await page.addInitScript(() => {
    window.qaTurnoConfirmations = 0
    window.addEventListener('nexo:mutation-completed', () => { window.qaTurnoConfirmations++ })
  })
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    const json = (body, responseStatus = 200) => route.fulfill({ status: responseStatus, json: body })
    if (path === '/api/auth/me') return json({ user: { id: 'user-qa', name: 'Persona QA', email: 'turnos@ejemplo.test', role, permissions: { modules: {} } }, tenant: { id: 'tenant-qa', name: 'Empresa QA Turnos' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') {
      const failure = fixture.failLoad
      if (fixture.holdNextRead) { fixture.holdNextRead = false; await new Promise(resolve => { fixture.releaseRead = resolve }) }
      if (failure) return json({ error: 'STATE_UNAVAILABLE' }, 503)
      return json({ state: { trabajadores: people, mantenciones: orders, turnos: fixture.turnos, minas: [], asignaciones: [] }, moduleVersions: { turnos: fixture.version } })
    }
    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const body = request.postDataJSON(); fixture.writes.push(body)
      if (fixture.hold) await new Promise(resolve => { fixture.release = resolve })
      if (fixture.conflictNextWrite) {
        fixture.conflictNextWrite = false
        fixture.turnos.push({ id: 'external-shift-qa', trabId: person.id, mantId: order.id, fecha: '2026-11-04', turno: 'noche', regimen: '7x7', asistencia: 'presente', ingreso: '20:00', salida: '04:00', hh: 8 })
        fixture.version++
        fixture.failLoad = fixture.failLoadAfterConflict
        return json({ error: 'MODULE_VERSION_CONFLICT' }, 409)
      }
      if (fixture.status === 403) return json({ error: 'FIELD_PERMISSION_DENIED' }, 403)
      if (fixture.status !== 200) return json({ error: 'DUPLICATE_SHIFT' }, fixture.status)
      expect(body.changes.turnos.version).toBe(fixture.version)
      expect(Object.keys(body.changes)).toEqual(['turnos'])
      fixture.turnos = structuredClone(body.changes.turnos.data); fixture.version++
      return json({ moduleVersions: { turnos: fixture.version } })
    }
    return json({})
  })
  return fixture
}

async function openModal(page) {
  await page.goto('/app/turnos')
  await page.getByRole('button', { name: 'Programar turno', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Programar jornada' })).toBeVisible()
}

for (const entry of [
  { name: 'persona y orden', people: [], orders: [], reason: /persona habilitada y una orden de servicio/ },
  { name: 'persona habilitada', people: [], orders: [order], reason: /persona habilitada/ },
  { name: 'orden de servicio', people: [person], orders: [], reason: /una orden de servicio/ },
  { name: 'persona restringida', people: [{ ...person, bloqueado: true }], orders: [order], reason: /persona habilitada/ },
]) {
  test(`Programar explica el requisito faltante: ${entry.name}`, async ({ page }) => {
    const fixture = await mockTurnos(page, entry)
    await page.goto('/app/turnos')
    const button = page.getByRole('button', { name: 'Programar turno', exact: true })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAccessibleDescription(entry.reason)
    await expect(button).not.toHaveAccessibleDescription(/perfil no permite|Acción no disponible/)
    const descriptionId = await button.getAttribute('aria-describedby')
    await expect(page.locator(`[id="${descriptionId}"]`)).toBeVisible()
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
    expect(fixture.writes).toHaveLength(0)
  })
}

for (const role of ['consulta', 'acreditacion']) {
  test(`el rol ${role} sólo consulta y no evade el permiso al forzar el botón`, async ({ page }) => {
    const fixture = await mockTurnos(page, { role })
    await page.goto('/app/turnos')
    const button = page.getByRole('button', { name: 'Programar turno', exact: true })
    await expect(button).toBeDisabled()
    await expect(button).toHaveAccessibleDescription(/Tu perfil no permite programar jornadas/)
    await button.evaluate(element => { element.disabled = false; element.click() })
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(fixture.writes).toHaveLength(0)
    await expect(page.getByRole('heading', { name: 'Turnos y asistencia' })).toBeVisible()
  })
}

for (const role of ['domian_admin', 'client_admin', 'rrhh', 'prevencion']) {
  test(`el rol autorizado ${role} registra y confirma exactamente una vez`, async ({ page }) => {
    const fixture = await mockTurnos(page, { role })
    await openModal(page)
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
    await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(1)
    await expect(page.locator('.nk-operation-feedback')).toContainText('Información guardada correctamente.')
    expect(fixture.writes).toHaveLength(1)
    expect(fixture.turnos).toHaveLength(1)
    expect(fixture.turnos[0]).toMatchObject({ trabId: person.id, mantId: order.id, asistencia: 'presente', hh: 12 })
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(1)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Turnos y asistencia' })).toBeVisible()
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
  })
}

test('Guardar explica los campos incompletos y recupera su estado al completarlos', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)
  const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
  await page.getByLabel('Persona', { exact: true }).selectOption('')
  await page.getByLabel('Proyecto / servicio', { exact: true }).selectOption('')
  await page.getByLabel('Fecha', { exact: true }).fill('')
  await expect(save).toBeDisabled()
  await expect(save).toHaveAccessibleDescription(/Completa persona, orden de servicio, fecha/)
  await expect(save).not.toHaveAccessibleDescription(/perfil/)
  await page.getByLabel('Persona', { exact: true }).selectOption(person.id)
  await page.getByLabel('Proyecto / servicio', { exact: true }).selectOption(order.id)
  await expect(save).toHaveAccessibleDescription(/Completa fecha/)
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-05')
  await expect(save).toBeEnabled()
  expect(fixture.writes).toHaveLength(0)
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
})

for (const width of [375, 1440]) {
  test(`guardado en curso explica la espera y evita dobles envíos a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    const fixture = await mockTurnos(page, { hold: true })
    await openModal(page)
    const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
    await save.click()
    await expect.poll(() => fixture.writes.length).toBe(1)
    const pending = page.getByRole('button', { name: 'Guardando…', exact: true })
    await expect(pending).toBeDisabled()
    await expect(pending).toHaveAccessibleDescription(/Se está guardando la jornada/)
    await expect(pending).not.toHaveAccessibleDescription(/Tu perfil/)
    for (const name of ['Cancelar', 'Cerrar']) {
      const action = page.getByRole('dialog').getByRole('button', { name, exact: true })
      await expect(action).toBeDisabled()
      await expect(action).toHaveAccessibleDescription(/Se está guardando la jornada/)
    }
    await expect(page.getByRole('button', { name: 'Programar turno', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Programar turno', exact: true })).toHaveAccessibleDescription(/Se está guardando/)
    await expect(page.getByLabel('Fecha', { exact: true })).toBeDisabled()
    await pending.evaluate(element => { element.disabled = false; element.click() })
    await pending.evaluate(element => { element.disabled = true })
    await page.locator('.nk-dialog-backdrop').click({ position: { x: 3, y: 3 } })
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(fixture.writes).toHaveLength(1)
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
    await pending.scrollIntoViewIfNeeded()
    await expect(pending).toBeInViewport()
    await page.screenshot({ path: test.info().outputPath(`turnos-guardando-${width}.png`), fullPage: true })
    fixture.release()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(1)
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(1)
    expect(fixture.writes).toHaveLength(1)
  })
}

for (const responseStatus of [403, 409]) {
  test(`rechazo autoritativo ${responseStatus} no confirma y conserva el formulario`, async ({ page }) => {
    const fixture = await mockTurnos(page, { status: responseStatus })
    await openModal(page)
    await page.getByLabel('Fecha', { exact: true }).fill('2026-11-05')
    await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await page.evaluate(({ worker, service, turnos, version }) => window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded', { detail: { result: { state: { trabajadores: [worker], mantenciones: [service], turnos, minas: [], asignaciones: [] }, moduleVersions: { turnos: version } }, sourcePath: '/app/turnos' } })), { worker: person, service: order, turnos: fixture.turnos, version: fixture.version })
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-05')
    await expect(page.getByRole('button', { name: 'Guardar jornada', exact: true })).toBeEnabled()
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
    expect(fixture.turnos).toHaveLength(0)
    fixture.status = 200
    await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.locator('.nk-operation-feedback')).toHaveCount(1)
    expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(1)
    expect(fixture.turnos).toHaveLength(1)
  })
}

test('un fallo posterior a un éxito retira la confirmación anterior sin publicar otra', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)
  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(1)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded', { detail: { result: { state: {}, moduleVersions: {} }, sourcePath: '/app/otra-ruta' } })))
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(1)
  fixture.status = 409
  await page.getByRole('button', { name: 'Programar turno', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(1)
  expect(fixture.turnos).toHaveLength(1)
})

test('la carga fallida explica el estado real y su recuperación no confirma escrituras', async ({ page }) => {
  const fixture = await mockTurnos(page, { failLoad: true })
  await page.goto('/app/turnos')
  const program = page.getByRole('button', { name: 'Programar turno', exact: true })
  await expect(program).toBeDisabled()
  await expect(program).toHaveAccessibleDescription(/No fue posible cargar las personas y órdenes/)
  fixture.failLoad = false
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
  await expect(program).toBeEnabled()
  await expect(page.locator('.nk-operation-feedback-error')).toHaveCount(0)
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
  expect(fixture.writes).toHaveLength(0)
})

test('el conflicto actualiza jornadas y versión conservando borrador y turno externo, sin reenvío automático', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-05')
  await page.getByLabel('Ingreso', { exact: true }).fill('09:30')
  await page.getByLabel('HH reales', { exact: true }).fill('10.5')
  fixture.conflictNextWrite = true
  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Tu formulario se conserva')
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-05')
  await expect(page.getByLabel('Ingreso', { exact: true })).toHaveValue('09:30')
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('10.5')
  await expect(page.getByRole('button', { name: 'Guardar jornada', exact: true })).toBeEnabled()
  expect(fixture.writes).toHaveLength(1)
  expect(fixture.turnos).toHaveLength(1)
  expect(fixture.version).toBe(2)
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.writes).toHaveLength(2)
  expect(fixture.writes[1].changes.turnos.version).toBe(2)
  expect(fixture.turnos).toHaveLength(2)
  expect(fixture.turnos.find(item => item.id === 'external-shift-qa')).toMatchObject({ turno: 'noche', hh: 8 })
  expect(fixture.turnos.find(item => item.id !== 'external-shift-qa')).toMatchObject({ fecha: '2026-11-05', ingreso: '09:30', hh: 10.5 })
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(1)
})

test('si falla la lectura tras conflicto bloquea nuevos PUT y permite recuperar sin perder el formulario', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-07')
  await page.getByLabel('HH reales', { exact: true }).fill('9.5')
  fixture.conflictNextWrite = true
  fixture.failLoadAfterConflict = true
  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
  await expect(save).toBeDisabled()
  await expect(save).toHaveAccessibleDescription(/Actualiza los datos antes de volver a guardar/)
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-07')
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('9.5')
  await save.evaluate(element => { element.disabled = false; element.click(); element.disabled = true })
  expect(fixture.writes).toHaveLength(1)
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
  fixture.failLoad = false
  await page.getByRole('dialog').getByRole('button', { name: 'Actualizar jornadas', exact: true }).click()
  await expect(save).toBeEnabled()
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('9.5')
  await expect(page.locator('.nk-operation-feedback-error')).toHaveCount(0)
  expect(fixture.writes).toHaveLength(1)
  await save.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.turnos).toHaveLength(2)
  expect(fixture.writes[1].changes.turnos.version).toBe(2)
  expect(fixture.turnos.some(item => item.id === 'external-shift-qa')).toBe(true)
})

test('cerrar el aviso global deja un reintento local que recupera Programar sin confirmación', async ({ page }) => {
  const fixture = await mockTurnos(page, { failLoad: true })
  await page.goto('/app/turnos')
  await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).click()
  await expect(page.locator('.nk-operation-feedback-error')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reintentar carga', exact: true })).toBeVisible()
  fixture.failLoad = false
  await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Programar turno', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Reintentar carga', exact: true })).toHaveCount(0)
  await expect(page.locator('.nk-operation-feedback')).toHaveCount(0)
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
})

test('un reintento global tardío que falla no revierte una recuperación local más reciente', async ({ page }) => {
  const fixture = await mockTurnos(page, { failLoad: true })
  await page.goto('/app/turnos')
  await expect(page.locator('.nk-operation-feedback-error')).toBeVisible()
  fixture.holdNextRead = true
  await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click()
  await expect.poll(() => Boolean(fixture.releaseRead)).toBe(true)
  fixture.failLoad = false
  await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Programar turno', exact: true })).toBeEnabled()
  await expect(page.locator('.nk-operation-feedback-error')).toHaveCount(0)
  const stale = page.waitForResponse(response => response.url().endsWith('/api/state') && response.status() === 503)
  fixture.releaseRead()
  await (await stale).finished()
  await expect(page.locator('.nk-operation-feedback-error')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Programar turno', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
})

test('la respuesta de un reintento local abandonado no borra el error de otro módulo', async ({ page }) => {
  const fixture = await mockTurnos(page, { failLoad: true })
  await page.goto('/app/turnos')
  await page.getByRole('button', { name: 'Cerrar aviso', exact: true }).click()
  fixture.failLoad = false
  fixture.holdNextRead = true
  await page.getByRole('button', { name: 'Reintentar carga', exact: true }).click()
  await expect.poll(() => Boolean(fixture.releaseRead)).toBe(true)
  fixture.failLoad = true
  await page.getByRole('link', { name: 'Personas', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/trabajadores$/)
  await expect(page.locator('.nk-operation-feedback-error')).toBeVisible()
  const stale = page.waitForResponse(response => response.url().endsWith('/api/state') && response.status() === 200)
  fixture.releaseRead()
  await (await stale).finished()
  await expect(page.locator('.nk-operation-feedback-error')).toBeVisible()
  await expect(page.locator('.nk-people-page')).toBeVisible()
  expect(await page.evaluate(() => window.qaTurnoConfirmations)).toBe(0)
})
