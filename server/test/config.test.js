import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeEnvironment } from '../runtime-validation.js';

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://app:secret@db.example.com/accesomina',
  APP_ORIGIN: 'https://app.example.com',
  TENANT_SECRET_KEY: '5b54c8c0dca93623111c1db64622f6da',
  REGISTRATION_INVITE_CODE: 'invite-5d6d87e633e30f067979',
  REGISTRATION_ENABLED: 'false',
  MFA_REQUIRED: 'true',
  FILE_STORAGE: 's3',
  AWS_S3_BUCKET: 'private-accesomina-files',
  VIRUS_SCAN_API_URL: 'https://scanner.example.com/scan'
  ,METRICS_TOKEN: 'monitor-4f57c269775f4caaa9156af36b3e'
};

test('production configuration accepts complete secure infrastructure', () => {
  assert.doesNotThrow(() => validateRuntimeEnvironment(productionEnv));
});

test('production configuration refuses insecure or incomplete infrastructure', () => {
  const invalid = { ...productionEnv, APP_ORIGIN: 'http://localhost:8088', TENANT_SECRET_KEY: 'short', REGISTRATION_ENABLED:'true',MFA_REQUIRED:'false',REGISTRATION_INVITE_CODE: 'change-this', FILE_STORAGE: 'local', AWS_S3_BUCKET: '', VIRUS_SCAN_API_URL: '' };
  assert.throws(() => validateRuntimeEnvironment(invalid), error => {
    assert.match(error.message, /APP_ORIGIN/);
    assert.match(error.message, /TENANT_SECRET_KEY/);
    assert.match(error.message, /REGISTRATION_INVITE_CODE/);
    assert.match(error.message, /REGISTRATION_ENABLED/);
    assert.match(error.message, /MFA_REQUIRED/);
    assert.match(error.message, /FILE_STORAGE/);
    assert.match(error.message, /AWS_S3_BUCKET/);
    assert.match(error.message, /VIRUS_SCAN_API_URL/);
    return true;
  });
});

test('development requires only a database connection', () => {
  assert.doesNotThrow(() => validateRuntimeEnvironment({ NODE_ENV: 'development', DATABASE_URL: 'postgres://localhost/accesomina' }));
  assert.throws(() => validateRuntimeEnvironment({ NODE_ENV: 'development' }), /DATABASE_URL/);
});
