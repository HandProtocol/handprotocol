// Turns an audit result into something to read: a terminal summary, a
// Markdown report, a standalone HTML page. Findings are grouped by who has
// to act: HAND now, the owner, or at the domain cutover.
import { WEIGHTS } from './score.mjs';
import { c, clip, escapeHtml, plural } from './util.mjs';

export const WHO = [
  { key: 'hand', label: 'HAND can fix now' },
  { key: 'owner', label: 'Needs the owner' },
  { key: 'cutover', label: 'At the domain move' },
];
const SEV = { fail: 'FAIL', warn: 'WARN', info: 'INFO' };

export function groupByWho(findings) {
  return WHO.map((w) => ({ ...w, items: findings.filter((f) => (f.who || 'hand') === w.key) })).filter((g) => g.items.length);
}

const shortUrl = (url, start) => {
  if (!url) return '';
  if (url === start) return 'home';
  try {
    const u = new URL(url);
    const s = new URL(start);
    return u.host === s.host ? u.pathname + u.search : url;
  } catch {
    return url;
  }
};

// Findings from one check on many pages fold into one line with a page list.
function fold(items) {
  const map = new Map();
  for (const f of items) {
    const key = `${f.id}|${f.severity}|${f.message}`;
    if (!map.has(key)) map.set(key, { ...f, urls: [] });
    if (f.url) map.get(key).urls.push(f.url);
  }
  return [...map.values()];
}

function counts(findings) {
  const n = (s) => findings.filter((f) => f.severity === s).length;
  return { fail: n('fail'), warn: n('warn'), info: n('info') };
}

export function terminalReport(r, { verbose = false } = {}) {
  const lines = [];
  const s = r.score;
  const k = counts(r.findings);
  const color = s.total >= 90 ? c.green : s.total >= 70 ? c.yellow : c.red;
  lines.push('');
  lines.push(`${c.bold('SEO audit')}  ${r.target.url}${r.target.local ? c.dim(' (local build)') : ''}`);
  lines.push(`${color(c.bold(`${s.total}/100 (${s.band})`))}   ${s.gate.pass ? c.green('launch gate: pass') : c.red(`launch gate: BLOCKED (${s.gate.blocking.length})`)}   ${c.red(`${k.fail} fail`)} · ${c.yellow(`${k.warn} warn`)} · ${c.dim(`${k.info} info`)} · ${r.passed.length} passed · ${r.skipped.length} skipped`);
  lines.push(c.dim(Object.entries(s.byCategory).map(([cat, v]) => `${cat} ${v.score}`).join('  ')));
  for (const g of groupByWho(r.findings)) {
    const shown = fold(g.items).filter((f) => verbose || f.severity !== 'info');
    if (!shown.length) continue;
    lines.push('');
    lines.push(c.bold(`${g.label} (${shown.length})`));
    for (const f of shown) {
      const tag = f.severity === 'fail' ? c.red(SEV.fail) : f.severity === 'warn' ? c.yellow(SEV.warn) : c.dim(SEV.info);
      const where = f.urls.length ? c.dim(` [${f.urls.map((u) => shortUrl(u, r.target.url)).slice(0, 3).join(', ')}${f.urls.length > 3 ? ' …' : ''}]`) : '';
      lines.push(`  ${tag} ${f.gate && f.severity === 'fail' ? c.red('⛔ ') : ''}${f.message}${where}`);
      if (f.fix) lines.push(c.dim(`       → ${f.fix}`));
    }
  }
  const infos = r.findings.filter((f) => f.severity === 'info').length;
  if (!verbose && infos) lines.push('', c.dim(`${plural(infos, 'info note')} hidden (--verbose shows them).`));
  lines.push('');
  return lines.join('\n');
}

export function markdownReport(r) {
  const s = r.score;
  const k = counts(r.findings);
  const out = [];
  out.push(`# SEO audit: ${r.target.label || r.target.url}`);
  out.push('');
  out.push(`- **Address:** ${r.target.url}${r.target.local ? ' (local build)' : ''}`);
  out.push(`- **Run:** ${r.finishedAt.slice(0, 16).replace('T', ' ')} UTC, ${plural(r.pages.length, 'page')} crawled, hand-client-seo ${r.version}`);
  out.push(`- **Score:** ${s.total}/100 (${s.band})`);
  out.push(`- **Launch gate:** ${s.gate.pass ? 'pass' : `blocked by ${plural(s.gate.blocking.length, 'fault')}`}`);
  out.push(`- **Findings:** ${k.fail} fail, ${k.warn} warn, ${k.info} info; ${r.passed.length} checks passed, ${r.skipped.length} skipped`);
  out.push('');
  out.push('| Area | Score | Fail | Warn | Info |');
  out.push('|---|---:|---:|---:|---:|');
  for (const cat of Object.keys(WEIGHTS)) {
    const v = s.byCategory[cat];
    if (v) out.push(`| ${cat} | ${v.score} | ${v.fails} | ${v.warns} | ${v.infos} |`);
  }
  for (const g of groupByWho(r.findings)) {
    out.push('', `## ${g.label}`, '');
    for (const f of fold(g.items)) {
      const where = f.urls.length ? ` (${f.urls.map((u) => shortUrl(u, r.target.url)).join(', ')})` : '';
      out.push(`- **${SEV[f.severity]}**${f.gate && f.severity === 'fail' ? ' (launch gate)' : ''} ${f.message}${where}`);
      if (f.evidence) out.push(`  - Evidence: ${clip(f.evidence, 300)}`);
      if (f.fix) out.push(`  - Fix: ${f.fix}`);
      if (f.engineFix) out.push(`  - Engine: ${f.engineFix}`);
    }
  }
  if (r.psi) {
    out.push('', '## PageSpeed', '');
    for (const [strategy, v] of Object.entries(r.psi)) {
      if (!v || v.error) out.push(`- ${strategy}: not available (${v ? v.error : 'no data'})`);
      else out.push(`- ${strategy} (${v.source === 'local' ? 'Lighthouse on this machine' : 'PageSpeed Insights'}): performance ${Math.round(v.scores.performance * 100)}, SEO ${Math.round(v.scores.seo * 100)}, accessibility ${Math.round(v.scores.accessibility * 100)}, best practices ${Math.round(v.scores['best-practices'] * 100)}; LCP ${(v.lab.lcp / 1000).toFixed(1)} s, CLS ${v.lab.cls.toFixed(2)}, TBT ${Math.round(v.lab.tbt)} ms`);
    }
  }
  out.push('', '## Pages', '', '| Page | Status | Indexable | Title | Words |', '|---|---|---|---|---:|');
  for (const p of r.pages) out.push(`| ${shortUrl(p.url, r.target.url)} | ${p.status} | ${p.indexable === undefined ? '' : p.indexable ? 'yes' : `no: ${(p.whyNot || []).join('; ')}`} | ${clip(p.title || '', 60).replace(/\|/g, '/')} | ${p.words ?? ''} |`);
  if (r.skipped.length) {
    out.push('', '## Not checked this run', '');
    for (const x of r.skipped) out.push(`- ${x.title}: ${x.reason}`);
  }
  out.push('');
  return out.join('\n');
}

