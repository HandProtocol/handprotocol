import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config, seedMedia } from '../netlify/functions/lib/config.mjs';
import { DEFAULT_CONTENT, ROUTES, sanitize } from '../netlify/functions/lib/site.mjs';
import { matchRoute, renderRoute } from '../netlify/functions/lib/render.mjs';
import render, { config as renderConfig } from '../netlify/functions/render.mjs';
import page from '../netlify/functions/page.mjs';
import { faviconLink } from '../netlify/functions/lib/html.mjs';

const ok = async () => ({ content: sanitize(DEFAULT_CONTENT), media: seedMedia(), source: 'defaults', updated_at: null, site: {} });
const down = async () => { throw new Error('ECONNREFUSED'); };
const req = (path) => new Request(`https://site.test${path}`);

test('routes: "/" always, trailing slashes tolerated, unknown paths null', () => {
  assert.equal(ROUTES[0], '/');
  assert.equal(matchRoute('/'), '/');
  assert.equal(matchRoute('/about', ['/', '/about']), '/about');
  assert.equal(matchRoute('/about/', ['/', '/about']), '/about');
  assert.equal(matchRoute('/nope', ['/', '/about']), null);
  assert.equal(matchRoute('/x/', ['/']), null);
});

test('/index.html is a 301 to / (query kept); render.mjs owns both paths, page.mjs has no custom path', async () => {
  const res = await renderRoute(req('/index.html?utm=x'), { load: ok });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), 'https://site.test/?utm=x');
  assert.deepEqual(renderConfig.path, ['/', '/index.html']);
  assert.equal(typeof render, 'function');
  assert.equal(typeof page, 'function');
  const mod = await import('../netlify/functions/page.mjs');
  assert.equal(mod.config, undefined);
});

test('a known route renders 200 with the CDN cache tag; an unknown one is a 404', async () => {
  const res = await renderRoute(req('/'), { load: ok });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(res.headers.get('netlify-cache-tag'), config.cacheTag);
  assert.match(res.headers.get('netlify-cdn-cache-control'), /s-maxage=600/);
  assert.ok((await res.text()).length > 1000);
  const nf = await renderRoute(req('/no-such-page'), { load: ok, notFound: null });
  assert.equal(nf.status, 404);
  assert.match(await nf.text(), /Page not found/);
  const custom = await renderRoute(req('/no-such-page'), { load: ok, notFound: () => '<h1>Wrong turn.</h1>' });
  assert.equal(custom.status, 404);
  assert.match(await custom.text(), /Wrong turn/);
});

test('a pack may answer with a Response of its own (another status, other headers)', async () => {
  const res = await renderRoute(req('/'), { load: ok, page: () => new Response('teapot', { status: 418, headers: { 'X-Pack': '1' } }) });
  assert.equal(res.status, 418);
  assert.equal(res.headers.get('x-pack'), '1');
});

test('database down: 503 + Retry-After by default; the pack\'s defaults, uncached, with render.fallback = defaults', async () => {
  const res = await renderRoute(req('/'), { load: down, cfg: { ...config, render: { fallback: '503' } } });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('retry-after'), '30');
  const soft = await renderRoute(req('/'), { load: down, cfg: { ...config, render: { fallback: 'defaults' } } });
  assert.equal(soft.status, 200);
  assert.equal(soft.headers.get('cache-control'), 'no-store');
  assert.equal(soft.headers.get('netlify-cdn-cache-control'), null);
  assert.ok((await soft.text()).length > 1000);
  // a renderer that throws is a 503 too, never a stack trace
  const boom = await renderRoute(req('/'), { load: ok, page: () => { throw new Error('boom'); } });
  assert.equal(boom.status, 503);
});

test('faviconLink types an svg icon and escapes the href', () => {
  assert.equal(faviconLink('/favicon.svg'), '<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
  assert.equal(faviconLink('/favicon.ico'), '<link rel="icon" href="/favicon.ico">');
  assert.equal(faviconLink('/a"b.png'), '<link rel="icon" href="/a&quot;b.png">');
  assert.equal(faviconLink(''), '');
});
