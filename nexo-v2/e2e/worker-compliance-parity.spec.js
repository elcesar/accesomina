import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const identityFiles = [
  { side: 'front', fileId: 'qa-identity-front' },
  { side: 'back', fileId: 'qa-identity-back' },
]

const file = (type, documentType, name) => ({ type, documentType, name, fileId: `qa-${documentType.toLowerCase()}` })

const worker = {
  id: 'qa-worker-compliance',
  nombre: 'Persona de paridad QA',
  rut: '11.111.111-1',
  tipo: 'permanente',
  especialidad: 'Mecánico Industrial',
  disponibilidad: 'disponible',
  mineras: ['qa-client'],
  workerItems: [
    { type: 'documento', documentType: 'IDENTITY_CARD', name: 'Cédula de identidad', files: identityFiles, vence: '2030-01-01' },
    file('contrato', 'EMPLOYMENT_CONTRACT', 'Contrato de trabajo'),
    file('documento', 'AFP_CERTIFICATE', 'Certificado AFP'),
    file('documento', 'AFC_CERTIFICATE', 'Certificado AFC'),
    file('documento', 'HEALTH_INSURANCE_CERTIFICATE', 'Certificado Fonasa/Isapre'),
    file('examen', 'MEDICAL_EXAM', 'Examen preocupacional'),
    file('curso', 'ODI_ACKNOWLEDGMENT', 'ODI / Derecho a Saber'),
    file('curso', 'INTERNAL_REGULATION_ACKNOWLEDGMENT', 'Reglamento Interno'),
    file('cv', 'CV', 'CV actualizado'),
    file('curso', 'TRAINING', 'LOTO / Bloqueo y Etiquetado'),
  ],
}

const state = {
  minas: [{ id: 'qa-client', nombre: 'Cliente QA' }],
  contratos: [{ id: 'qa-contract', numero: 'CON-QA', minaId: 'qa-client' }],
  mantenciones: [{ id: 'qa-order', codigo: 'OS-QA', nombre: 'Orden QA', minaId: 'qa-client', contratoId: 'qa-contract', estado: 'activo', personalReq: 1 }],
  trabajadores: [worker],
  asignaciones: [{ id: 'qa-assignment', trabId: worker.id, mantId: 'qa-order', estado: 'confirmado', recruitmentStage: 'reclutamiento' }],
  restricted: [],
  alertas: [],
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role: 'client_admin', nombre: 'Administrador QA' }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json({ settings: { branding: { theme: 'light' } } })
    if (path === `/api/state/records/trabajadores/${worker.id}`) return json({ record: worker, revision: 'qa-revision' })
    if (path === '/api/state') return json({ state, moduleVersions: { trabajadores: 1 } })
    return json({})
  })
})

test('the same compliance policy governs Personas, ficha, auditoría, CSV, Cliente and gestión', async ({ page }) => {
  // Sólo falta el anexo asociado al servicio: 10 de 11 requisitos = 91%.
  await page.goto('/app/trabajadores')
  const peopleRow = page.locator('.nk-people-row').filter({ hasText: worker.nombre })
  await expect(peopleRow.locator('.nk-people-progress-value')).toHaveText('91%')
  const peopleDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  const peopleCsv = await readFile(await (await peopleDownload).path(), 'utf8')
  expect(peopleCsv).toContain('"91%"')

  await peopleRow.getByRole('button', { name: 'Ficha', exact: true }).click()
  await expect(page.getByText('91% habilitado', { exact: true })).toBeVisible()

  await page.goto('/app/auditoria')
  const auditRow = page.locator('.nk-audit-table tbody tr').filter({ hasText: worker.nombre })
  await expect(auditRow).toContainText('11')
  await expect(auditRow).toContainText('91%')
  await expect(auditRow).toContainText('Falta: Anexo asociado al servicio')
  const auditDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click()
  const auditCsv = await readFile(await (await auditDownload).path(), 'utf8')
  expect(auditCsv).toContain('"11"')
  expect(auditCsv).toContain('"91%"')

  await page.goto('/app/clientes/qa-client')
  await expect(page.locator('.nk-client-person').filter({ hasText: '91% documentación vigente' })).toBeVisible()

  await page.goto('/app/reclutamiento?proyecto=qa-order')
  await expect(page.locator('.nk-staffing-table').filter({ hasText: worker.nombre })).toContainText('Requiere revisión · 91%')
})
