import{test,expect}from'@playwright/test'
test('worker profile uses a scoped read and a record patch with its initial revision',async({page})=>{
 let submitted,wholeStateReads=0
 const worker={id:'qa',nombre:'Persona QA',rut:'11.111.111-1',email:'qa@example.com',workerItems:[]}
 await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname
  if(path==='/api/state'&&!url.searchParams.has('modules'))wholeStateReads++
  if(path==='/api/state/records/trabajadores/qa'&&route.request().method()==='PATCH'){submitted=route.request().postDataJSON();return route.fulfill({json:{record:{...worker,...submitted.patch},revision:'new-revision'}})}
  return route.fulfill({json:path==='/api/auth/me'?{user:{role:'client_admin'},tenant:{id:'qa'}}:path==='/api/settings'?{settings:{}}:path==='/api/state'?{state:{},moduleVersions:{}}:path==='/api/state/records/trabajadores/qa'?{record:worker,revision:'initial-revision'}:{}})
 })
 await page.goto('/app/trabajadores/qa')
 await page.locator('#worker-email').fill('nuevo@example.com')
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).first().click()
 await expect.poll(()=>submitted?.revision).toBe('initial-revision')
 expect(submitted.patch.email).toBe('nuevo@example.com')
 expect(submitted.patch.workerItems).toBeUndefined()
 expect(submitted.changes).toBeUndefined()
 expect(wholeStateReads).toBe(0)
})

test('worker documents keep distinct evidence in-session, confirm removal, re-upload, and explain a real duplicate', async ({ page }) => {
  const contractFileId = 'file-contract-qa'
  const cvFileId = 'file-cv-qa'
  const contractEvidence = { name: 'Contrato QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('contrato QA') }
  const cvEvidence = { name: 'CV QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('cv QA') }
  const uploadPlan = [
    { fileId: contractFileId, file: contractEvidence, deduplicated: false },
    { fileId: cvFileId, file: cvEvidence, deduplicated: false },
    { fileId: contractFileId, file: contractEvidence, deduplicated: false },
    { fileId: contractFileId, file: contractEvidence, deduplicated: true },
  ]
  const worker = { id: 'qa', nombre: 'Persona QA', rut: '11.111.111-1', email: 'qa@example.com', workerItems: [] }
  const uploads = []
  const documents = []
  const audits = []
  const removedUploads = []
  const pageErrors = []
  let deletes = 0
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.route('**/api/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return json({ user: { role: 'client_admin' }, tenant: { id: 'qa' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state: {}, moduleVersions: {} })
    if (path === '/api/state/records/trabajadores/qa') return json({ record: worker, revision: 'initial-revision' })
    if (path === '/api/files' && request.method() === 'POST') {
      const upload = uploadPlan[uploads.length]
      if (!upload) return json({ error: 'UNEXPECTED_UPLOAD' }, 500)
      uploads.push(upload)
      return json({ id: upload.fileId, original_name: upload.file.name, content_type: upload.file.mimeType, byte_size: upload.file.buffer.byteLength, deduplicated: upload.deduplicated }, upload.deduplicated ? 200 : 201)
    }
    if (path === '/api/files/' + contractFileId && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: contractEvidence.mimeType, headers: { 'content-disposition': 'attachment; filename="Contrato QA.pdf"' }, body: contractEvidence.buffer })
    }
    if (path.startsWith('/api/files/') && request.method() === 'DELETE') {
      removedUploads.push(path.split('/').at(-1))
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/state/workers/qa/documents' && request.method() === 'POST') {
      const item = request.postDataJSON().item
      const duplicate = worker.workerItems.some(existing =>
        existing.documentType === item.documentType &&
        existing.name === item.name &&
        String(existing.vence || '') === String(item.vence || ''))
      if (duplicate) return json({ error: 'DUPLICATE_WORKER_DOCUMENT' }, 409)
      worker.workerItems.push(item)
      documents.push(item)
      audits.push({ action: 'worker.document_added', documentId: item.id })
      return json({ item, moduleVersion: documents.length }, 201)
    }
    if (path.startsWith('/api/state/workers/qa/documents/') && request.method() === 'DELETE') {
      const documentId = decodeURIComponent(path.split('/').at(-1))
      deletes += 1
      worker.workerItems = worker.workerItems.filter(document => document.id !== documentId)
      audits.push({ action: 'file.deleted_with_worker_document', documentId })
      audits.push({ action: 'worker.document_removed', documentId })
      return json({ item: { id: documentId }, moduleVersion: documents.length + 1, deletedFileIds: [contractFileId] })
    }
    return json({})
  })

  async function saveDocument(type, file) {
    await page.getByLabel('Tipo', { exact: true }).selectOption(type)
    await page.getByLabel('Archivo', { exact: true }).setInputFiles(file)
    await page.getByRole('button', { name: 'Guardar registro', exact: true }).click()
  }

  await page.goto('/app/trabajadores/qa')
  await page.getByRole('button', { name: 'Documentos y aptitudes', exact: true }).click()
  await saveDocument('EMPLOYMENT_CONTRACT', contractEvidence)
  await expect(page.getByRole('heading', { name: 'Documentos cargados (1)', exact: true })).toBeVisible()

  const downloadLink = page.locator('a[href="/api/files/' + contractFileId + '"]')
  await expect(downloadLink).toHaveCount(1)
  const [download] = await Promise.all([page.waitForEvent('download'), downloadLink.click()])
  expect(download.suggestedFilename()).toBe(contractEvidence.name)

  await saveDocument('CV', cvEvidence)
  await expect(page.getByRole('heading', { name: 'Documentos cargados (2)', exact: true })).toBeVisible()
  const documentsCard = page.locator('section.nk-person-card').filter({ hasText: 'Documentos cargados (2)' })
  const contractRow = documentsCard.locator('tbody tr').filter({ hasText: 'Contrato de trabajo' })
  await expect(contractRow).toHaveCount(1)
  await expect(documentsCard.getByText('Currículum vitae', { exact: true })).toBeVisible()

  await contractRow.getByRole('button', { name: 'Eliminar', exact: true }).click()
  const dialog = page.getByRole('alertdialog', { name: 'Eliminar documento', exact: true })
  await expect(dialog).toContainText('Contrato de trabajo')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(deletes).toBe(0)

  await contractRow.getByRole('button', { name: 'Eliminar', exact: true }).click()
  await dialog.getByRole('button', { name: 'Eliminar documento', exact: true }).click()
  await expect.poll(() => deletes).toBe(1)
  await expect(page.getByRole('heading', { name: 'Documentos cargados (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Currículum vitae', exact: true })).toBeVisible()

  await saveDocument('EMPLOYMENT_CONTRACT', contractEvidence)
  await expect(page.getByRole('heading', { name: 'Documentos cargados (2)', exact: true })).toBeVisible()
  await expect(page.locator('a[href="/api/files/' + contractFileId + '"]')).toHaveCount(1)

  await saveDocument('EMPLOYMENT_CONTRACT', contractEvidence)
  await expect(page.getByText('Ya existe un documento con la misma clasificación, referencia y vigencia para esta persona.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Documentos cargados (2)', exact: true })).toBeVisible()
  expect(uploads).toHaveLength(4)
  expect(removedUploads).toEqual([])
  expect(documents).toHaveLength(3)
  expect(documents[0].fileId).toBe(contractFileId)
  expect(documents[1].fileId).toBe(cvFileId)
  expect(documents[2].fileId).toBe(contractFileId)
  expect(audits.map(entry => entry.action)).toEqual([
    'worker.document_added',
    'worker.document_added',
    'file.deleted_with_worker_document',
    'worker.document_removed',
    'worker.document_added',
  ])
  expect(pageErrors).toEqual([])
})

