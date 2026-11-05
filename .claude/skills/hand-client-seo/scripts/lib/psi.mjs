// PageSpeed: Google's PageSpeed Insights API (v5) when it answers, which also
// brings real-visitor field data; otherwise Lighthouse run on this machine
// (lab numbers only). The keyless API shares one daily quota with the whole
// internet and is often exhausted, so pass a key (PAGESPEED_API_KEY or
// --psi-key) for reliable results.
//
// → { mobile, desktop }, each { error } or
//   { source: 'api'|'local', scores: { performance, seo, accessibility, 'best-practices' },
//     failedSeoAudits: [], lab: { lcp, cls, tbt }, field: null | { scope, lcp, inp, cls } }
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { findPlaywright } from './lab.mjs';

const execFileP = promisify(execFile);
const API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CATEGORIES = ['performance', 'seo', 'accessibility', 'best-practices'];

// The Lighthouse CLI sitting in the npx cache, found by scanning (the cache
// folder name is a hash that changes).
export function findLighthouse() {
  const root = join(homedir(), '.npm', '_npx');
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root)) {
    const cli = join(root, dir, 'node_modules', 'lighthouse', 'cli', 'index.js');
    if (existsSync(cli)) return cli;
  }
  return null;
}

// Lighthouse result (lhr) → our shape. Shared by the API and local paths.
export function fromLhr(lhr) {
  const scores = {};
  for (const c of CATEGORIES) scores[c] = lhr.categories?.[c]?.score ?? null;
  const failedSeoAudits = (lhr.categories?.seo?.auditRefs || [])
    .filter((ref) => ref.weight > 0)
    .map((ref) => lhr.audits[ref.id])
    .filter((au) => au && au.score !== null && au.score < 1)
    .map((au) => au.id);
  const num = (id) => lhr.audits?.[id]?.numericValue ?? null;
  return { scores, failedSeoAudits, lab: { lcp: num('largest-contentful-paint'), cls: num('cumulative-layout-shift'), tbt: num('total-blocking-time') } };
}

function fieldData(json) {
  const pick = (exp, scope) => {
    const m = exp && exp.metrics;
    if (!m) return null;
    const metric = (key, fmt) => (m[key] ? { category: m[key].category, display: fmt(m[key].percentile) } : null);
    return {
      scope,
      lcp: metric('LARGEST_CONTENTFUL_PAINT_MS', (v) => `${(v / 1000).toFixed(1)} s`),
      inp: metric('INTERACTION_TO_NEXT_PAINT', (v) => `${v} ms`),
      cls: metric('CUMULATIVE_LAYOUT_SHIFT_SCORE', (v) => (v / 100).toFixed(2)),
    };
  };
  const page = json.loadingExperience && json.loadingExperience.origin_fallback !== true ? pick(json.loadingExperience, 'this page') : null;
  return page || pick(json.originLoadingExperience, 'whole site');
}

async function viaApi(url, strategy, key) {
  const qs = new URLSearchParams({ url, strategy });
  for (const c of CATEGORIES) qs.append('category', c);
  if (key) qs.set('key', key);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(`${API}?${qs}`, { signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.lighthouseResult) return { error: `PageSpeed API ${res.status}: ${json.error?.message?.slice(0, 120) || 'no result'}` };
    return { source: 'api', ...fromLhr(json.lighthouseResult), field: fieldData(json) };
  } catch (err) {
    return { error: `PageSpeed API: ${err.name === 'AbortError' ? 'timeout' : err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

async function viaLocal(url, strategy) {
  const cli = findLighthouse();
  if (!cli) return { error: 'no local Lighthouse (run "npx lighthouse --version" once to cache it)' };
  const pw = await findPlaywright();
  const chrome = process.env.CHROME_PATH || (pw && pw.chromium.executablePath());
  if (!chrome || !existsSync(chrome)) return { error: 'no Chrome for local Lighthouse (set CHROME_PATH)' };
  const dir = mkdtempSync(join(tmpdir(), 'hand-seo-lh-'));
  const out = join(dir, 'lhr.json');
  try {
    const argv = [cli, url, '--output=json', `--output-path=${out}`, '--quiet', `--only-categories=${CATEGORIES.join(',')}`, '--chrome-flags=--headless=new --no-sandbox --disable-gpu'];
    if (strategy === 'desktop') argv.push('--preset=desktop');
    await execFileP(process.execPath, argv, { env: { ...process.env, CHROME_PATH: chrome }, timeout: 180_000, maxBuffer: 64 * 1024 * 1024 });
    return { source: 'local', ...fromLhr(JSON.parse(readFileSync(out, 'utf8'))), field: null };
  } catch (err) {
    return { error: `local Lighthouse: ${String(err.stderr || err.message).trim().split('\n').pop().slice(0, 160)}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function runPsi(url, { key = process.env.PAGESPEED_API_KEY, strategies = ['mobile', 'desktop'], local = true } = {}) {
  const out = {};
  for (const strategy of strategies) {
    let r = await viaApi(url, strategy, key);
    if (r.error && local) {
      const l = await viaLocal(url, strategy);
      r = l.error ? { error: `${r.error}; ${l.error}` } : { ...l, apiError: r.error };
    }
    out[strategy] = r;
  }
  return out;
}
