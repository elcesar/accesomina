import test from 'node:test'
import assert from 'node:assert/strict'
import { validateTenantState } from '../validation.js'
import { OPTIONAL_RUT_ERROR, validateRut } from '../../shared/rut.js'

function state() {
  return {
    trabajadores: [],
    minas: [],
    contratos: [],
    mantenciones: [],
    asignaciones: [],
  }
}

test('new subcontractors require a valid RUT while an unchanged historical blank remains readable', () => {
  const current = state()
  current.subcontratos = [{ id: 'subc-legacy', razon: 'Tercero histórico', rut: '' }]

  assert.doesNotThrow(() => validateTenantState(structuredClone(current), { previousState: current }))

  const newBlank = structuredClone(current)
  newBlank.subcontratos.push({ id: 'subc-new', razon: 'Tercero nuevo', rut: '' })
  assert.throws(
    () => validateTenantState(newBlank, { previousState: current }),
    error => error.code === 'INCOMPLETE_SUBCONTRACTOR_RUT'
  )

  const invalid = structuredClone(current)
  invalid.subcontratos.push({ id: 'subc-invalid', razon: 'Tercero inválido', rut: '11.111.111-2' })
  assert.throws(
    () => validateTenantState(invalid, { previousState: current }),
    error => error.code === 'INVALID_SUBCONTRACTOR_RUT'
  )

  const valid = structuredClone(current)
  valid.subcontratos.push({ id: 'subc-valid', razon: 'Tercero válido', rut: '14.507.215-8' })
  assert.doesNotThrow(() => validateTenantState(valid, { previousState: current }))

  const previouslyIdentified = structuredClone(current)
  previouslyIdentified.subcontratos[0].rut = '14.507.215-8'
  const cleared = structuredClone(previouslyIdentified)
  cleared.subcontratos[0].rut = ''
  assert.throws(
    () => validateTenantState(cleared, { previousState: previouslyIdentified }),
    error => error.code === 'INCOMPLETE_SUBCONTRACTOR_RUT'
  )
})


test('shared RUT feedback allows formatting whitespace but rejects alpha and backslash input', () => {
  assert.equal(validateRut('14.507.215 - 8'), null)
  assert.equal(validateRut('14s507.215-8'), OPTIONAL_RUT_ERROR)
  assert.equal(validateRut('14\\\\507.215-8'), OPTIONAL_RUT_ERROR)
})
