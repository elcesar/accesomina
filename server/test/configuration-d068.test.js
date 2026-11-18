import test, { after, before, mock } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pool, withTenant } from '../db.js'
import { settingsRouter, settingsUpdateAuthorization } from '../routes/settings.js'
import { canAccessModule } from '../module-access.js'
import { accessibleBrandText, brandCssVariables } from '../../nexo-v2/src/services/theme.js'
import { config } from '../config.js'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const USERS = {
  client_admin: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  domian_admin: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  rrhh: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  tenant_b: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
}

let fixture
let failNextSettingsPersist = false

async function applyMigrations(db) {
  const dir = path.resolve('database/postgres')
  const files = (await fs.readdir(dir)).filter(file => /^\d+.*\.sql$/.test(file)).sort()
  for (const file of files) {
    await db.exec((await fs.readFile(path.join(dir, file), 'utf8')).replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto;/g, ''))
  }
}

async function jsonApi(pathname, { tenant = TENANT_A, role = 'client_admin', method = 'GET', body } = {}) {
  const response = await fetch(`${fixture.base}${pathname}`, {
    method,
    headers: {
      'x-qa-tenant': tenant,
      'x-qa-role': role,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return { status: response.status, body: await response.json() }
}

async function logoApi(bytes, { tenant = TENANT_A, role = 'client_admin' } = {}) {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'logo-qa.png')
  const response = await fetch(`${fixture.base}/settings/logo`, {
    method: 'POST',
    headers: { 'x-qa-tenant': tenant, 'x-qa-role': role },
    body: form,
  })
  return { status: response.status, body: await response.json() }
}

async function storedBrandingFiles() {
  const directory = path.join(config.uploadDir, 'tenants', TENANT_A, 'branding')
  try {
    return (await fs.readdir(directory)).sort()
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

before(async () => {
  const db = new PGlite()
  await applyMigrations(db)

  let queue = Promise.resolve()
  const connectMock = mock.method(pool, 'connect', async () => {
    const previous = queue
    let release
    queue = new Promise(resolve => { release = resolve })
    await previous
    return {
      query: async (sql, params) => {
        if (failNextSettingsPersist && String(sql).includes('INSERT INTO tenant_settings')) {
          failNextSettingsPersist = false
          throw Object.assign(new Error('forced tenant settings persistence failure'), { code: 'FORCED_SETTINGS_FAILURE' })
        }
        return db.query(sql, params)
      },
      release,
    }
  })

  await db.query(
    `INSERT INTO tenants(id,tenant_code,company_name,rut,admin_email,status)
     VALUES($1,'config-qa-a','Configuración QA A','76.111.111-1','a@example.test','active'),
           ($2,'config-qa-b','Configuración QA B','76.222.222-2','b@example.test','active')`,
    [TENANT_A, TENANT_B]
  )
  await db.query(
    `INSERT INTO app_users(id,tenant_id,email,full_name,role,permissions)
     VALUES($1,$2,'client@example.test','Cliente QA','client_admin','{"modules":{}}'),
           ($3,$2,'global@example.test','Global QA','domian_admin','{"modules":{}}'),
           ($4,$2,'rrhh@example.test','RRHH QA','rrhh','{"modules":{}}'),
           ($5,$6,'tenant-b@example.test','Cliente QA B','client_admin','{"modules":{}}')`,
    [USERS.client_admin, TENANT_A, USERS.domian_admin, USERS.rrhh, USERS.tenant_b, TENANT_B]
  )

  const app = express()
  app.use(express.json())
  app.use((req, _res, next) => {
    const tenantId = req.get('x-qa-tenant') || TENANT_A
    const role = req.get('x-qa-role') || 'client_admin'
    const userId = tenantId === TENANT_B ? USERS.tenant_b : USERS[role]
    req.auth = { tenantId, userId, role, permissions: { modules: {} }, companyName: 'Configuración QA', rut: '76.111.111-1' }
    next()
  })
  app.use('/settings', settingsRouter)
  app.use('/work-books', (await import('../routes/work-books.js')).workBooksRouter)
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.code || 'SERVER_ERROR' }))
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', error => error ? reject(error) : resolve(instance))
    instance.once('error', reject)
  })
  fixture = {
    db,
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    connectMock,
  }
})

after(async () => {
  await new Promise(resolve => fixture?.server?.close(resolve))
  fixture?.connectMock?.mock.restore()
  await fixture?.db?.close()
  await fs.rm(path.join(config.uploadDir, 'tenants', TENANT_A), { recursive: true, force: true })
})