test('worker identity evidence requires both sides and expiry before saving', async ({ page }) => {
  const worker = { id: 'qa-two-sided', nombre: 'Persona QA', rut: '11.111.111-1', email: 'qa@example.com', workerItems: [] }
  const fileIds = ['file-front-qa', 'file-back-qa']
  const uploads = []
  const documents = []
  const front = { name: 'Anverso QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('anverso QA') }
  const back = { name: 'Reverso QA.pdf', mimeType: 'application/pdf', buffer: Buffer.from('reverso QA') }
  await page.route('**/api/**', route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/me') return json({ user: { role: 'client_admin' }, tenant: { id: 'qa' } })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/state') return json({ state: {}, moduleVersions: {} })
    if (path === '/api/state/records/trabajadores/qa-two-sided') return json({ record: worker, revision: 'initial-revision' })
    if (path === '/api/files' && request.method() === 'POST') {
      const index = uploads.length
      uploads.push(fileIds[index])
      return json({ id: fileIds[index], original_name: index === 0 ? front.name : back.name, content_type: 'application/pdf', byte_size: 20 }, 201)
    }
    if (path === '/api/state/workers/qa-two-sided/documents' && request.method() === 'POST') {
      const item = request.postDataJSON().item
      worker.workerItems.push(item)
      documents.push(item)
      return json({ item, moduleVersion: 2 }, 201)
    }
    return json({})
  })

  await page.goto('/app/trabajadores/qa-two-sided')
  await page.getByRole('button', { name: 'Documentos y aptitudes', exact: true }).click()
  await page.getByLabel('Tipo', { exact: true }).selectOption('IDENTITY_CARD')
  await page.getByLabel('Nombre / referencia', { exact: true }).fill('Cédula de identidad QA')
  const save = page.getByRole('button', { name: 'Guardar registro', exact: true })
  await expect(save).toBeDisabled()
  await page.getByLabel('Archivo anverso', { exact: true }).setInputFiles(front)
  await expect(save).toBeDisabled()
  await page.getByLabel('Archivo reverso', { exact: true }).setInputFiles(back)
  await expect(save).toBeDisabled()
  await page.getByLabel('Fecha de vencimiento obligatoria', { exact: true }).fill('2030-01-01')
  await expect(save).toBeEnabled()
  await save.click()
  await expect.poll(() => documents.length).toBe(1)
  expect(documents[0].files.map(file => file.side)).toEqual(['front', 'back'])
  expect(documents[0].files.map(file => file.fileId)).toEqual(fileIds)
  expect(documents[0].vence).toBe('2030-01-01')
})
