import { test, expect } from '@playwright/test'

test('turnos preserves canonical values while displaying consistent readable labels', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin' }, tenant: { id: 'qa', name: 'Empresa QA' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state: {
      trabajadores: [{ id: 'person-qa', nombre: 'Persona QA', rut: '11.111.111-1' }],
      mantenciones: [{ id: 'service-qa', nombre: 'Servicio QA', estado: 'activo' }],
      minas: [], asignaciones: [],
      turnos: [{ id: 'shift-qa', trabId: 'person-qa', mantId: 'service-qa', fecha: '2026-11-16', regimen: '7x7', turno: 'día', asistencia: 'presente', ingreso: '08:00', salida: '20:00', hh: 12 }],
    }, moduleVersions: {} })
    return json({})
  })
  await page.goto('/app/turnos')
  const jornada = page.locator('tbody tr').filter({ hasText: 'Persona QA' })
  await expect(jornada).toContainText('7×7')
  await expect(jornada).toContainText('Día')
  await expect(jornada).toContainText('Presente')
  await expect(page.getByText('7x7', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Programar turno', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Programar jornada', exact: true })
  const regimen = dialog.locator('select').nth(2)
  const asistencia = dialog.locator('select').nth(4)
  await expect(regimen).toHaveValue('7x7')
  await expect(regimen.getByRole('option', { name: '7×7', exact: true })).toHaveAttribute('value', '7x7')
  await expect(asistencia.getByRole('option', { name: 'Presente', exact: true })).toHaveAttribute('value', 'presente')
})
