import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { NOTICES } from '../dist/measurement-feedback-client.mjs';

const source = await readFile(new URL('../dist/language.js', import.meta.url), 'utf8');
function fixture() {
  const listeners = {}, stored = new Map(), controls = [];
  const raw = { nodeValue: '<img src=x onerror=alert(1)> $&$1', parentElement: { closest: () => true } };
  const notice = { nodeValue: NOTICES.en.analytics, parentElement: { closest: () => false } };
  const location = new URL('https://host.test/unpack/?lang=de&keep=1#result');
  const historyState = { draft: 'preserved' };
  const document = {
    documentElement: {},
    createElement: tag => ({ tag, dataset: {}, attributes: {},
      setAttribute(key, value) { this.attributes[key] = value; },
      append(node) { if (node.tag === 'button') controls.push(node); },
      addEventListener(name, fn) { this[name] = fn; },
    }),
    querySelector: () => ({ append() {} }),
    querySelectorAll: selector => selector === '[data-app-language]' ? controls : [],
    createTreeWalker() { const nodes = [notice, raw]; let i = -1; return { nextNode() { this.currentNode = nodes[++i]; return Boolean(this.currentNode); } }; },
  };
  const context = { document, NOTICES, URL, location, navigator: { language: 'en-GB' },
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    history: { state: historyState, replaceState(state, title, url) { assert.equal(state, historyState); location.href = url.href; } },
    window: { addEventListener(name, fn) { (listeners[name] ??= []).push(fn); },
      dispatchEvent(event) { for (const fn of listeners[event.type] ?? []) fn(event); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    NodeFilter: { SHOW_TEXT: 4 }, MutationObserver: class { disconnect() {} observe() {} },
  };
  runInNewContext(source.replace(/^import .*$/gm, '').replace(/export /g, '') + '\nglobalThis.api = {translate, getLanguage, setLanguage};', context);
  return { ...context, controls, stored, raw, notice };
}

test('localized notices, receipt and new result copy preserve literal text and existing language protocol', () => {
  const f = fixture();
  assert.equal(f.api.getLanguage(), 'de');
  assert.equal(f.notice.nodeValue, NOTICES.de.analytics);
  assert.equal(f.raw.nodeValue, '<img src=x onerror=alert(1)> $&$1');
  for (const key of Object.keys(NOTICES.en).filter(key => key !== 'sent')) {
    assert.equal(f.api.translate(NOTICES.en[key]), NOTICES.de[key]);
  }
  for (const key of ['on', 'off', 'blocked']) {
    assert.equal(f.api.translate(NOTICES.en[key] + ' ' + NOTICES.en.pageOnly), NOTICES.de[key] + ' ' + NOTICES.de.pageOnly);
  }
  assert.match(f.api.translate('Feedback and usage counts are unavailable on this page. URL inspection works independently. You can draft feedback or use the contact link; drafts are not saved.'), /^Feedback und Nutzungszählungen/);
  assert.equal(f.api.translate(NOTICES.en.sent + '$&$1'), NOTICES.de.sent + '$&$1');
  assert.match(f.api.translate('2 nested links expanded at the first level. Open all URL details to inspect their hosts.'), /^2 verschachtelte Links/);
  assert.equal(f.controls.length, 2);
  assert.deepEqual(f.controls.map(control => control.dataset.appLanguage), ['en', 'de']);
  f.window.dispatchEvent(new f.CustomEvent('arcdrake-language-change', { detail: { language: 'en' } }));
  assert.equal(f.notice.nodeValue, NOTICES.en.analytics);
  assert.equal(f.raw.nodeValue, '<img src=x onerror=alert(1)> $&$1');
  assert.equal(f.location.searchParams.get('keep'), '1'); assert.equal(f.location.hash, '#result');
  assert.equal(f.stored.get('arcdrake-tools-language'), 'en');
  f.api.setLanguage('de', true);
  assert.equal(f.notice.nodeValue, NOTICES.de.analytics);
  assert.equal(f.controls[1].attributes['aria-pressed'], 'true');
});
