import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');

const indexSource = fs.readFileSync(path.join(serverDir, 'index.js'), 'utf8');
const authSource = fs.readFileSync(path.join(serverDir, 'routes', 'auth.js'), 'utf8');

test('password recovery endpoints are registered as public auth routes', () => {
  assert.match(authSource, /authRouter\.post\(['"]\/forgot-password['"]/);
  assert.match(authSource, /authRouter\.post\(['"]\/reset-password['"]/);
});

test('public auth router is mounted before global API authentication', () => {
  const publicAuthMount = indexSource.indexOf("app.use('/api/auth', authRouter)");
  const protectedApiMount = indexSource.indexOf("app.use('/api', authenticate, requireCsrf, requireMfa)");

  assert.notEqual(publicAuthMount, -1, 'public auth router must be mounted');
  assert.notEqual(protectedApiMount, -1, 'protected API middleware must be mounted');
  assert.ok(
    publicAuthMount < protectedApiMount,
    'password recovery must remain reachable without an authenticated session',
  );
});
