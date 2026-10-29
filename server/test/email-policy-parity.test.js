import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { sanitizeJson, validateTenantState } from '../validation.js';
import { isValidEmail, normalizeEmail } from '../../nexo-v2/src/services/email-validation.js';
import { emailCases } from './fixtures/email-cases.js';

const schema = z.string().trim().max(254).email();
const optional = value => value == null || (typeof value === 'string' && !value.trim());

test('preserving worker email does not change sanitization of other strings or emails', () => {
  const email = "o'connor@example.com";
  const sanitized = sanitizeJson({
    trabajadores: [{ email, nombre: '<Persona> "QA"' }],
    minas: [{ email, nombre: '<Cliente>' }],
    email,
  });
  assert.equal(sanitized.trabajadores[0].email, email);
  assert.equal(sanitized.trabajadores[0].nombre, 'Persona ”QA”');
  assert.equal(sanitized.minas[0].email, 'o’connor@example.com');
  assert.equal(sanitized.minas[0].nombre, 'Cliente');
  assert.equal(sanitized.email, 'o’connor@example.com');
});

for (const { name, value, valid } of emailCases) {
  test(`shared UI, installed Zod and server agree: ${name}`, () => {
    const zodAccepts = optional(value) || schema.safeParse(value).success;
    assert.equal(zodAccepts, valid, 'independent expectation matches installed Zod');
    assert.equal(isValidEmail(value), zodAccepts, 'optional UI policy');
    assert.equal(isValidEmail(value, { required: true }), schema.safeParse(value).success, 'required UI policy');
    const input = { trabajadores: [{ id: 'qa-parity', nombre: 'Persona QA', rut: '14.507.215-8', email: value }] };
    if (valid) {
      assert.equal(validateTenantState(input).trabajadores[0].email, value == null ? value : normalizeEmail(value));
    } else {
      assert.throws(() => validateTenantState(input), error => error.code === 'INVALID_WORKER_EMAIL');
    }
  });
}
