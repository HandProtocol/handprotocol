import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorName, anchors, decodeEntities, fragmentTargets, headInfo, headings, images, jsonLdBlocks, parseHtml, visibleText, wordCount } from '../lib/html.mjs';

const PAGE = `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<title>Maria&rsquo;s Studio &amp; Co &#8212; Austin</title>
<meta name="description" content="A &quot;quoted&quot; line > with a bracket">
<link rel="canonical" href="https://example.com/">
<link rel="alternate" hreflang="es" href="https://example.com/es/">
<meta property="og:image" content="https://example.com/a.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"A <b> & B"}</script>
<script>if (a < b && c > d) { document.write('<h1>not a heading</h1>'); }</script>
<style>h1::before { content: "<h2>"; }</style>
</head>
<body>
<header><a href="/" aria-label="Home"><svg viewBox="0 0 10 10"><title>Logo</title><path d="M0 0"/></svg></a></header>
<h1 id="top">Hello <em>there</em></h1>
<p>First paragraph
<p>Second paragraph with <a href="#top">a jump</a> and <a href="tel:+15125550100">a call</a>.
<h2>Section</h2>
<ul><li>One<li>Two</ul>
<img src="/a.jpg" alt="A photo" width="800" height="600" loading="lazy">
<img src="/b.jpg">
<a href="/b"><img src="/c.jpg" alt="Linked photo"></a>
<a href="">empty</a><a href="#">hash</a><a>no href</a>
<template><h2>Template heading</h2><img src="/t.jpg"></template>
<div hidden><h3>Hidden heading</h3>secret words</div>
<noscript><img src="/pixel.gif"></noscript>
</body>
</html>`;

test('head: title, metas, links, lang, charset', () => {
  const doc = parseHtml(PAGE);
  const head = headInfo(doc);
  assert.equal(head.lang, 'en-US');
  assert.equal(head.charset, 'utf-8');
  assert.equal(head.titles.length, 1, 'the svg <title> is not a page title');
  assert.equal(head.titles[0].text, 'Maria’s Studio & Co — Austin');
  assert.equal(head.meta('description')[0].content, 'A "quoted" line > with a bracket');
  assert.equal(head.rel('canonical')[0].href, 'https://example.com/');
  assert.equal(head.rel('canonical')[0].inHead, true);
  assert.equal(head.rel('alternate')[0].hreflang, 'es');
  assert.equal(head.prop('og:image')[0].content, 'https://example.com/a.jpg');
  assert.equal(doc.headBrokenBy, null);
});

test('scripts and styles never produce elements or text', () => {
  const doc = parseHtml(PAGE);
  const hs = headings(doc).filter((h) => !h.offPage);
  assert.deepEqual(hs.map((h) => [h.level, h.text]), [[1, 'Hello there'], [2, 'Section']]);
  assert.ok(!visibleText(doc).includes('not a heading'));
  assert.ok(!visibleText(doc).includes('::before'));
});

test('json-ld is read raw, even with markup characters inside', () => {
  const blocks = jsonLdBlocks(parseHtml(PAGE));
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].error, null);
  assert.equal(blocks[0].data.name, 'A <b> & B');
  assert.equal(blocks[0].inHead, true);
  const bad = jsonLdBlocks(parseHtml('<script type="application/ld+json">{"a":}</script>'));
  assert.ok(bad[0].error);
});

test('omitted end tags: p and li do not nest', () => {
  const doc = parseHtml(PAGE);
  const ps = doc.find('p');
  assert.equal(ps.length, 2);
  assert.equal(ps[0].text(), 'First paragraph');
  assert.equal(doc.find('li').map((li) => li.text()).join('|'), 'One|Two');
});

test('images: alt present vs missing, off-page ones flagged', () => {
  const imgs = images(parseHtml(PAGE));
  const on = imgs.filter((i) => !i.offPage);
  assert.equal(on.length, 3);
  assert.equal(on[0].alt, 'A photo');
  assert.equal(on[0].loading, 'lazy');
  assert.equal(on[1].alt, null, 'no alt attribute at all');
  assert.equal(on[2].inLink, true);
  assert.equal(imgs.filter((i) => i.offPage).length, 2, 'template + noscript images');
});

