// Shared helpers for the hand-client-seo scripts. No dependencies.
// What a "client" is (REPO, clientDirs, loadClientConfig…) comes from the
// sibling hand-client-site skill, so both tools always agree.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export {
  REPO,
  CLIENTS,
  TEMPLATE,
  args,
  die,
  ok,
  today,
  clientDirs,
  loadClientConfig,
  publishDir,
  capture,
  run,
} from '../../../hand-client-site/scripts/lib.mjs';

export const VERSION = '1.0.0';
export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SCRIPTS_DIR = resolve(SKILL_DIR, 'scripts');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = {
  bold: paint('1'),
  dim: paint('2'),
  red: paint('31'),
  green: paint('32'),
  yellow: paint('33'),
  blue: paint('34'),
  cyan: paint('36'),
};

export function nowIso() {
  return new Date().toISOString();
}

// 20260930-211502: sorts by time, safe in a path.
export function stamp(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}

export function clip(text, max = 120) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${err.message}`);
  }
}

export function writeFileEnsured(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return path;
}

export function writeJson(path, data) {
  return writeFileEnsured(path, `${JSON.stringify(data, null, 2)}\n`);
}

// Run fn over items with at most `limit` in flight; results keep input order.
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

export function tryUrl(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

// One spelling per page: lowercase scheme + host, no default port, no
// fragment. The query stays (it can change the page); the path is untouched
// because servers treat /a and /a/ as different URLs.
export function normalizeUrl(value, base) {
  const u = tryUrl(value, base);
  if (!u || !/^https?:$/.test(u.protocol)) return null;
  u.hash = '';
  return u.href;
}

export function hostOf(value) {
  const u = tryUrl(value);
  return u ? u.host.toLowerCase() : '';
}

// example.com and www.example.com are the same site for crawling purposes.
export function bareHost(host) {
  return String(host || '').toLowerCase().replace(/^www\./, '');
}

export function sameSite(a, b) {
  return bareHost(hostOf(a)) === bareHost(hostOf(b));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function uniq(list) {
  return [...new Set(list)];
}
