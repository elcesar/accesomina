import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { withTenant } from '../db.js'
import { appendAudit } from '../audit.js'
import { decryptJson, encryptJson } from '../security.js'
import { sanitizeJson } from '../validation.js'
import { removeStoredFile, readStoredFile, safeName, scanFile, storageReadiness, storeFile } from './files.js'
import { brandingWithLogo, INACTIVE_INTEGRATIONS, mergeBranding, tenantLogoObject, validLogoObject } from '../branding.js'
import { canEditTenantSettings, canManageTenantModules } from '../tenant-capabilities.js'

export const settingsRouter = Router()
const providers = new Set(['smtp', 'whatsapp', 'signature', 'erp', 'accreditation'])
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key)
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const sameJson = (left, right) => JSON.stringify(left || {}) === JSON.stringify(right || {})
const isSafeEndpoint = value => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname) && !/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)
  } catch {
    return false
  }
}
const isValidIanaTimeZone = value => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    if (['image/png', 'image/jpeg'].includes(file.mimetype)) return done(null, true)
    return done(Object.assign(new Error('El logo debe ser PNG o JPG.'), { status: 400, code: 'INVALID_LOGO_FILE' }))
  },
})

function sendSettingsPermissionDenied(res) {
  return res.status(403).json({ error: 'PERMISSION_DENIED' })
}

function normalizeModules(value) {
  if (!plainObject(value)) {
    throw Object.assign(new Error('Los módulos deben ser una configuración válida.'), { status: 400, code: 'INVALID_MODULE_SETTINGS' })
  }
  const entries = Object.entries(value)
  if (entries.some(([key, enabled]) => !/^[a-z][a-z0-9_]{0,63}$/i.test(key) || typeof enabled !== 'boolean')) {
    throw Object.assign(new Error('Los módulos deben contener sólo valores booleanos.'), { status: 400, code: 'INVALID_MODULE_SETTINGS' })
  }
  return Object.fromEntries(entries)
}

function mergedAlerts(previous, incoming) {
  const before = plainObject(previous)
  const patch = plainObject(incoming)
  const warningDays = own(patch, 'warningDays') ? Number(patch.warningDays) : Number(before.warningDays) || 30
  const criticalDays = own(patch, 'criticalDays') ? Number(patch.criticalDays) : Number(before.criticalDays) || 7
  const alerts = {
    ...before,
    warningDays: Math.min(365, Math.max(1, warningDays)),
    criticalDays: Math.min(365, Math.max(1, criticalDays)),
  }
  if (alerts.criticalDays > alerts.warningDays) {
    throw Object.assign(new Error('El plazo crítico no puede superar al plazo preventivo.'), { status: 400, code: 'INVALID_ALERT_THRESHOLDS' })
  }
  return alerts
}

function mergedCatalogs(previous, incoming) {
  const before = plainObject(previous)
  const patch = plainObject(incoming)
  const catalogs = { ...before, ...patch }
  catalogs.operationalTimeZone = String(catalogs.operationalTimeZone || 'America/Santiago').trim()
  if (!isValidIanaTimeZone(catalogs.operationalTimeZone)) {
    throw Object.assign(new Error('La zona horaria operacional no es válida.'), { status: 400, code: 'INVALID_OPERATIONAL_TIME_ZONE' })
  }
  if (Array.isArray(catalogs.specialties)) {
    catalogs.specialties = [...new Set(catalogs.specialties.map(value => String(value).trim()).filter(Boolean))].slice(0, 100)
  }
  return catalogs
}

export async function tenantOperationalTimeZone(tenantId) {
  return withTenant(tenantId, async client => {
    const row = (await client.query('SELECT catalogs FROM tenant_settings WHERE tenant_id=$1', [tenantId])).rows[0]
    const value = String(row?.catalogs?.operationalTimeZone || 'America/Santiago')
    return isValidIanaTimeZone(value) ? value : 'America/Santiago'
  })
}

export async function tenantIntegration(tenantId, provider) {
  if (INACTIVE_INTEGRATIONS.has(provider)) return { enabled: false, available: false, publicConfig: {}, secret: {} }
  return withTenant(tenantId, async client => {
    const row = (await client.query(
      'SELECT enabled,public_config,encrypted_secret FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',
      [tenantId, provider]
    )).rows[0]
    return row ? { enabled: row.enabled, available: true, publicConfig: row.public_config || {}, secret: decryptJson(row.encrypted_secret) } : null
  })
}

settingsRouter.get('/', async (req, res) => {
  const result = await withTenant(req.auth.tenantId, async client => {
    const settings = (await client.query(
      'SELECT branding,modules,alerts,catalogs,updated_at FROM tenant_settings WHERE tenant_id=$1',
      [req.auth.tenantId]
    )).rows[0] || {}
    const integrations = (await client.query(
      'SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at FROM tenant_integrations WHERE tenant_id=$1 ORDER BY provider',
      [req.auth.tenantId]
    )).rows.map(row => INACTIVE_INTEGRATIONS.has(row.provider)
      ? { ...row, enabled: false, configured: false, available: false, public_config: {} }
      : { ...row, available: true })
    return { settings, integrations }
  })
  res.json(result)
})