test('anchors: kinds and accessible names', () => {
  const as = anchors(parseHtml(PAGE));
  const kinds = as.map((a) => a.kind);
  assert.deepEqual(kinds, ['relative', 'anchor', 'tel', 'relative', 'empty', 'hash-only', 'none']);
  assert.equal(anchorName(as[0]), 'Home', 'aria-label wins when there is no text');
  assert.equal(anchorName(as[3]), 'Linked photo', 'image alt names an image link');
  assert.ok(fragmentTargets(parseHtml(PAGE)).has('top'));
});

test('visible text skips hidden, template, noscript, head', () => {
  const text = visibleText(parseHtml(PAGE));
  assert.ok(text.includes('Second paragraph'));
  assert.ok(!text.includes('secret words'));
  assert.ok(!text.includes('Template heading'));
  assert.ok(!text.includes('Maria’s Studio'), 'the <title> is not body text');
  assert.equal(wordCount('Feel good in your body, at peace — it’s yours.'), 9);
});

test('a body-only tag in <head> ends the head early', () => {
  const doc = parseHtml('<html><head><title>T</title><div>oops</div><link rel="canonical" href="/x"><meta name="robots" content="noindex"></head><body><h1>x</h1></body></html>');
  assert.deepEqual(doc.headBrokenBy && doc.headBrokenBy.tag, 'div');
  const head = headInfo(doc);
  assert.equal(head.rel('canonical')[0].inHead, false);
  assert.equal(head.meta('robots')[0].inHead, false);
  assert.equal(head.titles[0].inHead, true);
});

test('no <head> tag at all: head is implied until the first body tag', () => {
  const doc = parseHtml('<!doctype html><title>T</title><meta name="description" content="d"><h1>Hi</h1><meta name="robots" content="noindex">');
  const head = headInfo(doc);
  assert.equal(head.titles[0].inHead, true);
  assert.equal(head.meta('description')[0].inHead, true);
  assert.equal(head.meta('robots')[0].inHead, false);
});

test('attributes: unquoted, single-quoted, duplicate, ">" inside a value, valueless', () => {
  const doc = parseHtml(`<a href=/x class='a b' title="1 > 0" data-x data-x="second" HREF="/y">t</a><p title="it's fine">p</p>`);
  const a = doc.first('a');
  assert.equal(a.attrs.href, '/x', 'first attribute wins');
  assert.equal(a.attrs.class, 'a b');
  assert.equal(a.attrs.title, '1 > 0');
  assert.equal(a.attrs['data-x'], '');
  assert.equal(a.text(), 't');
  assert.equal(doc.first('p').attrs.title, "it's fine");
});

test('garbage in, no throw', () => {
  for (const junk of ['', '<', '<<<>>>', '<a', '<a href="x', '</nope>', '<!-- never closed', '<script>never closed', '<p><b>unclosed', null, undefined, 42]) {
    assert.doesNotThrow(() => visibleText(parseHtml(junk)));
  }
  assert.equal(parseHtml('a < b and c > d').root.children.map((ch) => ch.value).join(''), 'a < b and c > d');
});

test('entities', () => {
  assert.equal(decodeEntities('&amp;&lt;&gt;&quot;&#39;&#x27;&nbsp;&eacute;&unknown;&amp'), '&<>"\'\' é&unknown;&amp');
});

test('svg self-closing children do not swallow the page', () => {
  const doc = parseHtml('<body><svg><g><path d="M0"/><circle r="1"/></g></svg><h1>After</h1></body>');
  assert.equal(headings(doc)[0].text, 'After');
  assert.equal(doc.first('h1').closest('svg'), null);
});

test('text(): <br> and block children separate words', () => {
  const doc = parseHtml('<h2>Dealer quality.<br>Without the bill.</h2><h3>One<div>Two</div>Three</h3><h4>in<em>line</em></h4>');
  assert.deepEqual(headings(doc).map((h) => h.text), ['Dealer quality. Without the bill.', 'One Two Three', 'inline']);
});
