import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const appSource = fs.readFileSync(path.join(root, 'nexo-v2', 'src', 'App.jsx'), 'utf8');
const loginSource = fs.readFileSync(path.join(root, 'nexo-v2', 'src', 'pages', 'LoginPage.jsx'), 'utf8');
const changePasswordSource = fs.readFileSync(path.join(root, 'nexo-v2', 'src', 'pages', 'ChangePasswordPage.jsx'), 'utf8');

test('account activation has a registered MFA route', () => {
  assert.match(appSource, /import MfaSetupPage from '.\/pages\/MfaSetupPage\.jsx'/);
  assert.match(appSource, /path="\/configurar-mfa"/);
});

test('a pending MFA enrollment cannot open the private application', () => {
  assert.match(appSource, /mfaEnrollmentRequired && !allowMfaEnrollment/);
  assert.match(appSource, /Navigate to="\/configurar-mfa"/);
});

test('first access continues from temporary password to MFA enrollment', () => {
  assert.match(loginSource, /navigate\('\/configurar-mfa'\)/);
  assert.match(changePasswordSource, /updatedSession\?\.user\?\.mfaEnrollmentRequired \? '\/configurar-mfa' : '\/app'/);
});
