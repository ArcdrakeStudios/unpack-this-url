import test from 'node:test';
import assert from 'node:assert/strict';
import { CHOICE_KEY, createMeasurementClient, mountMeasurementFeedback, NOTICES, runMeasuredAction } from '../dist/measurement-feedback-client.mjs';
const RECEIPT = '0d4d0a14-6468-4947-a670-28bbddbcc33c';

function setup(overrides = {}) {
  const data = new Map(), calls = [];
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  const client = createMeasurementClient({ product: 'company', storage, privacy: {},
    fetchImpl: async (path, options) => { calls.push({ path, options }); return Response.json(path.endsWith('feedback') ? { ok: true, id: RECEIPT } : { ok: true }, { status: 202 }); },
    ...overrides });
  return { client, calls, storage };
}

test('no automatic traffic, explicit opt-in, narrow payload, no credentials/referrer, and immediate opt-out', async () => {
  const { client, calls } = setup();
  assert.equal(client.choice(), 'unset');
  await client.track('page_view');
  assert.equal(calls.length, 0);
  client.setChoice('yes');
  await client.track('play_start');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/api/events');
  assert.deepEqual(JSON.parse(calls[0].options.body), { product: 'company', event: 'play_start' });
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.referrerPolicy, 'no-referrer');
  client.setChoice('no');
  await client.track('page_view');
  assert.equal(calls.length, 1);
  await assert.rejects(client.track('unknown'), /Unknown event/);
});

test('browser GPC/DNT override opt-in, storage failures use session-only choice, cross-instance opt-out respected', async () => {
  for (const privacy of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
    const { client, calls } = setup({ privacy });
    assert.equal(client.setChoice('yes'), 'blocked');
    await client.track('page_view');
    assert.equal(calls.length, 0);
  }
  const broken = setup({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } } });
  broken.client.setChoice('yes');
  await broken.client.track('page_view');
  assert.equal(broken.calls.length, 1);
  const f = setup();
  f.client.setChoice('yes');
  const second = createMeasurementClient({ product: 'studios', storage: f.storage, privacy: {} });
  second.setChoice('no');
  await f.client.track('page_view');
  assert.equal(f.calls.length, 0);
  f.client.setChoice('yes');
  f.storage.removeItem(CHOICE_KEY);
  await f.client.track('page_view');
  assert.equal(f.calls.length, 0);
});

test('feedback needs explicit send, works with analytics off, validates and never retries on failure', async () => {
  const { client, calls } = setup();
  assert.equal(calls.length, 0);
  const valid = { category: 'idea', message: 'A thought' };
  assert.equal((await client.sendFeedback(valid)).ok, true);
  assert.equal(calls[0].path, '/api/feedback');
  assert.deepEqual(JSON.parse(calls[0].options.body), { product: 'company', ...valid });
  assert.equal((await client.sendFeedback({ ...valid, metadata: 'extra' })).ok, false);
  assert.equal(calls.length, 1);
  let attempts = 0;
  const failed = setup({ fetchImpl: async () => { attempts++; throw Error('offline'); } });
  assert.deepEqual(await failed.client.sendFeedback(valid), { ok: false, error: 'unavailable' });
  assert.equal(attempts, 1);
});

