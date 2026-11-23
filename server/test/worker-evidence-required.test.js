import test from 'node:test';
import assert from 'node:assert/strict';
import { DOCUMENT_TYPE_OPTIONS } from '../../nexo-v2/src/services/worker-document-rules.js';
import { changedWorkerDocuments, requireWorkerDocumentEvidence } from '../worker-document-evidence.js';
import { validateAppendChanges, validateTenantState, validateWorkerDocumentAppend } from '../validation.js';

const worker = { id: 'qa-worker', nombre: 'Persona ficticia QA', rut: '13.848.379-7', workerItems: [] };
const contract = { id: 'qa-contract', name: 'Contrato de trabajo', type: 'contrato', documentType: 'EMPLOYMENT_CONTRACT' };

for (const { value, label } of DOCUMENT_TYPE_OPTIONS) {
  test(`${value}: fileless evidence is rejected through the document append and state validators`, () => {
    const item = { id: 'qa-document', name: label, documentType: value };
    assert.throws(() => validateWorkerDocumentAppend(worker, item), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
    assert.throws(() => validateTenantState({ trabajadores: [{ ...worker, workerItems: [item] }] }), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
  });
}

test('filenames, embedded bytes, draft flags and claimed availability never replace a stored reference', () => {
  for (const patch of [{ fileName: 'QA.pdf' }, { fileData: 'data:application/pdf;base64,QQ==' }, { status: 'borrador' }, { fileAvailability: 'available' }, { files: [{ fileName: 'QA.pdf' }] }]) {
    assert.throws(() => requireWorkerDocumentEvidence({ ...contract, ...patch }), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
  }
});

test('two-sided documents require both stored sides and a real expiry date', () => {
  const item = { id: 'qa-identity', name: 'Cédula de identidad', documentType: 'IDENTITY_CARD', files: [{ side: 'front', fileId: 'qa-front' }] };
  assert.throws(() => requireWorkerDocumentEvidence(item), error => error.code === 'WORKER_DOCUMENT_SIDES_REQUIRED');
  const both = { ...item, files: [...item.files, { side: 'back', fileId: 'qa-back' }] };
  for (const vence of ['', '2030-02-30', 'no-fecha']) assert.throws(() => requireWorkerDocumentEvidence({ ...both, vence }), error => error.code === 'WORKER_DOCUMENT_EXPIRY_REQUIRED');
  assert.doesNotThrow(() => requireWorkerDocumentEvidence({ ...both, vence: '2030-02-28' }));
  assert.doesNotThrow(() => requireWorkerDocumentEvidence({ ...contract, fileId: 'qa-file', vence: '' }));
});

test('a valid main attachment cannot conceal malformed extra file references', () => {
  for (const file of [{ fileName: 'sin-referencia.pdf' }, { fileId: 123 }, { fileId: ' qa-file ' }]) {
    assert.throws(() => requireWorkerDocumentEvidence({ ...contract, fileId: 'qa-valid', files: [file] }), error => error.code === 'WORKER_DOCUMENT_FILE_UNAVAILABLE');
  }
});

test('unchanged historical fileless documents do not block profile edits or another module', () => {
  const old = { ...worker, workerItems: [contract] };
  const result = validateTenantState({ trabajadores: [{ ...old, cargo: 'Cargo QA' }], configuracion: { note: 'QA' } }, { previousState: { trabajadores: [old] } });
  assert.deepEqual(result.trabajadores[0].workerItems, [contract]);
  assert.throws(() => validateTenantState({ trabajadores: [{ ...old, workerItems: [{ ...contract, name: 'Documento modificado' }] }] }, { previousState: { trabajadores: [old] } }), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
});

test('append-only legacy fallback cannot bypass evidence requirements', () => {
  const before = { trabajadores: [worker], asignaciones: [{ id: 'qa-old-link', trabId: 'missing', mantId: 'missing' }] };
  const after = { ...before, trabajadores: [{ ...worker, workerItems: [contract] }] };
  assert.throws(() => validateAppendChanges(before, after, ['trabajadores']), error => error.code === 'WORKER_DOCUMENT_FILE_REQUIRED');
  const valid = { ...after, trabajadores: [{ ...worker, workerItems: [{ ...contract, fileId: 'qa-file' }] }] };
  assert.equal(validateAppendChanges(before, valid, ['trabajadores']), true);
});

test('history is matched by worker/document identity, not by position or a forged client snapshot', () => {
  const old = { ...worker, workerItems: [contract] };
  const reordered = { ...old, workerItems: [{ id: 'qa-other', name: 'CV', documentType: 'CV', fileId: 'qa-file' }, contract] };
  assert.deepEqual(changedWorkerDocuments([old], [reordered]), [reordered.workerItems[0]]);
  assert.deepEqual(changedWorkerDocuments([old], [{ ...old, id: 'qa-new-worker' }]), [contract]);
  assert.deepEqual(changedWorkerDocuments([old], [{ ...old, workerItems: [{ ...contract, id: 'qa-new-document' }] }]), [{ ...contract, id: 'qa-new-document' }]);
  const anonymous = { ...contract }; delete anonymous.id;
  assert.deepEqual(changedWorkerDocuments([{ ...worker, workerItems: [anonymous] }], [{ ...worker, workerItems: [anonymous, anonymous] }]), [anonymous]);
});
