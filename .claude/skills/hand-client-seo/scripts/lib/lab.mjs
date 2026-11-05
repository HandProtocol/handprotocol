// The browser lab: open the page in real Chromium at phone and desktop size
// and record what only a browser can see: sideways scrolling, tap targets,
// tiny text, script errors, failed requests, and whether the main content
// is in the HTML or only appears after JavaScript runs.
//
// Playwright is borrowed from the gstack skill (no install of our own). On
// this machine the Chromium sandbox does not start, so it runs without it.
// → { mobile: {...}, desktop: {...} } or { error }.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SIZES = { mobile: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }, desktop: { width: 1440, height: 900 } };
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export async function findPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, join(homedir(), '.claude', 'skills', 'gstack', 'node_modules', 'playwright', 'index.mjs')].filter(Boolean);
  const npx = join(homedir(), '.npm', '_npx');
  if (existsSync(npx)) for (const d of readdirSync(npx)) candidates.push(join(npx, d, 'node_modules', 'playwright', 'index.mjs'));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      return await import(pathToFileURL(path).href);
    } catch {
      // try the next one
    }
  }
  return null;
}

// Runs inside the page.
function measure() {
  const vw = window.innerWidth;
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}`;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
  };
  const overflow = Math.max(0, document.documentElement.scrollWidth - vw);
  const culprits = [];
  if (overflow > 2) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 && r.width > 0 && visible(el) && !el.closest('[aria-hidden="true"]')) {
        const parentSticks = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 2;
        if (!parentSticks || el.parentElement === document.body) culprits.push(`${describe(el)} (${Math.round(r.right - vw)}px)`);
      }
      if (culprits.length >= 5) break;
    }
  }
  const small = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, [role=button]')) {
    if (!visible(el) || el.closest('p, li p, td')) continue; // links inside running text are exempt
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.right <= 0) continue; // parked off screen (a skip link)
    if (r.width < 44 || r.height < 44) small.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  let tiny = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
    if (own && visible(el) && parseFloat(getComputedStyle(el).fontSize) < 12) tiny++;
  }
  const h1 = document.querySelector('h1');
  return { overflow, overflowCulprits: culprits, smallTapTargets: small.length, smallTapExamples: small.slice(0, 5), tinyText: tiny, h1: h1 ? h1.textContent.trim() : '', textLength: document.body.innerText.trim().length };
}

async function visit(browser, url, size, { js = true } = {}) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: Boolean(size.isMobile), hasTouch: Boolean(size.hasTouch), deviceScaleFactor: size.deviceScaleFactor || 1, userAgent: size.isMobile ? PHONE_UA : undefined, javaScriptEnabled: js });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} (${r.failure()?.errorText || 'failed'})`));
  page.on('response', (r) => r.status() >= 400 && failedRequests.push(`${r.url()} → ${r.status()}`));
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
    await page.waitForTimeout(800);
    const m = await page.evaluate(measure);
    return { ...m, errors: [...new Set(errors)], failedRequests: [...new Set(failedRequests)] };
  } finally {
    await context.close();
  }
}

export async function runLab(url) {
  const pw = await findPlaywright();
  if (!pw) return { error: 'Playwright not found (expected under ~/.claude/skills/gstack/node_modules)' };
  let browser;
  try {
    browser = await pw.chromium.launch({ chromiumSandbox: false, args: ['--no-sandbox'] });
  } catch (err) {
    return { error: `Chromium did not start: ${String(err.message).split('\n')[0]}` };
  }
  try {
    const mobile = await visit(browser, url, SIZES.mobile);
    const desktop = await visit(browser, url, SIZES.desktop);
    const raw = await visit(browser, url, SIZES.mobile, { js: false });
    // The main heading (or, without one, most of the text) must be there
    // before any script runs.
    mobile.contentInHtml = mobile.h1 ? raw.h1 === mobile.h1 : raw.textLength >= mobile.textLength * 0.5;
    return { mobile, desktop: { errors: desktop.errors, failedRequests: desktop.failedRequests, overflow: desktop.overflow } };
  } catch (err) {
    return { error: String(err.message).split('\n')[0] };
  } finally {
    await browser.close();
  }
}
