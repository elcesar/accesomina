import test from 'node:test';
import assert from 'node:assert/strict';
import { decryptJson, encryptJson, generateRecoveryCodes, generateTotp, generateTotpSecret, hashPassword, hashRecoveryCode, verifyPassword, verifyTotp, validatePassword, normalizeRut, isValidRut } from '../security.js';

test('passwords are hashed with a unique salt and verified safely', async () => {
  const first=await hashPassword('SecurePassword123'),second=await hashPassword('SecurePassword123');
  assert.notEqual(first.hash,second.hash);assert.equal(await verifyPassword('SecurePassword123',first.salt,first.hash),true);assert.equal(await verifyPassword('wrong',first.salt,first.hash),false);
});
test('password policy and RUT normalization',()=>{assert.equal(validatePassword('SecurePassword123'),true);assert.equal(validatePassword('short'),false);assert.equal(normalizeRut('78.425.213-2'),'784252132');});
test('Chilean worker RUT validation checks verifier digit',()=>{assert.equal(isValidRut('78.425.213-2'),true);assert.equal(isValidRut('78.425.213-1'),false);});
test('company registration RUT examples validate checksum',()=>{assert.equal(isValidRut('76.123.456-0'),true);assert.equal(isValidRut('76.123.456-7'),false);});
test('tenant integration secrets are encrypted and authenticated',()=>{const value={token:'private-token',pass:'private-password'},encrypted=encryptJson(value);assert.equal(encrypted.includes(value.token),false);assert.deepEqual(decryptJson(encrypted),value);assert.throws(()=>decryptJson(`${encrypted.slice(0,-2)}aa`));});
test('TOTP MFA generates and verifies time-bound codes',()=>{const secret=generateTotpSecret(),time=1_750_000_000_000,code=generateTotp(secret,time);assert.match(secret,/^[A-Z2-7]+$/);assert.match(code,/^\d{6}$/);assert.equal(verifyTotp(secret,code,time),true);assert.equal(verifyTotp(secret,'000000',time),false);});
test('MFA recovery codes are unique and stored only as hashes',()=>{const codes=generateRecoveryCodes();assert.equal(codes.length,10);assert.equal(new Set(codes).size,10);assert.equal(hashRecoveryCode(codes[0]).includes(codes[0]),false);});
