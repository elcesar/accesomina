import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { config } from '../config.js';
import { eraseTenantFiles } from '../tenant-erasure.js';

const KEY = 'tenants/qa-erasure/objects/document.pdf';
const file = { storage_provider: 's3', storage_key: KEY };
let previousBucket;
before(() => { previousBucket = config.aws.bucket; config.aws.bucket = 'qa-erasure-stub-only'; });
after(() => { config.aws.bucket = previousBucket; });

// Model only S3 metadata and requests in memory. No SDK client makes network calls.
function versionedStore(seed, { status = 'Enabled', pageSize = 1000, failVersionOnce, afterDelete } = {}) {
  let entries = structuredClone(seed), fail = failVersionOnce;
  const calls = [];
  const store = {
    calls,
    entries: () => structuredClone(entries),
    async send(command) {
      const name = command.constructor.name, input = structuredClone(command.input);
      calls.push({ name, input });
      assert.equal(input.Bucket, 'qa-erasure-stub-only');
      if (name === 'GetBucketVersioningCommand') return status ? { Status: status } : {};
      if (name === 'ListObjectVersionsCommand') {
        const selected = entries.filter(entry => entry.Key.startsWith(input.Prefix))
          .sort((a, b) => a.Key < b.Key ? -1 : a.Key > b.Key ? 1 : 0);
        let start = 0;
        if (input.KeyMarker !== undefined) {
          start = selected.findIndex(entry => entry.Key === input.KeyMarker && entry.VersionId === input.VersionIdMarker);
          assert.notEqual(start, -1, 'Pagination must finish before versions referenced by its markers are deleted');
          start++;
        }
        const page = selected.slice(start, start + pageSize), truncated = start + page.length < selected.length;
        const strip = ({ kind, ...entry }) => entry;
        return { Versions: page.filter(entry => entry.kind !== 'marker').map(strip),
          DeleteMarkers: page.filter(entry => entry.kind === 'marker').map(strip), IsTruncated: truncated,
          ...(truncated ? { NextKeyMarker: page.at(-1).Key, NextVersionIdMarker: page.at(-1).VersionId } : {}) };
      }
      assert.equal(name, 'DeleteObjectCommand');
      if (fail !== undefined && input.VersionId === fail) { fail = undefined; throw Object.assign(new Error('QA object retained'), { code: 'AccessDenied' }); }
      if (input.VersionId !== undefined) entries = entries.filter(entry => entry.Key !== input.Key || entry.VersionId !== input.VersionId);
      else if (status) entries.unshift({ Key: input.Key, VersionId: 'new-delete-marker', kind: 'marker' });
      else entries = entries.filter(entry => entry.Key !== input.Key);
      afterDelete?.(input, entries);
      return {};
    },
  };
  return store;
}

test('unversioned S3 objects use a permanent exact-key delete', async () => {
  const store = versionedStore([{ Key: KEY, VersionId: 'null' }], { status: '' });
  assert.equal(await eraseTenantFiles([file], { s3: store }), 1);
  assert.deepEqual(store.entries(), []);
  assert.deepEqual(store.calls.map(call => call.name), ['GetBucketVersioningCommand', 'DeleteObjectCommand']);
  assert.deepEqual(store.calls[1].input, { Bucket: config.aws.bucket, Key: KEY });
});