// Minimal DOM harness checks control flow and safe text assignment; not browser QA.
class Element {
  constructor(tag, doc) { this.tag = tag; this.ownerDocument = doc; this.children = []; this.listeners = {}; this.attributes = {}; this.value = ''; }
  append(child) { this.children.push(child); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(key, fn) { this.listeners[key] = fn; }
  focus() {}
  reset() { this.resets = (this.resets ?? 0) + 1; }
  remove() {}
  set innerHTML(_value) { assert.fail('Unsafe HTML rendering'); }
}
function all(root) { return [root, ...root.children.flatMap(all)]; }

test('EN/DE widget sends only on submit and rejects untrusted receipts without reset', async () => {
  for (const language of ['en', 'de']) {
    const doc = { createElement: tag => new Element(tag, doc) };
    const container = new Element('div', doc);
    let sends = 0;
    mountMeasurementFeedback(container, { product: 'tools', language, storage: null, privacy: {},
      fetchImpl: async () => { sends++; return Response.json({ ok: true, id: '<script>unsafe</script>' }, { status: 202 }); } });
    const nodes = all(container), copy = NOTICES[language];
    assert.ok(nodes.some(node => node.textContent === copy.analytics));
    assert.ok(nodes.some(node => node.textContent === copy.feedback));
    await nodes.find(node => node.textContent === copy.open).listeners.click();
    assert.equal(sends, 0);
    const form = nodes.find(node => node.tag === 'form');
    nodes.find(node => node.tag === 'textarea').value = 'A report';
    nodes.find(node => node.tag === 'select').value = 'bug';
    await form.listeners.submit({ preventDefault() {} });
    assert.equal(sends, 1);
    assert.ok(nodes.some(node => node.textContent === copy.unavailable));
    assert.equal(form.resets, undefined);
    assert.equal(nodes.find(node => node.tag === 'textarea').value, 'A report');
  }
});

test('client preserves bounded API errors, rejects malformed receipts, never follows redirects or retries', async () => {
  for (const [status, body, error] of [[400, { ok: false, error: 'invalid' }, 'invalid'],
    [429, { ok: false, error: 'rate' }, 'rate'], [503, { ok: false, error: 'capacity' }, 'capacity'],
    [503, { error: '<secret provider exception>' }, 'unavailable'], [202, null, 'unavailable'],
    [200, { ok: true }, 'unavailable'], [202, { ok: 'yes' }, 'unavailable']]) {
    let attempts = 0;
    const { client } = setup({ fetchImpl: async (_path, options) => {
      attempts++;
      assert.equal(options.redirect, 'error');
      return Response.json(body, { status });
    } });
    assert.deepEqual(await client.sendFeedback({ category: 'other', message: 'Synthetic' }), { ok: false, error });
    assert.equal(attempts, 1);
  }
});

test('real action wrapper emits start and successful completion only, with consent and privacy gates', async () => {
  for (const kind of ['play', 'tool']) {
    const f = setup();
    let actions = 0;
    const action = async () => { actions++; return 'task result'; };
    assert.equal(await runMeasuredAction(f.client, kind, action), 'task result');
    assert.equal(actions, 1);
    assert.equal(f.calls.length, 0);
    f.client.setChoice('yes');
    assert.equal(await runMeasuredAction(f.client, kind, action), 'task result');
    assert.deepEqual(f.calls.map(call => JSON.parse(call.options.body).event), [`${kind}_start`, `${kind}_complete`]);
    await assert.rejects(runMeasuredAction(f.client, kind, async () => { throw Error('task failed'); }), /task failed/);
    assert.deepEqual(f.calls.map(call => JSON.parse(call.options.body).event), [`${kind}_start`, `${kind}_complete`, `${kind}_start`]);
    f.client.setChoice('no');
    await runMeasuredAction(f.client, kind, action);
    assert.equal(f.calls.length, 3);
    for (const privacy of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
      const blocked = setup({ privacy });
      blocked.client.setChoice('yes');
      await runMeasuredAction(blocked.client, kind, action);
      assert.equal(blocked.calls.length, 0);
    }
    const offline = setup({ fetchImpl: async () => { throw Error('offline'); } });
    offline.client.setChoice('yes');
    assert.equal(await runMeasuredAction(offline.client, kind, action), 'task result');
  }
});

test('localized widget links existing host privacy/contact routes and preserves text on unconfirmed sends', async () => {
  for (const language of ['en', 'de']) for (const product of ['company', 'studios', 'tools']) {
    const doc = { createElement: tag => new Element(tag, doc) };
    const container = new Element('div', doc);
    mountMeasurementFeedback(container, { product, language, storage: null, privacy: {},
      fetchImpl: async () => { throw Error('offline'); } });
    const nodes = all(container), prefix = language === 'de' ? '/de' : '';
    const host = product === 'company' ? 'arcdrake.com' : product === 'tools' ? 'tools.arcdrake.com' : 'arcdrakestudios.com';
    assert.ok(nodes.some(node => node.href === `https://${host}${prefix}/privacy/`));
    assert.ok(nodes.some(node => node.href === `https://${product === 'tools' ? 'arcdrake.com' : host}${prefix}/contact/`));
    const message = nodes.find(node => node.tag === 'textarea');
    message.value = '<script>untrusted text</script>';
    nodes.find(node => node.tag === 'select').value = 'other';
    await nodes.find(node => node.tag === 'form').listeners.submit({ preventDefault() {} });
    assert.equal(message.value, '<script>untrusted text</script>');
    assert.ok(nodes.some(node => node.textContent === NOTICES[language].unavailable));
    assert.match(NOTICES[language].feedback, /Arcdrake/);
    assert.match(NOTICES[language].feedback, /platform failures|Plattformfehlern/);
  }
});

test('write responses require exact status/schema and a UUIDv4 feedback receipt', async () => {
  const invalid = [
    [202, { ok: true }], [202, { ok: true, id: '' }], [202, { ok: true, id: '<script>bad</script>' }],
    [202, { ok: true, id: '00000000-0000-0000-0000-000000000000' }],
    [202, { ok: true, id: RECEIPT, debug: 'private' }], [202, [{ ok: true, id: RECEIPT }]],
    [200, { ok: true, id: RECEIPT }], [400, { ok: false, error: 'rate' }],
    [429, { ok: true, error: 'rate' }], [429, { error: 'rate' }],
    [429, { ok: false, error: 'rate', detail: 'private' }], [503, { ok: false, error: '__proto__' }],
    [202, { ok: false, error: 'invalid' }],
  ];
  for (const [status, body] of invalid) {
    const { client } = setup({ fetchImpl: async () => Response.json(body, { status }) });
    assert.deepEqual(await client.sendFeedback({ category: 'idea', message: 'Synthetic' }), { ok: false, error: 'unavailable' });
  }
  const good = setup();
  assert.deepEqual(await good.client.sendFeedback({ category: 'idea', message: 'Synthetic' }), { ok: true, id: RECEIPT });
  const badEvent = setup({ fetchImpl: async () => Response.json({ ok: true, id: RECEIPT }, { status: 202 }) });
  badEvent.client.setChoice('yes');
  assert.deepEqual(await badEvent.client.track('page_view'), { ok: false, error: 'unavailable' });
});

test('one deadline bounds fetch and response JSON, aborts, returns unavailable and never retries', async () => {
  for (const stage of ['fetch', 'json']) {
    let signal, attempts = 0;
    const { client } = setup({ timeoutMs: 10, fetchImpl: async (_path, options) => {
      signal = options.signal; attempts++;
      if (stage === 'fetch') return new Promise(() => {});
      return { status: 202, json: () => new Promise(() => {}) };
    } });
    assert.deepEqual(await client.sendFeedback({ category: 'other', message: 'Synthetic' }), { ok: false, error: 'unavailable' });
    assert.equal(signal.aborted, true);
    assert.equal(attempts, 1);
  }
});

test('completed and failed requests clear deadline timers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const fails of [false, true]) {
    let signal;
    const { client } = setup({ fetchImpl: async (_path, options) => {
      signal = options.signal;
      if (fails) throw Error('offline');
      return Response.json({ ok: true, id: RECEIPT }, { status: 202 });
    } });
    await client.sendFeedback({ category: 'other', message: 'Synthetic' });
    t.mock.timers.tick(10001);
    assert.equal(signal.aborted, false);
  }
});

