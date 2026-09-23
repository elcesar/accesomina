import assert from 'node:assert/strict'
import test from 'node:test'
import { moduleForPath, moduleIsEnabled } from '../../nexo-v2/src/services/module-access.js'

test('a disabled module blocks every route in its mapped functional area', () => {
  const modules = { trabajadores: false, vehiculos: false }
  assert.equal(moduleForPath('/app/trabajadores/t-123'), 'trabajadores')
  assert.equal(moduleForPath('/app/cursos'), 'trabajadores')
  assert.equal(moduleForPath('/app/mantenimiento'), 'vehiculos')
  assert.equal(moduleIsEnabled(modules, moduleForPath('/app/trabajadores/t-123')), false)
  assert.equal(moduleIsEnabled(modules, moduleForPath('/app/mantenimiento')), false)
})

test('unset settings keep their corresponding modules enabled', () => {
  assert.equal(moduleIsEnabled({}, moduleForPath('/app/servicios')), true)
  assert.equal(moduleIsEnabled({ mantenciones: true }, moduleForPath('/app/servicios')), true)
})
