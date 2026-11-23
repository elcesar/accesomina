import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')

test('D-060 fila 82: Reportes e información y excepción fila 96', () => {
  const sidebar = source('components/layout/Sidebar.jsx')
  expect(sidebar).toContain("label: 'Reportes e información'")
  expect(sidebar).not.toContain("label: 'Reportes y datos'")
  expect(sidebar).toContain("label: 'Privacidad y datos'")
})

test('D-060 fila 83: el título de importación usa información', () => {
  const imports = source('pages/ImportarExportarPage.jsx')
  expect(imports).toContain('<h2>Importar información masiva</h2>')
  expect(imports).not.toContain('<h2>Importar datos masivos</h2>')
})

test('D-060 fila 97: se conserva Datos personales, pero se mejora texto genérico de protección', () => {
  const worker = source('pages/FichaTrabajadorPage.jsx')
  expect(worker).toContain('title="Datos personales"')
  expect(worker).toContain('Información para gestionar la entrega de protección personal.')
  expect(worker).not.toContain('Datos para gestionar la entrega de protección personal.')
})

test('los estados visibles evitan Restringido sin alterar claves históricas', () => {
  const staffing = source('pages/GestionPersonalProyectoPage.jsx')
  expect(staffing).toContain("label: 'No habilitado'")
  expect(staffing).toContain("'Persona no habilitada'")
  expect(staffing).not.toContain("label: 'Restringido'")
  expect(staffing).toContain('worker.restringido')
  expect(staffing).toContain('worker.bloqueado')
})

test('las validaciones generales usan información y mantienen claves de negocio', () => {
  const clients = source('pages/ClientesPage.jsx')
  const workers = source('pages/NuevoTrabajadorPage.jsx')
  expect(clients).toContain('Falta información obligatoria')
  expect(workers).toContain('Falta información obligatoria')
  expect(workers).toContain('La información fue modificada')
  expect(workers).toContain('bloqueado: false')
})

test('D-060 fila 105: Falta dotación mantiene su navegación al módulo correspondiente', () => {
  const operations = source('pages/CentroOperativoPage.jsx')
  expect(operations).toContain("gaps.push('Falta dotación')")
  expect(operations).toContain("'Falta dotación':")
  expect(operations).not.toContain('Falta personal')
})

test('D-060: los mensajes transversales solicitan información, sin reemplazar términos legales', () => {
  for (const name of [
    'FichaTrabajadorPage', 'SaludOcupacionalPage', 'ClientesPage',
    'AlojamientosPage', 'TercerosSubcontratosPage',
    'HabilitacionesCumplimientoPage', 'ActivosInventarioPage',
    'GestionPersonalProyectoPage',
  ]) {
    const component = source(`pages/${name}.jsx`)
    expect(component, name).not.toContain('Completa los datos obligatorios')
  }
  const users = source('pages/UsuariosPermisosPage.jsx')
  expect(users).toContain('información separada por empresa')
  expect(users).not.toContain('datos independientes')
  expect(source('pages/PrivacidadDatosPage.jsx')).toContain('Privacidad y datos')
})
