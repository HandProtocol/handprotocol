#!/usr/bin/env node
// hand-client-seo: SEO for HAND client sites, by stage.
//
//   node .claude/skills/hand-client-seo/scripts/seo.mjs <command> <client|url|folder> [--flags]
//
//   menu [--json]                       the stage questions (asks them itself on a terminal)
//   plan --client= --stage= --owner= --depth=
//                                       the commands a set of menu answers turns into
//   status <client>                     facts, stage progress, audit history
//   audit <target> [--local] [--psi] [--lab] [--max=25] [--also=<url>,…] [--no-external]
//                  [--only=<id|category>,…] [--skip=…] [--verbose] [--json] [--no-save] [--compare]
//   test <target> [same flags] [--gate] the audit; --gate exits 1 when the launch gate is blocked
//   baseline <target> [--local]         audit, then the HAND standard on-site setup, item by item
//   google <client> [--done=<item>,…] [--todo=<item>,…]
//                                       the owner's Google steps and their progress
//   cutover <client> [--domain=<domain>] the domain move, step by step
//   standup <client> [--when=2026-10-07T10:00] [--tz=America/Chicago] [--channel="Zoom"]
//                                       writes seo/standup/: agenda, owner page, invite, message
//   report <client> [--id=<stamp>] [--format=md|html|json|text]
//   facts <client> [set key=value …] [unset key …]
//   checks [--md]                       the check list (--md regenerates reference/checks.md)
//
// A target is a client slug (audits its productionUrl, or its dist-preview
// with --local), any URL, or a folder (served locally and audited as its
// public address: web/threehandshealing → handprotocol.org/threehandshealing/).
// Results land in clients/<slug>/seo/. Nothing here deploys, edits a site,
// or sends anyone anything.
import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { runAudit } from './lib/audit.mjs';
import { CHECKS } from './lib/checks/index.mjs';
import { gatherFacts, parseFact } from './lib/facts.mjs';
import { BASELINE, CUTOVER_STEPS, GOOGLE_ITEMS, GOOGLE_STEPS } from './lib/guides.mjs';
import { markdownReport, terminalReport } from './lib/report.mjs';
import { WEIGHTS } from './lib/score.mjs';
import { buildStandup, writeStandup } from './lib/standup.mjs';
import { auditDirs, compareAudits, loadAudit, loadState, recordAudit, saveState, seoDir } from './lib/state.mjs';
import { openTarget, resolveTarget } from './lib/target.mjs';
import { REPO, args, c, clientDirs, die, ok, plural } from './lib/util.mjs';

const a = args();
const [command, input] = a._;
const list = (v) => (v && v !== true ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : null);
const rel = (p) => relative(REPO, p);
const SCRIPT = 'node .claude/skills/hand-client-seo/scripts/seo.mjs';

// ── the menu ────────────────────────────────────────────────────────────
function menuData() {
  const clients = clientDirs().filter((x) => x.onTemplate).map((x) => x.slug);
  return {
    questions: [
      { id: 'client', header: 'Client', question: 'Which client is this for?', options: clients.map((s) => ({ value: s, label: s })), other: 'any URL or folder' },
      {
        id: 'stage',
        header: 'Stage',
        question: 'Where does this client need help?',
        options: [
          { value: 'baseline', label: 'Baseline setup', description: 'HAND\'s standard on-site SEO, proven by an audit: titles, sitemap, canonicals, structured data, previews, photos.' },
          { value: 'google', label: 'Google setup with the owner', description: 'Search Console, Business Profile, review link, Bing. Needs the owner\'s Google account.' },
          { value: 'test', label: 'Tests and audit', description: 'Crawl the site and score it; optionally PageSpeed and a real-browser check; or the launch gate.' },
          { value: 'full', label: 'Full run', description: 'Baseline, a full audit, the Google steps, a standup with the owner, and the domain-move plan.' },
        ],
        more: [
          { value: 'cutover', label: 'Domain move', description: 'Move the site to its own domain without losing anything.' },
          { value: 'standup', label: 'Standup', description: 'Prepare the working session with the owner.' },
          { value: 'monitor', label: 'Monitor', description: 'Re-audit and compare with the last run.' },
        ],
      },
      {
        id: 'owner',
        header: 'Owner steps',
        question: 'How will the owner\'s steps happen?',
        when: { stage: ['google', 'full'] },
        options: [
          { value: 'standup', label: 'Standup together', description: 'A one-hour session; HAND drives, the owner signs in and verifies.' },
          { value: 'setup-tab', label: 'Owner alone, Setup tab', description: 'The owner follows the Setup tab in /admin/ at their own pace.' },
          { value: 'shared-access', label: 'HAND with shared access', description: 'The owner adds HAND as a manager; HAND does the rest.' },
          { value: 'later', label: 'Not now', description: 'Record the steps as open and move on.' },
        ],
      },
      {
        id: 'depth',
        header: 'Test depth',
        question: 'How deep should the test go?',
        when: { stage: ['test', 'full', 'baseline', 'monitor'] },
        options: [
          { value: 'quick', label: 'Quick', description: 'Crawl up to 10 pages, skip outbound links. Under a minute.' },
          { value: 'full', label: 'Full crawl + PageSpeed', description: 'Every page, outbound links, PageSpeed and the phone/desktop browser check. A few minutes.' },
          { value: 'gate', label: 'Launch gate', description: 'The full run, and a hard pass/fail on the faults that must not ship.' },
        ],
      },
    ],
    plan: `${SCRIPT} plan --client=<client> --stage=<stage> --owner=<owner> --depth=<depth>`,
  };
}