test('direct settings API gives module authority only to the tenant client administrator and preserves omitted modules', async () => {
  assert.equal(settingsUpdateAuthorization('rrhh', true), 'MODULE_SETTINGS_PERMISSION_DENIED')
  assert.equal(settingsUpdateAuthorization('domian_admin', true), 'MODULE_SETTINGS_PERMISSION_DENIED')
  assert.equal(settingsUpdateAuthorization('client_admin', true), null)
  assert.equal(settingsUpdateAuthorization('rrhh', false), 'PERMISSION_DENIED')

  const deniedRole = await jsonApi('/settings', { role: 'rrhh', method: 'PUT', body: { modules: { epp: false } } })
  const deniedGlobal = await jsonApi('/settings', { role: 'domian_admin', method: 'PUT', body: { modules: { epp: false } } })
  assert.deepEqual([deniedRole.status, deniedRole.body.error], [403, 'MODULE_SETTINGS_PERMISSION_DENIED'])
  assert.deepEqual([deniedGlobal.status, deniedGlobal.body.error], [403, 'MODULE_SETTINGS_PERMISSION_DENIED'])

  const saved = await jsonApi('/settings', { method: 'PUT', body: { modules: { epp: false }, branding: { primaryColor: '#005577' } } })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.modules.epp, false)
  assert.equal(saved.body.branding.primaryColor, '#005577')

  const identityOnly = await jsonApi('/settings', { role: 'domian_admin', method: 'PUT', body: { branding: { displayName: 'Marca QA' } } })
  assert.equal(identityOnly.status, 200)
  assert.equal(identityOnly.body.modules.epp, false)

  const audit = await withTenant(TENANT_A, client => client.query(
    `SELECT action,user_id FROM audit_log WHERE tenant_id=$1 AND action='settings.modules.updated' ORDER BY created_at DESC LIMIT 1`,
    [TENANT_A]
  ))
  assert.equal(audit.rows[0].user_id, USERS.client_admin)
  assert.equal(canAccessModule({ role: 'client_admin', companyModules: { epp: false }, permissions: { modules: { epp: true } } }, 'epp'), false)
  assert.equal(canAccessModule({ role: 'domian_admin', companyModules: { epp: false }, permissions: { modules: {} } }, 'epp'), false)
})

test('uploaded logos are private to the tenant, replace the prior branding object, and clean up a failed persistence', async () => {
  const first = await logoApi(new Uint8Array([1, 2, 3]))
  assert.equal(first.status, 201)
  assert.ok(first.body.branding.logoFileId)
  assert.equal(first.body.replaced, false)

  const firstRead = await fetch(`${fixture.base}/settings/logo`, { headers: { 'x-qa-tenant': TENANT_A, 'x-qa-role': 'rrhh' } })
  assert.equal(firstRead.status, 200)
  assert.equal(firstRead.headers.get('cache-control'), 'private, no-store')

  await withTenant(TENANT_B, client => client.query(
    `INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,catalogs,updated_by)
     VALUES($1,$2::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$3)
     ON CONFLICT(tenant_id) DO UPDATE SET branding=$2`,
    [TENANT_B, JSON.stringify({ logoFileId: first.body.branding.logoFileId }), USERS.tenant_b]
  ))
  const crossTenant = await fetch(`${fixture.base}/settings/logo`, { headers: { 'x-qa-tenant': TENANT_B, 'x-qa-role': 'client_admin' } })
  assert.equal(crossTenant.status, 404)

  const second = await logoApi(new Uint8Array([4, 5, 6]))
  assert.equal(second.status, 201)
  assert.equal(second.body.replaced, true)
  const oldObject = await withTenant(TENANT_A, client => client.query(
    'SELECT deleted_at FROM file_objects WHERE id=$1 AND tenant_id=$2',
    [first.body.logo.id, TENANT_A]
  ))
  assert.ok(oldObject.rows[0].deleted_at)

  const beforeFailure = await storedBrandingFiles()
  failNextSettingsPersist = true
  const failed = await logoApi(new Uint8Array([7, 8, 9]))
  assert.equal(failed.status, 500)
  assert.deepEqual(await storedBrandingFiles(), beforeFailure)
})

test('D-068 color contract supplies contrast-safe variables and unavailable surfaces reject direct use', async () => {
  const variables = brandCssVariables('#005577')
  for (const property of ['--nk-primary', '--nk-primary-deep', '--nk-primary-soft', '--nk-action', '--nk-on-primary', '--pri', '--action']) {
    assert.ok(variables[property], `missing ${property}`)
  }
  assert.equal(variables['--nk-primary'], '#005577')
  assert.equal(variables['--pri'], '#005577')
  assert.equal(variables['--nk-on-primary'], accessibleBrandText('#005577'))
  assert.deepEqual(brandCssVariables('not-a-color'), {})

  const whatsapp = await jsonApi('/settings/integrations/whatsapp', { method: 'PUT', body: { enabled: true, secret: { token: 'not-written' } } })
  assert.deepEqual([whatsapp.status, whatsapp.body.error], [409, 'INTEGRATION_NOT_AVAILABLE'])
  const signature = await jsonApi('/settings/integrations/signature', { method: 'PUT', body: { enabled: true } })
  assert.deepEqual([signature.status, signature.body.error], [409, 'INTEGRATION_NOT_AVAILABLE'])

  const workBook = await fetch(`${fixture.base}/work-books/entries`, { headers: { 'x-qa-tenant': TENANT_A, 'x-qa-role': 'client_admin' } })
  assert.deepEqual([workBook.status, (await workBook.json()).error], [409, 'WORK_BOOK_NOT_AVAILABLE'])
})
