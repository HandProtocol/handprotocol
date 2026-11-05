# Skill conventions for `hand-client-seo` (research, 2026-09-30)

Scope: how the existing HAND skill tooling is written, so the new SEO skill matches it.
Everything below was read from disk or run read-only on this machine on 2026-09-30.
No secret values appear here; secrets are referred to by name only.
`REPO` = `/home/koh/Documents/handprotocol`.

Sources read in full: `.claude/skills/hand-client-site/SKILL.md` (360 lines), its
`scripts/` (`lib.mjs` 149, `scaffold.mjs` 107, `sync-engine.mjs` 74, `provision.mjs` 286,
`keyring-secret.py` 63), its `reference/` (`brief-template.md`, `porting-a-design.md`,
`verify-checklist.md`; booking docs skimmed for structure), `.claude/skills/hand-biz-pitch/SKILL.md`
(478 lines), `clients/precisionfix/HANDOFF.md` (347), `clients/_template/HANDOFF.template.md` (48),
`clients/_template/README.md` (227), `clients/three-hands-healing/HANDOFF.md` (127), the ten memory
notes named in the task, plus `~/.claude/skills/hand-biz-finalize/SKILL.md` (F5), the ZeroBlur
handoff's token recipe, and `~/Documents/lhwt/netlify.toml` + `HANDOFF.md` (domain redirect).

---

## 0. Things that surprised me (read these first)

1. **`netlifyToken()`, `supabaseToken()`, `nf()` and `supabaseQuery()` are NOT in `lib.mjs`.** They are
   private functions inside `provision.mjs` (lines 52-76, 183-195). A new skill's scripts must either
   copy them or the implementer moves them into `lib.mjs` (an edit to the sibling skill).
2. **`command/.env.local` does not exist on this machine** (checked: MISSING). `provision.mjs` still
   reads it first (line 135) and falls back to copying `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `RESEND_API_KEY`, `EMAIL_FROM` from the ZeroBlur Netlify site's env through the Netlify API
   (lines 124-132, 153-161). `hand-biz-pitch` still says "Supabase creds for local work:
   `command/.env.local`" (line 35); that is stale.
3. **The docs say the Netlify CLI's active login is `zantrra`; today it is cryptokoh.**
   `~/.config/netlify/config.json` top-level `userId` starts `65ff678f` (the cryptokoh user), and
   `netlify status` prints team `koH` (the cryptokoh team's display name per `~/Documents/lhwt/HANDOFF.md:286`).
   The state has flipped before. Never rely on the active login: always pass `NETLIFY_AUTH_TOKEN`
   explicitly, selected by user id prefix as `provision.mjs` does.
4. **Three Hands Healing is 28 engine items behind the template** (`sync-engine.mjs --check`, run
   2026-09-30): `page.mjs`, `render.mjs`, `review.mjs`, `sitemap.mjs`, `lib/render.mjs`, `lib/blocks.mjs`,
   `lib/config.mjs`, `lib/site.mjs`, etc. plus the `@anthropic-ai/sdk` dependency. Visible effect today:
   `https://three-hands-healing.netlify.app/index.html` answers **200**, not the 301 the current engine
   gives (`clients/_template/netlify/functions/lib/render.mjs:49`). Legacy Care and PrecisionFix show
   the same drift; only `~/Documents/lhwt` is up to date.
5. **Three Hands Healing has no Setup tab and no Search Console field.** `clients/three-hands-healing/site/`
   holds only `brand.mjs`, `page.mjs`, `schema.mjs` (no `checklist.mjs`), `site.config.mjs` does not
   import a checklist, and its `seo` section has only `title` (max 90) and `description` (max 170)
   (`site/schema.mjs:144-151`). The engine's `seo.google_verification` → meta tag logic is present in its
   `lib/blocks.mjs:56-57` but the schema field that feeds it is not.
6. **The managed `netlify.toml` has no `*.netlify.app` → custom-domain redirect**, and it is regenerated on
   every sync (`clients/_template/scripts/gen-netlify-toml.mjs`). A hand edit to a client's `netlify.toml`
   is overwritten by the next `sync-engine.mjs`. See section 6.
7. **There are two different copies of the `hand-biz-pitch` skill.** `REPO/.claude/skills/hand-biz-pitch/SKILL.md`
   (478 lines, has `find-nearby.mts`, lacks the bilingual section) and `~/.claude/skills/hand-biz-pitch/SKILL.md`
   (488 lines, has "Model selection by task" and the "Bilingual EN/ES (required, settled 2026-06-14)"
   Phase 3 bullet, lacks `find-nearby`). Phase 6 is identical in both. `i18n-snippet.html` exists only in
   the `~/.claude` copy.
8. **Playwright launched fine inside this session's default Bash** (no `dangerouslyDisableSandbox`), and
   **Lighthouse 12.8.2 is already in the npx cache and runs without installing anything.** See section 4.

---

## 1. Skill anatomy

### 1.1 Where skills live

- Project skills: `REPO/.claude/skills/<name>/`. Today: `hand-biz-pitch/` (only `SKILL.md`) and
  `hand-client-site/` (`SKILL.md`, `scripts/`, `reference/`). `hand-client-site/` is **untracked in git**
  (`?? ../.claude/skills/hand-client-site/` in git status); nothing from the client-site work is committed.
- User-level skills: `~/.claude/skills/<name>/` (`hand-biz-finalize`, `hand-biz-pitch` second copy, `gstack`, ...).
- The new skill goes at `REPO/.claude/skills/hand-client-seo/` with the same three-part layout:
  `SKILL.md`, `scripts/*.mjs`, `reference/*.md`.

### 1.2 Frontmatter (exact shape)

`hand-client-site/SKILL.md:1-4`:

```
---
name: hand-client-site
description: "Build an owner-editable client website from the HAND template: <what it does>. Use when asked to: <comma list of trigger phrases>."
---
```

Only two keys, `name` and `description`. The description is one double-quoted string: one sentence of
what it does, then the literal phrase **"Use when asked to:"** followed by trigger phrases. All three HAND
skills (`hand-client-site`, `hand-biz-pitch`, `hand-biz-finalize`) follow this.

### 1.3 Section structure of `hand-client-site/SKILL.md`

| Lines | Section | What it is |
|---|---|---|
| 6 | `# HAND Client Site (owner-editable template)` | H1 = human title |
| 8-13 | intro paragraph | what it turns into what, engine vs site pack |
| 15-18 | `**Working directory**`, `**Template**`, `**First instance**`, `**Scripts**` | bold key: value pointers, repo-relative paths in backticks |
| 20-25 | "What the owner gets ... What HAND gets" | outcome summary |
| 27-36 | `## Decide the path first (30 seconds)` | a 3-column table (wants / path / per-client work) |
| 38-47 | `## Phase 1 — Brief (fill reference/brief-template.md)` | |
| 49-60 | `## Phase 2 — Scaffold` | fenced `bash` command, then one paragraph of what it does |
| 62-94 | `## Phase 3 — Site pack` | bold lead-ins `**Fast path.**` / `**Bespoke.**` |
| 96-128 | `## Phase 3b — Setup tab (the owner's to-do list: buttons, not prose)` | bulleted rules with bold lead sentence |
| 130-156 | `## Phase 4 — Provision (creates prod resources: confirm with the operator first)` | `--dry` line first, real line second |
| 158-165 | `## Phase 5 — Custom domain + hand-off` | defers to "Phase 6c of `hand-biz-pitch`" |
| 167-233 | `## Engine features a pack can opt into (added 2026-09-15)` | dated bullets |
| 235-264 | `## Multi-page packs and external clients (added 2026-09-22, longhornwinetours)` | |
| 266-282 | `## Engine maintenance` | |
| 284-292 | `## Instances` | table: Client / Dir / State (dated) |
| 294-326 | `## Booking calendar` | |
| 328-338 | `## ZeroBlur (first instance, predates the template)` | |
| 340-360 | `## Gotchas (from ZeroBlur, all still true)` | flat bullets |

Patterns to copy:

