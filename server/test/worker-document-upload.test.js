import assert from 'node:assert/strict'
import test from 'node:test'
import { removeUploadedFiles, uploadDocumentFiles } from '../../nexo-v2/src/services/worker-document-upload.js'

test('a failed second side removes the first uploaded document', async () => {
  const removed = []
  let calls = 0
  await assert.rejects(() => uploadDocumentFiles({
    workerId: 'worker-1',
    files: [{ side: 'front', file: { name: 'front.pdf' } }, { side: 'back', file: { name: 'back.pdf' } }],
    uploadFile: async () => {
      calls += 1
      if (calls === 2) throw new Error('storage unavailable')
      return { id: 'front-file', original_name: 'front.pdf', content_type: 'application/pdf', byte_size: 10 }
    },
    removeFile: async id => { removed.push(id) },
  }), /storage unavailable/)
  assert.deepEqual(removed, ['front-file'])
})

test('a failed second side never removes a reused file belonging to existing evidence', async () => {
  const removed = []
  let calls = 0
  await assert.rejects(() => uploadDocumentFiles({
    workerId: 'qa-worker', files: [{ side: 'front', file: { name: 'QA.pdf' } }, { side: 'back', file: { name: 'QA-back.pdf' } }],
    uploadFile: async () => { if (++calls === 2) throw new Error('QA storage failure'); return { id: 'qa-shared', deduplicated: true } },
    removeFile: async id => removed.push(id),
  }), /QA storage failure/)
  assert.deepEqual(removed, [])
})

test('failed persistence removes new uploads and preserves deduplicated references', async () => {
  const removed = []
  await removeUploadedFiles([{ fileId: 'qa-new' }, { fileId: 'qa-shared', deduplicated: true }], async id => removed.push(id))
  assert.deepEqual(removed, ['qa-new'])
})
