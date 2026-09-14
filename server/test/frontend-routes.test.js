import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('every private navigation item resolves to a declared React route', () => {
  const sidebar = source('nexo-v2/src/components/layout/Sidebar.jsx');
  const app = source('nexo-v2/src/App.jsx');
  const navigationRoutes = [...sidebar.matchAll(/to:\s*'\/app([^']*)'/g)]
    .map(([, route]) => route || '/');
  const declaredRoutes = new Set([
    '/',
    ...[...app.matchAll(/path="([^"]+)"/g)].map(([, route]) => `/${route}`),
  ]);

  const missing = [...new Set(navigationRoutes)].filter(route => !declaredRoutes.has(route));
  assert.deepEqual(missing, []);
});
