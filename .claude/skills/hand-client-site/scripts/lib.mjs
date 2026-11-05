// Shared helpers for the hand-client-site scripts. No dependencies.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const CLIENTS = join(REPO, 'clients');
export const TEMPLATE = join(CLIENTS, '_template');
export const MIGRATIONS = join(REPO, 'command', 'supabase', 'migrations');
export const SKIP_DIRS = new Set(['node_modules', 'dist-preview', '.netlify', '.git']);

export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
    else out._.push(a);
  }
  return out;
}

export function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

export function ok(msg) {
  console.log(`✓ ${msg}`);
}

export function assertSlug(slug) {
  if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(slug || '')) die(`slug must be lowercase [a-z0-9-], got ${JSON.stringify(slug)}`);
  return slug;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function assetVersionToday() {
  return `${today().replace(/-/g, '')}a`;
}

// Recursive copy that skips build artifacts.
export function copyTree(src, dest, { skip = SKIP_DIRS, skipFiles = new Set() } = {}) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (skip.has(name) || skipFiles.has(name)) continue;
    const s = join(src, name);
    const d = join(dest, name);
    if (statSync(s).isDirectory()) copyTree(s, d, { skip, skipFiles });
    else cpSync(s, d);
  }
}

// Replace exactly-one occurrence, or fail loudly (a silent miss would ship a
// site still named after the template).
export function patchFile(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    const count = text.split(from).length - 1;
    if (count !== 1) die(`${relative(REPO, path)}: expected exactly one ${JSON.stringify(from)}, found ${count}`);
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

export function engineFiles(templateDir = TEMPLATE) {
  return readFileSync(join(templateDir, 'ENGINE_FILES'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// Every client: the dirs under clients/ plus the external ones listed in
// clients/_external (one absolute path per line, # comments), for sites that
// live in their own repo (longhornwinetours: ~/Documents/lhwt). An external
// client's slug is its site.config.mjs slug when the engine is already there,
// else its directory name.
export function externalClientDirs() {
  const list = join(CLIENTS, '_external');
  if (!existsSync(list)) return [];
  return readFileSync(list, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((p) => (p.startsWith('~/') ? join(process.env.HOME || '', p.slice(2)) : p))
    .filter((dir) => existsSync(dir) && statSync(dir).isDirectory())
    .map((dir) => {
      const cfg = join(dir, 'site.config.mjs');
      const m = existsSync(cfg) ? /slug:\s*'([^']+)'/.exec(readFileSync(cfg, 'utf8')) : null;
      return { slug: m ? m[1] : basename(dir), dir, onTemplate: existsSync(cfg), external: true };
    });
}

export function clientDirs() {
  const local = readdirSync(CLIENTS)
    .filter((n) => !n.startsWith('.') && !n.startsWith('_'))
    .filter((n) => statSync(join(CLIENTS, n)).isDirectory())
    .map((n) => ({ slug: n, dir: join(CLIENTS, n), onTemplate: existsSync(join(CLIENTS, n, 'site.config.mjs')), external: false }));
  return [...local, ...externalClientDirs()];
}

export function run(cmd, argv, { cwd = REPO, env = {}, quiet = false } = {}) {
  const r = spawnSync(cmd, argv, { cwd, env: { ...process.env, ...env }, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (r.status !== 0) {
    if (quiet) process.stderr.write(r.stdout || '');
    if (quiet) process.stderr.write(r.stderr || '');
    die(`${cmd} ${argv.join(' ')} failed (exit ${r.status})`);
  }
  return r.stdout || '';
}

export function capture(cmd, argv, { cwd = REPO, env = {}, input } = {}) {
  return execFileSync(cmd, argv, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', input, maxBuffer: 16 * 1024 * 1024 });
}

export function nextMigrationNumber() {
  const nums = readdirSync(MIGRATIONS)
    .map((f) => /^(\d{3})_/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return String(Math.max(0, ...nums) + 1).padStart(3, '0');
}

// Loads a client's normalized config by importing its own engine (so the
// derivations are the ones the site actually uses).
export async function loadClientConfig(dir) {
  const mod = await import(join(dir, 'netlify', 'functions', 'lib', 'config.mjs') + `?t=${Date.now()}`);
  return mod.config;
}

// The client's publish dir (site.config.mjs netlify.publish, default public),
// read without importing the engine so it works before the first sync.
export function publishDir(dir) {
  const cfg = join(dir, 'site.config.mjs');
  if (!existsSync(cfg)) return 'public';
  const m = /netlify:\s*\{[^}]*publish:\s*'([^']+)'/.exec(readFileSync(cfg, 'utf8'));
  return m ? m[1] : 'public';
}

// Where an engine file lands in a client: paths under public/ map to the
// client's publish dir.
export function clientPath(dir, engineFile) {
  const pub = publishDir(dir);
  if (pub !== 'public' && (engineFile === 'public' || engineFile.startsWith('public/'))) return join(dir, pub, engineFile.slice('public'.length + 1));
  return join(dir, engineFile);
}
