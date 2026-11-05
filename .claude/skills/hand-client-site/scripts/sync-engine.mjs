#!/usr/bin/env node
// Push engine files from clients/_template into client sites, never touching
// their site packs.
//
//   node .claude/skills/hand-client-site/scripts/sync-engine.mjs --check          # report drift, change nothing
//   node .claude/skills/hand-client-site/scripts/sync-engine.mjs <slug> [--test]  # sync one client
//   node .claude/skills/hand-client-site/scripts/sync-engine.mjs --all [--test]   # sync every template-based client
//
// package.json stays the client's own (its name differs), but the engine's
// `dependencies` are carried over and installed: engine functions import them
// (review-core.mjs → @anthropic-ai/sdk) and a client without them fails to bundle.
// After copying it regenerates netlify.toml (unless the pack owns it:
// netlify.managed = false) + placeholders from the client's own config and
// (with --test) runs the client's tests. Clients without a site.config.mjs
// (pre-template builds, e.g. zeroblur) are listed and skipped. Engine paths
// under public/ land in the client's publish dir (netlify.publish); external
// clients (clients/_external) are synced like any other.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { REPO, TEMPLATE, args, clientDirs, clientPath, die, engineFiles, ok, run } from './lib.mjs';

const a = args();
const files = engineFiles();
const targets = a.all || a.check ? clientDirs() : clientDirs().filter((c) => c.slug === a._[0]);
if (!targets.length) die('name a client slug, or pass --all / --check');

const readPkg = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const engineDeps = readPkg(TEMPLATE).dependencies || {};
// Engine dependencies the client's package.json is missing or has at another version.
function depDrift(dir) {
  const have = readPkg(dir).dependencies || {};
  return Object.entries(engineDeps).filter(([name, range]) => have[name] !== range).map(([name]) => name);
}

let drifted = 0;
for (const c of targets) {
  if (!c.onTemplate) {
    console.log(`– ${c.slug}: not on the template (no site.config.mjs), skipped`);
    continue;
  }
  const where = c.external ? ` (${relative(process.env.HOME || '/', c.dir) ? '~/' + relative(process.env.HOME || '/', c.dir) : c.dir})` : '';
  const diffs = files.filter((f) => {
    const src = join(TEMPLATE, f);
    const dst = clientPath(c.dir, f);
    if (!existsSync(src)) return false;
    if (!existsSync(dst)) return true;
    return !readFileSync(src).equals(readFileSync(dst));
  });
  const deps = depDrift(c.dir);
  if (a.check) {
    drifted += diffs.length + deps.length;
    const lines = [...diffs, ...deps.map((d) => `package.json dependency: ${d}`)];
    console.log(lines.length ? `✗ ${c.slug}${where}: ${lines.length} engine item(s) differ\n    ${lines.join('\n    ')}` : `✓ ${c.slug}${where}: engine up to date`);
    continue;
  }
  for (const f of diffs) {
    const dst = clientPath(c.dir, f);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(TEMPLATE, f), dst);
  }
  const needsInstall = deps.length > 0 || (Object.keys(engineDeps).length > 0 && !existsSync(join(c.dir, 'node_modules')));
  if (deps.length) {
    const pkg = readPkg(c.dir);
    writeFileSync(join(c.dir, 'package.json'), `${JSON.stringify({ ...pkg, dependencies: { ...(pkg.dependencies || {}), ...engineDeps } }, null, 2)}\n`);
  }
  if (needsInstall) run('npm', ['install', '--no-audit', '--no-fund'], { cwd: c.dir, quiet: true });
  run('node', ['scripts/gen-netlify-toml.mjs'], { cwd: c.dir, quiet: true }); // a no-op for a pack-owned toml
  run('node', ['scripts/make-placeholders.mjs'], { cwd: c.dir, quiet: true });
  if (a.test) run('node', ['--test', 'tests/*.test.mjs'], { cwd: c.dir, quiet: true });
  ok(`${c.slug}${where}: ${diffs.length} file(s) synced${needsInstall ? ', dependencies installed' : ''}, generated files refreshed${a.test ? ', tests pass' : ''}`);
  if (diffs.length) console.log(`    remember: bump assetVersion in ${relative(REPO, c.dir)}/site.config.mjs if admin/site assets changed, then redeploy with --skip-functions-cache`);
}
if (a.check) process.exit(drifted ? 1 : 0);
