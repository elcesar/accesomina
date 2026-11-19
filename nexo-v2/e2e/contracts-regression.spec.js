import { test, expect } from '@playwright/test'

const contractsFixture = () => [
  { id: 'contract-one', numero: 'QA-001', nombre: 'Mantención industrial QA', minaId: 'client-north', estado: 'vigente', fechaInicio: '2026-01-01', fechaTermino: '2026-12-31', responsable: 'Ana QA', fileId: 'file-contract', archivo: 'Contrato QA.pdf', archivoTipo: 'application/pdf', archivoTamano: 1000 },
  { id: 'contract-two', numero: 'QA-002', nombre: 'Servicios eléctricos QA', minaId: 'client-south', estado: 'borrador', responsable: 'José QA' },
  { id: 'contract-legacy', numero: 'QA-003', nombre: 'Contrato histórico QA', vinculo: 'Mina Norte QA', estado: 'ACTIVO', inicio: '2025-01-01', termino: '2025-12-31' },
]
async function mockContracts(page, { role = 'client_admin', contracts = contractsFixture(), firstLoadError = false, saveError = false, delay = 0 } = {}) {
  const fixture = {
    contracts: structuredClone(contracts), version: 1, reads: 0, writes: [], uploads: [], failReads: firstLoadError,
    clients: [{ id: 'client-north', nombre: 'Mina Norte QA', rut: '11.111.111-1' }, { id: 'client-south', nombre: 'Mina Sur QA', rut: '22.222.222-2' }],
  }
  await page.route('**/api/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-contract-user', name: 'Persona QA', email: 'contratos@ejemplo.test', role, permissions: { modules: {} } }, tenant: { id: 'qa-contract-company', name: 'Empresa QA Contratos' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json({ settings: { modules: {}, branding: { theme: 'light' } } })
    if (path === '/api/state') {
      fixture.reads++
      const reject = fixture.failReads
      if (delay) await new Promise(resolve => setTimeout(resolve, delay))
      if (reject) return json({ error: 'LOAD_FAILED' }, 503)
      return json({ state: { contratos: fixture.contracts, minas: fixture.clients, mantenciones: [{ id: 'order-qa', codigo: 'OS-QA', nombre: 'Orden vinculada QA', contratoId: 'contract-one', minaId: 'client-north' }] }, moduleVersions: { contratos: fixture.version } })
    }
    if (path === '/api/state/modules' && request.method() === 'PUT') {
      const payload = request.postDataJSON(); fixture.writes.push(payload)
      if (role === 'consulta') return json({ error: 'PERMISSION_DENIED' }, 403)
      if (saveError) { saveError = false; return json({ error: 'MODULE_VERSION_CONFLICT' }, 409) }
      expect(payload.changes.contratos.version).toBe(fixture.version)
      fixture.contracts = structuredClone(payload.changes.contratos.data); fixture.version++
      return json({ moduleVersions: { contratos: fixture.version } })
    }
    if (path === '/api/files' && request.method() === 'POST') { fixture.uploads.push(request.postDataBuffer()); return json({ id: 'file-new-contract', original_name: 'Acuerdo QA.pdf', content_type: 'application/pdf', byte_size: 500, created_at: '2026-11-05T12:00:00Z' }, 201) }
    return json({})
  })
  return fixture
}

async function exposeGlobalCreate(page) {
  await expect(page.getByRole('heading', { name: 'Contratos y firmas', exact: true })).toBeVisible()
  const action = page.getByRole('button', { name: '+ Contrato', exact: true })
  if (!await action.isVisible()) await page.getByRole('button', { name: 'Mostrar acciones de creación' }).click()
  await expect(action).toBeVisible()
  return action
}

