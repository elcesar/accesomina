import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidEmail, normalizeEmail, validateEmail, EMAIL_REQUIRED_ERROR } from '../src/services/email-validation.js'

test('email is optional unless required', () => {
  assert.equal(validateEmail(''), null)
  assert.equal(validateEmail('   '), null)
  assert.equal(validateEmail('', { required: true }), EMAIL_REQUIRED_ERROR)
})
test('email normalization and supported valid forms', () => {
  assert.equal(normalizeEmail('  a+b@sub.example.cl  '), 'a+b@sub.example.cl')
  for (const value of ['a@ejemplo.cl', 'a+b@sub.example.cl', 'first.last@example.com']) {
    assert.equal(isValidEmail(value), true, value)
  }
})
test('reject invalid email formats and excessive length', () => {
  for (const value of ['sin-arroba', 'persona@dominio', 'a..b@example.com', '.a@example.com', 'a@-example.com', 'a'.repeat(250) + '@example.com']) {
    assert.notEqual(validateEmail(value), null, value)
  }
})
