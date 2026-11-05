#!/usr/bin/env node
// Provision a scaffolded client site end to end. Creates production
// resources — run with --dry first and confirm with the operator.
//
//   node .claude/skills/hand-client-site/scripts/provision.mjs <slug> [--owner=email] [--dry]
//        [--only=site,env,migration,deploy,verify] [--skip=…] [--account=cryptokoh]
//        [--site-name=<netlify name>]   (when <slug>.netlify.app is taken by someone else; tables/bucket keep the slug)
//        [--copy-env-from=<netlify site id>]   (source for RESEND_API_KEY / EMAIL_FROM; default: zeroblur)
//
// Steps (each idempotent, each skippable):
//   site       create the Netlify site under the account, name it <slug>, disable the
//              "Powered by Netlify" badge, write netlifySiteId into site.config.mjs
//   env        set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY / EMAIL_FROM (copied from the
//              source site's env, default zeroblur; command/.env.local if present), <PREFIX>_SESSION_SECRET
//              (generated), <PREFIX>_SITE_NAME, <PREFIX>_OWNER_EMAILS (--owner). Any KEY=VALUE in
//              clients/<slug>/.env overrides.
//   migration  POST command/supabase/migrations/NNN_<prefix>.sql to the Supabase management API
//              (token from env SUPABASE_ACCESS_TOKEN or the GNOME keyring) and record the version
//   deploy     netlify deploy --prod --build --skip-functions-cache --site <id>
//   verify     GET / (200, no badge script, has "Owner sign in"), /admin/ (200), /api/content (ok),
//              /api/auth/me (401)
//
// Secrets never print. Netlify token: env NETLIFY_AUTH_TOKEN, else the cryptokoh user in
// ~/.config/netlify/config.json (the CLI's active login is a different account).

import crypto from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { CLIENTS, MIGRATIONS, REPO, args, assertSlug, capture, die, loadClientConfig, ok, patchFile, run } from './lib.mjs';

const a = args();
const slug = assertSlug(a._[0]);
const dir = join(CLIENTS, slug);
if (!existsSync(join(dir, 'site.config.mjs'))) die(`${relative(REPO, dir)} is not a scaffolded site`);
const cfg = await loadClientConfig(dir);
const account = String(a.account || 'cryptokoh');
// Netlify subdomain. Defaults to the slug; override when that name is taken.
const siteName = String(a['site-name'] || slug);
if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(siteName)) die('--site-name must be lowercase [a-z0-9-]');
const dry = Boolean(a.dry);
const ALL = ['site', 'env', 'migration', 'deploy', 'verify'];
const only = a.only ? String(a.only).split(',') : ALL;
const skip = a.skip ? String(a.skip).split(',') : [];
const steps = ALL.filter((s) => only.includes(s) && !skip.includes(s));
const SOURCE_SITE = String(a['copy-env-from'] || '6cd7a853-09f9-4d8d-9a06-ee5e12304392'); // zeroblur

console.log(`provision ${slug} (${cfg.name}) → steps: ${steps.join(', ')}${dry ? '  [DRY RUN]' : ''}`);

// --- tokens -----------------------------------------------------------------

function netlifyToken() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  const cfgPath = join(homedir(), '.config', 'netlify', 'config.json');
  if (!existsSync(cfgPath)) die('no NETLIFY_AUTH_TOKEN and no ~/.config/netlify/config.json');
  const users = JSON.parse(readFileSync(cfgPath, 'utf8')).users || {};
  const hit = Object.entries(users).find(([id, u]) => id.startsWith('65ff678f') && u.auth && u.auth.token);
  if (!hit) die('cryptokoh Netlify user (id 65ff678f…) not found in the CLI config; export NETLIFY_AUTH_TOKEN');
  return hit[1].auth.token;
}

function supabaseToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  return capture('python3', [join(REPO, '.claude/skills/hand-client-site/scripts/keyring-secret.py'), 'Supabase CLI', 'access-token']).trim();
}

