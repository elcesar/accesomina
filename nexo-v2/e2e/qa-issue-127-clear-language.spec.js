import { test, expect } from '@playwright/test'
import {
  roleLabel,
  auditActionLabel,
  auditEntityLabel,
  auditFieldLabel,
} from '../src/services/ui-labels.js'

test('los roles técnicos se muestran en español', () => {
  expect(roleLabel('client_admin')).toBe('Administrador de empresa')
  expect(roleLabel('domian_admin')).toBe('Administrador de Nexo Klar')
  expect(roleLabel('rrhh')).toBe('Recursos humanos')
  expect(roleLabel('unexpected_role')).toBe('Perfil de usuario')
})

test('los eventos y campos de auditoría no muestran códigos internos', () => {
  expect(auditActionLabel('password_reset_delivery')).toBe('Envío de instrucciones para restablecer la contraseña')
  expect(auditActionLabel('document_added')).toBe('Documento agregado')
  expect(auditEntityLabel('worker_document')).toBe('Documento de persona')
  expect(auditFieldLabel('worker_document')).toBe('Documento de persona')
  for (const code of ['user.mfa_reset_by_admin', 'document_added', 'password_reset_delivery', 'undefined.event_internal']) {
    const label = auditActionLabel(code)
    expect(label).not.toMatch(/[_]|(?:password|reset|document_added|mfa)/i)
    expect(label.length).toBeGreaterThan(8)
  }
  expect(auditActionLabel('future_backend_event')).toBe('Actividad registrada')
  expect(auditFieldLabel('internal_payload')).toBe('Información del registro')
})

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    const data = path === '/api/auth/me'
      ? { user: { id: 'qa', name: 'Persona de prueba', role: 'client_admin' }, tenant: { id: 'qa-company', name: 'Empresa QA' } }
      : path === '/api/audit' ? [
        { id: 1, action: 'password_reset_delivery', entity_type: 'worker_document', user_name: 'Administración', created_at: '2026-11-23T12:00:00Z', old_value: null, new_value: { worker_document: 'doc' } },
        { id: 2, action: 'document_added', entity_type: 'worker_document', user_name: 'Administración', created_at: '2026-11-23T13:00:00Z', old_value: null, new_value: { status: 'vigente' } },
      ]
      : path === '/api/settings' ? { settings: {} }
      : path === '/api/state' ? { state: {}, moduleVersions: {} }
      : path === '/api/tenants' ? { tenants: [] }
      : ['/api/users','/api/work-books/entries'].includes(path) ? [] : {}
    return route.fulfill({ json: data })
  })
})

test('el encabezado no expone Client Admin', async ({ page }) => {
  await page.goto('/app/turnos')
  await expect(page.locator('.nk-global-header')).toBeVisible()
  await expect(page.locator('.nk-global-user')).toContainText('Administrador de empresa')
  await expect(page.locator('.nk-global-user')).not.toContainText('Client Admin')
})

test('la bitácora traduce los códigos sin cambiar los eventos almacenados', async ({ page }) => {
  await page.goto('/app/bitacora')
  await expect(page.locator('.nk-audit-page')).toBeVisible()
  await expect(page.locator('.nk-audit-action').first()).toContainText('Envío de instrucciones')
  await expect(page.locator('.nk-audit-table')).not.toContainText('worker_document')
  await expect(page.locator('.nk-audit-table')).not.toContainText('password_reset_delivery')
})

test('la configuración explica los términos técnicos', async ({ page }) => {
  await page.goto('/app/configuracion')
  const main = page.locator('.nk-app-main')
  await expect(main).toBeVisible()
  await expect(main).toContainText('Correo electrónico (protocolo SMTP)')
  const copy = await main.innerText()
  expect(copy).not.toContain('Phone Number ID')
  expect(copy).toContain('Identificador del número de WhatsApp')
  expect(copy).toContain('Correo electrónico (protocolo SMTP)')
})

test('el centro operativo utiliza nombres completos', async ({ page }) => {
  await page.goto('/app/operaciones')
  await expect(page.locator('.nk-app-main')).toBeVisible()
  await expect(page.locator('.nk-app-main')).toContainText('Órdenes de servicio listas para ejecutar')
  const copy = await page.locator('.nk-app-main').innerText()
  expect(copy).toContain('Órdenes de servicio listas para ejecutar')
  expect(copy).toContain('Acciones correctivas y preventivas abiertas')
  expect(copy).not.toMatch(/\b(?:CAPA|HH|OS)\b/)
})