settingsRouter.put('/', async (req, res) => {
  const clean = sanitizeJson(req.body || {})
  const wantsModules = own(clean, 'modules')

  // Do this before the broad settings gate so a direct API attempt receives the
  // stable denial required by #179, even if the account has no settings access.
  if (wantsModules && !canManageTenantModules(req.auth?.role)) {
    return res.status(403).json({ error: 'MODULE_SETTINGS_PERMISSION_DENIED' })
  }
  if (!canEditTenantSettings(req.auth?.role)) return sendSettingsPermissionDenied(res)

  const row = await withTenant(req.auth.tenantId, async client => {
    const before = (await client.query(
      'SELECT branding,modules,alerts,catalogs FROM tenant_settings WHERE tenant_id=$1 FOR UPDATE',
      [req.auth.tenantId]
    )).rows[0] || { branding: {}, modules: {}, alerts: {}, catalogs: {} }

    const branding = mergeBranding(before.branding, own(clean, 'branding') ? plainObject(clean.branding) : {})
    const modules = wantsModules ? normalizeModules(clean.modules) : plainObject(before.modules)
    const alerts = mergedAlerts(before.alerts, own(clean, 'alerts') ? clean.alerts : {})
    const catalogs = mergedCatalogs(before.catalogs, own(clean, 'catalogs') ? clean.catalogs : {})

    const updated = (await client.query(
      `INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,catalogs,updated_by)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(tenant_id) DO UPDATE
       SET branding=$2,modules=$3,alerts=$4,catalogs=$5,updated_by=$6,updated_at=now()
       RETURNING branding,modules,alerts,catalogs,updated_at`,
      [req.auth.tenantId, branding, modules, alerts, catalogs, req.auth.userId]
    )).rows[0]

    await appendAudit(client, {
      tenantId: req.auth.tenantId,
      userId: req.auth.userId,
      entityType: 'tenant_settings',
      action: 'settings.updated',
      oldValue: before,
      newValue: updated,
    })
    if (wantsModules && !sameJson(before.modules, modules)) {
      await appendAudit(client, {
        tenantId: req.auth.tenantId,
        userId: req.auth.userId,
        entityType: 'tenant_settings',
        action: 'settings.modules.updated',
        oldValue: { modules: before.modules || {} },
        newValue: { modules },
      })
    }
    return updated
  })
  res.json(row)
})

function requireLogoInfrastructure(req, res, next) {
  const readiness = storageReadiness()
  if (!readiness.ready) return res.status(503).json({ error: readiness.code })
  next()
}

