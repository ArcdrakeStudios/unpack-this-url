import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { inspect, sanitize } from '../dist/anatomy.js';
import { mountMeasurementFeedback, NOTICES } from '../dist/measurement-feedback-client.mjs';
import { EVENTS, validatePayload } from '../dist/measurement-contract.mjs';
import { COLLECTION_ENABLED } from '../dist/feedback-config.js';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../dist/app.js', import.meta.url), 'utf8');
const adapter = await readFile(new URL('../dist/feedback.js', import.meta.url), 'utf8');

// In-process DOM control-flow fixture. No browser, server or inspected URL request.
class Element {
  constructor(tag, doc) {
    this.tag = tag; this.ownerDocument = doc; this.children = []; this.listeners = {};
    this.attributes = {}; this.dataset = {}; this.value = ''; this.checked = false;
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  querySelectorAll(tag) { return this.children.flatMap(child => [child, ...child.querySelectorAll('*')]).filter(child => tag === '*' || child.tag === tag); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  reset() { for (const node of this.querySelectorAll('*')) if (['input', 'textarea'].includes(node.tag)) node.value = ''; }
  set innerHTML(_value) { assert.fail('Unsafe HTML rendering'); }
}
function documentFixture() {
  const nodes = new Map();
  const doc = { createElement: tag => new Element(tag, doc), getElementById: id => nodes.get(id) };
  for (const match of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)) nodes.set(match[2], new Element(match[1], doc));
  return { doc, nodes };
}
function feedbackFixture({ enabled = COLLECTION_ENABLED, options = {} } = {}) {
  const { doc, nodes } = documentFixture(), listeners = {};
  let language = 'en';
  const context = { document: doc, COLLECTION_ENABLED: enabled, EVENTS, NOTICES,
    getLanguage: () => language,
    mountMeasurementFeedback: (container, supplied) => mountMeasurementFeedback(container, {
      storage: null, privacy: {}, ...options, ...supplied,
    }),
    window: { addEventListener: (name, fn) => { listeners[name] = fn; } },
  };
  runInNewContext(adapter.replace(/^import .*$/gm, '').replace(/^export /gm, '') + '\nglobalThis.ui = ui;', context);
  return { doc, nodes, ui: context.ui, setLanguage(value) { language = value; listeners['arcdrake-language-change'](); } };
}
function productFixture({ consent = false, privacy = {}, unavailable = false, enabled = true, fetchImpl, storage = null } = {}) {
  const calls = [];
  const f = feedbackFixture({ enabled, options: { storage, privacy, fetchImpl: async (path, options) => {
    calls.push({ path, options });
    if (unavailable) throw Error('fixture offline');
    return fetchImpl ? fetchImpl(path, options) : Response.json({ ok: true }, { status: 202 });
  } } });
  const { doc, nodes } = f, measurement = f.ui.client;
  if (consent) measurement.setChoice('yes');
  runInNewContext(app.replace(/^import .*$/gm, ''), { document: doc, inspect, sanitize, measurement,
    navigator: { clipboard: { writeText: async () => { throw Error('fixture denied'); } } } });
  const submit = value => { nodes.get('url-input').value = value; nodes.get('inspect-form').listeners.submit({ preventDefault() {} }); };
  return { ...f, measurement, calls, submit };
}

test('real inspector counts start and successful rendered result, never input or invalid completion', async () => {
  const f = productFixture({ consent: true });
  const url = 'https://user:secret@actual.example/?q=%3Cimg%20src=x%20onerror=alert(1)%3E&utm_source=private#fragment';
  f.submit(url);
  assert.equal(f.nodes.get('results').hidden, false);
  assert.equal(f.nodes.get('main-host').textContent, 'actual.example');
  assert.equal(f.nodes.get('original').value, url);
  assert.ok(f.nodes.get('queries').querySelectorAll('p').some(node => node.textContent === '<img src=x onerror=alert(1)>'));
  f.submit('not a URL');
  assert.equal(f.nodes.get('error').hidden, false);
  assert.equal(f.nodes.get('results').hidden, true);
  const payloads = f.calls.map(call => JSON.parse(call.options.body));
  assert.deepEqual(payloads, ['tool_start', 'tool_complete', 'tool_start'].map(event => ({ product: 'unpack', event })));
  for (const call of f.calls) {
    assert.equal(call.path, '/api/events');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.mode, 'same-origin');
  }
  assert.doesNotMatch(JSON.stringify(payloads), /secret|actual\.example|private|fragment|onerror/);
});

