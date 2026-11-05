import test from 'node:test';
import assert from 'node:assert/strict';
import { hasGroupFor, isAllowed, parseRobots } from '../lib/robots.mjs';
import { parseSitemap } from '../lib/sitemap.mjs';
import { imageSize } from '../lib/image.mjs';

test('robots: longest rule wins, allow beats disallow on a tie', () => {
  const r = parseRobots(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nAllow: /api/public\n\nSitemap: https://example.com/sitemap.xml\n`);
  assert.equal(isAllowed(r, 'googlebot', '/').allowed, true);
  assert.equal(isAllowed(r, 'googlebot', '/admin/').allowed, false);
  assert.equal(isAllowed(r, 'googlebot', '/admin/x?y=1').allowed, false);
  assert.equal(isAllowed(r, 'googlebot', '/api/public/thing').allowed, true);
  assert.equal(isAllowed(r, 'googlebot', '/api/private').allowed, false);
  assert.deepEqual(r.sitemaps, ['https://example.com/sitemap.xml']);
  assert.equal(r.problems.length, 0);
});

test('robots: the most specific group replaces *, sub-products inherit', () => {
  const r = parseRobots(`User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nUser-agent: bingbot\nDisallow: /private\n\nUser-agent: GPTBot\nDisallow: /\n`);
  assert.equal(isAllowed(r, 'googlebot', '/page').allowed, true);
  assert.equal(isAllowed(r, 'googlebot-image', '/page').allowed, true, 'googlebot-image falls back to googlebot');
  assert.equal(isAllowed(r, 'bingbot', '/private/x').allowed, false);
  assert.equal(isAllowed(r, 'gptbot', '/page').allowed, false);
  assert.equal(isAllowed(r, 'claudebot', '/page').allowed, false, 'everyone else gets *');
  assert.equal(hasGroupFor(r, 'gptbot'), true);
  assert.equal(hasGroupFor(r, 'claudebot'), false);
});

test('robots: wildcards, end anchor, empty disallow, comments, BOM', () => {
  const r = parseRobots(`﻿# comment\nUser-agent: *\nDisallow:\nDisallow: /*.pdf$\nDisallow: /search?*q=\n`);
  assert.equal(isAllowed(r, 'googlebot', '/anything').allowed, true);
  assert.equal(isAllowed(r, 'googlebot', '/files/a.pdf').allowed, false);
  assert.equal(isAllowed(r, 'googlebot', '/files/a.pdf?x=1').allowed, true, '$ anchors the end');
  assert.equal(isAllowed(r, 'googlebot', '/search?a=1&q=x').allowed, false);
});

test('robots: problems are reported, an HTML page is not a robots file', () => {
  const r = parseRobots(`Disallow: /early\nUser-agent: *\nNoindex: /x\nFoo: bar\n<html>`);
  assert.equal(r.problems.length, 4);
  assert.equal(isAllowed(r, 'googlebot', '/early').allowed, true, 'a rule before any group is ignored');
  assert.equal(isAllowed(parseRobots(''), 'googlebot', '/').allowed, true);
});

test('sitemap: urlset with lastmod, entities, images', () => {
  const s = parseSitemap(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>https://example.com/</loc><lastmod>2026-09-30</lastmod></url>
  <url><loc>https://example.com/a?x=1&amp;y=2</loc><lastmod>2026-09-30T10:00:00+00:00</lastmod><image:image><image:loc>https://example.com/i.jpg</image:loc></image:image></url>
  <url><loc>https://example.com/b</loc><lastmod>yesterday</lastmod></url>
</urlset>`);
  assert.equal(s.kind, 'urlset');
  assert.deepEqual(s.urls.map((u) => u.loc), ['https://example.com/', 'https://example.com/a?x=1&y=2', 'https://example.com/b']);
  assert.equal(s.urls[1].images, 1);
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0], /lastmod "yesterday"/);
});

test('sitemap: index, html-instead-of-xml, empty', () => {
  const idx = parseSitemap('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://example.com/s1.xml</loc></sitemap></sitemapindex>');
  assert.equal(idx.kind, 'index');
  assert.deepEqual(idx.children, ['https://example.com/s1.xml']);
  assert.match(parseSitemap('<!doctype html><html><body>Not found</body></html>').problems[0], /HTML page/);
  assert.match(parseSitemap('').problems[0], /empty/);
  assert.match(parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>').problems[0], /no URLs/);
});

test('image sizes from headers', () => {
  const pngBuf = Buffer.alloc(24);
  pngBuf.write('\x89PNG\r\n\x1a\n', 0, 'latin1');
  pngBuf.writeUInt32BE(13, 8);
  pngBuf.write('IHDR', 12, 'latin1');
  pngBuf.writeUInt32BE(1200, 16);
  pngBuf.writeUInt32BE(630, 20);
  assert.deepEqual(imageSize(pngBuf), { type: 'png', width: 1200, height: 630 });

  const gifBuf = Buffer.alloc(10);
  gifBuf.write('GIF89a', 0, 'latin1');
  gifBuf.writeUInt16LE(40, 6);
  gifBuf.writeUInt16LE(30, 8);
  assert.deepEqual(imageSize(gifBuf), { type: 'gif', width: 40, height: 30 });

  // JPEG: SOI, an APP0 segment of length 16, then SOF0 with 600x800.
  const jpg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.alloc(14),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x20, 0x02, 0x58, 0x03]),
    Buffer.alloc(16),
  ]);
  assert.deepEqual(imageSize(jpg), { type: 'jpeg', width: 600, height: 800 });

  const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256"><path/></svg>');
  assert.deepEqual(imageSize(svgBuf), { type: 'svg', width: 512, height: 256 });
  assert.equal(imageSize(Buffer.from('not an image')), null);
  assert.equal(imageSize(null), null);
});
