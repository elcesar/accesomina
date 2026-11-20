import { test, expect } from '@playwright/test'

const person = {
  id: 'person-qa',
  nombre: 'Persona ficticia QA',
  rut: '11.111.111-1',
  disponibilidad: 'disponible',
}
const order = {
  id: 'order-qa',
  nombre: 'Orden de servicio QA',
  estado: 'abierta',
  personalReq: 1,
}

async function mockTurnos(page, {
  role = 'client_admin',
  people = [person],
  orders = [order],
} = {}) {
  const fixture = {
    writes: [],
    turnos: [],
    version: 1,
    conflictNextWrite: false,
    failRefreshAfterConflict: false,
    failReads: false,
  }

  await page.addInitScript(() => {
    window.qaTurnosMutationCount = 0
    window.addEventListener('nexo:mutation-completed', () => {
      window.qaTurnosMutationCount += 1
    })
  })

  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })

    if (path === '/api/auth/me') {
      return json({
        user: {
          id: 'user-qa',
          name: 'Persona QA',
          email: 'turnos@ejemplo.test',
          role,
          permissions: { modules: {} },
        },
        tenant: { id: 'tenant-qa', name: 'Empresa QA Turnos' },
        csrfToken: 'qa-csrf',
      })
    }

    if (path === '/api/settings') {
      return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    }

    if (path === '/api/state') {
      if (fixture.failReads) return json({ error: 'STATE_UNAVAILABLE' }, 503)
      return json({
        state: {
          trabajadores: people,
          mantenciones: orders,
          turnos: fixture.turnos,
          minas: [],
          asignaciones: [],
        },
        moduleVersions: { turnos: fixture.version },
      })
    }

    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const body = request.postDataJSON()
      fixture.writes.push(body)

      if (fixture.conflictNextWrite) {
        fixture.conflictNextWrite = false
        fixture.turnos.push({
          id: 'turno-externo-qa',
          trabId: person.id,
          mantId: order.id,
          fecha: '2026-11-04',
          turno: 'noche',
          regimen: '7x7',
          asistencia: 'presente',
          ingreso: '20:00',
          salida: '04:00',
          hh: 8,
        })
        fixture.version += 1
        fixture.failReads = fixture.failRefreshAfterConflict
        return json({ error: 'MODULE_VERSION_CONFLICT' }, 409)
      }

      expect(Object.keys(body.changes)).toEqual(['turnos'])
      expect(body.changes.turnos.version).toBe(fixture.version)
      fixture.turnos = body.changes.turnos.data
      fixture.version += 1
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

test('explica el prerrequisito real de Programar turno, sin el texto genérico', async ({ page }) => {
  const fixture = await mockTurnos(page, { people: [], orders: [order] })
  await page.goto('/app/turnos')

  const program = page.getByRole('button', { name: 'Programar turno', exact: true })
  await expect(program).toBeDisabled()
  await expect(program).toHaveAccessibleDescription(/Necesitas una persona habilitada para programar un turno/)
  await expect(program).not.toHaveAccessibleDescription(/Acción no disponible/)
  expect(fixture.writes).toHaveLength(0)
})

test('explica cuando falta una orden de servicio', async ({ page }) => {
  const fixture = await mockTurnos(page, { people: [person], orders: [] })
  await page.goto('/app/turnos')

  const program = page.getByRole('button', { name: 'Programar turno', exact: true })
  await expect(program).toBeDisabled()
  await expect(program).toHaveAccessibleDescription(/Necesitas una orden de servicio para programar un turno/)
  await expect(program).not.toHaveAccessibleDescription(/Acción no disponible/)
  expect(fixture.writes).toHaveLength(0)
})

test('el rol de consulta no evade el permiso al forzar el botón', async ({ page }) => {
  const fixture = await mockTurnos(page, { role: 'consulta' })
  await page.goto('/app/turnos')

  const program = page.getByRole('button', { name: 'Programar turno', exact: true })
  await expect(program).toBeDisabled()
  await expect(program).toHaveAccessibleDescription(/Tu perfil no permite programar jornadas/)
  await expect(program).not.toHaveAccessibleDescription(/Acción no disponible/)

  await program.evaluate(element => {
    element.disabled = false
    element.click()
  })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.writes).toHaveLength(0)
})

