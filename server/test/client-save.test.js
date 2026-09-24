import assert from 'node:assert/strict'
import test from 'node:test'
import { saveClientWithRetry } from '../../nexo-v2/src/services/client-save.js'

const draft = {
  nombre: 'Cliente QA', mandante: 'Nexo Klar QA', rut: '76.100.001-2', region: 'Antofagasta', comuna: 'Antofagasta',
  telefonoMandante: '+56955550001', emailMandante: 'qa@nexoklar.test', contacto: 'Contacto QA', altura: '3200', sistema: 'QA', observacion: '', contactos: [], requisitos: [],
}

test('client save retries a module version conflict with a fresh version', async () => {
  let reads = 0
  let created = 0
  const versions = []
  const api = {
    get: async () => ({ state: { minas: [] }, moduleVersions: { minas: ++reads } }),
    put: async (_path, body) => {
      versions.push(body.changes.minas.version)
      if (versions.length === 1) throw Object.assign(new Error('stale'), { code: 'MODULE_VERSION_CONFLICT' })
      return { moduleVersions: { minas: 3 } }
    },
  }
  const result = await saveClientWithRetry(api, { draft, creating: true, selectedId: null, createId: () => `qa-client-${++created}` })
  assert.deepEqual(versions, [1, 2])
  assert.equal(result.saved.id, 'qa-client-1')
  assert.equal(created, 1)
  assert.equal(result.saved.nombre, 'Cliente QA')
})

test('client save does not retry other conflicts', async () => {
  let writes = 0
  const api = {
    get: async () => ({ state: { minas: [] }, moduleVersions: { minas: 1 } }),
    put: async () => { writes += 1; throw Object.assign(new Error('invalid'), { code: 'INVALID_REFERENCE' }) },
  }
  await assert.rejects(() => saveClientWithRetry(api, { draft, creating: true, selectedId: null, createId: () => 'qa-client' }), error => error.code === 'INVALID_REFERENCE')
  assert.equal(writes, 1)
})