- **Phases are numbered `## Phase N — Title (parenthetical hint)`**, with sub-phases as `3b`. `hand-biz-pitch`
  uses `## Phase 1`, `1.5`, `2` ... `6` and `### 6a` ... `6e`; `hand-biz-finalize` uses `F1` ... `F5` and `F5.0` ... `F5.4`.
  (The phase headings themselves use an em dash; that is the existing convention for headings.)
- **A decision table opens the skill** ("Decide the path first"). The SEO skill's stage menu is the
  natural equivalent: a table of "client needs / stage / what happens".
- **A phase that creates production resources says so in the heading** and gives the `--dry` command
  before the real one ("creates prod resources: confirm with the operator first", line 130).
- **Scripts are invoked from the repo root with the full repo-relative path**:
  `node .claude/skills/hand-client-site/scripts/<script>.mjs <slug> [--flags]` inside a fenced `bash` block,
  followed by a prose paragraph listing exactly what the script does and does not do ("No network.",
  "Refuses to overwrite ... without `--force`").
- **References are linked by relative path in backticks**, not Markdown links: `reference/brief-template.md`,
  `reference/porting-a-design.md`, `reference/verify-checklist.md`. Cross-skill references name the skill and
  phase: "the exact calls are Phase 6c of `hand-biz-pitch`".
- **Reference instances are named with paths**: "Pattern: `clients/precisionfix/site/themes.mjs`",
  "Reference instance: `~/Documents/lhwt`".
- **Dated facts**: additions carry "(added 2026-09-15)", the Instances table is "State (2026-09-06)",
  lessons are "PrecisionFix, 2026-09-15". ISO dates only.
- **Gotchas section at the end**, one bullet per hard-won fact, each stating the failure and the fix.
- **An Instances table** recording every client the skill has been run on, with site id prefix, migration
  number, owners, and "read `<path>/HANDOFF.md`".

### 1.4 Tone and writing rules (what the skills themselves say)

- `hand-client-site/SKILL.md:93-94`: "Copy rules for anything carrying the HAND name follow the grant voice
  (no em dashes, no AI tells). The client's own copy is theirs."
- `hand-biz-pitch/SKILL.md:237-238`: "**Voice**: plain, warm, the owner talking, not an agency. No em dashes,
  no AI tells (leverage, robust, elevate, nestled, passionate, one-stop, top-notch)."
- `hand-biz-pitch/SKILL.md:316-318`: "The HAND grant voice rules do NOT apply to the demo (it is the business's
  own site); they DO apply loosely to anything carrying the HAND name. No em dashes anywhere."
- The grant voice is defined in the `grants` skill: "Warm-editorial, evidence-first, no em dashes, no AI tells"
  (`~/.claude/skills/grants/SKILL.md:93-94`, canonical list in its `references/hand-context.md`, not read here).
- Observed style of the skill prose itself: second-person imperative, short declarative sentences, colons
  and parentheses instead of dashes inside body text, bold only for the lead phrase of a rule, exact file
  paths and flag names in backticks, no emoji, no marketing adjectives, numbers given exactly
  ("29 tests", "20 min, single use, 5/hour/editor").
- Owner-facing copy (Setup tab items, messages to the owner) follows the checklist rules in section 7.1:
  one verb per line, buttons named in bold, a `done` line.

Practical reading for the SEO skill: everything the skill writes that carries HAND's name (the SKILL.md,
standup agenda, owner guide, Setup tab items, emails) uses no em dashes and none of the listed AI-tell
words. Titles and meta descriptions written for the client are "theirs", but note that Three Hands
Healing's current default title and description both contain an em dash (`site/schema.mjs:242-243`).

---

## 2. Script conventions

### 2.1 Language level and dependencies

- Node ESM `.mjs`, shebang `#!/usr/bin/env node`, top-level `await`, built-in `fetch`. Machine: Node `v22.16.0`
  (`~/.nvm/versions/node/v22.16.0/bin/node`).
