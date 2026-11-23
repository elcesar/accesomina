import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const pagePath = new URL('../../nexo-v2/src/pages/FichaTrabajadorPage.jsx', import.meta.url)

test('worker document deletion delegates confirmation and in-dialog errors to ConfirmDialog', async () => {
  const source = await readFile(pagePath, 'utf8')

  assert.match(source, /import ConfirmDialog from '..\/components\/ui\/ConfirmDialog\.jsx'/)
  assert.match(source, /const \[documentToRemove, setDocumentToRemove\] = useState\(null\)/)
  assert.match(source, /const \[deleteError, setDeleteError\] = useState\(null\)/)
  assert.match(source, /onClick=\{\(\) => solicitarEliminacion\(d\)\}/)
  assert.match(source, /open=\{Boolean\(documentToRemove\)\}/)
  assert.match(source, /variant="danger"/)
  assert.match(source, /loading=\{uploading\}/)
  assert.match(source, /error=\{deleteError\}/)
  assert.match(source, /setDeleteError\(message\)/)
  assert.match(source, /await onRemoveItem\(documentToRemove\)/)
})
