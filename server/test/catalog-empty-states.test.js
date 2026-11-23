import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const root = new URL('../..', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('catalog pages distinguish empty catalogs from filtered results', async () => {
  const [orders, contracts, clients, people] = await Promise.all([
    source('nexo-v2/src/pages/OrdenesServicioPage.jsx'),
    source('nexo-v2/src/pages/ContratosPage.jsx'),
    source('nexo-v2/src/pages/ClientesPage.jsx'),
    source('nexo-v2/src/pages/TrabajadoresPage.jsx'),
  ])
  assert.match(orders, /orders\.length===0/)
  assert.match(orders, /No encontramos órdenes de servicio/)
  assert.match(contracts, /contracts\.length===0/)
  assert.match(contracts, /No encontramos contratos/)
  assert.match(clients, /clients\.length===0/)
  assert.match(clients, /No encontramos clientes/)
  assert.match(people, /personas\.length === 0/)
  assert.match(people, /activeFilters > 0/)
})