test('real inspection and clean-copy fallback work with opt-out, privacy signals and unavailable telemetry', async () => {
  for (const options of [{}, { consent: true, privacy: { globalPrivacyControl: true } },
    { consent: true, privacy: { doNotTrack: '1' } }, { consent: true, unavailable: true }]) {
    const f = productFixture(options);
    f.submit('https://example.test/?x=1&utm_source=mail&x=2');
    assert.equal(f.nodes.get('main-host').textContent, 'example.test');
    f.nodes.get('remove-tracking').checked = true;
    f.nodes.get('choices').listeners.change();
    assert.equal(f.nodes.get('preview').value, 'https://example.test/?x=1&x=2');
    await f.nodes.get('copy').listeners.click();
    assert.equal(f.nodes.get('preview').selected, true);
    assert.match(f.nodes.get('copy-status').textContent, /unavailable/);
    assert.equal(f.calls.length, options.unavailable ? 2 : 0);
    f.measurement.setChoice('no'); f.submit('https://next.example/');
    assert.equal(f.calls.length, options.unavailable ? 2 : 0);
    f.nodes.get('clear').listeners.click();
    assert.equal(f.nodes.get('url-input').value, '');
    assert.equal(f.nodes.get('results').hidden, true);
  }
});

test('actual feedback adapter sends no unsolicited feedback and keeps drafts during language changes or failure', async () => {
  const calls = [];
  const f = feedbackFixture({ enabled: true, options: { fetchImpl: async (path, options) => {
    calls.push({ path, options }); return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  } } });
  const { nodes } = f;
  const container = nodes.get('measurement-feedback'), all = container.querySelectorAll('*');
  assert.equal(calls.length, 0);
  const form = all.find(node => node.tag === 'form'), message = all.find(node => node.tag === 'textarea');
  const open = all.find(node => node.textContent === NOTICES.en.open);
  const category = all.find(node => node.tag === 'select');
  assert.deepEqual(category.children.map(node => node.value), ['bug', 'idea', 'usability', 'other']);
  open.listeners.click(); assert.equal(calls.length, 0);
  message.value = 'A voluntary draft'; category.value = 'usability';
  f.setLanguage('de');
  assert.equal(message.value, 'A voluntary draft'); assert.equal(form.hidden, false);
  assert.deepEqual(container.querySelectorAll('a').slice(0, 2).map(node => node.href), [
    'https://tools.arcdrake.com/de/privacy/', 'https://arcdrake.com/de/contact/',
  ]);
  await form.listeners.submit({ preventDefault() {} });
  assert.equal(calls.length, 1); assert.equal(calls[0].path, '/api/feedback');
  assert.deepEqual(JSON.parse(calls[0].options.body), { product: 'unpack', category: 'usability', message: 'A voluntary draft', noticeVersion: '2026-10-27-mail-v1' });
  assert.equal(message.value, 'A voluntary draft');
  assert.ok(all.some(node => node.textContent === NOTICES.en.unavailable));
});

test('first result keeps host, observations and optional copy before closed exhaustive disclosure', () => {
  const disclosure = html.indexOf('<details id="raw-details"');
  assert.ok(disclosure > html.indexOf('id="main-host"'));
  assert.ok(disclosure > html.indexOf('id="warnings"'));
  assert.ok(disclosure > html.indexOf('id="preview"'));
  assert.doesNotMatch(html.slice(disclosure, html.indexOf('>', disclosure)), /\bopen\b/);
  for (const id of ['anatomy', 'queries', 'nested', 'original', 'normalized']) assert.ok(html.indexOf(`id="${id}"`) > disclosure);
  assert.match(html, /connect-src 'self'/);
  assert.doesNotMatch(app, /innerHTML|window\.open|location\s*=/);
});

