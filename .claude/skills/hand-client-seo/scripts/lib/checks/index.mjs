// The check registry and the loop that runs it. A site check runs once; a
// page check runs once per analyzed page. Each finding comes back stamped
// with the check's id, category, title and gate flag, a default `who`
// (hand) and, for page checks, a default `url` (the page).
import { checks as site } from './site.mjs';
import { checks as page } from './page.mjs';
import { checks as data } from './data.mjs';
import { checks as links } from './links.mjs';
import { checks as perf } from './perf.mjs';
import { checks as local } from './local.mjs';

export const CHECKS = [...site, ...page, ...data, ...links, ...perf, ...local];

export const CATEGORIES = ['crawlability', 'indexability', 'on-page', 'content', 'structured-data', 'social', 'links', 'images', 'performance', 'mobile', 'security', 'local', 'i18n'];

{
  const ids = new Set();
  for (const c of CHECKS) {
    if (ids.has(c.id)) throw new Error(`duplicate check id: ${c.id}`);
    if (!CATEGORIES.includes(c.category)) throw new Error(`check ${c.id} has an unknown category: ${c.category}`);
    if (!c.site === !c.page) throw new Error(`check ${c.id} must define exactly one of site() or page()`);
    ids.add(c.id);
  }
}

const isSkip = (r) => r && !Array.isArray(r) && typeof r === 'object' && 'skip' in r;

// → { findings[], passed[], skipped[] }. A check that throws becomes an
// info finding (category kept) so one bug never sinks a whole audit.
export async function runChecks(ctx, { only = null, skip = null } = {}) {
  const findings = [];
  const passed = [];
  const skipped = [];
  const stamp = (c, f, url) => ({ id: c.id, category: c.category, title: c.title, gate: Boolean(c.gate), who: 'hand', ...(url ? { url } : {}), ...f, severity: f.severity });
  for (const c of CHECKS) {
    if (only && !only.includes(c.id) && !only.includes(c.category)) continue;
    if (skip && (skip.includes(c.id) || skip.includes(c.category))) {
      skipped.push({ id: c.id, category: c.category, title: c.title, reason: 'excluded by option' });
      continue;
    }
    const mine = [];
    let skipReason = null;
    const crash = (err, url) => mine.push(stamp(c, { severity: 'info', message: `the check itself failed: ${err && err.message ? err.message : err}`, crashed: true }, url));
    if (c.site) {
      try {
        const r = await c.site(ctx);
        if (isSkip(r)) skipReason = r.skip;
        else for (const f of r || []) mine.push(stamp(c, f));
      } catch (err) {
        crash(err);
      }
    } else {
      const reasons = new Set();
      let ran = 0;
      for (const a of ctx.pages) {
        if (!a.doc) continue;
        try {
          const r = await c.page(ctx, a);
          if (isSkip(r)) {
            reasons.add(r.skip);
            continue;
          }
          ran++;
          for (const f of r || []) mine.push(stamp(c, f, a.url));
        } catch (err) {
          ran++;
          crash(err, a.url);
        }
      }
      if (!ran) skipReason = [...reasons][0] || 'no HTML pages to check';
    }
    if (skipReason && !mine.length) skipped.push({ id: c.id, category: c.category, title: c.title, reason: skipReason });
    else if (mine.length) findings.push(...mine);
    else passed.push({ id: c.id, category: c.category, title: c.title, gate: Boolean(c.gate) });
  }
  return { findings, passed, skipped };
}
