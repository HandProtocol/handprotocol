// Performance, mobile and security checks. The static ones read the HTML and
// headers; the PageSpeed and lab ones read measurements when the audit ran
// with --psi / --lab (they skip themselves otherwise).
import { bareHost, tryUrl } from '../util.mjs';
import { clip, fail, info, warn } from './kit.mjs';

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const secs = (ms) => `${(ms / 1000).toFixed(1)} s`;

export const checks = [
  {
    id: 'html-size',
    category: 'performance',
    title: 'the HTML is a reasonable size',
    page(ctx, a) {
      if (a.page.bytes > 400_000) return [warn(`the HTML alone is ${kb(a.page.bytes)}`, { fix: 'Move inline images, data and scripts into files; keep the document under 100 KB.' })];
      if (a.page.bytes > 150_000) return [info(`the HTML is ${kb(a.page.bytes)}`, { fix: 'Large inline SVG or JSON is the usual cause.' })];
      return [];
    },
  },
  {
    id: 'compression',
    category: 'performance',
    title: 'the page is served compressed',
    page({ crawl }, a) {
      if (crawl.local) return { skip: 'local build' };
      if (a.url !== crawl.start) return [];
      return a.page.headers['content-encoding'] || a.page.bytes < 1500 ? [] : [warn('the HTML is served without gzip or brotli compression', { fix: 'Turn on compression at the host (Netlify does it by default).' })];
    },
  },
  {
    id: 'response-time',
    category: 'performance',
    title: 'the server answers quickly',
    page({ crawl }, a) {
      if (crawl.local || a.url !== crawl.start) return [];
      if (a.page.ms > 2500) return [warn(`the page took ${secs(a.page.ms)} to download from this machine (one sample)`, { fix: 'Check caching: a server-rendered page should come from the CDN cache in well under a second.' })];
      if (a.page.ms > 1200) return [info(`the page took ${secs(a.page.ms)} to download from this machine (one sample)`, { fix: 'Run it again; a cold cache or a slow function start can explain one slow answer.' })];
      return [];
    },
  },
  {
    id: 'render-blocking',
    category: 'performance',
    title: 'nothing in <head> holds up the first paint needlessly',
    page(ctx, a) {
      const blocking = a.head.scripts.filter((s) => s.inHead && s.src && !s.async && !s.defer && s.type !== 'module' && !/json|importmap|template/.test(s.type));
      const sheets = a.head.rel('stylesheet').filter((l) => l.inHead && (!l.media || /^(all|screen)?$/i.test(l.media.trim())));
      const out = [];
      if (blocking.length) out.push((blocking.length > 1 ? warn : info)(`${blocking.length} script(s) in <head> block rendering: ${blocking.slice(0, 3).map((s) => clip(s.src, 50)).join(', ')}`, { fix: 'Add defer (or async), or move them to the end of <body>.' }));
      if (sheets.length > 4) out.push(info(`${sheets.length} stylesheets load before the first paint`, { fix: 'Combine them or load the non-critical ones later.' }));
      return out;
    },
  },
  {
    id: 'fonts',
    category: 'performance',
    title: 'web fonts load without hiding the text',
    page(ctx, a) {
      const google = a.head.rel('stylesheet').filter((l) => /fonts\.googleapis\.com/i.test(l.href || ''));
      if (!google.length) return [];
      const out = [];
      if (google.some((l) => !/[?&]display=(swap|optional|fallback)/i.test(l.href))) out.push(warn('a Google Fonts stylesheet has no display=swap: text stays invisible until the font arrives', { fix: 'Add &display=swap to the fonts URL.' }));
      if (!a.head.rel('preconnect').some((l) => /fonts\.gstatic\.com/i.test(l.href || ''))) out.push(info('no preconnect to fonts.gstatic.com', { fix: 'Add <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>.' }));
      const families = google.flatMap((l) => (l.href.match(/family=[^&]+/g) || []));
      if (families.length > 3) out.push(info(`${families.length} font families are requested`, { fix: 'Two families (one display, one body) is plenty; each one costs a download.' }));
      return out;
    },
  },
  {
    id: 'third-parties',
    category: 'performance',
    title: 'third-party scripts are kept in check',
    page({ crawl }, a) {
      const hosts = new Set();
      for (const s of a.head.scripts) {
        const abs = s.src ? tryUrl(s.src, a.base) : null;
        if (abs && bareHost(abs.host) !== bareHost(crawl.host)) hosts.add(abs.host);
      }
      return hosts.size >= 4 ? [info(`scripts load from ${hosts.size} other hosts: ${[...hosts].slice(0, 5).join(', ')}`, { fix: 'Each third-party script slows the page; keep only the ones the business uses.' })] : [];
    },
  },
  {
    id: 'mixed-content',
    category: 'security',
    title: 'an https page loads nothing over http',
    gate: true,
    page(ctx, a) {
      if (!/^https:/i.test(a.url)) return [];
      const insecure = [];
      for (const el of a.doc.all) {
        if (el.offPage) continue;
        const src = ['img', 'script', 'iframe', 'video', 'audio', 'source', 'embed'].includes(el.tag) ? el.attrs.src : el.tag === 'link' && /stylesheet|icon|preload/i.test(el.attrs.rel || '') ? el.attrs.href : null;
        if (src && /^http:\/\//i.test(src)) insecure.push(`<${el.tag}> ${clip(src, 60)}`);
      }
      return insecure.length ? [fail(`${insecure.length} resource(s) load over plain http:// on a secure page; browsers block them: ${insecure.slice(0, 3).join(', ')}`, { fix: 'Use https:// URLs.' })] : [];
    },
  },
  {
    id: 'security-headers',
    category: 'security',
    title: 'baseline security headers are present',
    site({ crawl, home }) {
      if (crawl.local) return { skip: 'local build' };
      if (!home) return { skip: 'the start page did not load' };
      const h = home.page.headers;
      const missing = [];
      if (!h['strict-transport-security']) missing.push('Strict-Transport-Security');
      if (!h['x-content-type-options']) missing.push('X-Content-Type-Options');
      if (!h['referrer-policy']) missing.push('Referrer-Policy');
      return missing.length ? [info(`missing response header(s): ${missing.join(', ')}`, { fix: 'Add them at the host (netlify.toml [[headers]]). Not a ranking factor; it is basic hygiene.' })] : [];
    },
  },
  {
    id: 'psi-scores',
    category: 'performance',
    title: 'PageSpeed Insights scores',
    site({ psi }) {
      if (!psi) return { skip: 'PageSpeed was not run (add --psi)' };
      const out = [];
      for (const [strategy, r] of Object.entries(psi)) {
        if (!r || r.error) {
          out.push(info(`PageSpeed (${strategy}) did not return a result: ${r ? r.error : 'no data'}`, {}));
          continue;
        }
        const pct = (v) => (v == null ? 'n/a' : Math.round(v * 100));
        const perf = r.scores.performance;
        if (perf != null && perf < 0.5) out.push(fail(`PageSpeed performance on ${strategy}: ${pct(perf)}/100`, { fix: 'See the slowest items below; images and render-blocking resources are the usual causes.' }));
        else if (perf != null && perf < 0.9) out.push(warn(`PageSpeed performance on ${strategy}: ${pct(perf)}/100`, { fix: 'Above 90 is the target.' }));
        if (r.scores.seo != null && r.scores.seo < 1) out.push(warn(`Lighthouse SEO on ${strategy}: ${pct(r.scores.seo)}/100; failing: ${r.failedSeoAudits.join(', ') || 'see the report'}`, { fix: 'Each failing audit names its own fix.' }));
        if (r.scores.accessibility != null && r.scores.accessibility < 0.9) out.push(info(`Lighthouse accessibility on ${strategy}: ${pct(r.scores.accessibility)}/100`, { fix: 'Contrast, labels and alt text are the common gaps.' }));
        if (r.scores['best-practices'] != null && r.scores['best-practices'] < 0.9) out.push(info(`Lighthouse best practices on ${strategy}: ${pct(r.scores['best-practices'])}/100`, {}));
      }
      return out;
    },
  },
  {
    id: 'web-vitals',
    category: 'performance',
    title: 'Core Web Vitals are in the good range',
    site({ psi }) {
      if (!psi) return { skip: 'PageSpeed was not run (add --psi)' };
      const out = [];
      for (const [strategy, r] of Object.entries(psi)) {
        if (!r || r.error) continue;
        const m = r.lab;
        if (m.lcp != null) {
          if (m.lcp > 4000) out.push(fail(`largest contentful paint on ${strategy} (lab): ${secs(m.lcp)}; good is 2.5 s or less`, { fix: 'Make the hero image smaller and load it first (fetchpriority="high", no lazy-loading).' }));
          else if (m.lcp > 2500) out.push(warn(`largest contentful paint on ${strategy} (lab): ${secs(m.lcp)}; good is 2.5 s or less`, { fix: 'Shrink or prioritize the hero image; cut render-blocking CSS and fonts.' }));
        }
        if (m.cls != null) {
          if (m.cls > 0.25) out.push(fail(`layout shift on ${strategy} (lab): ${m.cls.toFixed(2)}; good is 0.1 or less`, { fix: 'Give images and embeds a width and height; avoid inserting content above what is on screen.' }));
          else if (m.cls > 0.1) out.push(warn(`layout shift on ${strategy} (lab): ${m.cls.toFixed(2)}; good is 0.1 or less`, { fix: 'Reserve space for images, fonts and embeds.' }));
        }
        if (m.tbt != null && m.tbt > 600) out.push(warn(`main thread blocked for ${Math.round(m.tbt)} ms on ${strategy} (lab): the page will feel slow to respond`, { fix: 'Defer or remove heavy scripts.' }));
        const f = r.field;
        if (f) {
          for (const [name, label, good] of [['lcp', 'largest contentful paint', '2.5 s'], ['inp', 'interaction to next paint', '200 ms'], ['cls', 'layout shift', '0.1']]) {
            const v = f[name];
            if (!v) continue;
            if (v.category === 'SLOW') out.push(fail(`real visitors (${strategy}, ${f.scope}): ${label} is poor at the 75th percentile (${v.display}); good is ${good}`, { fix: 'This is field data from Chrome users over 28 days; it changes slowly after a fix.' }));
            else if (v.category === 'AVERAGE') out.push(warn(`real visitors (${strategy}, ${f.scope}): ${label} needs improvement (${v.display}); good is ${good}`, { fix: 'Field data from Chrome users over 28 days.' }));
          }
        }
      }
      return out;
    },
  },
  {
    id: 'lab-mobile',
    category: 'mobile',
    title: 'the page works at phone width',
    gate: true,
    site({ lab }) {
      if (!lab) return { skip: 'the browser lab was not run (add --lab)' };
      if (lab.error) return [info(`the browser lab could not run: ${lab.error}`, {})];
      const out = [];
      const m = lab.mobile;
      if (m) {
        if (m.overflow > 2) out.push(fail(`the page is ${m.overflow}px wider than a 390px phone screen: visitors must scroll sideways`, { evidence: m.overflowCulprits && m.overflowCulprits.length ? `widest: ${m.overflowCulprits.join(', ')}` : '', fix: 'Find the element that sticks out (a wide image, a long word, a fixed width) and let it shrink.' }));
        if (m.smallTapTargets > 0) out.push(info(`${m.smallTapTargets} link(s) or button(s) are smaller than 44px on a phone`, { evidence: (m.smallTapExamples || []).join(', '), fix: 'Give tap targets at least 44×44px.' }));
        if (m.tinyText > 0) out.push(info(`${m.tinyText} text block(s) render under 12px on a phone`, { fix: 'Keep body text at 16px.' }));
        if (!m.contentInHtml) out.push(warn('the main heading only appears after JavaScript runs: crawlers that do not render see an empty page', { fix: 'Render the content on the server.' }));
      }
      for (const [name, v] of Object.entries(lab)) {
        if (!v || typeof v !== 'object' || !('errors' in v)) continue;
        if (v.errors.length) out.push(warn(`${v.errors.length} JavaScript error(s) at ${name} width: ${clip(v.errors[0], 100)}`, { fix: 'Fix the script error; broken scripts can leave content hidden.' }));
        if (v.failedRequests.length) out.push(warn(`${v.failedRequests.length} request(s) failed at ${name} width: ${clip(v.failedRequests.slice(0, 3).join(', '), 140)}`, { fix: 'Fix or remove the missing files.' }));
      }
      return out;
    },
  },
];
