import assert from 'node:assert/strict'
import test from 'node:test'
import { moduleForPath, moduleIsEnabled } from '../../nexo-v2/src/services/module-access.js'
import { assertEntityTypeAccess, assertModuleAccess, canAccessEntityType, canAccessModule, filterAccessibleModules, moduleForEntityType } from '../module-access.js'
import { stateRouter } from '../routes/state.js'

test('a disabled module blocks every route in its mapped functional area', () => {
  const modules = { trabajadores: false, minas: false, vehiculos: false }
  assert.equal(moduleForPath('/app/trabajadores/t-123'), 'trabajadores')
  assert.equal(moduleForPath('/app/clientes/nuevo'), 'minas')
  assert.equal(moduleForPath('/app/cursos'), 'trabajadores')
  assert.equal(moduleForPath('/app/mantenimiento'), 'vehiculos')
  assert.equal(moduleIsEnabled(modules, moduleForPath('/app/trabajadores/t-123')), false)
  assert.equal(moduleIsEnabled(modules, moduleForPath('/app/mantenimiento')), false)
})

test('unset settings keep their corresponding modules enabled', () => {
  assert.equal(moduleIsEnabled({}, moduleForPath('/app/servicios')), true)
  assert.equal(moduleIsEnabled({ mantenciones: true }, moduleForPath('/app/servicios')), true)
})

test('a user restriction hides the module even when the company has it enabled', () => {
  assert.equal(moduleIsEnabled({ trabajadores: true }, 'trabajadores', { trabajadores: false }), false)
  assert.equal(moduleIsEnabled({ trabajadores: false }, 'trabajadores', { trabajadores: true }), false)
  assert.equal(moduleIsEnabled({ trabajadores: true }, 'trabajadores', { trabajadores: true }), true)
})

test('administration routes have stable module identities for route protection', () => {
  assert.equal(moduleForPath('/app/configuracion'), 'configuracion')
  assert.equal(moduleForPath('/app/usuarios'), 'usuarios')
  assert.equal(moduleForPath('/app/administracion-clientes'), 'administracion-clientes')
})

test('backend rejects an explicit worker restriction while administrators retain full access', () => {
  const restricted = { role: 'rrhh', permissions: { modules: { trabajadores: false } } }
  assert.equal(canAccessModule(restricted, 'trabajadores'), false)
  assert.throws(() => assertModuleAccess(restricted, 'trabajadores'), error => error.code === 'MODULE_PERMISSION_DENIED')
  assert.equal(canAccessModule({ role: 'client_admin', permissions: { modules: { trabajadores: false } } }, 'trabajadores'), true)
})

test('specialized file and transfer access resolves to the protected module', () => {
  assert.equal(moduleForEntityType('worker_document'), 'trabajadores')
  assert.equal(moduleForEntityType('health_protocol'), 'trabajadores')
  assert.equal(moduleForEntityType('epp_delivery'), 'epp')
  assert.equal(moduleForEntityType('contract_document'), 'contratos')
  assert.equal(moduleForEntityType('order_document'), 'mantenciones')
  assert.equal(moduleForEntityType('company_document'), 'auditoria')
  assert.deepEqual(filterAccessibleModules({ role: 'rrhh', permissions: { modules: { trabajadores: false } } }, { trabajadores: [{ id: 'p1' }], vehiculos: [{ id: 'v1' }] }), { vehiculos: [{ id: 'v1' }] })
})

test('unknown file entity types are denied by default while administrators retain explicit access', () => {
  const restricted = { role: 'rrhh', permissions: { modules: { trabajadores: false } } }
  assert.equal(canAccessEntityType(restricted, 'worker_document'), false)
  assert.throws(() => assertEntityTypeAccess(restricted, 'worker_document'), error => error.code === 'MODULE_PERMISSION_DENIED')
  assert.equal(canAccessEntityType(restricted, 'unknown_sensitive_type'), false)
  assert.throws(() => assertEntityTypeAccess(restricted, 'unknown_sensitive_type'), error => error.code === 'MODULE_PERMISSION_DENIED')
  assert.equal(canAccessEntityType({ role: 'client_admin', permissions: { modules: { trabajadores: false } } }, 'unknown_sensitive_type'), true)
})

test('state module updates reject disabled modules with a controlled 403 before any write', async () => {
  const route = stateRouter.stack.find(layer => layer.route?.path === '/modules' && layer.route.methods.put)
  const handler = route.route.stack.at(-1).handle
  const req = {
    auth: { role: 'rrhh', permissions: { modules: { trabajadores: false } } },
    body: { changes: { trabajadores: { version: 0, data: [] } } },
  }
  const res = { status() { throw new Error('The restricted request must not write or return a success response') } }
  let propagated
  await handler(req, res, error => { propagated = error })
  assert.equal(propagated?.status, 403)
  assert.equal(propagated?.code, 'MODULE_PERMISSION_DENIED')
})
