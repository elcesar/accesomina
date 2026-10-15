import assert from 'node:assert/strict'
import test from 'node:test'
import { canManageTenantModules as canManageFrontendTenantModules } from '../../nexo-v2/src/services/tenant-capabilities.js'
import { canManageTenantModules } from '../tenant-capabilities.js'
import { resolveSettingsUpdate } from '../routes/settings.js'

const existing = {
  branding: { displayName: 'Empresa A', theme: 'dark', logoUrl: 'https://empresa.example/logo.svg' },
  modules: { trabajadores: true, contratos: true, incidentes: false },
  alerts: { warningDays: 30, criticalDays: 7 },
  catalogs: { specialties: ['Operador'] },
}

test('client_admin preserves modules when saving identity without modules', () => {
  const next = resolveSettingsUpdate({
    before: existing,
    clean: { branding: { displayName: 'Empresa A actualizada' } },
    canManageModules: canManageTenantModules('client_admin'),
  })
  assert.equal(next.branding.displayName, 'Empresa A actualizada')
  assert.deepEqual(next.modules, existing.modules)
  assert.deepEqual(next.alerts, existing.alerts)
  assert.deepEqual(next.catalogs, existing.catalogs)
})

test('client_admin may explicitly replace valid tenant module settings', () => {
  const next = resolveSettingsUpdate({
    before: existing,
    clean: { modules: { trabajadores: true, contratos: true, incidentes: true } },
    canManageModules: canManageTenantModules('client_admin'),
  })
  assert.deepEqual(next.modules, { trabajadores: true, contratos: true, incidentes: true })
})

test('an explicitly empty module object is distinct from an omitted field', () => {
  const next = resolveSettingsUpdate({
    before: existing,
    clean: { modules: {} },
    canManageModules: canManageTenantModules('client_admin'),
  })
  assert.deepEqual(next.modules, {})
})

test('other administrators preserve modules while saving permitted partial settings', () => {
  const next = resolveSettingsUpdate({
    before: existing,
    clean: { alerts: { warningDays: 20, criticalDays: 5 } },
    canManageModules: canManageTenantModules('domian_admin'),
  })
  assert.deepEqual(next.modules, existing.modules)
  assert.deepEqual(next.branding, existing.branding)
  assert.deepEqual(next.alerts, { warningDays: 20, criticalDays: 5 })
})

test('roles without module capability cannot alter settings by direct payload', () => {
  for (const role of ['domian_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta']) {
    assert.throws(
      () => resolveSettingsUpdate({ before: existing, clean: { modules: { incidentes: true } }, canManageModules: canManageTenantModules(role) }),
      error => error.status === 403 && error.code === 'MODULE_SETTINGS_PERMISSION_DENIED',
      role,
    )
  }
})

test('module payload structure is validated and the client capability is aligned', () => {
  for (const invalidModules of [null, [], { incidentes: 'true' }]) {
    assert.throws(
      () => resolveSettingsUpdate({ before: existing, clean: { modules: invalidModules }, canManageModules: true }),
      error => error.status === 400 && error.code === 'INVALID_MODULE_SETTINGS',
    )
  }
  for (const role of ['client_admin', 'domian_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta']) {
    assert.equal(canManageFrontendTenantModules(role), canManageTenantModules(role))
  }
})
