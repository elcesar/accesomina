import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadDocumentFiles } from '../../nexo-v2/src/services/worker-document-upload.js'

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
