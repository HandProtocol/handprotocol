// One number per category and one for the site, plus the launch gate.
// Every category starts at 100. A fail costs 25 (+5 for each extra finding
// from the same check, at most +15); a warn costs 8 (+2 each, at most +6);
// info costs nothing. The total is the weighted mean of the categories that
// ran. The gate passes when no `gate` check has a fail.
export const WEIGHTS = {
  crawlability: 15,
  indexability: 20,
  'on-page': 15,
  'structured-data': 10,
  social: 5,
  links: 8,
  images: 7,
  performance: 10,
  mobile: 4,
  security: 3,
  local: 10,
  i18n: 1,
  content: 2,
};

const COST = {
  fail: { base: 25, extra: 5, cap: 15 },
  warn: { base: 8, extra: 2, cap: 6 },
};

export function band(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function scoreAudit({ findings, passed, skipped }) {
  const ran = new Set([...passed.map((p) => p.category), ...findings.filter((f) => !f.crashed).map((f) => f.category)]);
  const byCategory = {};
  for (const cat of Object.keys(WEIGHTS)) {
    if (!ran.has(cat)) continue;
    const counts = new Map(); // `${id}|${severity}` → n
    for (const f of findings) {
      if (f.category !== cat || !COST[f.severity] || f.crashed) continue;
      const key = `${f.id}|${f.severity}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let lost = 0;
    for (const [key, n] of counts) {
      const c = COST[key.split('|')[1]];
      lost += c.base + Math.min(c.cap, (n - 1) * c.extra);
    }
    const count = (sev) => findings.filter((f) => f.category === cat && f.severity === sev).length;
    byCategory[cat] = { score: Math.max(0, 100 - lost), fails: count('fail'), warns: count('warn'), infos: count('info') };
  }
  const cats = Object.keys(byCategory);
  const weight = cats.reduce((s, k) => s + WEIGHTS[k], 0);
  const total = weight ? Math.round(cats.reduce((s, k) => s + byCategory[k].score * WEIGHTS[k], 0) / weight) : 0;
  const blocking = findings.filter((f) => f.gate && f.severity === 'fail').map((f) => ({ id: f.id, message: f.message, url: f.url || null, who: f.who }));
  return { total, band: band(total), byCategory, gate: { pass: blocking.length === 0, blocking }, skippedCount: skipped.length };
}