function planFor({ client, stage, owner = 'standup', depth = 'quick' }) {
  if (!client) die('plan needs --client');
  const depthFlags = { quick: '--max=10 --no-external', full: '--max=50 --psi --lab', gate: '--max=50 --psi --lab --gate' }[depth] || '';
  const auditCmd = `${SCRIPT} ${depth === 'gate' ? 'test' : 'audit'} ${client} ${depthFlags}`.trim();
  const ownerCmds = {
    standup: [`${SCRIPT} google ${client}`, `${SCRIPT} standup ${client} --when=<YYYY-MM-DDTHH:MM> --tz=America/Chicago`],
    'setup-tab': [`${SCRIPT} google ${client}`, '# confirm the Setup tab carries the Google items (site/checklist.mjs), then send the owner the /admin/ link'],
    'shared-access': [`${SCRIPT} google ${client}`, '# ask the owner to add HAND as a manager on the Business Profile and an owner on Search Console'],
    later: [`${SCRIPT} google ${client}`],
  }[owner] || [];
  const plans = {
    baseline: [`${SCRIPT} baseline ${client}`],
    google: ownerCmds,
    test: [auditCmd],
    full: [`${SCRIPT} baseline ${client}`, auditCmd, ...ownerCmds, `${SCRIPT} cutover ${client}`],
    cutover: [`${SCRIPT} cutover ${client}`],
    standup: [`${SCRIPT} standup ${client} --when=<YYYY-MM-DDTHH:MM> --tz=America/Chicago`],
    monitor: [`${SCRIPT} audit ${client} ${depthFlags} --compare`.replace(/\s+/g, ' ')],
  };
  if (!plans[stage]) die(`unknown stage "${stage}"`);
  return plans[stage];
}

async function interactiveMenu() {
  const data = menuData();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answers = {};
  try {
    for (const q of data.questions) {
      if (q.when && !q.when.stage.includes(answers.stage)) continue;
      const opts = [...q.options, ...(q.more || [])];
      console.log(`\n${c.bold(q.question)}`);
      opts.forEach((o, i) => console.log(`  ${i + 1}. ${o.label}${o.description ? c.dim(`  ${o.description}`) : ''}`));
      const raw = (await rl.question(`> `)).trim();
      const n = Number(raw);
      answers[q.id] = Number.isInteger(n) && opts[n - 1] ? opts[n - 1].value : raw;
    }
  } finally {
    rl.close();
  }
  const steps = planFor(answers);
  console.log(`\n${c.bold('Plan')}`);
  for (const s of steps) console.log(`  ${s}`);
  console.log(c.dim('\nRun the lines in order (the # lines are manual steps).'));
}

// ── shared pieces ───────────────────────────────────────────────────────
async function prepare(needInput = true) {
  if (needInput && !input) die(`${command} needs a client slug, URL or folder`);
  const target = await resolveTarget(input, { local: Boolean(a.local) });
  const state = loadState(target);
  return { target, state };
}