test('failed no-write removes stale yes when possible; same-page denial survives removal failure', async () => {
  for (const removalFails of [false, true]) {
    const data = new Map([[CHOICE_KEY, 'yes']]);
    let removals = 0, sends = 0;
    const storage = {
      getItem: key => data.get(key),
      setItem() { throw Error('storage write unavailable'); },
      removeItem(key) { removals++; if (removalFails) throw Error('removal unavailable'); data.delete(key); },
    };
    const create = storage => createMeasurementClient({ product: 'company', storage, privacy: {},
      fetchImpl: async () => { sends++; return Response.json({ ok: true }, { status: 202 }); } });
    const first = create(storage), second = create(storage);
    assert.equal(first.choice(), 'yes');
    assert.equal(first.setChoice('no'), 'no');
    assert.equal(removals, 1);
    assert.equal(first.choicePersistence(), 'page');
    await first.track('page_view'); await second.track('page_view');
    assert.equal(create(storage).choice(), 'no'); // Further clients on this page.
    assert.equal(sends, 0);
    // A fresh storage facade simulates a different page/module lifetime. If the
    // browser denies BOTH mutation APIs, durable cross-page opt-out is impossible.
    const reload = create({ ...storage });
    assert.equal(reload.choice(), removalFails ? 'yes' : 'unset');
    assert.equal(data.get(CHOICE_KEY), removalFails ? 'yes' : undefined);
  }
});

