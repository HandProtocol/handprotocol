import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, instagramUrl, jsonForScript, paragraphs, smsHref, telHref } from '../netlify/functions/lib/html.mjs';

test('escapes the five HTML metacharacters', () => {
  assert.equal(escapeHtml(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('paragraphs split on blank lines and escape', () => {
  assert.equal(paragraphs('one\ntwo\n\n<b>', 'p'), '<p class="p">one<br>two</p><p class="p">&lt;b&gt;</p>');
});

test('phone + instagram helpers normalize input', () => {
  assert.equal(telHref('(512) 555-0100'), 'tel:5125550100');
  assert.equal(smsHref(''), '');
  assert.equal(instagramUrl('@studio'), 'https://instagram.com/studio');
  assert.equal(instagramUrl('https://www.instagram.com/studio/'), 'https://instagram.com/studio');
});

test('jsonForScript cannot break out of a script tag', () => {
  assert.equal(jsonForScript({ a: '</script>' }).includes('</script>'), false);
});
