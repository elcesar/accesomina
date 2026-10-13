import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function mockPeople(page) {
  const state = {
    minas: [{ id: 'qa-client', nombre: 'Cliente QA' }, { id: 'other-client', nombre: 'Otro cliente QA' }],
    contratos: [], restricted: [],
    mantenciones: [{ id: 'qa-order', nombre: 'Orden QA', minaId: 'qa-client', estado: 'activo' }],
    trabajadores: [
      { id: 'qa-person', nombre: 'QA Ronda 02 Persona Ficticia', rut: '11.111.111-1', tipo: 'permanente', especialidad: 'Mecánico Industrial', disponibilidad: 'disponible', mineras: [], workerItems: [] },
      { id: 'other-person', nombre: 'Otra persona QA', rut: '14.507.215-8', tipo: 'permanente', disponibilidad: 'disponible', mineras: ['other-client'], workerItems: [] },
      { id: 'vacation-person', nombre: 'Vacaciones QA', rut: '14.567.890-0', tipo: 'permanente', disponibilidad: 'vacaciones', mineras: [], workerItems: [] },
    ],
    asignaciones: [
      { id: 'qa-assignment', trabId: 'qa-person', mantId: 'qa-order', estado: 'confirmado' },
      { id: 'retired-assignment', trabId: 'other-person', mantId: 'qa-order', estado: 'retirado' },
    ],
  }
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state, moduleVersions: { trabajadores: 1 } })
    return json({})
  })
  await page.goto('/app/trabajadores')
  await expect(page.locator('.nk-people-row')).toHaveCount(3)
}

test('lista y ficha muestran la misma disponibilidad y el filtro Asignado incluye la persona', async ({ page }) => {
  await mockPeople(page)
  const row = page.locator('.nk-people-row').filter({ hasText: 'QA Ronda 02 Persona Ficticia' })
  await expect(row.locator('.nk-badge').filter({ hasText: /^Asignado$/ })).toBeVisible()
  await page.getByLabel('Filtrar por disponibilidad').selectOption('asignado')
  await expect(page.locator('.nk-people-row')).toHaveCount(1)
  await row.getByRole('button', { name: 'Ficha', exact: true }).click()
  await expect(page.getByText('Disponibilidad: Asignado', { exact: true })).toBeVisible()
})

test('el filtro Cliente y el contexto consideran la asignación activa sin incluir las retiradas', async ({ page }) => {
  await mockPeople(page)
  await page.getByLabel('Filtrar por cliente').selectOption('qa-client')
  await expect(page.locator('.nk-people-row')).toHaveCount(1)
  await expect(page.locator('.nk-people-context-primary')).toHaveText('Cliente QA')
  await expect(page.locator('.nk-people-row')).toContainText('QA Ronda 02 Persona Ficticia')
})

for (const width of [1440, 768, 375]) {
  test(`búsqueda y exportación filtrada funcionan a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockPeople(page)
    const search = page.getByRole('textbox', { name: 'Buscar persona por nombre o RUT' })
    for (const query of ['11.111.111-1', '11111111-1', '111111111', ' QA Ronda 02 ', 'qa ronda 02']) {
      await search.fill(query)
      await expect(page.locator('.nk-people-row')).toHaveCount(1)
      await expect(page.locator('.nk-people-row')).toContainText('QA Ronda 02 Persona Ficticia')
    }
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar', exact: true }).click()
    const download = await downloadPromise
    const csv = await readFile(await download.path(), 'utf8')
    expect(csv).toContain('QA Ronda 02 Persona Ficticia')
    expect(csv).toContain('Cliente QA')
    expect(csv).toContain('Asignado')
    expect(csv).not.toContain('Otra persona QA')
    expect(csv).not.toContain('Vacaciones QA')
    await search.fill('NO_EXISTE_QA')
    await expect(page.locator('.nk-people-row')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeDisabled()
  })
}

test('Vacaciones se conserva y la exportación respeta el orden elegido en la vista', async ({ page }) => {
  await mockPeople(page)
  await page.getByLabel('Filtrar por disponibilidad').selectOption('vacaciones')
  await expect(page.locator('.nk-people-row')).toHaveCount(1)
  await expect(page.locator('.nk-people-row')).toContainText('Vacaciones QA')
  await page.getByLabel('Filtrar por disponibilidad').selectOption('')
  await page.locator('.nk-people-sort-button').filter({ hasText: /^Persona/ }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  const csv = await readFile(await (await downloadPromise).path(), 'utf8')
  expect(csv.indexOf('Vacaciones QA')).toBeLessThan(csv.indexOf('QA Ronda 02 Persona Ficticia'))
  expect(csv.indexOf('QA Ronda 02 Persona Ficticia')).toBeLessThan(csv.indexOf('Otra persona QA'))
})