settingsRouter.post('/logo', (req, res, next) => {
  if (!canEditTenantSettings(req.auth?.role)) return sendSettingsPermissionDenied(res)
  next()
}, requireLogoInfrastructure, logoUpload.single('file'), async (req, res) => {
  if (!req.file || !['image/png', 'image/jpeg'].includes(req.file.mimetype) || req.file.size > 2 * 1024 * 1024) {
    return res.status(400).json({ error: 'INVALID_LOGO_FILE' })
  }

  const malwareStatus = await scanFile(req.file)
  if (malwareStatus !== 'clean') return res.status(422).json({ error: 'MALWARE_DETECTED' })

  const id = crypto.randomUUID()
  const storageKey = `tenants/${req.auth.tenantId}/branding/${id}-${safeName(req.file.originalname)}`
  const storedFile = {
    id,
    tenant_id: req.auth.tenantId,
    storage_provider: config.fileStorage,
    storage_key: storageKey,
  }

  await storeFile(storageKey, req.file)
  try {
    const result = await withTenant(req.auth.tenantId, async client => {
      const before = (await client.query(
        'SELECT branding FROM tenant_settings WHERE tenant_id=$1 FOR UPDATE',
        [req.auth.tenantId]
      )).rows[0] || { branding: {} }
      const oldBranding = plainObject(before.branding)
      const oldId = String(oldBranding.logoFileId || '')
      const inserted = (await client.query(
        `INSERT INTO file_objects
         (id,tenant_id,uploaded_by,entity_type,entity_id,original_name,content_type,byte_size,storage_provider,storage_key,sha256,malware_status)
         VALUES($1,$2,$3,'company_branding','logo',$4,$5,$6,$7,$8,$9,'clean')
         RETURNING *`,
        [id, req.auth.tenantId, req.auth.userId, safeName(req.file.originalname), req.file.mimetype, req.file.size, config.fileStorage, storageKey, crypto.createHash('sha256').update(req.file.buffer).digest('hex')]
      )).rows[0]

      const branding = brandingWithLogo(oldBranding, inserted.id)
      const updated = (await client.query(
        `INSERT INTO tenant_settings(tenant_id,branding,modules,alerts,catalogs,updated_by)
         VALUES($1,$2,'{}'::jsonb,'{"warningDays":30,"criticalDays":7}'::jsonb,'{}'::jsonb,$3)
         ON CONFLICT(tenant_id) DO UPDATE SET branding=$2,updated_by=$3,updated_at=now()
         RETURNING branding,updated_at`,
        [req.auth.tenantId, branding, req.auth.userId]
      )).rows[0]

      let replaced = null
      if (oldId && oldId !== inserted.id) {
        replaced = (await client.query(
          `UPDATE file_objects SET deleted_at=now()
           WHERE id=$1 AND tenant_id=$2 AND entity_type='company_branding' AND entity_id='logo' AND deleted_at IS NULL
           RETURNING id,original_name`,
          [oldId, req.auth.tenantId]
        )).rows[0] || null
      }
      await appendAudit(client, {
        tenantId: req.auth.tenantId,
        userId: req.auth.userId,
        entityType: 'tenant_branding',
        entityId: inserted.id,
        action: replaced ? 'branding.logo.replaced' : 'branding.logo.applied',
        oldValue: oldId ? { logoFileId: oldId } : null,
        newValue: { logoFileId: inserted.id, name: inserted.original_name },
      })
      if (replaced) {
        await appendAudit(client, {
          tenantId: req.auth.tenantId,
          userId: req.auth.userId,
          entityType: 'file',
          entityId: replaced.id,
          action: 'branding.logo.retired',
          oldValue: replaced,
          newValue: { deleted: true, replacementId: inserted.id },
        })
      }
      return { branding: updated.branding, logo: { id: inserted.id, originalName: inserted.original_name }, replaced: Boolean(replaced) }
    })
    res.status(201).json(result)
  } catch (error) {
    // The object was never made reachable. Compensate storage before returning a
    // failed persistence result so abandoned/failed logo uploads leave no object.
    await removeStoredFile(storedFile).catch(() => {})
    throw error
  }
})

settingsRouter.get('/logo', async (req, res) => {
  const file = await withTenant(req.auth.tenantId, async client => {
    const settings = (await client.query('SELECT branding FROM tenant_settings WHERE tenant_id=$1', [req.auth.tenantId])).rows[0]
    return tenantLogoObject(client, req.auth.tenantId, settings?.branding?.logoFileId)
  })
  if (!validLogoObject(file)) return res.status(404).json({ error: 'FILE_NOT_FOUND' })
  res.set({
    'Content-Type': file.content_type,
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  }).send(await readStoredFile(file))
})

settingsRouter.put('/integrations/:provider', async (req, res) => {
  const provider = req.params.provider
  if (INACTIVE_INTEGRATIONS.has(provider)) return res.status(409).json({ error: 'INTEGRATION_NOT_AVAILABLE' })
  if (!providers.has(provider)) return res.status(404).json({ error: 'UNKNOWN_PROVIDER' })
  if (!canEditTenantSettings(req.auth?.role)) return sendSettingsPermissionDenied(res)

  const enabled = req.body.enabled === true
  const publicConfig = sanitizeJson(req.body.publicConfig || {})
  const secret = sanitizeJson(req.body.secret || {})
  if (['signature', 'erp', 'accreditation'].includes(provider) && publicConfig.url && !isSafeEndpoint(publicConfig.url)) {
    return res.status(400).json({ error: 'UNSAFE_INTEGRATION_URL' })
  }

  const row = await withTenant(req.auth.tenantId, async client => {
    const before = (await client.query(
      'SELECT provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured FROM tenant_integrations WHERE tenant_id=$1 AND provider=$2',
      [req.auth.tenantId, provider]
    )).rows[0]
    const encrypted = Object.keys(plainObject(secret)).length ? encryptJson(secret) : null
    const updated = (await client.query(
      `INSERT INTO tenant_integrations(tenant_id,provider,enabled,public_config,encrypted_secret,updated_by)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(tenant_id,provider) DO UPDATE
       SET enabled=$3,public_config=$4,encrypted_secret=COALESCE($5,tenant_integrations.encrypted_secret),updated_by=$6,updated_at=now()
       RETURNING provider,enabled,public_config,encrypted_secret IS NOT NULL AS configured,updated_at`,
      [req.auth.tenantId, provider, enabled, publicConfig, encrypted, req.auth.userId]
    )).rows[0]
    await appendAudit(client, {
      tenantId: req.auth.tenantId,
      userId: req.auth.userId,
      entityType: 'tenant_integration',
      action: 'integration.configured',
      oldValue: before,
      newValue: { provider, enabled, publicConfig, configured: updated.configured },
    })
    return updated
  })
  res.json(row)
})
