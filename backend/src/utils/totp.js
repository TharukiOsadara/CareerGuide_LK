const crypto = require('crypto');

// Time-based one-time passwords (RFC 6238) - the 6-digit codes shown by
// Google Authenticator / Microsoft Authenticator. SHA-1, 30-second steps, 6 digits:
// the defaults every authenticator app supports.
const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// 160-bit random secret, base32-encoded (what the authenticator app stores).
const generateSecret = () => base32Encode(crypto.randomBytes(20));

function codeAtStep(secretBuf, step, digits = DIGITS) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', secretBuf).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

const currentStep = (nowMs = Date.now()) => Math.floor(nowMs / 1000 / STEP_SECONDS);

// Checks a code against the current step +/- `window` steps (allows ~30s of clock drift).
// Returns the matched step number, or null. Steps <= `lastUsedStep` are rejected so a
// code cannot be replayed.
function verifyCode(secret, code, { window = 1, lastUsedStep = null, nowMs = Date.now() } = {}) {
  const clean = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean) || !secret) return null;
  const key = base32Decode(secret);
  const now = currentStep(nowMs);
  for (let s = now - window; s <= now + window; s += 1) {
    if (lastUsedStep != null && s <= lastUsedStep) continue;
    const expected = codeAtStep(key, s);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return s;
  }
  return null;
}

// otpauth:// URI encoded in the setup QR code.
function otpauthUrl({ secret, account, issuer = 'CareerGuide LK' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = { generateSecret, verifyCode, otpauthUrl, base32Encode, base32Decode, codeAtStep };