test('enabled S3 versioning removes every version and delete marker across pages without deleting prefix neighbours', async () => {
  const neighbour = { Key: `${KEY}.neighbour`, VersionId: 'other-version' };
  const store = versionedStore([{ Key: KEY, VersionId: 'v3' }, { Key: KEY, VersionId: 'marker', kind: 'marker' },
    { Key: KEY, VersionId: 'v2' }, { Key: KEY, VersionId: 'v1' }, neighbour], { pageSize: 2 });
  assert.equal(await eraseTenantFiles([file, file], { s3: store }), 1);
  assert.deepEqual(store.entries(), [neighbour]);
  const deletes = store.calls.filter(call => call.name === 'DeleteObjectCommand');
  assert.deepEqual(new Set(deletes.map(call => call.input.VersionId)), new Set(['v3', 'v2', 'v1', 'marker']));
  assert.ok(deletes.every(call => call.input.Key === KEY && call.input.VersionId));
  const lists = store.calls.filter(call => call.name === 'ListObjectVersionsCommand');
  assert.equal(lists[0].input.Prefix, KEY);
  assert.equal(lists[1].input.KeyMarker, KEY);
  assert.equal(lists[1].input.VersionIdMarker, 'marker');
  assert.equal(store.calls.slice(0, store.calls.indexOf(deletes[0])).filter(call => call.name === 'ListObjectVersionsCommand').length, 3);
});

test('suspended S3 versioning removes the null version, older versions and delete markers permanently', async () => {
  const store = versionedStore([{ Key: KEY, VersionId: 'null' }, { Key: KEY, VersionId: 'older' },
    { Key: KEY, VersionId: 'marker', kind: 'marker' }], { status: 'Suspended' });
  await eraseTenantFiles([file], { s3: store });
  assert.deepEqual(store.entries(), []);
  assert.ok(store.calls.some(call => call.name === 'DeleteObjectCommand' && call.input.VersionId === 'null'));
});

test('an already-erased versioned key is idempotent and does not create a new delete marker', async () => {
  const neighbour = { Key: `${KEY}.neighbour`, VersionId: 'other-version' };
  const store = versionedStore([neighbour]);
  assert.equal(await eraseTenantFiles([file], { s3: store }), 1);
  assert.equal(await eraseTenantFiles([file], { s3: store }), 1);
  assert.deepEqual(store.entries(), [neighbour]);
  assert.equal(store.calls.filter(call => call.name === 'DeleteObjectCommand').length, 0);
});

test('unknown S3 versioning state is not reported as complete', async () => {
  const store = versionedStore([{ Key: KEY, VersionId: 'v1' }], { status: 'Unknown' });
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'STORAGE_VERSIONING_UNKNOWN' });
  assert.equal(store.calls.length, 1);
});

test('a denied versioning lookup fails before any destructive request', async () => {
  const calls = [];
  await assert.rejects(() => eraseTenantFiles([file], { s3: { async send(command) {
    calls.push(command.constructor.name); throw Object.assign(new Error('QA access denied'), { code: 'AccessDenied' });
  } } }), { code: 'AccessDenied' });
  assert.deepEqual(calls, ['GetBucketVersioningCommand']);
});

test('an incomplete listing fails before deleting any version', async () => {
  const store = versionedStore([{ Key: KEY, VersionId: 'v2' }, { Key: KEY, VersionId: 'v1' }], { pageSize: 1 });
  const send = store.send.bind(store);
  store.send = async command => {
    if (command.constructor.name === 'ListObjectVersionsCommand' && command.input.KeyMarker) throw Object.assign(new Error('QA listing unavailable'), { code: 'AccessDenied' });
    return send(command);
  };
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'AccessDenied' });
  assert.equal(store.entries().length, 2);
  assert.equal(store.calls.filter(call => call.name === 'DeleteObjectCommand').length, 0);
});

test('a partial version deletion remains retryable and the retry removes only remaining versions', async () => {
  const store = versionedStore([{ Key: KEY, VersionId: 'v2' }, { Key: KEY, VersionId: 'v1' },
    { Key: KEY, VersionId: 'marker', kind: 'marker' }], { failVersionOnce: 'v1' });
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'AccessDenied' });
  assert.deepEqual(store.entries().map(entry => entry.VersionId), ['v1', 'marker']);
  assert.equal(await eraseTenantFiles([file], { s3: store }), 1);
  assert.deepEqual(store.entries(), []);
  assert.equal(store.calls.filter(call => call.name === 'DeleteObjectCommand' && call.input.VersionId === 'v2').length, 1);
});