test('contract rejects unknown fields, invalid message/replyTo and non-allowlisted actions', () => {
  for (const data of [{ product: 'unpack', event: 'input' }, { product: 'unpack', event: 'tool_start', url: 'private' }]) {
    assert.throws(() => validatePayload('events', data));
  }
  const valid = { product: 'unpack', category: 'bug', message: ' Hello\nthere\t ' };
  assert.equal(validatePayload('feedback', valid).message, 'Hello\nthere');
  for (const extra of [{ category: 'unknown' }, { message: '' }, { message: 'x'.repeat(2001) },
    { message: 'bad\u0000text' }, { replyTo: 'bad' }, { replyTo: 'a@example.test\nBcc: x' }, { id: 'extra' }]) {
    assert.throws(() => validatePayload('feedback', { ...valid, ...extra }));
  }
  assert.equal(validatePayload('feedback', { ...valid, replyTo: ' synthetic@example.test ' }).replyTo, 'synthetic@example.test');
});

test('static preview handler serves module MIME types and reports unavailable APIs without a server launch', async () => {
  let handler;
  const source = await readFile(new URL('../tools/serve.mjs', import.meta.url), 'utf8');
  runInNewContext(source.replace(/^import .*$/gm, ''), { resolve, readFile,
    process: { env: {}, on() {} }, console,
    createServer(callback) { handler = callback; return { listen() {}, close() {} }; },
  });
  async function request(url, method = 'GET') {
    const result = {};
    await handler({ url, method }, { writeHead(status, headers) { Object.assign(result, { status, headers }); }, end(body) { result.body = body; } });
    return result;
  }
  for (const path of ['/api/events', '/api/feedback']) {
    const result = await request(path, 'POST');
    assert.equal(result.status, 503);
    assert.deepEqual(JSON.parse(result.body), { ok: false, error: 'unavailable' });
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    for (const method of ['GET', 'PUT']) {
      const denied = await request(path, method);
      assert.equal(denied.status, 405);
      assert.deepEqual(JSON.parse(denied.body), { ok: false, error: 'method' });
      assert.equal(denied.headers.Allow, 'POST');
    }
  }
  for (const path of ['/feedback.js', '/feedback-config.js', '/measurement-contract.mjs', '/measurement-feedback-client.mjs']) {
    const result = await request(path);
    assert.equal(result.status, 200);
    assert.equal(result.headers['Content-Type'], 'text/javascript; charset=utf-8');
    assert.ok(result.body.length > 0);
  }
  assert.equal((await request('/unknown')).status, 404);
});

test('release config disables every collection flow even with saved consent and an explicit feedback send', async () => {
  assert.equal(COLLECTION_ENABLED, false);
  const stored = new Map([['arcdrake.analytics.v1', 'yes']]);
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  const f = productFixture({ enabled: COLLECTION_ENABLED, storage });
  f.submit('https://private.example/?secret=never-send');
  assert.equal(f.nodes.get('main-host').textContent, 'private.example');
  assert.equal(f.measurement.choice(), 'no');
  const all = f.nodes.get('measurement-feedback').querySelectorAll('*');
  assert.equal(all.some(node => node.textContent === NOTICES.en.allow), false);
  all.find(node => node.textContent === NOTICES.en.open).listeners.click();
  const message = all.find(node => node.tag === 'textarea');
  message.value = 'A draft that must stay local';
  all.find(node => node.tag === 'select').value = 'idea';
  await all.find(node => node.tag === 'form').listeners.submit({ preventDefault() {} });
  assert.equal(f.calls.length, 0);
  assert.equal(message.value, 'A draft that must stay local');
  assert.ok(all.some(node => node.textContent === NOTICES.en.unavailable));
  // A saved preference cannot trigger intake in a disabled build.
  assert.equal(stored.get('arcdrake.analytics.v1'), 'yes');
  await assert.rejects(f.measurement.track('not_allowlisted'), /Unknown event/);
});