test('registra una jornada con una única confirmación incluso ante doble activación', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)

  const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
  await save.evaluate(element => {
    element.click()
    element.click()
  })

  await expect.poll(() => fixture.writes.length).toBe(1)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.turnos).toHaveLength(1)
  expect(await page.evaluate(() => window.qaTurnosMutationCount)).toBe(1)
})

test('actualiza el conflicto, conserva el borrador y no reenvía automáticamente', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)

  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-05')
  await page.getByLabel('Ingreso', { exact: true }).fill('09:30')
  await page.getByLabel('HH reales', { exact: true }).fill('10.5')
  fixture.conflictNextWrite = true

  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Programar jornada' })
  await expect(dialog.getByRole('alert')).toContainText('Tu formulario se conserva')
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-05')
  await expect(page.getByLabel('Ingreso', { exact: true })).toHaveValue('09:30')
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('10.5')
  expect(fixture.writes).toHaveLength(1)
  expect(fixture.turnos).toHaveLength(1)
  expect(await page.evaluate(() => window.qaTurnosMutationCount)).toBe(0)

  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.writes).toHaveLength(2)
  expect(fixture.writes[1].changes.turnos.version).toBe(2)
  expect(fixture.turnos).toHaveLength(2)
  expect(fixture.turnos.some(turno => turno.id === 'turno-externo-qa')).toBe(true)
  expect(await page.evaluate(() => window.qaTurnosMutationCount)).toBe(1)
})

test('bloquea el reenvío si falla la recarga del conflicto y permite recuperarlo sin perder el formulario', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 })
  const fixture = await mockTurnos(page)
  await openModal(page)

  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-07')
  await page.getByLabel('HH reales', { exact: true }).fill('9.5')
  fixture.conflictNextWrite = true
  fixture.failRefreshAfterConflict = true

  await page.getByRole('button', { name: 'Guardar jornada', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Programar jornada' })
  const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
  await expect(dialog.getByRole('alert')).toContainText('No fue posible actualizar las jornadas')
  await expect(save).toBeDisabled()
  await expect(save).toHaveAccessibleDescription(/Actualiza los datos antes de volver a guardar/)
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-07')
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('9.5')
  expect(fixture.writes).toHaveLength(1)

  fixture.failReads = false
  await dialog.getByRole('button', { name: 'Actualizar jornadas', exact: true }).click()
  await expect(save).toBeEnabled()
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-07')
  await expect(page.getByLabel('HH reales', { exact: true })).toHaveValue('9.5')

  await save.click()
  await expect(dialog).toHaveCount(0)
  expect(fixture.writes).toHaveLength(2)
  expect(fixture.writes[1].changes.turnos.version).toBe(2)
})

test('el reintento global no desbloquea un conflicto sin versión válida de turnos', async ({ page }) => {
  const fixture = await mockTurnos(page)
  await openModal(page)
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-07')
  fixture.conflictNextWrite = true
  fixture.failRefreshAfterConflict = true

  const save = page.getByRole('button', { name: 'Guardar jornada', exact: true })
  await save.click()
  await expect(save).toBeDisabled()
  expect(fixture.writes).toHaveLength(1)

  // A shared retry may report success with a partial response but no Turnos version.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded', {
    detail: { result: { state: { turnos: [] }, moduleVersions: {} } },
  })))
  await expect(save).toBeDisabled()
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-07')
  expect(fixture.writes).toHaveLength(1)

  // Invalid version types and negative values must not bypass conflict protection.
  for (const badVersion of ['2', -1]) {
    await page.evaluate(version => window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded', {
      detail: { result: { state: { turnos: [] }, moduleVersions: { turnos: version } } },
    })), badVersion)
    await expect(save).toBeDisabled()
  }

  await page.evaluate(({ rows, version }) => window.dispatchEvent(new CustomEvent('nexo:state-retry-succeeded', {
    detail: { result: { state: { turnos: rows }, moduleVersions: { turnos: version } } },
  })), { rows: fixture.turnos, version: fixture.version })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(fixture.writes).toHaveLength(2)
  expect(fixture.writes[1].changes.turnos.version).toBe(2)
})
