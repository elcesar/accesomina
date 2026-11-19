import { test, expect } from '@playwright/test'

const state = {
  trabajadores: [{ id: 'worker-qa', nombre: 'Persona QA', rut: '11.111.111-1', especialidad: 'Mecánica' }],
  minas: [{ id: 'client-qa', nombre: 'Cliente QA' }],
  contratos: [{ id: 'contract-qa', numero: 'CTR-QA-001', nombre: 'Contrato QA' }],
  mantenciones: [{ id: 'service-qa', nombre: 'Servicio QA', minaId: 'client-qa', estado: 'activo' }],
  turnos: [],
  asignaciones: [],
  subcontratos: [],
  protocolosSalud: [],
  dailyLogs: [],
  capaActions: [],
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') return route.fulfill({ json: { user: { id: 'qa-admin', nombre: 'Admin QA', role: 'client_admin' }, tenant: { id: 'tenant-qa', name: 'Empresa QA' } } })
    if (path === '/api/settings') return route.fulfill({ json: { settings: { branding: { theme: 'light' } } } })
    if (path === '/api/state') return route.fulfill({ json: { state, moduleVersions: {} } })
    return route.fulfill({ json: {} })
  })
})

async function expectAssociatedLabel(control, label) {
  await expect(control).toBeVisible()
  await expect.poll(() => control.evaluate(element =>
    [...(element.labels || [])].some(item => item.htmlFor === element.id && item.textContent?.trim()),
  )).toBe(true)
  await expect(control).toHaveAccessibleName(label)
}

test('Programar jornada y Centro Operativo relacionan cada etiqueta con su control', async ({ page }) => {
  await page.goto('/app/turnos')
  await expect(page.getByRole('combobox', { name: 'Filtrar por cliente' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filtrar por proyecto o servicio' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filtrar por régimen' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filtrar por turno' })).toBeVisible()

  await page.getByRole('button', { name: 'Programar turno' }).click()
  const dialog = page.getByRole('dialog', { name: 'Programar jornada' })
  for (const label of ['Persona', 'Proyecto / servicio', 'Régimen', 'Turno', 'Fecha', 'Asistencia', 'Ingreso', 'Salida', 'HH reales']) {
    await expectAssociatedLabel(dialog.getByLabel(label, { exact: true }), label)
  }

  await page.goto('/app/operaciones')
  for (const label of ['Orden de servicio', 'Fecha', 'Horas hombre', 'Personas en terreno', 'Avance / trabajo ejecutado', 'Riesgos o restricciones']) {
    await expectAssociatedLabel(page.getByLabel(label, { exact: true }), label)
  }
  await page.getByRole('tab', { name: 'CAPA' }).click()
  for (const label of ['Origen', 'Título', 'Responsable', 'Vencimiento', 'Causa raíz', 'Acción correctiva / preventiva']) {
    await expectAssociatedLabel(page.getByLabel(label, { exact: true }), label)
  }
})

test('alta de persona, tercero y protocolo conservan nombres accesibles sin depender del placeholder', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/app/trabajadores/nuevo')
  for (const label of ['Nombre completo', 'RUT', 'Fecha de nacimiento', 'Teléfono', 'Correo electrónico', 'Región', 'Comuna']) {
    await expectAssociatedLabel(page.getByLabel(label, { exact: true }), label)
  }

  await page.goto('/app/subcontratos')
  await page.getByRole('button', { name: 'Nuevo tercero' }).click()
  for (const label of ['Razón social', 'RUT', 'Estado', 'Contrato asociado', 'Dotación', 'Servicios', 'Responsable', 'Contacto', 'F30', 'F30-1', 'Cotizaciones', 'Seguro', 'Observaciones']) {
    await expectAssociatedLabel(page.getByLabel(label, { exact: true }), label)
  }
  await expect(page.getByRole('textbox', { name: 'Buscar tercero por razón social, RUT o servicio' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filtrar por contrato' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Filtrar por estado' })).toBeVisible()

  await page.goto('/app/salud')
  await page.getByRole('button', { name: 'Gestionar protocolo' }).click()
  for (const label of ['Persona', 'Protocolo / seguimiento', 'Alcance', 'Fecha de evaluación', 'Vence', 'Riesgo / exposición', 'Estado', 'Responsable', 'Observaciones', 'Evidencia']) {
    await expectAssociatedLabel(page.getByLabel(label, { exact: true }), label)
  }
  await expect(page.getByRole('textbox', { name: 'Buscar por persona, protocolo o riesgo' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
