import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDemoRequest } from '../routes/contact.js';

test('normalizes a valid public demo request before persistence', () => {
  const request = normalizeDemoRequest({
    nombre: '  Carolina Soto ',
    empresa: ' Servicios Norte ',
    correo: ' CAROLINA@EMPRESA.CL ',
    telefono: '9 1234 5678',
    industria: 'Minería',
    dotacion: '31 a 75',
    necesidad: 'Acreditar personas.',
  });
  assert.deepEqual(request, {
    fullName: 'Carolina Soto', companyName: 'Servicios Norte', email: 'carolina@empresa.cl',
    phone: '+56912345678', industry: 'Minería', workforceSize: '31 a 75', need: 'Acreditar personas.',
  });
});

test('rejects a malformed public demo request', () => {
  assert.throws(() => normalizeDemoRequest({ nombre: 'A', correo: 'no-es-correo' }));
  assert.throws(() => normalizeDemoRequest({ nombre: 'Carolina Soto', correo: 'carolina@empresa.cl', telefono: '123' }), error => error.code === 'INVALID_CONTACT_PHONE');
});