- **Zero npm dependencies in skill scripts.** `lib.mjs:1`: "Shared helpers for the hand-client-site scripts.
  No dependencies." Only `node:fs`, `node:path`, `node:url`, `node:child_process`, `node:crypto`, `node:os`.
  External programs are shelled out: `curl` (Supabase management API), `python3` (keyring), `netlify` (deploy),
  `node` (the client's own generator scripts), `npm` (sync only).
- One Python helper, `keyring-secret.py`, stdlib plus `secretstorage` or `gi` (both already on the box).
- Header comment on every script: one line of purpose, then the usage line(s) indented three spaces with every
  flag, then a "What it does" / "Steps" block. Example `provision.mjs:1-24`.
- The engine itself (client sites) has exactly one dependency, `@anthropic-ai/sdk ^0.127.0`, for the review
  helper; tests are `node --test tests/*.test.mjs` with no DB and no network.

### 2.2 Arg parsing

`args(argv = process.argv.slice(2))` (`lib.mjs:13-21`): returns `{ _: [positionals], <flag>: value|true }`.
Only the `--key=value` and bare `--key` forms are recognized (regex `/^--([^=]+)(?:=(.*))?$/`). There is no
`--key value` form, no short flags, no validation. Convention: first positional is the slug
(`const slug = assertSlug(a._[0])`), hyphenated flags are read as `a['site-name']`, comma lists are split by
hand (`String(a.only).split(',')`).

### 2.3 Every export of `scripts/lib.mjs` (signatures)

| Line | Export | Signature and behavior |
|---|---|---|
| 7 | `REPO` | `resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')` → repo root, four levels up from `scripts/` |
| 8 | `CLIENTS` | `join(REPO, 'clients')` |
| 9 | `TEMPLATE` | `join(CLIENTS, '_template')` |
| 10 | `MIGRATIONS` | `join(REPO, 'command', 'supabase', 'migrations')` |
| 11 | `SKIP_DIRS` | `new Set(['node_modules', 'dist-preview', '.netlify', '.git'])` |
| 13 | `args(argv?)` | see 2.2 |
| 23 | `die(msg)` | `console.error('✗ ' + msg); process.exit(1)` |
| 28 | `ok(msg)` | `console.log('✓ ' + msg)` |
| 32 | `assertSlug(slug)` | must match `/^[a-z0-9][a-z0-9-]{1,48}$/`, else `die`; returns the slug |
| 37 | `today()` | `YYYY-MM-DD` (UTC, from `toISOString`) |
| 41 | `assetVersionToday()` | `YYYYMMDD` + `'a'`, e.g. `20260930a` |
| 46 | `copyTree(src, dest, { skip = SKIP_DIRS, skipFiles = new Set() } = {})` | recursive copy skipping build artifacts |
| 59 | `patchFile(path, replacements)` | `replacements` = `[[from, to], ...]`; each `from` must occur **exactly once** or it `die`s |
| 69 | `engineFiles(templateDir = TEMPLATE)` | lines of `ENGINE_FILES`, `#` comments and blanks dropped |
| 81 | `externalClientDirs()` | reads `clients/_external` (one absolute or `~/` path per line) → `[{ slug, dir, onTemplate, external: true }]` |
| 97 | `clientDirs()` | every dir under `clients/` not starting with `.` or `_`, as `{ slug, dir, onTemplate, external: false }`, plus the external ones. `onTemplate` = has `site.config.mjs` |
| 105 | `run(cmd, argv, { cwd = REPO, env = {}, quiet = false } = {})` | `spawnSync`; inherits stdio unless `quiet`; on non-zero prints captured output and `die`s; returns stdout |
| 115 | `capture(cmd, argv, { cwd = REPO, env = {}, input } = {})` | `execFileSync`, utf8, 16 MB buffer, returns stdout (throws on failure) |
| 119 | `nextMigrationNumber()` | highest `NNN_` prefix in `MIGRATIONS` + 1, zero-padded to 3 |
| 129 | `async loadClientConfig(dir)` | `import(join(dir, 'netlify/functions/lib/config.mjs') + '?t=' + Date.now())` → `mod.config` (the **normalized** config, via the client's own engine) |
| 136 | `publishDir(dir)` | regex-reads `netlify: { publish: '…' }` from `site.config.mjs`, default `'public'` (works before the engine exists) |
| 145 | `clientPath(dir, engineFile)` | maps `public/...` engine paths into the client's publish dir |

How a sibling skill can reuse them: `import { REPO, CLIENTS, args, die, ok, assertSlug, loadClientConfig, clientDirs, run, capture } from '../../hand-client-site/scripts/lib.mjs'`
resolves correctly (`REPO` is computed from `lib.mjs`'s own location). Whether to import across skills or copy
is an open design choice; nothing in the existing docs decides it.

### 2.4 Resolving a client and loading its config

```js
const a = args();
const slug = assertSlug(a._[0]);
const dir = join(CLIENTS, slug);
if (!existsSync(join(dir, 'site.config.mjs'))) die(`${relative(REPO, dir)} is not a scaffolded site`);
const cfg = await loadClientConfig(dir);
```
(`provision.mjs:32-36`.) For external clients (LHWT) use `clientDirs().find((c) => c.slug === slug)`, as
`sync-engine.mjs:25` does; `join(CLIENTS, slug)` would miss them.

Normalized config fields an SEO script will want (`clients/_template/netlify/functions/lib/config.mjs:181-235`):
`slug`, `name`, `dbPrefix` (slug with `-` → `_`), `envPrefix` (`c.envPrefix || dbPrefix.toUpperCase()`),
`productionUrl` (default `https://<slug>.netlify.app`, trailing slash stripped), `netlifySiteId`,
`supabase: { projectRef, schema: 'command' }`, `assetVersion`, `favicon` (default `/favicon.svg`),
`madeBy: { label: 'Made by HAND', href: 'https://handprotocol.org' }`, `tables: { editors, login_tokens, content, media, revisions, bookings }`
(each `<dbPrefix>_<name>`), `bucket` (= slug), `cacheTag` (= slug), `cookie` (`<dbPrefix>_session`), `checklist`,
`themes`, `booking`, `reviews`, `netlify: { publish, managed }`, `render: { fallback }`.
Note: the Netlify **site name** (the `*.netlify.app` subdomain) is not stored in the config; only
`netlifySiteId` and `productionUrl` are.

Caveat: `loadClientConfig` imports the client's deployed engine copy, so on a client that is behind the
template (THH today) newer config keys may be absent.

### 2.5 Idempotency and safety patterns

- **`--dry`**: every step prints `  would …` and returns without touching anything
  (`provision.mjs:94, 147-150, 200, 228, 239`); the banner shows `[DRY RUN]`; the script ends with
  "Dry run complete. Re-run without --dry to provision."
- **`--only=a,b` / `--skip=a,b`** over a fixed ordered list: `const ALL = ['site','env','migration','deploy','verify']`,
  `steps = ALL.filter((s) => only.includes(s) && !skip.includes(s))` (`provision.mjs:42-45`). Each step is an
  `async function step<Name>()`, dispatched from an `impl` map with a `\n[step]` header (lines 280-284).
- **Each step checks before it acts**: site already has an id → "already created"; env vars are split into
  create (POST) vs update (PUT) by reading what exists; the migration is regenerated only if its version is not
  yet in `supabase_migrations.schema_migrations`; inserts use `on conflict do nothing`.
- **`--check`** = report only, change nothing, exit code 1 if drift (`sync-engine.mjs:51-56, 74`).
- **`--force`** required to overwrite (`scaffold.mjs:26`). **`--all`** for every template-based client.
  **`--test`** to run the client's tests after.
- **Fail loudly**: `patchFile` dies unless the string occurs exactly once; `run` dies on non-zero exit;
  a missing env value dies naming the variable and where to put it.
- **Scripts update `HANDOFF.md`** by string replacement of known template phrases (`provision.mjs:270-278`).
- **Scripts that need secrets never print them**: `provision.mjs:23` "Secrets never print."

### 2.6 Output style

- First line: `<script> <slug> (<name>) → steps: a, b, c  [DRY RUN]`.
- `✓ <step>: <what happened>` via `ok()`; `✗ <reason>` via `die()`; `– <slug>: skipped …` for skips;
  indented `  would …` and `  ✓/✗ <check label>` for check lists; a `  note:` line for hints.
- Verify output is a list of `[label, boolean]` pairs printed one per line, then `die('verify: N check(s) failed')`
  (`provision.mjs:245-267`). This is the shape an SEO audit script should print.
- Last line tells the operator what to do next ("Next: 1. … 2. …", or "Done. Hand-off: clients/<slug>/HANDOFF.md").
- Paths are printed repo-relative (`relative(REPO, path)`).

---

## 3. Credentials and APIs (no secret values)

### 3.1 Netlify token for the cryptokoh account

- File: `~/.config/netlify/config.json` (Netlify CLI config). Shape (values redacted):
  ```json
  {
    "telemetryDisabled": false,
    "cliId": "<uuid>",
    "userId": "<id of the CLI's ACTIVE user>",
    "users": {
      "65ff678f…": { "id": "65ff678f…", "name": null, "email": "<cryptokoh address>", "auth": { "token": "<40 chars>", "github": {} } },
      "6a7a0513…": { "id": "6a7a0513…", "name": "Zan Trra", "email": "<zantrra address>", "auth": { "token": "<40 chars>", "github": {} } }
    }
  }
  ```
- Selection rule (`provision.mjs:52-60`): use env `NETLIFY_AUTH_TOKEN` if set; else the entry of `users`
  whose **key starts with `65ff678f`** and has `auth.token`; else die with
  "cryptokoh Netlify user (id 65ff678f…) not found in the CLI config; export NETLIFY_AUTH_TOKEN".
- The one-liner in `hand-biz-pitch` 6c (line 430) and `hand-biz-finalize` F5.0 picks the **first** user with a
  token (`next(u['auth']['token'] for u in d['users'].values() if …)`). Today that happens to be cryptokoh
  (insertion order), but it is order-dependent. Prefer the id-prefix rule.
- Account slug `cryptokoh` (team display name "koH"). All HAND and client sites live there, **except** Long Horn
  Wine Tours, which is on the `zantrra` account (`~/Documents/lhwt/HANDOFF.md:285`).
- Rule from `hand-client-site/SKILL.md:354-356`: "never `netlify login` again (breaks other sessions)".
- The repo root is `netlify link`ed to the `handprotocol` site (id `0d46269a-789a-4e42-a00e-7f30e79c5869`,
  confirmed by `netlify status`). A bare `netlify deploy` from the repo root would publish to handprotocol.org.
  Every client deploy runs from inside the client dir and is `--site`-scoped.

### 3.2 Netlify REST endpoints the scripts and docs use

Base `https://api.netlify.com/api/v1`, headers `Authorization: Bearer <token>`, `Content-Type: application/json`.
Wrapper: `async nf(method, path, body)` (`provision.mjs:67-76`), throws `netlify <METHOD> <path> → <status>: <first 300 chars>`.

| Method + path | Body | Where |
|---|---|---|
| `GET /accounts` | none; find `x.slug === 'cryptokoh'` → `id` | `provision.mjs:78-83` |
| `POST /{account_slug}/sites` | `{ "name": "<site-name>" }` | `provision.mjs:97` |
| `GET /sites?name=<name>` | none; pick exact `s.name` match (reuse on 422/taken) | `provision.mjs:100` |
| `PATCH /sites/{site_id}` | `{ "name": "<site-name>", "built_with_badge_enabled": false }` | `provision.mjs:106`; memory `hand-netlify-new-site-badge` |
| `GET /accounts/{account_id}/env?site_id={site_id}` | none; rows `{ key, values: [{ value, context }] }` | `provision.mjs:125, 163` |
| `POST /accounts/{account_id}/env?site_id={site_id}` | array of `{ key, scopes: ['builds','functions','runtime','post_processing'], values: [{ value, context: 'all' }] }` | `provision.mjs:165-169` |
| `PUT /accounts/{account_id}/env/{key}?site_id={site_id}` | `{ key, scopes, values: [{ value, context: 'all' }] }` | `provision.mjs:172` |
| `PATCH /sites/{site_id}` | `{ "custom_domain": "<domain>", "domain_aliases": ["www.<domain>"] }` (docs use the CLI passthrough `netlify api updateSite --data '{"site_id":"<id>","body":{…}}'`) | `hand-biz-pitch/SKILL.md:423` |
| `POST /dns_zones` | `{ "account_slug": "cryptokoh", "name": "<domain>" }` → response `dns_servers` = four `dnsN.pXX.nsone.net` | `hand-biz-pitch/SKILL.md:431-432` |
| `GET /dns_zones/{zone_id}/dns_records` | none (confirm the auto-added `NETLIFY` records for apex + www) | `hand-biz-pitch/SKILL.md:437` |
| `PATCH /sites/{site_id}` | `processing_settings.ignore_html_forms` → `false` (the docs name the property path; the exact JSON body is not spelled out, presumably `{"processing_settings":{"ignore_html_forms":false}}`, unverified) | `hand-client-site/SKILL.md:197-198` |
| `GET /sites/{site_id}/forms` | none | `hand-client-site/SKILL.md:198` |
| `PATCH /sites/{site_id}` | `{ repo: { id: <GitHub numeric repo id>, provider: 'github', repo, repo_branch: 'main', installation_id: 108354379, dir: 'public', cmd: '' } }` | `hand-client-site/SKILL.md:222-224` |
| `GET /sites/{site_id}/deploys` | none (confirm a deploy went `ready`) | `hand-client-site/SKILL.md:230`; `precisionfix/HANDOFF.md:216` |
| `POST /sites/{site_id}/builds` | none (manual build trigger; "do not rely on it") | `precisionfix/HANDOFF.md:210` |
| `POST /purge` | `{ "site_id": "<SITE_ID>", "cache_tags": ["<slug>"] }` with the **function-injected** `NETLIFY_PURGE_API_TOKEN` (runtime only, inside the site's functions) | `clients/_template/netlify/functions/lib/db.mjs:112-124` |

CLI passthroughs named in the docs: `netlify api createSite`, `updateSite`, `listAccountsForUser '{}'`,
`listSiteDeploys`. `netlify api createDnsZone` **returns 500** (CLI bug); use the REST call above.
`netlify api createSite` auto-names the subdomain, so it is followed by an `updateSite` rename
(`hand-biz-pitch/SKILL.md:410-411`). Netlify CLI installed: `netlify-cli/26.0.0`.

### 3.3 Supabase management-API SQL

- Project ref `vconmgerblqbworcqkvr` (the shared HAND project), schema `command`, tables `command.<dbPrefix>_*`,
  RLS on with no policies (service role only).
- Token: env `SUPABASE_ACCESS_TOKEN` if set, else GNOME keyring item **service `Supabase CLI`, username `access-token`**,
  read by `python3 .claude/skills/hand-client-site/scripts/keyring-secret.py "Supabase CLI" access-token`
  (`provision.mjs:62-65`). `keyring-secret.py` tries `secretstorage` (walks `get_all_items()` because
  `search_items()` throws on stale paths) and then raw Gio D-Bus (`OpenSession('plain')`, `SearchItems`, `GetSecret`);
  prints the secret to stdout only; exit 1 with `keyring: secret not found.` on stderr.
- Call (`provision.mjs:183-195`): `POST https://api.supabase.com/v1/projects/<ref>/database/query`, headers
  `Authorization: Bearer <token>`, `Content-Type: application/json`, body `{"query": "<sql>"}` piped on stdin:
  `curl -sS -w '\n%{http_code}' -X POST <url> -H … --data-binary @-`. **Must be `curl`**: Python urllib is blocked
  by Cloudflare (403 error 1010). Success is 2xx (a migration returns 201). The response body is the JSON rows.
- Applied migrations are recorded by hand: `insert into supabase_migrations.schema_migrations (version, name) values ('NNN', '<name>') on conflict do nothing;`.
  Never edit an applied migration; write the next number (`nextMigrationNumber()`).
- `command/supabase/.temp/pooler-url` holds a placeholder password: direct `psql` does not work.
- The runtime path (inside a site's functions) uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env on the
  Netlify site, not the management API.

### 3.4 Deploys (exact flags)

From inside the client dir, with the cryptokoh token in the environment:

```
cd clients/<slug>
NETLIFY_AUTH_TOKEN=<cryptokoh token> netlify deploy --prod --build --skip-functions-cache --site <site-id> --message "<text>"
```

- `provision.mjs:230`: `['deploy','--prod','--build','--skip-functions-cache','--site', siteId,'--message', 'provision <ISO minute>']`, `cwd: dir`, `env: { NETLIFY_AUTH_TOKEN }`.
- `--skip-functions-cache` whenever anything under `netlify/` changed. `--build` does **not** run `npm install`;
  `node_modules` must exist (the engine now has one dependency; `sync-engine.mjs` installs it).
- Bump `assetVersion` in `site.config.mjs` when `public/assets/*` or `public/admin/*` change (both site and admin
  assets carry `?v=<assetVersion>`).
- Draft deploy for a safe look first: the same command **without `--prod`** gives a draft URL (scheduled
  functions do not run on drafts). Rule from `clients/_template/HANDOFF.md`: for a schema change,
  **migrate first, deploy second**.
- Static (non-engine) client sites: `cd clients/<prod-slug> && netlify deploy --prod --dir . --site <site-id>`.
- Client sites are **not git-linked** (except PrecisionFix, whose link does not deploy on the Free plan);
  deploy is always CLI. handprotocol.org itself auto-deploys from `main` (`publish = "web"`).
- After deploying, confirm with `GET /sites/<id>/deploys` rather than assuming.

Three Hands Healing: site id `5d0bc794-27d0-4af8-b1b1-1116b34e6350`, project `three-hands-healing`, account
cryptokoh, `assetVersion` currently `20260916a`.

### 3.5 Minting a login token for headless `/admin/` sign-in

Recipe (`clients/zeroblur/HANDOFF.md:141-155`, used again on THH and PrecisionFix):

1. Generate a raw token. The engine's own format is `crypto.randomBytes(32).toString('base64url')` (43 chars)
   (`clients/_template/netlify/functions/lib/session.mjs:50`). Its stored form is the **hex SHA-256 of the raw
   string** (`session.mjs:54`).
2. Insert through the management API (section 3.3):
   ```sql
   insert into command.<prefix>_login_tokens (editor_id, token_hash, expires_at, request_ip)
   select id, encode(sha256('<raw-token>'::bytea), 'hex'), now() + interval '20 minutes', 'manual'
   from command.<prefix>_editors where email = 'hand@handprotocol.org';
   ```
   For THH the tables are `command.three_hands_healing_login_tokens` and `command.three_hands_healing_editors`.
3. Open `https://<host>/admin/?t=<raw-token>` in Playwright. `admin.js` POSTs `/api/auth/verify { token }`
   (`clients/_template/public/admin/admin.js:105`), which sets the HttpOnly session cookie (30 days).
4. Properties: single use (replay → 400), 20 minutes, same-origin check on writes (foreign `Origin` → 403).
   Sign in as **`hand@handprotocol.org`** (the operator inbox seeded as owner by every migration), never as
   the client or a personal address.
5. Playwright notes from prior runs: click `.task__check` (the label), not the hidden input, to tick a Setup
   item; a done task collapses.

Auth endpoints (`clients/_template/netlify/functions/auth.mjs:3-6`): `POST /api/auth/request { email }` (always
`{ ok: true }`), `POST /api/auth/verify { token }`, `GET /api/auth/me` (401 signed out), `POST /api/auth/logout`.
Content writes: full publish through `/api/admin/content`, and field-level
`PATCH /api/admin/content { set: { '<section>.<field>': value } }` (sanitized, one revision, cache purged,
no Publish needed). The public read is `GET /api/content` (`ok: true`, `source: 'db' | 'defaults'`).

### 3.6 Per-client env var names

`<PREFIX>` = slug in UPPER_SNAKE (`three-hands-healing` → `THREE_HANDS_HEALING`), or `envPrefix` in the config
(`config.mjs:188-189`; read at runtime by `siteEnv(key)` = `process.env[<PREFIX>_<key>]`, line 250).

| Variable | Purpose |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | shared project, unprefixed |
| `RESEND_API_KEY`, `EMAIL_FROM` | unprefixed; `EMAIL_FROM` is `<Client Name> <address>` re-labelled from ZeroBlur's |
| `<PREFIX>_SESSION_SECRET` | generated (`randomBytes(32).hex`) |
| `<PREFIX>_SITE_NAME` | optional |
| `<PREFIX>_OWNER_EMAILS` | comma list; auto-provisions owners on first sign-in |
| `<PREFIX>_FORM_NOTIFY`, `<PREFIX>_BOOKING_NOTIFY` | recipients (booking → form → config → owners) |
| `<PREFIX>_REVIEW_PIN` | overrides `reviews.pin` |
| `ANTHROPIC_API_KEY` | only for the guest review helper |
| `NETLIFY_PURGE_API_TOKEN`, `SITE_ID` | injected by Netlify into functions |

`clients/<slug>/.env` (KEY=VALUE lines) overrides any value at provision time. Scopes used for every var:
`['builds','functions','runtime','post_processing']`, context `all`.

---

## 4. Browser automation on this machine

### 4.1 What is installed

| Thing | Location | Version |
|---|---|---|
| Playwright (use this one) | `/home/koh/.claude/skills/gstack/node_modules/playwright/` (`index.mjs`) | `1.62.1` (also `playwright-core` 1.62.1 beside it) |
| Playwright (global) | `~/.nvm/versions/node/v22.16.0/lib/node_modules/playwright` and `@playwright/test` | `1.58.2` (ESM ignores `NODE_PATH`; import by absolute path) |
| `playwright-core` | `REPO/command/node_modules/playwright-core` | devDependency of `command/` (do not touch `command/` this session) |
| Browsers in `~/.cache/ms-playwright/` | `chromium-1208`, `-1217`, `-1228`, `-1234`; `chromium_headless_shell-1208`, `-1217`, `-1228`, `-1234`; `ffmpeg-1011`; `firefox-1509`; `webkit-2248` | gstack's 1.62.1 wants chromium rev `1234` (present, "Google Chrome for Testing 151.0.7922.34"), firefox `1538` and webkit `2336` (**not present**: only Chromium can be launched from the gstack install). Global 1.58.2 wants chromium `1208` (present). |
| System Chrome | `/usr/bin/google-chrome` | `Google Chrome 153.0.8010.52` |
| Lighthouse | **not on PATH** (`which lighthouse` → nothing), **not global** (`~/.nvm/.../lib/node_modules` has no lighthouse). **Cached by npx** at `~/.npm/_npx/0f94ee7615faf582/node_modules/lighthouse` | `12.8.2`, with `chrome-launcher`, `puppeteer-core`, `axe-core` beside it; bins `lighthouse`, `chrome-debug`, `print-chrome-path` |

Global npm packages relevant here: `netlify-cli@26.0.0`, `playwright@1.58.2`, `@playwright/test@1.58.2`,
`http-server`, `resend-cli`.

### 4.2 Launch options that work

```js
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] })
```

- Why: Ubuntu's AppArmor restriction on unprivileged user namespaces makes Chromium abort with "No usable
  sandbox!"; the gstack `/browse` daemon does not pass `--no-sandbox` and is therefore unusable here
  (memory `machine-headless-chromium-sandbox`).
- **Bash sandbox**: the memory note and `reference/verify-checklist.md:7` both say the Bash call needs
  `dangerouslyDisableSandbox: true`. In this session (2026-09-30) a launch + navigation to the live THH site
  succeeded in a plain Bash call without that flag (1.0 s, Chromium `151.0.7922.34`, HTTP 200). So: try the
  normal call first; if the launch fails with a sandbox or namespace error, repeat with
  `dangerouslyDisableSandbox: true`. The difference is presumably whether the harness sandbox is enabled for
  the session; I could not determine that from inside.
- Screenshot scripts belong in the session scratchpad, not the repo.
- Raw alternative from `hand-biz-pitch/SKILL.md:288-290`:
  `~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell --no-sandbox --headless --screenshot=/tmp/x.png --window-size=1280,3200 file://<abs>/index.html`.

### 4.3 Minimal working snippet (from `REPO/threehandshealing/tools/shot.mjs`, lines 3, 14-30)

```js
import { chromium } from '/home/koh/.claude/skills/gstack/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
const errors = []
async function shoot(name, viewport, fullPage) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  page.on('pageerror', e => errors.push(`[${name}] pageerror: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`) })
  await page.goto('file://' + file, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  // scroll through so lazy images + scroll-triggered reveals fire
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += viewport.height * 0.8) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120) }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(600)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 2) errors.push(`[${name}] horizontal overflow: ${overflow}px`)
  await page.screenshot({ path: `${out}/${slug}-${name}.png`, fullPage })
  await ctx.close()
}
await shoot('desktop', { width: 1440, height: 900 }, false)
await shoot('mobile', { width: 390, height: 844 }, false)
await browser.close()
```

House viewports: desktop `1440x900` (older notes use 1280), mobile `390x844`; overflow tolerance `> 2px`;
full-page captures need the scroll-through first (and on engine sites add `.in` to every `.reveal`, per
`precisionfix/HANDOFF.md:121-122`). Auto-detect Spanish is tested with a second context `locale: 'es-MX'`.

### 4.4 Lighthouse without installing (verified)

```
CHROME_PATH=/usr/bin/google-chrome node ~/.npm/_npx/0f94ee7615faf582/node_modules/.bin/lighthouse <url> \
  --only-categories=seo --output=json --output-path=<scratch>/lh.json --quiet \
  --chrome-flags="--headless=new --no-sandbox"
```

Ran against `https://three-hands-healing.netlify.app/` on 2026-09-30: exit 0, `lighthouseVersion 12.8.2`,
SEO category score `1` (all ten automated audits pass: `is-crawlable`, `document-title`, `meta-description`,
`http-status-code`, `link-text`, `crawlable-anchors`, `robots-txt`, `image-alt`, `hreflang`, `canonical`;
`structured-data` is manual). Caveat: the npx cache directory name is a hash and npx may prune or replace it;
a script should locate it by scanning `~/.npm/_npx/*/node_modules/lighthouse/package.json` and fall back to
"not available" rather than hard-coding the hash. `npx lighthouse` itself would re-resolve from the network.

---

## 5. Verify checklist and handoff conventions

### 5.1 `reference/verify-checklist.md` (39 lines), verbatim structure

**Local (no DB)**: `cd clients/<slug> && npm test && npm run preview`, then screenshots.
- tests green
- desktop + mobile screenshots read right (fonts loaded, theme colors, no unstyled block)
- no console errors; no horizontal overflow at 390px (probe `scrollWidth > clientWidth`)
- every section with an empty list is hidden and its nav link gone
- `<style id="theme">` present, `Owner sign in` link present, **JSON-LD present**
- `dist-preview/admin/index.html` (login view) reads as the site
- `node scripts/gen-migration.mjs` mentions only this slug's tables/bucket
- `tests/checklist.test.mjs` green; the admin preview carries `data-action-kind` buttons (and `looks-tpl` with themes)

**Live (after provision)**:
- `/` 200, no `/.netlify/scripts/hud`, `Netlify-Cache-Tag` = slug (`curl -sI`)
- `/admin/` 200 with `X-Robots-Tag: noindex`, themed like the site
- `/api/content` `ok:true`; `/api/auth/me` 401
- request a link for `hand@handprotocol.org` → delivered (Resend log), or mint a token via SQL
- publish once → `source` flips to `db`; the page reflects the edit within a second (purge ok)
- upload a photo → Image CDN 200/webp; replace a placeholder; reorder; delete
- add the owner in Editors; last-owner guard holds
- token replay rejected; cross-origin POST blocked (403)
- mobile Safari: sticky action bar, lightbox swipe
- Setup tab: lands first; every action button lands where it says; a manual tick survives a reload without
  Publish; done tasks collapse; self-ticking items flip when the field / photo / host condition is met
- Looks picker: Preview shows `/?theme=<id>` at 390 and 1440; Use this look flips `/` within a second

**Booking calendar** block (only for sites with `config.booking`), ending with "Delete the test rows … so the
owner's first view is empty."

`provision.mjs` `verify` step automates: `/` 200; no `/.netlify/scripts/hud`; `href="/admin/"` present;
`<style id="theme">` present; `/admin/` 200; `/api/content` 200 with `source` in `db|defaults`; `/api/auth/me` 401
(all with `redirect: 'manual'`).

For static graduated sites (`hand-biz-pitch` 6e): `<prod-slug>.netlify.app` → `/` 200, footer "Made by HAND",
no `demo-visit`, `/img/*` + `/robots.txt` + `/sitemap.xml` 200; after propagation `curl -I https://<domain>/` and
`https://www.<domain>/` → 200 over valid HTTPS; `dig +short NS <domain>` shows the nsone servers.

An SEO verify list should use the same form: a checkbox list in `reference/`, each line one probe with the
exact expected value, split "Local" / "Live", and the script printing `✓/✗ label` per check.

### 5.2 What a client `HANDOFF.md` records

Template (`clients/_template/HANDOFF.template.md`, placeholders `{{NAME}} {{SLUG}} {{PREFIX}} {{DATE}} {{OWNER}} {{MIGRATION}} {{SITE_ID}}`):

1. Title `# Handoff — <Name> · <date>` and a one-paragraph description (what the site is, who the owner is, which skill built it, when).
2. `**Status:**` line. Template phrases that `provision.mjs` string-replaces: `scaffolded, not provisioned.` →
   `LIVE at https://<name>.netlify.app since <date> (provisioned by provision.mjs).`; `not created yet` → site id;
   `applied: **no**` → `applied: **yes** (<date>)`.
3. `## Start here (cold session)`: numbered, read this file then `README.md`; which files are the site pack;
   how to test and preview.
4. `## Who can sign in (all owner role)`: table Email / Who.
5. `## Where things are`: Code, Database (project ref, tables, migration file + applied?), Storage bucket,
   Netlify (project, site id, account, env var names), Custom domain, Setup tab consts, Booking calendar.
6. `## Next steps`: numbered.

What a mature handoff adds (`clients/precisionfix/HANDOFF.md`):

- **Dated checkpoints at the top**, newest first: `**2026-09-17 checkpoint: LIVE** (assetVersion, deploy id, the
  deploy id to roll back to)`, what shipped, what was verified, and **what was not done**.
- `## What was built`, `## Engine additions made for this site`.
- `## Verified live (<date>, <topic>)` sections: exact probes and observed values, viewports, "zero console
  errors", and the cleanup performed (test rows deleted, content left as the owner should first see it).
- `## Known gaps and risks`: plain statements, including things promised to the owner that are not yet true.
- `## Message to send the owner (ready: …)`: a block-quoted, copy-pasteable message in owner voice.
- `## Next steps`: numbered, each naming who is waited on (owner / koH) and what unblocks it.
- Standing facts: owner emails, Netlify site id, account, env var **names** (never values), migration numbers
  and applied dates, repo locations, exact redeploy command, registrar and domain plan.
- Records explicitly when nothing is committed ("Nothing in the monorepo is committed", "koH said do not commit").

THH has two handoffs: `clients/three-hands-healing/HANDOFF.md` (the engine build) and
`threehandshealing/HANDOFF.md` (495 lines, the client workspace: Maria's answers, domain, funnel plan, photo
licensing). The engine one says to read both. An SEO run should append a dated section to the client-dir
handoff (and note the workspace one), not create a third file. `clients/_template/HANDOFF.md` is the engine's
own handoff and is never copied into a client.

Git: commit only when koH asks; stage by explicit path, never `-A` (another session shares the checkout).

---

## 6. Domain / DNS procedure

### 6.1 As written (hand-biz-pitch Phase 6c, lines 420-445; reordered by hand-biz-finalize F5.0)

Order (founder feedback 2026-06-14, "DNS goes FIRST"): ask which registrar at the top → create the DNS zone →
relay the four nameservers immediately → do the rest while propagation runs. The `pXX` pool is assigned at
zone creation, so the zone must exist before the nameservers can be given.

1. Attach the domain to the site:
   ```
   netlify api updateSite --data '{"site_id":"<id>","body":{"custom_domain":"<domain>","domain_aliases":["www.<domain>"]}}'
   ```
2. Create the Netlify DNS zone. `netlify api createDnsZone` 500s, so REST directly:
   ```
   curl -s -X POST https://api.netlify.com/api/v1/dns_zones -H "Authorization: Bearer $TOK" \
     -H "Content-Type: application/json" -d '{"account_slug":"cryptokoh","name":"<domain>"}'
   ```
   Response `dns_servers` = four `dnsN.pXX.nsone.net`. Zone creation auto-adds `NETLIFY` ALIAS records for apex
   and www (confirm with `GET /api/v1/dns_zones/<zone>/dns_records`); Netlify matches them to the site through
   `custom_domain` even though `zone.site_id` reads null.
3. Relay the four nameservers to the human. Registrar step is theirs. Namecheap: Domain List → Manage →
   Nameservers → **Custom DNS** → paste the four → save.
4. Propagation is minutes to hours. Split-brain during propagation is normal (`dig +short NS` shows nsone
   while `dig +short <domain> A` still shows the old host). Let's Encrypt SSL auto-provisions for apex + www once
   the zone is authoritative.
5. External-DNS alternative: keep the registrar's nameservers, add `A @ → 75.2.60.5` and
   `CNAME www → <site-name>.netlify.app`. Delegation is preferred "for a fresh single-purpose domain".
6. Verify: `curl -I https://<domain>/` and `https://www.<domain>/` → 200 on valid HTTPS; `dig +short NS <domain>`.
7. For an engine site (hand-client-site Phase 5, lines 160-165): then **update `productionUrl` in
   `site.config.mjs` (canonical/og fallback) and redeploy**; consider `EMAIL_FROM` on the client's own verified
   Resend domain; fill the handoff.
8. Record the site id, zone id, nameservers and `ssl_state` (for pipeline leads: in `biz/<slug>/lead.md`
   frontmatter + `register-lead.mts`; for engine clients: in the client `HANDOFF.md`).

The Setup tab already has a `domain` item (`clients/_template/site/checklist.mjs:164-177`) that opens the
registrar, explains the four nameservers, and self-ticks with `check: { kind: 'host' }` (true when `/admin/` is
served on a host that is not `*.netlify.app`).

### 6.2 Redirecting the netlify.app subdomain and old URLs

- **hand-biz-pitch and hand-client-site say nothing about redirecting `<name>.netlify.app` to the custom
  domain.** Their verify steps expect the netlify.app subdomain to keep answering 200.
- The only written precedent is Long Horn Wine Tours (`~/Documents/lhwt/netlify.toml:39-52`), with the note
  "Netlify does NOT do this automatically. Deploy-preview URLs are unaffected. Must stay first; force = true
  because every file exists.":
  ```toml
  [[redirects]]
    from = "https://longhorn-wine-tours.netlify.app/*"
    to = "https://longhornwinetours.com/:splat"
    status = 301
    force = true

  [[redirects]]
    from = "http://longhorn-wine-tours.netlify.app/*"
    to = "https://longhornwinetours.com/:splat"
    status = 301
    force = true
  ```
  LHWT's toml is **pack-owned** (`netlify: { managed: false }`). The same handoff warns that forced host rules
  run before functions (`netlify.toml` comment at "0b", verified live 2026-09-22), so rule order matters.
- For a **managed** toml (THH, Legacy Care, PrecisionFix) there is no such rule and no config key to produce
  one: `gen-netlify-toml.mjs` emits only `[build]`, `[functions]`, `[images]`, page rewrites, and four header
  blocks. The file is rewritten by `scaffold.mjs` and by every `sync-engine.mjs`. So the redirect has to be
  added to the generator in `clients/_template` (engine change + test + sync), not to the client's toml.
  The generator would also need the netlify.app site name, which the config does not hold (section 2.4).
- Why it matters for SEO: `headTags()` builds canonical and `og:url` from the **request origin**
  (`blocks.mjs:51-52`: `const base = origin || config.productionUrl`), and `/sitemap.xml` lists the host that
  served the request. After a domain is attached, the netlify.app host self-canonicalizes and serves its own
  sitemap, i.e. a second indexable copy, unless the 301 exists. `productionUrl` is only a fallback (static
  preview and `jsonLd`'s default).
- **Retiring an old separate site**: LHWT's old review site was replaced with a redirect-only deploy whose
  `_redirects` is `/*  https://longhornwinetours.com/:splat  301!` (`lhwt/HANDOFF.md:286`). The Setup tab's
  `old_site` item (`checklist.mjs:212-223`, only when `OLD_SITE` is set) tells the owner HAND "can redirect the
  old address to the new site instead".
- **Old demo URLs** (pipeline leads): the demo at `handprotocol.org/demos/<slug>/` is never deleted or
  redirected ("don't remove the demo, just mark it done elsewhere"). On graduation its **canonical is flipped
  to the production domain** and a slim "✦ Now live … at `<domain>`" banner is added; the visit beacon stays on
  the demo and is removed from production (`hand-biz-pitch/SKILL.md:457-460`).
- THH specifics (observed 2026-09-30): `https://3handshealing.com/` → 301 → `https://www.3handshealing.com/`,
  served by CloudFront (systeme.io); the apex is CNAME'd to a `cloudfront.net` host; registrar Namecheap per the
  workspace handoff. The static copy `https://handprotocol.org/threehandshealing/` is indexable with
  `canonical` = itself (`web/threehandshealing/index.html:9`), so after cutover it competes with the real
  domain unless its canonical is flipped the way demos are. Before repointing: **export Maria's email list from
  systeme.io** (both handoffs), and koH earlier said not to chase the DNS/systeme.io angle yet.

---

## 7. Rules an SEO skill must respect

### 7.1 Owner UX: buttons, not prose (koH, 2026-09-15; SKILL.md Phase 3b lines 96-128)

- Owners are phone-only small-business people. "This ux should be as buttery smooth as possible."
- **The button is the step.** Every Setup item carries `actions`; prose steps refer to buttons by label in bold
  ("Tap **Open Search Console**"), never to a place the owner must find.
- **Never make the owner type a URL** or hunt for a section.
- **Let it tick itself** (`check`) wherever the site can tell; ticks and picks save on the spot
  (`PATCH /api/admin/content`), never behind Publish.
- **One verb per line, a `done` line on every item, phone-first**; `desktop[]` only where it differs.
- First visit lands on the Setup tab while work is left; previews show the real thing.
- Item shape (`clients/_template/netlify/functions/lib/checklist.mjs:7-24`):
  `{ id, title, why, actions: [{ label, kind, target }], check: { kind, path?, value? }, embed, phone: [], desktop: [], links: [{ label, href }], ask, done, later }`.
  Action kinds: `tab` (content | media | editors | history | setup | bookings), `section`, `field`
  (`<section>.<field>`), `site` (`#hash` or `/path`, always root-relative), `url` (`https://…`), `looks`.
  Check kinds: `field` (path non-empty), `value` (path equals value), `media`, `host`, `booking`.
  Ids match `/^[a-z][a-z0-9_]*$/`; field paths `/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/`. Inline marks in steps:
  only `**bold**` and `` `code` ``.
- Existing SEO-relevant items in the template checklist (`clients/_template/site/checklist.mjs`):
  - `search_console` (lines 179-196): buttons "Open Search Console" (`https://search.google.com/search-console`)
    and "Paste the code here" (`field` `seo.google_verification`), self-ticks on that field; steps say choose
    **URL prefix**, **HTML tag** method, copy the code after `content=`, Publish, Verify, then Sitemaps → type
    `sitemap.xml` → Submit. (This one step does have the owner type a short string in Search Console.)
  - `google_business` (198-210): button "Open Google Business" (`https://business.google.com`), manual tick.
  - `domain` (164-177) and `old_site` (212-223) as described above.
  The order in `CHECKLIST` is: looks, copy, photos, hours/test/calendar (or contact test), code access items,
  domain, searchConsole, googleBusiness, oldSite.
- Engine hooks already present: `seo.google_verification` (validated `/^[A-Za-z0-9_-]{10,120}$/`) →
  `<meta name="google-site-verification">` (`blocks.mjs:56-57`); `/sitemap.xml` function on every site
  (`ROUTES` minus `NOINDEX`, current host, `preferStatic: true`, `Cache-Control: public, max-age=3600`);
  `headTags()` emits title, description, canonical, `og:title/description/type/url/image`, `twitter:card`,
  `theme-color`; `jsonLd(content, origin, featured, overrides)` emits `LocalBusiness` with `name`,
  `description`, `url`, `telephone`, `email`, `image`, `sameAs` (Instagram only) plus overrides (THH passes
  `{ '@type': 'HealthAndBeautyBusiness' }`); `public/robots.txt` is **pack-owned** (not in `ENGINE_FILES`) and
  today is `User-agent: * / Allow: / / Disallow: /admin/ / Disallow: /api/` with **no `Sitemap:` line**;
  `/admin/*` carries `X-Robots-Tag: noindex, nofollow`; the engine's not-found page carries
  `<meta name="robots" content="noindex">`.
- Engine vs pack: SEO changes to `lib/blocks.mjs`, `sitemap.mjs`, `gen-netlify-toml.mjs`, `lib/render.mjs`
  are **engine** changes: make them in `clients/_template`, add a test in `clients/_template/tests/`, run
  `npm test` there, `sync-engine.mjs --check`, then `sync-engine.mjs <slug> --test`. Per-client SEO work
  belongs in the pack: `site.config.mjs`, `site/schema.mjs` (keep existing keys: renaming orphans saved copy;
  new keys fall back to `DEFAULT_CONTENT` until the owner publishes), `site/page.mjs`, `site/checklist.mjs`,
  `public/robots.txt`, `tests/page.test.mjs`. Never fork the engine inside a client dir.
- Owner text always goes through `e()`; schema text fields need `max`; keys are `[a-z0-9_]`; lists cannot nest.

### 7.2 Never invent facts

- `hand-biz-pitch/SKILL.md:166, 171-172`: "Never invent a phone, address, hours, services, awards, or staff".
- "A wrong number on a real business's live customer-facing site is the one genuinely harmful mistake here"
  (line 190-191). `hand-client-site/SKILL.md:359-360`: "never put a wrong phone on a live site (confirm the
  digits with the owner before the site goes on their domain)".
- No phone → no Call button; do not block and do not invent (memory index: `hand-biz-demo-no-phone-no-call`).
- Review links: "Ask the owner for the real review links (Google: Business Profile → *Ask for reviews*);
  never guess them" (`SKILL.md:206-207`). No review gating by star rating (template README:147).
- Never translate verbatim Google review quotes or their cites.
- Scraped Google Maps photos never go on a public site; production uses only owner-provided or approved photos.
- Consequence for SEO: JSON-LD `telephone`, `address`, `geo`, `openingHours`, `areaServed`, `aggregateRating`,
  `sameAs`, and any city in titles/descriptions may be emitted only from values the owner has confirmed. THH's
  phone, email, booking link and city are all still empty/unconfirmed (its handoff: "Maria has not answered
  Q6–Q9"), which is why its JSON-LD today has no `telephone`/`address`.
- THH wording rule: "EFT / Tapping sessions", never "EFT therapy" unless Maria is licensed (TX exposure; hands-on
  soft-tissue work is licensed massage therapy under TDLR). The footer disclaimer must stay. This binds titles,
  descriptions, schema `@type`/`description`, and Business Profile categories/services.

### 7.3 Bilingual EN/ES

- Settled 2026-06-14: HAND demo and client sites ship English + Spanish with automatic detection (Austin metro).
- Static pattern (`~/.claude/skills/hand-biz-pitch/i18n-snippet.html`): `data-es="…"` on the smallest text
  element; `<title>` and `<meta name="description">` carry `data-es` too (the script swaps a META's `content`);
  a `.lang-toggle` button; ~25-line script; `localStorage` key `hand-lang`; an `es*` `navigator.language` gets
  Spanish with no click; `<html lang>` kept in sync.
- Engine pattern (Legacy Care, PrecisionFix): every visible field has an `_es` twin in the schema, rendered as
  `data-es="${B.e(x_es)}"` (`clients/legacy-care-llc/site/page.mjs`), same `hand-lang` script in `site.js`.
- SEO implication to state plainly: this is a **client-side swap on one URL**. There are no separate Spanish
  URLs, no `hreflang`, and the server HTML is always English with `<html lang="en">`. Whether Google indexes
  the Spanish text is not something the existing docs address.
- Register: warm idiomatic Mexican Spanish, keep local loanwords. Verify with Playwright interaction plus an
  `es-MX` context, not a static screenshot.
- **Three Hands Healing is English-only today** (no `_es` fields, no toggle, `site/page.mjs:86` `<html lang="en">`).

### 7.4 noindex conventions

- Pitch pages: all 215 `web/demos/*/pitch/index.html` contain `noindex`, and they sit behind Basic Auth.
- Demo pages: **0 of 223** `web/demos/*/index.html` carry a robots noindex meta; demos are public and indexable
  by design (the visit beacon and "free preview" footer mark them). On graduation the demo's canonical is flipped.
- Client preview / portfolio paths are kept out of search with `X-Robots-Tag = "noindex, nofollow"` header rules
  in the root `netlify.toml` (lines 439-461): `/threehandshealing/styles/*`, `/project/untouchable-freedom/*`,
  `/project/unfuckwithable/*`, `/project/subculture-audio/*`. The THH main page `/threehandshealing/` is **not**
  in that list (indexable).
- Engine: `/admin/*` header noindex; pack `NOINDEX` export removes routes from the sitemap; the review page is
  noindex and off the sitemap (LHWT).
- When porting a design into a pack: "Drop demo-only things: visit beacons, portfolio pills, `noindex`, studio
  tooling, 'free preview' footers" (`reference/porting-a-design.md:65-66`). An SEO audit should therefore fail a
  production client page that still carries `noindex`, `/assets/demo-visit.js`, or the "free preview" footer.
- Production footers: "Made by HAND" linking `https://handprotocol.org` (default `madeBy`), or white-label;
  `footerLinks()` (maker credit + owner sign-in) is mandatory in engine packs.
- New Netlify sites inject a "Powered by Netlify" badge script (`/.netlify/scripts/hud`); it must be off
  (`built_with_badge_enabled: false`) and its absence verified.

### 7.5 Naming and privacy rules

- **Mesquitos**: `hand-client-site/SKILL.md:359` "Never name Mesquitos". Memory rule: research only, never named
  as a queued/planned Reciprocate community in public or grant copy; Mystic Hearts is the only confirmed one.
  Do not let it appear in any generated copy, schema, or standup material.
- **Test addresses**: never use koH's personal email in test data, signups or sends. Use `*@handprotocol.org`
  (prior art: `hand@handprotocol.org` for admin sign-in, `booking-test@handprotocol.org`,
  `learn-e2e-test@handprotocol.org`), delete the rows afterwards, and confirm delivery through the provider API
  (Resend `last_event: delivered`) rather than an inbox. This applies to any Search Console / Bing / Business
  Profile "add HAND as a user" step: the docs' wording is "Add HAND's email as a user" (`checklist.mjs:194`),
  and the HAND operator inbox is `hand@handprotocol.org`.
- **AI stance** (memory index): never name specific AI models in public/grant copy.
- **Secrets**: never in repo or chat; env var names only. The functions carry the shared Supabase service-role
  key, which is why client sites stay on HAND's Netlify account and owners get `/admin/`, not Netlify access
  (`precisionfix/HANDOFF.md:223-230`).

### 7.6 Operating rules for this checkout

- Another Claude session works in the same checkout (today: `omnione/`, `koordi/`, `yuhm/`, `command/`). Stage
  by explicit path, never `git add -A`; before reverting any file run `git status --short <file>` and never
  `git checkout --` a file with changes you did not make; read `git reflog` on anomalies.
- Commit only when koH asks. "Momentum over questions" for small asks; plan + one confirm for big ones.
- No multi-agent Workflow / ultracode runs for THH (memory `feedback-no-ultracode-workflows`, 2026-09-04). Note:
  this research task itself was launched by a workflow script; the skill being built should not instruct
  future runs to spawn workflows.
- Netlify edge-function helpers must live in a subdirectory (`netlify/edge-functions/lib/`), and an edge
  `context.next()` does not apply toml rewrites. Both concern handprotocol.org (the root site), not the client
  engine, which uses Functions v2 only. Relevant only if the SEO skill touches `web/` or root `netlify/`.
- handprotocol.org publishes `web/` + `netlify/` from `main` only; after any push verify the deploy went
  `ready` through the API (`netlify api listSiteDeploys`), since a failed build fails silently.
- Functions v2 facts: a function with a custom `path` is not reachable at its default URL and matches before
  redirects and static files; `/admin/` is a function route, so never add a static `public/admin/index.html`;
  a static `sitemap.xml` in the publish dir wins over the engine's function (`preferStatic`).

---

## 8. Three Hands Healing snapshot (observed 2026-09-30, read-only GETs)

| Probe | Result |
|---|---|
| `GET https://three-hands-healing.netlify.app/` | 200, `text/html`, `netlify-vary: query=theme`, Durable cache hit |
| `<title>` | `Three Hands Healing — EFT, energy healing & bodywork with Maria · Texas` |
| meta description | `Three Hands Healing — EFT, energy healing, bodywork, Qi Gong and Family Constellations with Maria. Online or in person in Texas.` |
| canonical / `og:url` | `https://three-hands-healing.netlify.app/` |
| `og:image` | `/.netlify/images?url=%2Fimg%2Fphotos%2Fmaria-arch-laughing.jpg&w=1066&q=78&fm=webp` (absolute), with `og:image:alt` |
| robots meta | none; `google-site-verification` none |
| JSON-LD | `HealthAndBeautyBusiness` with `name`, `description`, `url`, `image` only |
| `<h1>` count / `lang` / overflow at 390 | 1 / `en` / 0 |
| `/sitemap.xml` | 200, one `<url>` for the netlify.app host |
| `/robots.txt` | 200, no `Sitemap:` line |
| `/admin/` | 200, `x-robots-tag: noindex, nofollow`, `cache-control: no-store` |
| `/index.html` | 200 (engine behind; current engine would 301 to `/`) |
| Lighthouse 12.8.2 SEO category | 1.0 |
| `https://3handshealing.com/` | 301 → `https://www.3handshealing.com/`, `server: CloudFront` |

Pack facts: `slug: 'three-hands-healing'`, `productionUrl: 'https://three-hands-healing.netlify.app'`,
`netlifySiteId: '5d0bc794-27d0-4af8-b1b1-1116b34e6350'`, `assetVersion: '20260916a'`, migration 044, 29 tests,
owners `<Maria's own Gmail>`, `cryptokoh@gmail.com`, `hand@handprotocol.org`. Nothing committed.

---

## 9. Not verified / uncertain

- I did not call the Netlify API with a token or the Supabase management API (read-only brief; nothing needed
  it). Endpoint shapes are taken from the code and docs, not re-tested today.
- The exact JSON body for turning form detection on is not written anywhere I read.
- Whether the harness Bash sandbox is on in other sessions (and so whether `dangerouslyDisableSandbox` is
  needed for Playwright) could not be determined; it was not needed here.
- The `grants` skill's `references/hand-context.md` (the canonical voice list) was not read; the AI-tell word
  list above is the one quoted in `hand-biz-pitch`.
- I did not read `clients/_template/HANDOFF.md` past line 80 or the `threehandshealing/HANDOFF.md` workspace
  file in full (grep only).
