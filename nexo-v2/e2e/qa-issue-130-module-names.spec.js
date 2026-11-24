import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { pageDomain, PAGE_DOMAINS } from '../src/config/page-domains.js'

const source = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const sharedSource = path => readFileSync(new URL(`../../shared/${path}`, import.meta.url), 'utf8')

test('NK-R01-056: los tres antetítulos observados por QA coinciden con sus grupos', () => {
  expect(pageDomain('/app/epp-inventario')).toBe('Activos, Equipos e Inventario')
  expect(pageDomain('/app/epp-inventario/detalle')).toBe('Activos, Equipos e Inventario')
  expect(pageDomain('/app/reportes')).toBe('Reportes e información')
  expect(pageDomain('/app/transferencia')).toBe('Reportes e información')
})

test('NK-R01-056: el prefijo /app/epp no captura rutas como /app/epp-inventario', () => {
  expect(pageDomain('/app/epp')).toBe('Capital Humano')
  expect(pageDomain('/app/epp/registro')).toBe('Capital Humano')
  expect(pageDomain('/app/epp-inventario')).not.toBe('Capital Humano')
})

test('los grupos declarados tienen nombres idénticos a los que aparecen en el menú', () => {
  const sidebar = source('components/layout/Sidebar.jsx')
  for (const domain of PAGE_DOMAINS) {
    expect(sidebar, domain.label).toContain(`label: '${domain.label}'`)
  }
  expect(pageDomain('/app/administracion-clientes')).toBe('Administración Nexo Klar')
  expect(pageDomain('/app/administracion-planes')).toBe('Administración Nexo Klar')
  expect(pageDomain('/app/configuracion')).toBe('Gestión y Administración')
  expect(pageDomain('/app/incidentes')).toBe('Cumplimiento y calidad')
})

test('configuración conserva los identificadores y adopta los nombres del menú', () => {
  const config = source('pages/ConfiguracionPage.jsx')
  const modules = sharedSource('access-modules.js')
  const sidebar = source('components/layout/Sidebar.jsx')
  const options = [
    ['vehiculos', 'Flota y equipos móviles'],
    ['credenciales', 'Credenciales de acceso'],
    ['reportes', 'Reportes'],
  ]
  expect(config).toContain("import { ASSIGNABLE_MODULES }")
  for (const [id, label] of options) {
    expect(modules).toContain(`key: '${id}', label: '${label}'`)
    expect(sidebar).toContain(`label: '${label}'`)
  }
  expect(modules).not.toContain('Vehículos, activos y equipos')
  expect(modules).not.toContain("['credenciales', 'Credenciales']")
  expect(modules).not.toContain("['reportes', 'Reportes y analítica']")
})

test('los encabezados de módulo también coinciden con el menú', () => {
  expect(source('pages/ReportesPage.jsx')).toContain('<h1>Reportes</h1>')
  expect(source('pages/EppInventarioPage.jsx')).toContain('title="Inventario de equipos de protección personal"')
  expect(source('pages/ImportarExportarPage.jsx')).toContain('<h1>Importar y exportar</h1>')
})

test('las rutas no asignadas no heredan dominios por coincidencia parcial', () => {
  expect(pageDomain('/app/epp-ruta-inexistente')).toBe('')
  expect(pageDomain('/app/reportes-extra')).toBe('')
})