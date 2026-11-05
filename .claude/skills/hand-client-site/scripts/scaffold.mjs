#!/usr/bin/env node
// Scaffold a new owner-editable client site from clients/_template.
//
//   node .claude/skills/hand-client-site/scripts/scaffold.mjs <slug> --name="Client Name" [--owner=email] [--domain=example.com] [--old-site=https://…] [--code-access] [--dest=<dir>] [--force] [--no-migration]
//
// What it does: copies the template, stamps slug/name/version into the site
// pack, regenerates netlify.toml + placeholders from the new config, writes
// the migration as the next number under command/supabase/migrations/,
// writes HANDOFF.md, runs the tests and a static preview. Nothing touches
// the network. Provisioning (Netlify site, env, migration apply, deploy) is
// provision.mjs.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { CLIENTS, MIGRATIONS, REPO, TEMPLATE, args, assertSlug, assetVersionToday, copyTree, die, loadClientConfig, nextMigrationNumber, ok, patchFile, run, today } from './lib.mjs';

const a = args();
const slug = assertSlug(a._[0]);
const name = String(a.name || '').trim();
if (!name) die('--name="Client Name" is required');
const owner = a.owner ? String(a.owner) : '';
const from = a.from ? join(REPO, String(a.from)) : TEMPLATE;
const dest = a.dest ? (isAbsolute(String(a.dest)) ? String(a.dest) : join(REPO, String(a.dest))) : join(CLIENTS, slug);

if (!existsSync(join(from, 'site.config.mjs'))) die(`template not found at ${from}`);
if (existsSync(dest) && !a.force) die(`${relative(REPO, dest)} exists; pass --force to overwrite the engine + pack files in place`);

copyTree(from, dest, { skipFiles: new Set(['HANDOFF.template.md', 'HANDOFF.md', 'README.md']) });
// README is engine documentation; keep a copy but point at the template.
writeFileSync(join(dest, 'README.md'), readFileSync(join(from, 'README.md'), 'utf8').replace(/^# .*$/m, `# ${name} — owner-editable site\n\nScaffolded from \`clients/_template\` (read that README for the architecture; this copy is identical).`));
ok(`copied template → ${relative(REPO, dest)}`);

const fromCfg = readFileSync(join(from, 'site.config.mjs'), 'utf8');
const fromSlug = /slug:\s*'([^']+)'/.exec(fromCfg)[1];
const fromName = /\n\s*name:\s*'([^']+)'/.exec(fromCfg)[1];
const fromUrl = /productionUrl:\s*'([^']+)'/.exec(fromCfg)[1];
const fromVer = /assetVersion:\s*'([^']+)'/.exec(fromCfg)[1];
patchFile(join(dest, 'site.config.mjs'), [
  [`slug: '${fromSlug}'`, `slug: '${slug}'`],
  [`name: '${fromName}'`, `name: '${name.replace(/'/g, "\\'")}'`],
  [`productionUrl: '${fromUrl}'`, `productionUrl: 'https://${slug}.netlify.app'`],
  [`assetVersion: '${fromVer}'`, `assetVersion: '${assetVersionToday()}'`],
]);
ok(`site.config.mjs: slug=${slug} name=${JSON.stringify(name)}`);

// Default copy: swap the template's business name wherever it appears.
const schemaPath = join(dest, 'site', 'schema.mjs');
const schema = readFileSync(schemaPath, 'utf8');
if (schema.includes(fromName)) {
  writeFileSync(schemaPath, schema.split(fromName).join(name.replace(/'/g, '’')));
  ok(`site/schema.mjs: "${fromName}" → "${name}" in default copy`);
}

patchFile(join(dest, 'package.json'), [[`"name": "${fromSlug}"`, `"name": "${slug}"`]]);

// Setup tab consts (site/checklist.mjs): the client's name, and what we know
// about the domain, the old site, and whether the owner will edit code.
const checklistPath = join(dest, 'site', 'checklist.mjs');
if (existsSync(checklistPath)) {
  const q = (v) => `'${String(v).replace(/'/g, "\\'")}'`;
  const reps = [[`export const SITE = ${q(fromName)};`, `export const SITE = ${q(name)};`]];
  if (a.domain) reps.push([`export const DOMAIN = 'your domain';`, `export const DOMAIN = ${q(a.domain)};`]);
  if (a['old-site']) reps.push([`export const OLD_SITE = '';`, `export const OLD_SITE = ${q(a['old-site'])};`]);
  if (a['code-access']) reps.push([`export const CODE_ACCESS = false;`, `export const CODE_ACCESS = true;`]);
  patchFile(checklistPath, reps);
  ok(`site/checklist.mjs: SITE=${JSON.stringify(name)}${a.domain ? ` DOMAIN=${a.domain}` : ''}${a['old-site'] ? ' OLD_SITE set' : ''}${a['code-access'] ? ' CODE_ACCESS=true' : ''}`);
}

// Generated files from the NEW config.
run('node', ['scripts/gen-netlify-toml.mjs'], { cwd: dest, quiet: true });
run('node', ['scripts/make-placeholders.mjs'], { cwd: dest, quiet: true });
ok('regenerated netlify.toml + placeholder images');

const cfg = await loadClientConfig(dest);
let migrationName = '(skipped)';
if (!a['no-migration']) {
  const existing = readdirSync(MIGRATIONS).find((f) => /^\d{3}_/.test(f) && f.endsWith(`_${cfg.dbPrefix}.sql`));
  migrationName = existing || `${nextMigrationNumber()}_${cfg.dbPrefix}.sql`;
  const out = join(MIGRATIONS, migrationName);
  run('node', ['scripts/gen-migration.mjs', `--out=${out}`], { cwd: dest, quiet: true });
  ok(`migration ${existing ? 'regenerated' : 'written'}: command/supabase/migrations/${migrationName} (not applied)`);
}

const handoff = readFileSync(join(from, 'HANDOFF.template.md'), 'utf8')
  .replaceAll('{{NAME}}', name)
  .replaceAll('{{SLUG}}', slug)
  .replaceAll('{{PREFIX}}', cfg.dbPrefix)
  .replaceAll('{{DATE}}', today())
  .replaceAll('{{OWNER}}', owner || 'TBD')
  .replaceAll('{{MIGRATION}}', migrationName)
  .replaceAll('{{SITE_ID}}', 'not created yet');
writeFileSync(join(dest, 'HANDOFF.md'), handoff);
ok('HANDOFF.md written');

run('node', ['--test', 'tests/*.test.mjs'], { cwd: dest, quiet: true });
ok('tests pass');
run('node', ['scripts/render-static.mjs'], { cwd: dest, quiet: true });
ok('static preview rendered → dist-preview/');

console.log(`
Next:
  1. Site pack: ${relative(REPO, dest)}/site.config.mjs (theme, fonts, logo, nav), site/schema.mjs (copy),
     site/page.mjs + public/assets/site.css for a bespoke layout. Re-run: npm test && npm run preview
     Setup tab: site/checklist.mjs (consts at the top; cut items that do not apply, add the client's own)
  2. Provision (creates prod resources — confirm first):
     node .claude/skills/hand-client-site/scripts/provision.mjs ${slug}${owner ? ` --owner=${owner}` : ''}
`);