async function nf(method, path, body) {
  const res = await fetch(`https://api.netlify.com/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${netlifyToken()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`netlify ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function accountId() {
  const accounts = await nf('GET', '/accounts');
  const acc = accounts.find((x) => x.slug === account);
  if (!acc) die(`Netlify account ${account} not visible to this token`);
  return acc.id;
}

// --- steps -----------------------------------------------------------------

let siteId = cfg.netlifySiteId || '';

async function stepSite() {
  if (siteId) {
    ok(`site: already created (${siteId})`);
    return;
  }
  if (dry) return console.log(`  would create Netlify site "${siteName}" under ${account}, disable badge, write netlifySiteId`);
  let site;
  try {
    site = await nf('POST', `/${account}/sites`, { name: siteName });
  } catch (err) {
    if (!/422|already|taken/i.test(err.message)) throw err;
    const all = await nf('GET', `/sites?name=${encodeURIComponent(siteName)}`);
    site = all.find((s) => s.name === siteName);
    if (!site) die(`site: "${siteName}.netlify.app" is taken by another account; re-run with --site-name=<other-name>`);
    ok('site: name already taken by an existing site in this account, reusing it');
  }
  siteId = site.id;
  await nf('PATCH', `/sites/${siteId}`, { name: siteName, built_with_badge_enabled: false });
  patchFile(join(dir, 'site.config.mjs'), [[`netlifySiteId: ''`, `netlifySiteId: '${siteId}'`]]);
  if (siteName !== slug && readFileSync(join(dir, 'site.config.mjs'), 'utf8').includes(`productionUrl: 'https://${slug}.netlify.app'`)) {
    patchFile(join(dir, 'site.config.mjs'), [[`productionUrl: 'https://${slug}.netlify.app'`, `productionUrl: 'https://${siteName}.netlify.app'`]]);
  }
  ok(`site: created ${siteId} → https://${siteName}.netlify.app (badge off, id written to site.config.mjs)`);
}

function envFileValues(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

async function sourceSiteEnv(accId) {
  const rows = await nf('GET', `/accounts/${accId}/env?site_id=${SOURCE_SITE}`);
  const out = {};
  for (const r of rows) {
    const v = (r.values || []).find((x) => x.context === 'all') || (r.values || [])[0];
    if (v && v.value) out[r.key] = v.value;
  }
  return out;
}

async function stepEnv() {
  const local = envFileValues(join(REPO, 'command', '.env.local'));
  const override = envFileValues(join(dir, '.env'));
  const P = cfg.envPrefix;
  const vars = {
    SUPABASE_URL: override.SUPABASE_URL || local.NEXT_PUBLIC_SUPABASE_URL || local.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: override.SUPABASE_SERVICE_ROLE_KEY || local.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: override.RESEND_API_KEY,
    EMAIL_FROM: override.EMAIL_FROM,
    [`${P}_SESSION_SECRET`]: override[`${P}_SESSION_SECRET`] || crypto.randomBytes(32).toString('hex'),
    [`${P}_SITE_NAME`]: override[`${P}_SITE_NAME`] || cfg.name,
  };
  if (a.owner) vars[`${P}_OWNER_EMAILS`] = String(a.owner);
  if (dry) {
    console.log(`  would set on the site: ${Object.keys(vars).join(', ')} (Supabase + Resend values copied from site ${SOURCE_SITE} unless in clients/${slug}/.env)`);
    return;
  }
  if (!siteId) die('env: no site id yet (run the site step first)');
  const accId = await accountId();
  if (!vars.RESEND_API_KEY || !vars.EMAIL_FROM || !vars.SUPABASE_URL || !vars.SUPABASE_SERVICE_ROLE_KEY) {
    const src = await sourceSiteEnv(accId);
    vars.SUPABASE_URL = vars.SUPABASE_URL || src.SUPABASE_URL;
    vars.SUPABASE_SERVICE_ROLE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY || src.SUPABASE_SERVICE_ROLE_KEY;
    vars.RESEND_API_KEY = vars.RESEND_API_KEY || src.RESEND_API_KEY;
    const from = src.EMAIL_FROM || '';
    const addr = /<([^>]+)>/.exec(from) ? /<([^>]+)>/.exec(from)[1] : from;
    vars.EMAIL_FROM = vars.EMAIL_FROM || (addr ? `${cfg.name} <${addr}>` : '');
  }
  for (const [k, v] of Object.entries(vars)) if (!v) die(`env: no value for ${k} (put it in clients/${slug}/.env)`);
  const existing = await nf('GET', `/accounts/${accId}/env?site_id=${siteId}`);
  const have = new Set(existing.map((r) => r.key));
  const scopes = ['builds', 'functions', 'runtime', 'post_processing'];
  const create = Object.entries(vars)
    .filter(([k]) => !have.has(k))
    .map(([key, value]) => ({ key, scopes, values: [{ value, context: 'all' }] }));
  if (create.length) await nf('POST', `/accounts/${accId}/env?site_id=${siteId}`, create);
  for (const [key, value] of Object.entries(vars)) {
    if (!have.has(key)) continue;
    await nf('PUT', `/accounts/${accId}/env/${key}?site_id=${siteId}`, { key, scopes, values: [{ value, context: 'all' }] });
  }
  ok(`env: ${create.length} created, ${Object.keys(vars).length - create.length} updated (${Object.keys(vars).join(', ')})`);
}

function migrationFile() {
  const f = readdirSync(MIGRATIONS).find((n) => /^\d{3}_/.test(n) && n.endsWith(`_${cfg.dbPrefix}.sql`));
  if (!f) die(`no migration NNN_${cfg.dbPrefix}.sql in command/supabase/migrations (scaffold writes it)`);
  return f;
}

function supabaseQuery(sql) {
  const ref = cfg.supabase.projectRef;
  const token = supabaseToken();
  const body = JSON.stringify({ query: sql });
  // curl, not fetch: the management API sits behind Cloudflare rules that block
  // python urllib; curl is the verified path.
  const out = capture('curl', ['-sS', '-w', '\n%{http_code}', '-X', 'POST', `https://api.supabase.com/v1/projects/${ref}/database/query`,
    '-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json', '--data-binary', '@-'], { env: {}, input: body });
  const lines = out.trimEnd().split('\n');
  const status = Number(lines.pop());
  if (status < 200 || status >= 300) die(`supabase query → ${status}: ${lines.join('\n').slice(0, 400)}`);
  return lines.join('\n');
}

async function stepMigration() {
  const f = migrationFile();
  const version = f.slice(0, 3);
  if (dry) return console.log(`  would regenerate + apply command/supabase/migrations/${f} to project ${cfg.supabase.projectRef} and record version ${version}`);
  // The scaffold wrote this file from the template's config. The pack's seed
  // media/bucket may have changed since, so regenerate from the CURRENT config
  // before the first apply. Once recorded as applied it is frozen: changes
  // need a new numbered migration.
  const applied = supabaseQuery(`select 1 from supabase_migrations.schema_migrations where version = '${version}'`);
  if (/\[\s*\]/.test(applied)) {
    const before = readFileSync(join(MIGRATIONS, f), 'utf8');
    run('node', ['scripts/gen-migration.mjs', `--out=${join(MIGRATIONS, f)}`], { cwd: dir, quiet: true });
    if (before !== readFileSync(join(MIGRATIONS, f), 'utf8')) ok(`migration: regenerated ${f} from the current site.config.mjs (it had drifted)`);
  } else {
    console.log(`  version ${version} is already recorded as applied; not regenerating (write a new migration for changes)`);
  }
  const sql = readFileSync(join(MIGRATIONS, f), 'utf8');
  supabaseQuery(sql);
  supabaseQuery(`insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${f.slice(4, -4)}') on conflict do nothing;`);
  const check = supabaseQuery(`select count(*)::int as n from ${cfg.supabase.schema}.${cfg.tables.media};`);
  ok(`migration: applied ${f}, version ${version} recorded, media rows: ${check.replace(/\s+/g, ' ').trim()}`);
  // Owners passed on the command line are inserted now (the env allow-list
  // would also create them on first sign-in, but a visible row is better).
  const owners = String(a.owner || '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s));
  for (const email of owners) {
    supabaseQuery(`insert into ${cfg.supabase.schema}.${cfg.tables.editors} (email, role) values ('${email.replace(/'/g, "''")}', 'owner') on conflict do nothing;`);
  }
  if (owners.length) ok(`owners: ${owners.join(', ')} can sign in`);
}

async function stepDeploy() {
  if (dry) return console.log(`  would: cd clients/${slug} && netlify deploy --prod --build --skip-functions-cache --site <id>`);
  if (!siteId) die('deploy: no site id yet');
  run('netlify', ['deploy', '--prod', '--build', '--skip-functions-cache', '--site', siteId, '--message', `provision ${new Date().toISOString().slice(0, 16)}`], {
    cwd: dir,
    env: { NETLIFY_AUTH_TOKEN: netlifyToken() },
  });
  ok('deploy: production deploy finished');
}

async function stepVerify() {
  const base = `https://${siteName}.netlify.app`;
  if (dry) return console.log(`  would check ${base}/ , /admin/ , /api/content , /api/auth/me`);
  const get = async (p) => {
    const r = await fetch(base + p, { redirect: 'manual' });
    return { status: r.status, text: await r.text() };
  };
  const home = await get('/');
  const checks = [
    ['/ → 200', home.status === 200],
    ['/ has no Netlify badge script', !home.text.includes('/.netlify/scripts/hud')],
    ['/ carries the owner sign-in link', home.text.includes('href="/admin/"')],
    ['/ carries the theme block', home.text.includes('<style id="theme">')],
  ];
  const admin = await get('/admin/');
  checks.push(['/admin/ → 200', admin.status === 200]);
  const content = await get('/api/content');
  let src = '?';
  try { src = JSON.parse(content.text).source; } catch (_) {}
  checks.push([`/api/content ok (source=${src})`, content.status === 200 && src !== '?']);
  checks.push(['/api/content is served from the database', src === 'db' || src === 'defaults']);
  const me = await get('/api/auth/me');
  checks.push(['/api/auth/me → 401 when signed out', me.status === 401]);
  let bad = 0;
  for (const [label, pass] of checks) {
    console.log(`  ${pass ? '✓' : '✗'} ${label}`);
    if (!pass) bad++;
  }
  if (src === 'defaults') console.log('  note: source=defaults means the DB is reachable but has no content row yet (first publish creates it), or SUPABASE_* env is missing');
  if (bad) die(`verify: ${bad} check(s) failed`);
  ok(`verify: live at ${base}`);
}

function updateHandoff() {
  const p = join(dir, 'HANDOFF.md');
  if (!existsSync(p) || dry) return;
  let t = readFileSync(p, 'utf8');
  if (siteId) t = t.replace('not created yet', siteId);
  if (steps.includes('migration')) t = t.replace('applied: **no**', `applied: **yes** (${new Date().toISOString().slice(0, 10)})`);
  if (steps.includes('deploy')) t = t.replace('**Status:** scaffolded, not provisioned.', `**Status:** LIVE at https://${siteName}.netlify.app since ${new Date().toISOString().slice(0, 10)} (provisioned by provision.mjs).`);
  writeFileSync(p, t);
}

const impl = { site: stepSite, env: stepEnv, migration: stepMigration, deploy: stepDeploy, verify: stepVerify };
for (const s of steps) {
  console.log(`\n[${s}]`);
  await impl[s]();
}
updateHandoff();
console.log(dry ? '\nDry run complete. Re-run without --dry to provision.' : `\nDone. Hand-off: ${relative(REPO, join(dir, 'HANDOFF.md'))}`);
