import test from 'node:test';
import assert from 'node:assert/strict';
import { filesRouter } from '../routes/files.js';

test('file infrastructure is checked before Multer receives an upload', () => {
  const route = filesRouter.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post);
  assert.ok(route);

  const handlers = route.route.stack.map(layer => layer.handle.name);
  assert.equal(handlers.indexOf('requireFileInfrastructure') < handlers.indexOf('multerMiddleware'), true);
});
