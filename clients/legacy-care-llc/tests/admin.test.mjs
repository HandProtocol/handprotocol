import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../netlify/functions/lib/config.mjs';
import { adminTheme, adminThemeVars, isDark, mix, siteThemeVars } from '../netlify/functions/lib/theme.mjs';
import { renderAdminPage } from '../netlify/functions/lib/admin-page.mjs';

test('the admin page is server-rendered with the site name, logo, theme block and versioned assets', () => {
  const html = renderAdminPage();
  assert.ok(html.includes(`<title>${config.name} · Editor</title>`));
  assert.match(html, /<style id="theme">:root\{--/);
  assert.ok(html.includes(`admin.css?v=${config.assetVersion}`));
  assert.ok(html.includes(`admin.js?v=${config.assetVersion}`));
  assert.ok(html.includes(config.logo.slice(0, 40)));
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.equal(html.includes('${'), false);
});

test('admin tokens: pack palette wins, gaps are derived, feel defaults apply, theme.admin overrides', () => {
  const t = adminTheme();
  assert.equal(t.bg, config.theme.bg);
  assert.equal(t.accent, config.theme.accent);
  for (const k of ['bg-2', 'bg-3', 'bg-4', 'ink-2', 'ink-3', 'accent-2', 'accent-3', 'accent-deep', 'on-accent', 'ok', 'bad', 'sheen']) assert.match(String(t[k]), /^#[0-9a-f]{6}$/i, k);
  for (const k of ['r', 'r-lg', 'r-btn', 'r-pill', 'label-transform', 'label-spacing', 'display-weight', 'btn-weight', 'btn-primary-bg']) assert.ok(t[k], k);
  for (const [k, v] of Object.entries(config.theme.admin || {})) assert.equal(t[k], v, k);
  assert.equal(t['color-scheme'], isDark(config.theme.bg) ? 'dark' : 'light');
  const vars = adminThemeVars();
  assert.match(vars, /--bg-2-rgb:\d+ \d+ \d+/);
  assert.match(vars, /--font-display:/);
  assert.equal(vars.includes('--admin:'), false);
});

test('site tokens never include the admin feel object', () => {
  assert.equal(siteThemeVars().includes('[object'), false);
  assert.equal(siteThemeVars().includes('--admin'), false);
});

test('mix + isDark behave', () => {
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(isDark('#082625'), true);
  assert.equal(isDark('#f4f5f0'), false);
});
