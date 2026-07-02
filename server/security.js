import crypto from 'node:crypto';

export function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url'); }
export function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
export function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
export function normalizeRut(value) { return String(value || '').trim().toLowerCase().replace(/[^0-9k]/g, ''); }
export function timingSafeEqualString(a, b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key.toString('hex'))));
  return { hash, salt };
}
export async function verifyPassword(password, salt, expected) {
  const { hash } = await hashPassword(password, salt);
  return timingSafeEqualString(hash, expected);
}
export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}
export function clientIp(req) { return String(req.ip || req.socket?.remoteAddress || '').slice(0, 80); }
const encryptionKey=()=>crypto.createHash('sha256').update(process.env.TENANT_SECRET_KEY||process.env.REGISTRATION_INVITE_CODE||'development-only-secret').digest();
export function encryptJson(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv),body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]),tag=cipher.getAuthTag();return Buffer.concat([iv,tag,body]).toString('base64url');}
export function decryptJson(value){if(!value)return{};const raw=Buffer.from(value,'base64url'),iv=raw.subarray(0,12),tag=raw.subarray(12,28),body=raw.subarray(28),decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8'));}
