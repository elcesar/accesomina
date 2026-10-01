import assert from 'node:assert/strict'
import test from 'node:test'
import { pageTitle } from '../../nexo-v2/src/services/page-title.js'

test('uses a specific title for public sections and portal routes', () => {
  assert.equal(pageTitle('/', '#producto'), 'Nexo Klar · Producto')
  assert.equal(pageTitle('/app/trabajadores'), 'Personas · Nexo Klar')
  assert.equal(pageTitle('/app/servicios/nuevo'), 'Nueva orden de servicio · Nexo Klar')
})

test('uses an explicit title for entity detail pages', () => {
  assert.equal(pageTitle('/app/trabajadores/worker-1'), 'Ficha de persona · Nexo Klar')
  assert.equal(pageTitle('/app/clientes/client-1'), 'Ficha de cliente · Nexo Klar')
})
