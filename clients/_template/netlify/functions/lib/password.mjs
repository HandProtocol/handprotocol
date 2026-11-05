// Optional passwords for editors, next to the magic link (which stays the
// way back in when a password is forgotten). scrypt from node:crypto, no
// dependency. Stored as "scrypt$N$r$p$salt$hash" (base64url) so the cost can
// rise later without breaking old hashes.

import crypto from 'node:crypto';

const N = 1 << 16, R = 8, P = 1, KEYLEN = 32;
const MAXMEM = 256 * 1024 * 1024;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

function scrypt(password, salt, { n, r, p, keylen }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password).normalize('NFKC'), salt, keylen, { N: n, r, p, maxmem: MAXMEM }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, { n: N, r: R, p: P, keylen: KEYLEN });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

// A stored value we did not write (or none) still costs one hash, so the
// answer time does not tell a stranger whether the email has a password.
const DUMMY = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(KEYLEN).toString('base64url')}`;

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  const real = parts.length === 6 && parts[0] === 'scrypt';
  const [, n, r, p, salt, hash] = real ? parts : DUMMY.split('$');
  const want = Buffer.from(hash, 'base64url');
  const got = await scrypt(password, Buffer.from(salt, 'base64url'), { n: Number(n), r: Number(r), p: Number(p), keylen: want.length || KEYLEN });
  return real && want.length === got.length && crypto.timingSafeEqual(want, got);
}

// Why a new password will not do, in words for the owner, or '' when it is fine.
export function passwordProblem(password, email = '') {
  const pw = String(password || '');
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters. A short sentence is easy to remember.`;
  if (pw.length > PASSWORD_MAX) return `Keep it under ${PASSWORD_MAX} characters.`;
  if (/^(.)\1+$/.test(pw)) return 'Pick something less repetitive.';
  const local = String(email || '').split('@')[0].toLowerCase();
  if (pw.toLowerCase() === String(email || '').toLowerCase() || (local.length >= 4 && pw.toLowerCase().includes(local))) return 'Pick something that is not your email address.';
  if (COMMON.has(pw.toLowerCase())) return 'That one is on every list of guessed passwords. Pick another.';
  return '';
}

const COMMON = new Set(['password12', 'password123', 'password1234', '1234567890', '0123456789', 'qwertyuiop', '1q2w3e4r5t', 'iloveyou12', 'letmein123', 'welcome123', 'admin12345', 'abcdefghij', 'passw0rd123', '11111111111', 'football123', 'baseball123', 'princess123', 'sunshine123', 'qwerty12345', 'changeme123']);