test('a version appearing during cleanup keeps the object pending until a later successful retry', async () => {
  let inject = true;
  const store = versionedStore([{ Key: KEY, VersionId: 'v1' }], { afterDelete(_input, entries) {
    if (inject) { inject = false; entries.push({ Key: KEY, VersionId: 'late-version' }); }
  } });
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'STORAGE_VERSIONS_REMAIN' });
  assert.deepEqual(store.entries().map(entry => entry.VersionId), ['late-version']);
  assert.equal(await eraseTenantFiles([file], { s3: store }), 1);
  assert.deepEqual(store.entries(), []);
});

test('repeated pagination markers fail closed instead of looping or deleting a partial listing', async () => {
  const calls = [];
  const store = { async send(command) {
    calls.push(command.constructor.name);
    return command.constructor.name === 'GetBucketVersioningCommand' ? { Status: 'Enabled' }
      : { Versions: [{ Key: KEY, VersionId: 'v1' }], IsTruncated: true, NextKeyMarker: KEY, NextVersionIdMarker: 'v1' };
  } };
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'STORAGE_LISTING_INCOMPLETE' });
  assert.deepEqual(calls, ['GetBucketVersioningCommand', 'ListObjectVersionsCommand', 'ListObjectVersionsCommand']);
});

test('a listed exact key without its version identifier is not silently marked erased', async () => {
  const store = { async send(command) { return command.constructor.name === 'GetBucketVersioningCommand' ? { Status: 'Enabled' } : { Versions: [{ Key: KEY }] }; } };
  await assert.rejects(() => eraseTenantFiles([file], { s3: store }), { code: 'STORAGE_VERSION_ID_MISSING' });
});

test('local traversal outside the configured upload root is rejected before removal', async () => {
  let removed = false;
  await assert.rejects(() => eraseTenantFiles([{ storage_provider: 'local', storage_key: '../../qa-outside' }], {
    removeFile: async () => { removed = true; },
  }), { code: 'INVALID_STORAGE_KEY' });
  assert.equal(removed, false);
});

test('a local parent symlink cannot redirect cleanup outside the configured root', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'nexoklar-erasure-storage-'));
  try {
    const root = path.join(fixture, 'uploads'), outside = path.join(fixture, 'outside');
    await fs.mkdir(root); await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'qa-sentinel'), 'QA fixture unchanged');
    await fs.symlink(outside, path.join(root, 'linked'));
    let removed = false;
    await assert.rejects(() => eraseTenantFiles([{ storage_provider: 'local', storage_key: 'linked/qa-sentinel' }], {
      uploadDir: root,
      removeFile: async () => { removed = true; },
    }), { code: 'INVALID_STORAGE_KEY' });
    assert.equal(removed, false);
    assert.equal(await fs.readFile(path.join(outside, 'qa-sentinel'), 'utf8'), 'QA fixture unchanged');
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});

test('local files inside the root and already-missing parents retain force-delete idempotence', async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'nexoklar-erasure-storage-'));
  try {
    await fs.mkdir(path.join(fixture, 'objects'));
    await fs.writeFile(path.join(fixture, 'objects', 'qa-file'), 'QA fixture unchanged');
    const removed = [];
    const dependencies = { uploadDir: fixture, removeFile: async (target, options) => { removed.push(target); assert.equal(options.force, true); } };
    assert.equal(await eraseTenantFiles([{ storage_provider: 'local', storage_key: 'objects/qa-file' }], dependencies), 1);
    assert.equal(await eraseTenantFiles([{ storage_provider: 'local', storage_key: 'missing-parent/qa-file' }], dependencies), 1);
    assert.equal(removed.length, 2);
    assert.equal(await fs.readFile(path.join(fixture, 'objects', 'qa-file'), 'utf8'), 'QA fixture unchanged');
  } finally {
    await fs.rm(fixture, { recursive: true, force: true });
  }
});
