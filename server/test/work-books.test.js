import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canTransitionWorkBookEntry, workBookFolio } from '../work-book.js';
import { validateTenantState } from '../validation.js';

const workBookRoute = fs.readFileSync(new URL('../routes/work-books.js', import.meta.url), 'utf8');
const frontend = fs.readFileSync(new URL('../../AccesoMina_v6.html', import.meta.url), 'utf8');
const signatureMigration = fs.readFileSync(new URL('../../database/postgres/018_work_book_signature_requests.sql', import.meta.url), 'utf8');
const governanceMigration = fs.readFileSync(new URL('../../database/postgres/020_work_book_governance.sql', import.meta.url), 'utf8');

function validState() {
  return {
    minas: [{ id: 'mine-1', nombre: 'Cliente Uno', mandante: 'Mandante Uno' }],
    contratos: [{ id: 'contract-1', minaId: 'mine-1' }],
    mantenciones: [{ id: 'project-1', minaId: 'mine-1', contratoId: 'contract-1' }],
    trabajadores: [],
    asignaciones: [],
    hoteles: [],
    hotelAsig: [],
    firmas: [],
    callouts: [],
    waGroups: [],
    permisosTrabajo: [],
    incidentes: [],
    subcontratos: [],
    vehiculos: [],
    eppDeliveries: [],
    eppMeasurements: {},
    opportunities: [],
    workBookEntries: [{
      id: 'entry-1',
      folio: 'LOD-2026-00001',
      entryNumber: 1,
      mineRef: 'mine-1',
      contractRef: 'contract-1',
      projectRef: 'project-1',
      subject: 'Inicio de servicio',
      body: 'Se entrega terreno y se inicia la ejecución.',
      status: 'borrador'
    }]
  };
}

test('work book folio is deterministic and padded', () => {
  assert.equal(workBookFolio(2026, 7), 'LOD-2026-00007');
});

test('work book workflow protects signed and closed entries', () => {
  assert.equal(canTransitionWorkBookEntry('borrador', 'pendiente_firma'), true);
  assert.equal(canTransitionWorkBookEntry('pendiente_firma', 'firmado'), true);
  assert.equal(canTransitionWorkBookEntry('firmado', 'borrador'), false);
  assert.equal(canTransitionWorkBookEntry('cerrado', 'observado'), false);
});

test('tenant state accepts a correctly scoped work book entry', () => {
  assert.doesNotThrow(() => validateTenantState(validState()));
});

test('tenant state rejects a work book entry from another client scope', () => {
  const state = validState();
  state.minas.push({ id: 'mine-2', nombre: 'Cliente Dos', mandante: 'Mandante Dos' });
  state.workBookEntries[0].mineRef = 'mine-2';
  assert.throws(() => validateTenantState(state), error => error.code === 'WORK_BOOK_SCOPE_MISMATCH');
});

test('tenant state rejects duplicate work book entry numbers', () => {
  const state = validState();
  state.workBookEntries.push({ ...state.workBookEntries[0], id: 'entry-2' });
  assert.throws(() => validateTenantState(state), error => error.code === 'DUPLICATE_WORK_BOOK_ENTRY');
});

test('work book signature requests connect provider, email and mobile channels', () => {
  assert.match(workBookRoute, /entries\/:id\/signature-requests/);
  assert.match(workBookRoute, /sendSignatureEmail/);
  assert.match(workBookRoute, /sendSignatureWhatsapp/);
  assert.match(workBookRoute, /work_book\.signature\.requested/);
  assert.match(frontend, /Solicitar firma electrónica/);
  assert.match(frontend, /sendWorkBookSignatureRequestV127/);
});

test('work book signature requests are tenant isolated and deduplicated', () => {
  assert.match(signatureMigration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(signatureMigration, /FORCE ROW LEVEL SECURITY/);
  assert.match(signatureMigration, /idx_work_book_signature_active/);
  assert.match(signatureMigration, /pendiente_configuracion/);
});

test('work book keeps approval and signature callback controls available', () => {
  assert.match(workBookRoute, /entries\/:id\/approvals/);
  assert.match(workBookRoute, /workBookSignatureCallbacksRouter\.post/);
  assert.match(workBookRoute, /SIGNATURE_CALLBACK_UNAUTHORIZED/);
  assert.match(governanceMigration, /work_book_entry_approvals/);
  assert.match(governanceMigration, /FORCE ROW LEVEL SECURITY/);
});
