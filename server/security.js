import crypto from 'node:crypto';

export function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url'); }
export function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
export function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
export function normalizeRut(value) { return String(value || '').trim().toLowerCase().replace(/[^0-9k]/g, ''); }
export function isValidRut(value){const rut=normalizeRut(value);if(!/^\d{7,8}[0-9k]$/.test(rut))return false;const body=rut.slice(0,-1),expected=rut.at(-1);let sum=0,multiplier=2;for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*multiplier;multiplier=multiplier===7?2:multiplier+1;}const result=11-(sum%11),digit=result===11?'0':result===10?'k':String(result);return digit===expected;}
export function timingSafeEqualString(a, b) {
  const aa = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  console.log('SCRYPT_PARAMS password_length:', password.length, 'salt:', salt.slice(0,10));
  const hash = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (e, key) => e ? reject(e) : resolve(key.toString('hex'))));
  console.log('SCRYPT_RESULT:', hash.slice(0,20));
  return { hash, salt };
}
export async function verifyPassword(password, salt, expected) {
  const { hash } = await hashPassword(password, salt);
  console.log('VERIFY_HASH_GENERATED:', hash.slice(0,20));
  console.log('VERIFY_HASH_EXPECTED:', expected.slice(0,20));
  console.log('VERIFY_LENGTHS:', hash.length, expected.length);
  return timingSafeEqualString(hash, expected);
}
export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);
}
const BASE32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buffer){let bits=0,value=0,out='';for(const byte of buffer){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=BASE32[(value>>>(bits-5))&31];bits-=5;}}if(bits>0)out+=BASE32[(value<<(5-bits))&31];return out;}
export function base32Decode(input){const clean=String(input||'').toUpperCase().replace(/[^A-Z2-7]/g,'');let bits=0,value=0,bytes=[];for(const char of clean){const index=BASE32.indexOf(char);if(index<0)continue;value=(value<<5)|index;bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(bytes);}
export function generateTotpSecret(){return base32Encode(crypto.randomBytes(20));}
export function generateTotp(secret,time=Date.now(),step=30,digits=6){const counter=BigInt(Math.floor(time/1000/step)),buffer=Buffer.alloc(8);buffer.writeBigUInt64BE(counter);const digest=crypto.createHmac('sha1',base32Decode(secret)).update(buffer).digest(),offset=digest[digest.length-1]&15,code=((digest[offset]&127)<<24)|((digest[offset+1]&255)<<16)|((digest[offset+2]&255)<<8)|(digest[offset+3]&255);return String(code%(10**digits)).padStart(digits,'0');}
export function verifyTotp(secret,code,time=Date.now(),window=1){const value=String(code||'').replace(/\D/g,'');if(!/^\d{6}$/.test(value))return false;for(let offset=-window;offset<=window;offset++)if(timingSafeEqualString(generateTotp(secret,time+offset*30_000),value))return true;return false;}
export function generateRecoveryCodes(count=10){return Array.from({length:count},()=>`${crypto.randomBytes(4).toString('hex').slice(0,4)}-${crypto.randomBytes(4).toString('hex').slice(0,4)}`.toUpperCase());}
export function hashRecoveryCode(code){return sha256(String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,''));}
export function clientIp(req) { return String(req.ip || req.socket?.remoteAddress || '').slice(0, 80); }
const encryptionKey=()=>crypto.createHash('sha256').update(process.env.TENANT_SECRET_KEY||process.env.REGISTRATION_INVITE_CODE||'development-only-secret').digest();
export function encryptJson(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv),body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]),tag=cipher.getAuthTag();return Buffer.concat([iv,tag,body]).toString('base64url');}
export function decryptJson(value){if(!value)return{};const raw=Buffer.from(value,'base64url'),iv=raw.subarray(0,12),tag=raw.subarray(12,28),body=raw.subarray(28),decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString('utf8'));}