for (const width of [375, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    test('listado, búsqueda, filtros combinados y retorno a la misma selección', async ({ page }) => {
      await mockContracts(page)
      await page.goto('/app/contratos')
      await expect(page.getByRole('heading', { name: 'Contratos y firmas', exact: true })).toBeVisible()
      const table = page.getByRole('table')
      await expect(table.getByRole('row')).toHaveCount(4)
      await exposeGlobalCreate(page)
      await expect(page.getByRole('button', { name: '+ Contrato', exact: true })).toHaveCount(1)
      await expect(table.getByText('Adjunto · Contrato QA.pdf')).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await table.scrollIntoViewIfNeeded()
      await page.screenshot({ path: test.info().outputPath(`contratos-listado-${width}.png`), fullPage: true })

      await page.getByLabel('Buscar contratos', { exact: true }).fill('mantencion')
      await expect(table.getByRole('row')).toHaveCount(2)
      await page.getByLabel('Estado del contrato').selectOption('vigente')
      await page.getByLabel('Cliente vinculado').selectOption('client-north')
      await page.getByRole('button', { name: 'Abrir contrato Mantención industrial QA' }).click()
      await expect(page).toHaveURL(/\/app\/contratos\/contract-one\?q=mantencion&estado=vigente&clienteId=client-north/)
      await expect(page.getByRole('heading', { name: 'Mantención industrial QA', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Descargar', exact: true })).toHaveAttribute('href', '/api/files/file-contract')
      await expect(page.getByRole('button', { name: /OS-QA/ })).toBeVisible()
      await page.reload()
      await page.getByLabel('Responsable', { exact: true }).fill('Ana QA actualizada')
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(page).toHaveURL(/\?q=mantencion&estado=vigente&clienteId=client-north$/)
      await page.getByRole('button', { name: 'Volver a Contratos', exact: true }).click()
      await expect(page.getByLabel('Buscar contratos', { exact: true })).toHaveValue('mantencion')
      await expect(page.getByLabel('Estado del contrato')).toHaveValue('vigente')
      await expect(page.getByLabel('Cliente vinculado')).toHaveValue('client-north')
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
      await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click()
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
      await page.getByLabel('Buscar contratos', { exact: true }).fill('jose')
      await expect(page.getByRole('button', { name: 'Abrir contrato Servicios eléctricos QA' })).toBeVisible()
      await page.getByLabel('Buscar contratos', { exact: true }).fill('sin-coincidencias-qa')
      await expect(page.getByRole('heading', { name: 'No encontramos contratos', exact: true })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Aún no hay contratos registrados', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Limpiar búsqueda y filtros' }).click()
      await page.getByLabel('Cliente vinculado').selectOption('client-north')
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(3)
      await page.getByRole('table').getByRole('button', { name: 'Mina Norte QA', exact: true }).first().click()
      await expect(page).toHaveURL(/\/app\/clientes\/client-north$/)
    })

    test('alta desde Header global, adjunto, edición y persistencia tras recargar', async ({ page }) => {
      const fixture = await mockContracts(page)
      await page.goto('/app/contratos')
      await (await exposeGlobalCreate(page)).click()
      await expect(page).toHaveURL(/\/app\/contratos\/nuevo$/)
      await page.getByLabel('Número o código', { exact: true }).fill('QA-004')
      await page.getByLabel('Nombre del contrato', { exact: true }).fill('Acuerdo operativo nuevo QA')
      await page.getByLabel('Cliente', { exact: true }).selectOption('client-south')
      await page.getByLabel('Fecha de inicio', { exact: true }).fill('2026-11-05')
      await page.getByLabel('Fecha de término', { exact: true }).fill('2027-11-05')
      await page.getByLabel('Responsable', { exact: true }).fill('Responsable ficticio QA')
      await page.locator('.nk-contract-file-input').setInputFiles({ name: 'Acuerdo QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDocumento ficticio QA') })
      await expect(page.getByText('Documento cargado. Guarda los cambios')).toBeVisible()
      await page.screenshot({ path: test.info().outputPath(`contratos-alta-${width}.png`), fullPage: true })
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(page).toHaveURL(/\/app\/contratos\/[a-f0-9-]{36}$/)
      await expect(page.getByRole('heading', { name: 'Acuerdo operativo nuevo QA', exact: true })).toBeVisible()
      expect(fixture.contracts).toHaveLength(4)
      const created = fixture.contracts.find(item => item.numero === 'QA-004')
      expect(created).toMatchObject({ minaId: 'client-south', fileId: 'file-new-contract', estado: 'vigente', inicio: '2026-11-05', termino: '2027-11-05' })
      expect(fixture.contracts.find(item => item.id === 'contract-one')).toMatchObject(contractsFixture()[0])
      await page.getByLabel('Nombre del contrato', { exact: true }).fill('Acuerdo operativo actualizado QA')
      await page.getByLabel('Estado', { exact: true }).selectOption('finalizado')
      await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Acuerdo operativo actualizado QA', exact: true })).toBeVisible()
      await page.reload()
      await expect(page.getByLabel('Nombre del contrato', { exact: true })).toHaveValue('Acuerdo operativo actualizado QA')
      await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('finalizado')
      await expect(page.getByRole('link', { name: 'Descargar', exact: true })).toHaveAttribute('href', '/api/files/file-new-contract')
      expect(fixture.uploads).toHaveLength(1)
      expect(fixture.writes).toHaveLength(2)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })

    test('consulta no crea ni edita y la ruta directa conserva lectura y adjuntos', async ({ page }) => {
      const fixture = await mockContracts(page, { role: 'consulta' })
      await page.goto('/app/contratos')
      await expect(page.getByRole('button', { name: '+ Contrato', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Abrir contrato Mantención industrial QA' }).click()
      await expect(page.getByLabel('Nombre del contrato', { exact: true })).toBeDisabled()
      await expect(page.getByLabel('Cliente', { exact: true })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Guardar cambios', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Reemplazar documento', exact: true })).toHaveCount(0)
      await expect(page.getByRole('link', { name: 'Descargar', exact: true })).toBeVisible()
      await page.goto('/app/contratos/nuevo')
      await expect(page.getByRole('heading', { name: 'No tienes permiso para crear contratos' })).toBeVisible()
      await expect(page.getByLabel('Nombre del contrato', { exact: true })).toHaveCount(0)
      expect(fixture.writes).toHaveLength(0)
    })
  })
}

test('catálogo vacío dirige al alta global y no se confunde con filtros', async ({ page }) => {
  await mockContracts(page, { contracts: [] })
  await page.goto('/app/contratos')
  await expect(page.getByRole('heading', { name: 'Aún no hay contratos registrados' })).toBeVisible()
  await expect(page.getByText('Para registrar el primero, utiliza “+ Contrato” en la cabecera.')).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Contrato', exact: true })).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'No encontramos contratos', exact: true })).toHaveCount(0)
})

test('carga, error y reintento no anuncian falsamente un catálogo vacío', async ({ page }) => {
  const fixture = await mockContracts(page, { firstLoadError: true, delay: 200 })
  await page.goto('/app/contratos')
  await expect(page.getByText('Cargando contratos…', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'No fue posible cargar los contratos' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Aún no hay contratos registrados' })).toHaveCount(0)
  const failedReads = fixture.reads
  fixture.failReads = false
  await page.getByRole('button', { name: 'Reintentar carga' }).click()
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(4)
  expect(fixture.reads).toBeGreaterThan(failedReads)
})

test('ruta de contrato inexistente es recuperable, incluso con catálogo vacío', async ({ page }) => {
  await mockContracts(page, { contracts: [] })
  await page.goto('/app/contratos/no-existe')
  await expect(page.getByRole('heading', { name: 'Contrato no disponible' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver a Contratos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Aún no hay contratos registrados' })).toBeVisible()
})

test('errores al guardar conservan cambios y permiten un nuevo intento', async ({ page }) => {
  const fixture = await mockContracts(page, { saveError: true })
  await page.goto('/app/contratos/contract-one')
  await page.getByLabel('Nombre del contrato', { exact: true }).fill('Contrato QA modificado')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'La información cambió' })).toBeVisible()
  await expect(page.getByLabel('Nombre del contrato', { exact: true })).toHaveValue('Contrato QA modificado')
  expect(fixture.contracts[0].nombre).toBe('Mantención industrial QA')
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contrato QA modificado', exact: true })).toBeVisible()
  expect(fixture.contracts[0].nombre).toBe('Contrato QA modificado')
})
