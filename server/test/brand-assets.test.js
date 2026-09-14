import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const digest = relative => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(root, relative)))
  .digest('hex');

test('the canonical assets copied by deployment match the React brand assets', () => {
  const assets = [
    'NK-color-horizontal-claim.svg',
    'NK-color-horizontal.svg',
    'NK-blanco-horizontal.svg',
    'NK-favico.svg',
  ];

  for (const asset of assets) {
    assert.equal(
      digest(`public/brand/${asset}`),
      digest(`nexo-v2/public/brand/${asset}`),
      `${asset} must be identical in the canonical and React folders`,
    );
  }
});
