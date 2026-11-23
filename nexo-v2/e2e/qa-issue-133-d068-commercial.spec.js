import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const source = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

test('D-068: las integraciones pendientes quedan visibles y deshabilitadas', () => {
  const page = source('pages/ConfiguracionPage.jsx')
  expect(page).toContain('Envío automatizado por WhatsApp')
  expect(page).toContain('Firma electrónica de contratos')
  expect(page).toContain('fieldset disabled className="nk-config-inactive"')
  expect(page).toContain('disabled onClick={() => saveIntegration(\'whatsapp\')}')
  expect(page).toContain('disabled onClick={() => saveIntegration(\'signature\')}')
  expect(page).toContain('Las solicitudes de firma del Libro de Obra son un flujo independiente')
})

test('D-068: cargar logo por archivo y color con validación', () => {
  const page = source('pages/ConfiguracionPage.jsx')
  expect(page).toContain('type="file" accept="image/png,image/jpeg"')
  expect(page).toContain("entityType: 'company_branding'")
  expect(page).toContain("type=\"color\"")
  expect(page).toContain('logoFileId: uploaded.id')
  expect(source('components/layout/Header.jsx')).toContain('/api/settings/logo?v=')
  expect(source('services/theme.js')).toContain('accessibleBrandText')
})

test('Libro de Obra sigue sujeto al servicio comercial contratado', () => {
  const layout = source('components/layout/AppLayout.jsx')
  const sidebar = source('components/layout/Sidebar.jsx')
  expect(layout).toContain('separateServices')
  expect(layout).toContain('separateAllowed')
  expect(sidebar).toContain("'/app/libro-obra'")
  expect(sidebar).toContain('service?.enabled')
  expect(layout).not.toContain('Este módulo aún no está disponible. Nexo Klar comunicará su habilitación')
})

test('Convocatorias se registran sin afirmar que el WhatsApp se envió', () => {
  const comms = source('pages/ComunicacionesPage.jsx')
  expect(comms).toContain('destinatarios elegibles preparados')
  expect(comms).toContain("api.put('/state/modules'")
})