async function doAudit(target, startState, { quiet = false } = {}) {
  let state = startState;
  const { facts, sources } = await gatherFacts(target, state, { fetchContent: !a.local });
  // --also addresses are remembered: every later audit tests them too.
  const otherUrls = [...new Set([...(state.otherUrls || []), ...(list(a.also) || [])])];
  if (a.also && !a['no-save']) {
    state = { ...state, otherUrls };
    saveState(target, state);
  }
  const { auditTarget, stop } = await openTarget(target, { otherUrls });
  const log = quiet || a.json ? () => {} : (m) => process.stderr.write(c.dim(`  · ${m}\n`));
  let result;
  try {
    result = await runAudit(auditTarget, facts, { maxPages: Number(a.max) || 25, external: !a['no-external'], psi: Boolean(a.psi), lab: Boolean(a.lab), psiKey: a['psi-key'], only: list(a.only), skip: list(a.skip), log });
  } finally {
    await stop();
  }
  result.factSources = sources;
  let saved = null;
  if (!a['no-save']) {
    const prev = state.audits.filter((x) => x.url === result.target.url && x.local === result.target.local).at(-1);
    const r = recordAudit(target, state, result);
    saveState(target, r.state);
    saved = { dir: r.dir, prev };
  }
  return { result, saved, facts };
}

function printCompare(target, saved, result) {
  if (!saved || !saved.prev) return console.log(c.dim('No earlier run of this address to compare with.'));
  const before = loadAudit(target, saved.prev.id);
  if (!before) return;
  const d = compareAudits(before, result);
  console.log(`${c.bold('Since')} ${saved.prev.id}: ${d.scoreBefore} → ${d.scoreAfter}`);
  for (const f of d.fixed.filter((x) => x.severity !== 'info')) console.log(`  ${c.green('fixed')} ${f.message}`);
  for (const f of d.added.filter((x) => x.severity !== 'info')) console.log(`  ${c.red('new')}   ${f.message}`);
  for (const f of d.unchecked.filter((x) => x.severity !== 'info')) console.log(`  ${c.dim('not checked this run')} ${f.message}`);
}

// reference/checks.md is this output: `seo.mjs checks --md > reference/checks.md`.
function checksMarkdown() {
  const out = ['# The checks', '', `Generated by \`seo.mjs checks --md\` from \`scripts/lib/checks/\` (${CHECKS.length} checks). \`gate\` = part of the launch gate: a fail there blocks \`seo.mjs test --gate\`.`, '', 'Severity: **fail** keeps a page out of search or misleads people; **warn** costs ranking or clicks; **info** is polish. Who acts: HAND (default), the owner, or at the domain move; set per finding.'];
  for (const cat of [...new Set([...Object.keys(WEIGHTS), ...CHECKS.map((ch) => ch.category)])].filter((x) => CHECKS.some((ch) => ch.category === x))) {
    out.push('', `## ${cat}`, '', '| Check | What it asks | Gate |', '|---|---|---|');
    for (const ch of CHECKS.filter((x) => x.category === cat)) out.push(`| \`${ch.id}\` | ${ch.title} | ${ch.gate ? 'yes' : ''} |`);
  }
  return `${out.join('\n')}\n`;
}