test('cross-tab opt-out updates visible state and gates traffic; EN/DE failures retain text and recover UI', async () => {
  for (const language of ['en', 'de']) {
    const f = setup();
    f.client.setChoice('yes');
    const listeners = new Map();
    const doc = { createElement: tag => new Element(tag, doc), defaultView: {
      addEventListener: (event, fn) => listeners.set(event, fn), removeEventListener: event => listeners.delete(event),
    } };
    const container = new Element('div', doc);
    const ui = mountMeasurementFeedback(container, { product: 'company', language, storage: f.storage, privacy: {},
      timeoutMs: 10, fetchImpl: async () => ({ status: 202, json: () => new Promise(() => {}) }) });
    const nodes = all(container), copy = NOTICES[language];
    f.storage.setItem(CHOICE_KEY, 'no');
    listeners.get('storage')({ key: CHOICE_KEY });
    assert.ok(nodes.some(node => node.textContent === copy.off));
    assert.equal((await ui.client.track('page_view')).skipped, true);
    const form = nodes.find(node => node.tag === 'form');
    const message = nodes.find(node => node.tag === 'textarea');
    const submit = nodes.find(node => node.type === 'submit');
    message.value = '<svg onload=unsafe>plain text';
    nodes.find(node => node.tag === 'select').value = 'other';
    await form.listeners.submit({ preventDefault() {} });
    assert.equal(submit.disabled, false);
    assert.equal(form.resets, undefined);
    assert.equal(message.value, '<svg onload=unsafe>plain text');
    assert.ok(nodes.some(node => node.textContent === copy.unavailable));
    ui.destroy();
    assert.equal(listeners.size, 0);
    for (const error of ['rate', 'capacity']) {
      const target = new Element('div', doc);
      mountMeasurementFeedback(target, { product: 'company', language, storage: null, privacy: {},
        fetchImpl: async () => Response.json({ ok: false, error }, { status: error === 'rate' ? 429 : 503 }) });
      const elements = all(target), form = elements.find(node => node.tag === 'form');
      elements.find(node => node.tag === 'select').value = 'other';
      elements.find(node => node.tag === 'textarea').value = 'Valid report';
      await form.listeners.submit({ preventDefault() {} });
      assert.ok(elements.some(node => node.textContent === copy[error]));
      assert.doesNotMatch(copy[error], /[Cc]heck the fields|[Pp]rüfe die Felder/);
      assert.equal(form.resets, undefined);
      assert.ok(elements.some(node => node.textContent?.includes(copy.pageOnly)));
    }
  }
});

test('EN/DE notices have matching keys and success resets only with a receipt', async () => {
  assert.deepEqual(Object.keys(NOTICES.en).sort(), Object.keys(NOTICES.de).sort());
  for (const language of ['en', 'de']) {
    for (const value of Object.values(NOTICES[language])) assert.ok(typeof value === 'string' && value.length > 0);
    const doc = { createElement: tag => new Element(tag, doc) };
    const container = new Element('div', doc);
    mountMeasurementFeedback(container, { product: 'company', language, storage: null, privacy: {},
      fetchImpl: async () => Response.json({ ok: true, id: RECEIPT }, { status: 202 }) });
    const nodes = all(container), form = nodes.find(node => node.tag === 'form');
    nodes.find(node => node.tag === 'select').value = 'idea';
    nodes.find(node => node.tag === 'textarea').value = '<script>plain text report</script>';
    await form.listeners.submit({ preventDefault() {} });
    assert.equal(form.resets, 1);
    assert.ok(nodes.some(node => node.textContent === NOTICES[language].sent + RECEIPT));
  }
});
