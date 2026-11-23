import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const src = resolve(process.cwd(), 'src')
const read = relative => readFileSync(resolve(src, relative), 'utf8')

test.describe('Issue #85 — estados vacíos compartidos', () => {
  test('el componente compartido incorpora icono, explicación y acción opcional', () => {
    const source = read('components/ui/EmptyState.jsx')
    expect(source).toContain('IconInbox')
    expect(source).toContain('role="status"')
    expect(source).toContain('onAction')
    expect(source).toContain('filtered')
    expect(source).toContain('actionLabel')
  })

  test('los catálogos representativos utilizan un componente común', () => {
    for (const page of [
      'ClientesPage.jsx', 'ContratosPage.jsx', 'OrdenesServicioPage.jsx',
      'TrabajadoresPage.jsx', 'ComunicacionesPage.jsx', 'MantenimientoPage.jsx',
      'ExamenesPage.jsx', 'FormacionPage.jsx', 'LibroObraPage.jsx',
      'AlojamientosPage.jsx', 'EvaluacionDesempenoPage.jsx', 'VehiculosPage.jsx',
      'ProteccionEppPage.jsx', 'UsuariosPermisosPage.jsx',
    ]) {
      const source = read('pages/' + page)
      expect(source, page).toContain('import EmptyState')
      expect(source, page).toContain('<EmptyState')
    }
  })

  test('los filtros sin coincidencias no se confunden con catálogos vacíos', () => {
    expect(read('pages/ContratosPage.jsx')).toContain('filtered onAction={clearFilters}')
    expect(read('pages/TrabajadoresPage.jsx')).toContain('filtered onAction={clearFilters}')
    expect(read('pages/ClientesPage.jsx')).toContain('objectLabel="clientes" filtered')
    expect(read('pages/OrdenesServicioPage.jsx')).toContain('objectLabel="órdenes de servicio" filtered')
  })

  test('los estados compartidos tienen cobertura en múltiples módulos', () => {
    const pages = readdirSync(resolve(src, 'pages')).filter(name => name.endsWith('.jsx'))
    const shared = pages.filter(page => read('pages/' + page).includes('<EmptyState'))
    expect(shared.length).toBeGreaterThanOrEqual(25)
  })
})