// ── commands ────────────────────────────────────────────────────────────
const commands = {
  async menu() {
    if (a.json || !process.stdin.isTTY) return console.log(JSON.stringify(menuData(), null, 2));
    return interactiveMenu();
  },

  async plan() {
    for (const line of planFor({ client: a.client, stage: a.stage, owner: a.owner, depth: a.depth })) console.log(line);
  },

  async audit() {
    const { target, state } = await prepare();
    const { result, saved } = await doAudit(target, state);
    if (a.json) return console.log(JSON.stringify(result, null, 2));
    console.log(terminalReport(result, { verbose: Boolean(a.verbose) }));
    if (a.compare) printCompare(target, saved, result);
    if (saved) ok(`saved ${rel(saved.dir)}/ (audit.json, report.md, report.html)`);
    if (command === 'test' && a.gate && !result.score.gate.pass) {
      console.error(c.red(`launch gate blocked by ${plural(result.score.gate.blocking.length, 'fault')}`));
      process.exit(1);
    }
  },

  async test() {
    return commands.audit();
  },

  async baseline() {
    const { target, state } = await prepare();
    const { result, saved } = await doAudit(target, state, { quiet: true });
    const byId = new Map();
    for (const f of result.findings) byId.set(f.id, [...(byId.get(f.id) || []), f]);
    const skipped = new Set(result.skipped.map((s) => s.id));
    console.log(`\n${c.bold('Baseline')} ${result.target.url}  ${result.score.total}/100 (${result.score.band})\n`);
    let done = 0;
    for (const b of BASELINE) {
      const hits = b.checks.flatMap((id) => byId.get(id) || []).filter((f) => f.severity !== 'info');
      const hand = hits.filter((f) => f.who === 'hand');
      const ownerOnly = hits.length && !hand.length;
      const mark = !hits.length ? c.green('✓') : ownerOnly ? c.yellow('…') : c.red('✗');
      if (!hits.length) done++;
      const untested = b.checks.filter((id) => skipped.has(id));
      console.log(`  ${mark} ${b.item}${untested.length === b.checks.length ? c.dim(' (not testable here)') : ''}`);
      for (const f of hits.slice(0, 4)) console.log(c.dim(`      ${f.who === 'hand' ? '' : `[${f.who}] `}${f.message}`));
    }
    const handOpen = result.findings.filter((f) => f.who === 'hand' && f.severity === 'fail').length;
    const status = handOpen === 0 && result.score.gate.blocking.every((x) => x.who !== 'hand') ? 'done' : 'in-progress';
    saveState(target, { ...loadState(target), stages: { ...loadState(target).stages, baseline: { status, at: result.finishedAt, score: result.score.total } } });
    console.log(`\n${done}/${BASELINE.length} items clean. Baseline: ${status === 'done' ? c.green('done (nothing left for HAND; owner items may remain)') : c.yellow('in progress')}`);
    if (saved) ok(`saved ${rel(saved.dir)}/`);
  },

  async google() {
    const { target, state } = await prepare();
    let items = { ...state.stages.google.items };
    for (const k of list(a.done) || []) {
      if (!GOOGLE_STEPS[k]) die(`unknown item "${k}" (one of ${GOOGLE_ITEMS.map((i) => i.key).join(', ')})`);
      items[k] = 'done';
    }
    for (const k of list(a.todo) || []) items[k] = 'todo';
    if (a.done || a.todo) saveState(target, { ...state, stages: { ...state.stages, google: { items } } });
    console.log(`\n${c.bold('Google setup')} ${target.slug || target.host}\n`);
    for (const i of GOOGLE_ITEMS) {
      const isDone = items[i.key] === 'done';
      console.log(`${isDone ? c.green('✓') : '○'} ${c.bold(i.label)} ${c.dim(`(${i.key})`)}`);
      if (isDone && !a.verbose) continue;
      console.log(c.dim(`  ${GOOGLE_STEPS[i.key].why}`));
      GOOGLE_STEPS[i.key].owner.forEach((s, n) => console.log(`  ${n + 1}. ${s.replace(/\*\*(.+?)\*\*/g, (m, x) => c.bold(x))}`));
      for (const s of GOOGLE_STEPS[i.key].hand) console.log(c.dim(`  HAND: ${s}`));
      console.log('');
    }
    console.log(c.dim(`Tick an item: ${SCRIPT} google ${input} --done=search-console`));
  },

  async cutover() {
    const { target } = await prepare();
    const domain = a.domain && a.domain !== true ? a.domain : null;
    console.log(`\n${c.bold('Domain move')} ${target.url} → ${domain ? `https://${domain}/` : '<the owner\'s domain>'}\n`);
    CUTOVER_STEPS.forEach((s, n) => console.log(`  ${n + 1}. ${c.dim(`[${s.who}]`)} ${s.step.replace(/<slug>/g, target.slug || input)}`));
    console.log(c.dim('\nNothing above runs automatically. DNS and deploys need the operator\'s go-ahead (see SKILL.md, Phase 6).'));
  },

  async standup() {
    const { target, state } = await prepare();
    const { facts } = await gatherFacts(target, state);
    const ids = auditDirs(target);
    const live = state.audits.filter((x) => !x.local).at(-1);
    const audit = live ? loadAudit(target, live.id) : ids.length ? loadAudit(target, ids.at(-1)) : null;
    const files = buildStandup({ target, state, facts, audit, when: a.when && a.when !== true ? a.when : null, tz: a.tz && a.tz !== true ? a.tz : 'America/Chicago', channel: a.channel && a.channel !== true ? a.channel : null });
    const { dir, written } = writeStandup(target, files);
    saveState(target, { ...state, standup: { ...(state.standup || {}), when: a.when || null, tz: a.tz || 'America/Chicago', preparedAt: new Date().toISOString(), minutes: files.minutes } });
    ok(`standup written to ${rel(dir)}/ (${written.map((w) => w.split('/').pop()).join(', ')}), about ${files.minutes} minutes`);
    if (!a.when) console.log(c.dim('No --when yet: the invite is not written until a time is set.'));
    console.log(c.dim('Nothing was sent. Publish owner.html as a private page for the operator to share, and send message.md yourself.'));
  },

  async report() {
    const { target } = await prepare();
    const ids = auditDirs(target);
    if (!ids.length) die('no audits yet');
    const id = a.id && a.id !== true ? a.id : ids.at(-1);
    const result = loadAudit(target, id);
    if (!result) die(`no audit ${id}`);
    const format = a.format || 'text';
    if (format === 'json') return console.log(JSON.stringify(result, null, 2));
    if (format === 'md') return console.log(markdownReport(result));
    if (format === 'html') return console.log(join(seoDir(target), 'audits', id, 'report.html'));
    console.log(terminalReport(result, { verbose: Boolean(a.verbose) }));
  },

  async facts() {
    const { target, state } = await prepare();
    const [, , verb, ...rest] = a._;
    let saved = { ...(state.facts || {}) };
    if (verb === 'set') for (const pair of rest) {
      const [k, v] = parseFact(pair);
      saved[k] = v;
    }
    if (verb === 'unset') for (const k of rest) delete saved[k];
    if (verb) saveState(target, { ...state, facts: saved });
    const { facts, sources } = await gatherFacts(target, { ...state, facts: saved });
    console.log(`\n${c.bold('Facts')} ${target.slug || target.host}`);
    for (const k of ['name', 'phone', 'email', 'locality', 'region', 'areaServed', 'serviceMode', 'bookingUrl', 'business', 'medical']) {
      const v = facts[k];
      console.log(`  ${k.padEnd(12)} ${v == null ? c.dim('unknown') : Array.isArray(v) ? v.join('; ') : v}${v == null ? '' : c.dim(`  (${sources[k]})`)}`);
    }
    console.log(c.dim(`\nRecord only what the owner confirmed: ${SCRIPT} facts ${input} set phone="+1 512 …"`));
  },

  async status() {
    const { target, state } = await prepare();
    console.log(`\n${c.bold(target.slug || target.host)}  ${target.url}`);
    console.log(`  baseline: ${state.stages.baseline.status}${state.stages.baseline.score != null ? ` (${state.stages.baseline.score}/100)` : ''}`);
    const g = state.stages.google.items;
    console.log(`  google:   ${GOOGLE_ITEMS.map((i) => `${g[i.key] === 'done' ? '✓' : '○'} ${i.key}`).join('  ')}`);
    console.log(`  standup:  ${state.standup && state.standup.preparedAt ? `prepared ${state.standup.preparedAt.slice(0, 10)}${state.standup.when ? ` for ${state.standup.when} ${state.standup.tz}` : ''}` : 'not prepared'}`);
    console.log(`  facts on record: ${Object.keys(state.facts || {}).join(', ') || 'none'}`);
    if (state.otherUrls && state.otherUrls.length) console.log(`  other addresses: ${state.otherUrls.join(', ')}`);
    console.log(`\n  ${c.bold('Audits')}`);
    for (const x of state.audits.slice(-8)) console.log(`  ${x.id}  ${String(x.score).padStart(3)} ${x.band}  gate ${x.gate ? 'pass' : 'BLOCKED'}  ${x.fail}f ${x.warn}w ${x.info}i  ${x.local ? c.dim('local') : ''}${x.psi ? c.dim(' psi') : ''}${x.lab ? c.dim(' lab') : ''}`);
    if (!state.audits.length) console.log(c.dim('  none yet'));
  },

  async checks() {
    if (a.md) return console.log(checksMarkdown());
    for (const ch of CHECKS) console.log(`${ch.id.padEnd(26)} ${ch.category.padEnd(16)} ${ch.gate ? 'gate ' : '     '}${ch.title}`);
  },
};

if (!command || command === 'help' || a.help) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1).filter((l, i, all) => all.slice(0, i + 1).every((x) => x.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
if (!commands[command]) die(`unknown command "${command}" (run with no arguments for help)`);
try {
  await commands[command]();
} catch (err) {
  die(err.message);
}
