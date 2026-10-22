import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTenantState } from '../validation.js';
import { validateOptionalHistoricalEmail } from '../email-policy.js';

// Covers identity-safe retention of commercial legacy email values.

const historical = {
  minas: [{ id: 'client-1', nombre: 'Cliente QA', emailMandante: 'central-invalido', contactos: [{ id: 'contact-1', nombre: 'Contacto QA', email: 'contacto-invalido' }] }],
  prospectos: [{ id: 'opp-1', company: 'Prospecto QA', type: 'nuevo_cliente', stage: 'prospecto', email: 'prospecto-invalido' }],
};

test('commercial historical emails remain exact during unrelated edits', () => {
  const next = JSON.parse(JSON.stringify(historical));
  next.minas[0].telefonoMandante = '+56912345678';
  next.prospectos[0].amount = 100;
  const clean = validateTenantState(next, { previousState: historical });
  assert.equal(clean.minas[0].emailMandante, 'central-invalido');
  assert.equal(clean.minas[0].contactos[0].email, 'contacto-invalido');
  assert.equal(clean.prospectos[0].email, 'prospecto-invalido');
});

test('new or changed invalid commercial emails are rejected by the server', () => {
  const changedClient = JSON.parse(JSON.stringify(historical));
  changedClient.minas[0].emailMandante = 'nuevo-invalido';
  assert.throws(() => validateTenantState(changedClient, { previousState: historical }), error => error.code === 'INVALID_CLIENT_EMAIL');

  const changedContact = JSON.parse(JSON.stringify(historical));
  changedContact.minas[0].contactos[0].email = 'nuevo-invalido';
  assert.throws(() => validateTenantState(changedContact, { previousState: historical }), error => error.code === 'INVALID_CLIENT_CONTACT_EMAIL');

  const changedOpportunity = JSON.parse(JSON.stringify(historical));
  changedOpportunity.prospectos[0].email = 'nuevo-invalido';
  assert.throws(() => validateTenantState(changedOpportunity, { previousState: historical }), error => error.code === 'INVALID_OPPORTUNITY_EMAIL');
});

test('empty optional commercial emails are valid', () => {
  const next = { minas: [{ id: 'client-empty', nombre: 'Cliente vacío', emailMandante: '', contactos: [{ id: 'contact-empty', nombre: 'Contacto vacío', email: '' }] }], prospectos: [{ id: 'opp-empty', company: 'Prospecto vacío', type: 'nuevo_cliente', stage: 'prospecto', email: '' }] };
  const clean = validateTenantState(next, { previousState: {} });
  assert.equal(clean.minas[0].emailMandante, '');
  assert.equal(clean.minas[0].contactos[0].email, '');
  assert.equal(clean.prospectos[0].email, '');
});


test('a new contact cannot borrow another contact historical email by position', () => {
  const next = JSON.parse(JSON.stringify(historical));
  next.minas[0].contactos = [{ id: 'contact-new', nombre: 'Nuevo contacto', email: 'contacto-invalido' }];
  assert.throws(
    () => validateTenantState(next, { previousState: historical }),
    error => error.code === 'INVALID_CLIENT_CONTACT_EMAIL',
  );
});

test('identified contacts preserve their own historical email after reordering', () => {
  const before = JSON.parse(JSON.stringify(historical));
  before.minas[0].contactos.push({ id: 'contact-2', nombre: 'Segundo contacto', email: 'segundo-invalido' });
  const next = JSON.parse(JSON.stringify(before));
  next.minas[0].contactos.reverse();
  const clean = validateTenantState(next, { previousState: before });
  assert.equal(clean.minas[0].contactos[0].id, 'contact-2');
  assert.equal(clean.minas[0].contactos[0].email, 'segundo-invalido');
  assert.equal(clean.minas[0].contactos[1].id, 'contact-1');
  assert.equal(clean.minas[0].contactos[1].email, 'contacto-invalido');
});

test('legacy contacts without IDs require one unambiguous name and phone match', () => {
  const before = {
    minas: [{
      id: 'client-legacy',
      nombre: 'Cliente legado',
      contactos: [{ nombre: 'Contacto legado', telefono: '+56911111111', email: 'legado-invalido' }],
    }],
  };
  const next = JSON.parse(JSON.stringify(before));
  next.minas[0].telefonoMandante = '+56922222222';
  assert.equal(
    validateTenantState(next, { previousState: before }).minas[0].contactos[0].email,
    'legado-invalido',
  );

  const ambiguous = JSON.parse(JSON.stringify(before));
  ambiguous.minas[0].contactos.push({ nombre: 'Contacto legado', telefono: '+56911111111', email: 'otro-invalido' });
  assert.throws(
    () => validateTenantState(ambiguous, { previousState: before }),
    error => error.code === 'INVALID_CLIENT_CONTACT_EMAIL',
  );
});

test('an absent previous value is not treated as a historical email exception', () => {
  assert.throws(
    () => validateOptionalHistoricalEmail('invalido', undefined, { hasPreviousRecord: false }),
    error => error.code === 'INVALID_EMAIL',
  );
  assert.equal(
    validateOptionalHistoricalEmail(undefined, undefined, { hasPreviousRecord: true }),
    undefined,
  );
});