export function htmlReport(r) {
  const s = r.score;
  const k = counts(r.findings);
  const e = escapeHtml;
  const groups = groupByWho(r.findings)
    .map(
      (g) => `<section><h2>${e(g.label)} <span class="n">${fold(g.items).length}</span></h2><ul>${fold(g.items)
        .map(
          (f) => `<li class="${f.severity}"><span class="sev">${SEV[f.severity]}</span>${f.gate && f.severity === 'fail' ? '<span class="gate">launch gate</span>' : ''}<p>${e(f.message)}</p>${f.urls.length ? `<p class="where">${f.urls.map((u) => e(shortUrl(u, r.target.url))).join(', ')}</p>` : ''}${f.evidence ? `<p class="ev">${e(clip(f.evidence, 300))}</p>` : ''}${f.fix ? `<p class="fix">${e(f.fix)}</p>` : ''}</li>`,
        )
        .join('')}</ul></section>`,
    )
    .join('');
  const cats = Object.keys(WEIGHTS)
    .filter((cat) => s.byCategory[cat])
    .map((cat) => `<div class="cat"><span>${e(cat)}</span><b>${s.byCategory[cat].score}</b><i style="width:${s.byCategory[cat].score}%"></i></div>`)
    .join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>SEO audit: ${e(r.target.label || r.target.url)}</title>
<style>
:root{--bg:#f7f6f2;--ink:#1d1f1e;--ink2:#5b605d;--line:#dcdad2;--card:#fff;--fail:#b3261e;--warn:#8a5a00;--info:#55605b;--ok:#1f6b45}
@media (prefers-color-scheme:dark){:root{--bg:#121413;--ink:#ecebe3;--ink2:#a6aea9;--line:#2c302e;--card:#1a1d1c;--fail:#ff8a80;--warn:#f2c14e;--info:#a6aea9;--ok:#7fd1a4}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.1rem;margin:32px 0 8px}
.meta{color:var(--ink2);margin:0 0 20px;word-break:break-all}.score{display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}
.big{font-size:3rem;font-weight:700}.pass{color:var(--ok)}.block{color:var(--fail)}
.cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:16px 0}
.cat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px;position:relative;overflow:hidden;display:flex;justify-content:space-between}
.cat i{position:absolute;left:0;bottom:0;height:3px;background:var(--ok)}
ul{list-style:none;padding:0;margin:0}li{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--info);border-radius:8px;padding:10px 12px;margin:8px 0}
li.fail{border-left-color:var(--fail)}li.warn{border-left-color:var(--warn)}li p{margin:4px 0}
.sev{font-size:.75rem;font-weight:700;letter-spacing:.06em;margin-right:8px}.fail .sev{color:var(--fail)}.warn .sev{color:var(--warn)}.info .sev{color:var(--info)}
.gate{font-size:.75rem;border:1px solid var(--fail);color:var(--fail);border-radius:99px;padding:0 8px}
.where,.ev{color:var(--ink2);font-size:.9rem;word-break:break-all}.fix{font-size:.95rem}.fix::before{content:"Fix: ";font-weight:600}
.n{color:var(--ink2);font-weight:400}
</style></head><body><main>
<h1>SEO audit</h1>
<p class="meta">${e(r.target.url)} · ${e(r.finishedAt.slice(0, 16).replace('T', ' '))} UTC · ${plural(r.pages.length, 'page')}</p>
<div class="score"><span class="big">${s.total}</span><span>/100 (${s.band})</span><strong class="${s.gate.pass ? 'pass' : 'block'}">${s.gate.pass ? 'Launch gate: pass' : `Launch gate: blocked (${s.gate.blocking.length})`}</strong><span>${k.fail} fail · ${k.warn} warn · ${k.info} info</span></div>
<div class="cats">${cats}</div>
${groups || '<p>No findings.</p>'}
</main></body></html>
`;
}
