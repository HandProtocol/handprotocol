// End to end: serve the two fixture sites locally, audit them as if they
// were live at https://good.test and https://bad.test, and check what the
// audit says. The good site must raise no fail; the bad one must raise the
// faults it was built with.
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDir } from '../lib/serve.mjs';
import { runAudit } from '../lib/audit.mjs';
import { CHECKS } from '../lib/checks/index.mjs';
import { scoreAudit } from '../lib/score.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

async function auditFixture(name, facts = {}) {
  const server = await serveDir(join(FIXTURES, name));
  try {
    return await runAudit({ url: `https://${name}.test/`, rewrite: { from: `https://${name}.test`, to: server.origin } }, facts, { external: false });
  } finally {
    await server.close();
  }
}

const ids = (r, severity) => new Set(r.findings.filter((f) => !severity || f.severity === severity).map((f) => f.id));

describe('good fixture', () => {
  let r;
  before(async () => {
    r = await auditFixture('good', { name: 'Good Test Studio', phone: '+1 512 867 3309', locality: 'Austin' });
  });

  test('raises no fail and passes the gate', () => {
    assert.deepEqual(r.findings.filter((f) => f.severity === 'fail').map((f) => `${f.id}: ${f.message}`), []);
    assert.equal(r.score.gate.pass, true);
    assert.ok(r.score.total >= 90, `score ${r.score.total}`);
  });

  test('crawls both pages from the link and the sitemap', () => {
    const urls = r.pages.map((p) => p.url).sort();
    assert.deepEqual(urls, ['https://good.test/', 'https://good.test/about']);
    assert.ok(r.pages.every((p) => p.inSitemap && p.indexable));
  });

  test('no check crashed', () => {
    assert.deepEqual(r.findings.filter((f) => f.crashed).map((f) => `${f.id}: ${f.message}`), []);
  });

  test('local builds skip the checks that need the real host', () => {
    const skipped = new Set(r.skipped.map((s) => s.id));
    for (const id of ['https-redirect', 'host-twin', 'compression', 'security-headers', 'psi-scores', 'lab-mobile']) assert.ok(skipped.has(id), id);
  });

  test('the result is plain JSON', () => {
    const copy = JSON.parse(JSON.stringify(r));
    assert.equal(copy.findings.length, r.findings.length);
  });
});

describe('bad fixture', () => {
  let r;
  before(async () => {
    r = await auditFixture('bad');
  });

  test('raises the faults it was built with', () => {
    const fails = ids(r, 'fail');
    for (const id of ['noindex', 'canonical-valid', 'head-broken', 'title-present', 'jsonld-parse', 'placeholder-text', 'demo-leftovers', 'sitemap-urls', 'page-status', 'links-broken-internal', 'img-broken', 'viewport', 'links-contact-format', 'og-image']) {
      assert.ok(fails.has(id), `expected a fail from ${id}`);
    }
    const any = ids(r);
    for (const id of ['robots-txt-blocks-pages', 'robots-txt-sitemap-line', 'robots-txt-valid', 'links-fragments', 'links-crawlable', 'img-alt', 'img-lcp', 'lang', 'unfinished-copy', 'local-area', 'copyright-year']) {
      assert.ok(any.has(id), `expected a finding from ${id}`);
    }
  });

  test('fails the gate and lands in the F band', () => {
    assert.equal(r.score.gate.pass, false);
    assert.ok(r.score.gate.blocking.some((b) => b.id === 'noindex'));
    assert.equal(r.score.band, 'F');
  });

  test('a noscript image in the head is not mistaken for the hero', () => {
    const lcp = r.findings.find((f) => f.id === 'img-lcp');
    assert.match(lcp.message, /lazy-loaded \(\/img\/portrait\.png\)/);
  });

  test('owner-only gaps are marked for the owner', () => {
    const owner = r.findings.filter((f) => f.who === 'owner').map((f) => f.id);
    assert.ok(owner.includes('local-area'));
    assert.ok(owner.includes('unfinished-copy'));
  });

  test('findings come sorted fail, warn, info', () => {
    const rank = { fail: 0, warn: 1, info: 2 };
    const seq = r.findings.map((f) => rank[f.severity]);
    assert.deepEqual(seq, [...seq].sort((a, b) => a - b));
  });
});

describe('registry and score', () => {
  test('every check has a unique id and a known category', () => {
    assert.equal(new Set(CHECKS.map((c) => c.id)).size, CHECKS.length);
    assert.equal(CHECKS.length, 86);
  });

  test('repeat findings from one check cost less than distinct ones', () => {
    const f = (id, severity) => ({ id, category: 'on-page', severity });
    const one = scoreAudit({ findings: [f('a', 'fail'), f('a', 'fail'), f('a', 'fail'), f('a', 'fail'), f('a', 'fail')], passed: [], skipped: [] });
    assert.equal(one.byCategory['on-page'].score, 100 - 25 - 15);
    const two = scoreAudit({ findings: [f('a', 'warn'), f('b', 'warn')], passed: [], skipped: [] });
    assert.equal(two.byCategory['on-page'].score, 84);
  });

  test('categories that never ran do not count', () => {
    const s = scoreAudit({ findings: [], passed: [{ id: 'x', category: 'links' }], skipped: [] });
    assert.deepEqual(Object.keys(s.byCategory), ['links']);
    assert.equal(s.total, 100);
  });
});