const sourceRoot = process.env.MEASUREMENT_SOURCE_ROOT;
test('bundled shared modules match final source bytes and include every relative dependency', { skip: !sourceRoot }, async t => {
  for (const name of ['measurement-feedback-client.mjs', 'measurement-contract.mjs']) {
    const local = await readFile(new URL('../dist/' + name, import.meta.url));
    assert.deepEqual(local, await readFile(resolve(sourceRoot, 'shared', name)));
    t.diagnostic(`${name} SHA-256 ${createHash('sha256').update(local).digest('hex')}`);
    for (const match of local.toString().matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)) {
      await readFile(new URL('../dist/' + match[1], import.meta.url));
    }
  }
  for (const prefix of ['', 'de/']) {
    await readFile(resolve(sourceRoot, 'app', prefix, 'contact/page.tsx'));
    await readFile(resolve(sourceRoot, 'tools/site', prefix, 'privacy/index.html'));
  }
});

test('explicitly enabled real inspector and feedback use the repaired client/API/storage pipeline in process', { skip: !sourceRoot }, async () => {
  const { createLocalBackend } = await import(pathToFileURL(resolve(sourceRoot, 'fixtures/measurement-feedback/local-backend.mjs')).href);
  const backend = createLocalBackend('https://tools.arcdrake.com');
  const pending = [];
  const f = productFixture({ enabled: true, consent: true, fetchImpl: (path, options) => {
    const request = backend.fetch(path, options); pending.push(request); return request;
  } });
  assert.equal(f.calls.length, 0); // Consent does not replay a page view.
  f.submit('https://user:secret@private.example/path?private=query#never-send');
  f.submit('invalid URL');
  await Promise.all(pending);
  const totals = await (await backend.read('/api/triage/events')).json();
  assert.deepEqual(totals.rows.map(({ event, count }) => ({ event, count })), [
    { event: 'tool_complete', count: 1 }, { event: 'tool_start', count: 2 },
  ]);
  assert.equal((await backend.fetch('/api/triage/feedback')).status, 401);
  const all = f.nodes.get('measurement-feedback').querySelectorAll('*');
  all.find(node => node.textContent === NOTICES.en.open).listeners.click();
  assert.equal((await (await backend.read('/api/triage/feedback')).json()).rows.length, 0);
  const message = all.find(node => node.tag === 'textarea');
  message.value = '<script>plain synthetic feedback</script>';
  all.find(node => node.tag === 'select').value = 'usability';
  await all.find(node => node.tag === 'form').listeners.submit({ preventDefault() {} });
  assert.equal(message.value, '');
  const read = await (await backend.read('/api/triage/feedback')).json();
  assert.equal(read.rows.length, 1);
  assert.equal(read.rows[0].product, 'unpack');
  assert.equal(read.rows[0].message, '<script>plain synthetic feedback</script>');
  const exported = await (await backend.read('/api/triage/export?kind=feedback&product=unpack&limit=1')).text();
  assert.equal(JSON.parse(exported).id, read.rows[0].id);
  await backend.read(`/api/triage/feedback/${read.rows[0].id}`, { method: 'DELETE' });
  assert.equal((await (await backend.read('/api/triage/feedback')).json()).rows.length, 0);
  for (const call of f.calls.filter(call => call.path === '/api/events')) {
    assert.deepEqual(Object.keys(JSON.parse(call.options.body)).sort(), ['event', 'product']);
    assert.doesNotMatch(call.options.body, /private|secret|query|never-send/);
  }
  // The remaining counters expire; no namespace, server or external request exists.
  await Promise.all(pending);
  backend.advanceDays(91);
  await backend.read('/api/triage/retention', { method: 'POST' });
  assert.deepEqual([...(await backend.inspect()).keys()], ['nextSweep']);
});
