// Where a client's SEO work is remembered: clients/<slug>/seo/
//   state.json        facts the owner confirmed, other addresses, stage progress, audit index
//   audits/<stamp>/   audit.json, report.md, report.html for each run
//   standup/          the agenda, owner page, invite and message for a session
// A target with no client folder (a bare URL) keeps its history under the
// skill's own .runs/ folder, keyed by host.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENTS, SKILL_DIR, nowIso, readJson, stamp, writeFileEnsured, writeJson } from './util.mjs';
import { htmlReport, markdownReport } from './report.mjs';

export const GOOGLE_ITEMS = [
  { key: 'search-console', label: 'Google Search Console: property verified, sitemap submitted' },
  { key: 'business-profile', label: 'Google Business Profile: created or claimed, verified' },
  { key: 'review-link', label: 'Review link: copied from the Business Profile, on the site' },
  { key: 'bing', label: 'Bing Webmaster Tools: imported from Search Console' },
  { key: 'analytics', label: 'Analytics: chosen and installed (or decided against)' },
];

export function seoDir(target) {
  if (target.clientDir) return join(target.clientDir, 'seo');
  return join(SKILL_DIR, '.runs', (target.host || 'unknown').replace(/[^a-z0-9.-]/gi, '_'));
}

const blank = (target) => ({
  slug: target.slug || null,
  createdAt: nowIso(),
  facts: {},
  otherUrls: [],
  stages: { baseline: { status: 'todo' }, google: { items: Object.fromEntries(GOOGLE_ITEMS.map((i) => [i.key, 'todo'])) }, cutover: { status: 'todo' } },
  audits: [],
});

export function loadState(target) {
  const saved = readJson(join(seoDir(target), 'state.json'));
  const base = blank(target);
  if (!saved) return base;
  return { ...base, ...saved, stages: { ...base.stages, ...saved.stages, google: { items: { ...base.stages.google.items, ...(saved.stages?.google?.items || {}) } } } };
}

export function saveState(target, state) {
  return writeJson(join(seoDir(target), 'state.json'), { ...state, updatedAt: nowIso() });
}

// Writes the run's files and returns the new state (the audit index gains a
// row). The caller saves the state.
export function recordAudit(target, state, result) {
  const id = stamp(new Date(result.finishedAt));
  const dir = join(seoDir(target), 'audits', id);
  writeJson(join(dir, 'audit.json'), result);
  writeFileEnsured(join(dir, 'report.md'), markdownReport(result));
  writeFileEnsured(join(dir, 'report.html'), htmlReport(result));
  const n = (s) => result.findings.filter((f) => f.severity === s).length;
  const row = { id, url: result.target.url, local: result.target.local, score: result.score.total, band: result.score.band, gate: result.score.gate.pass, fail: n('fail'), warn: n('warn'), info: n('info'), psi: result.options.psi, lab: result.options.lab };
  return { dir, state: { ...state, audits: [...state.audits, row] } };
}

export function auditDirs(target) {
  const root = join(seoDir(target), 'audits');
  return existsSync(root) ? readdirSync(root).sort() : [];
}

export function loadAudit(target, id) {
  return readJson(join(seoDir(target), 'audits', id, 'audit.json'));
}

// What changed between two runs, by finding identity (check id + page +
// message, with the JSON path in structured-data messages ignored). A
// finding whose check did not run this time is "unchecked", never "fixed".
export function compareAudits(before, after) {
  const key = (f) => `${f.id}|${f.url || ''}|${f.message.replace(/ at (@graph|\$)[^:]*:/, ':').replace(/^[A-Za-z+]+(?=: )/, '')}`;
  const was = new Map(before.findings.map((f) => [key(f), f]));
  const now = new Map(after.findings.map((f) => [key(f), f]));
  const notRun = new Set((after.skipped || []).map((s) => s.id));
  const gone = [...was].filter(([k]) => !now.has(k)).map(([, f]) => f);
  return {
    scoreBefore: before.score.total,
    scoreAfter: after.score.total,
    fixed: gone.filter((f) => !notRun.has(f.id)),
    unchecked: gone.filter((f) => notRun.has(f.id)),
    added: [...now].filter(([k]) => !was.has(k)).map(([, f]) => f),
  };
}

export { CLIENTS };
