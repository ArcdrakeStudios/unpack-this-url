import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inspect, sanitize, unicodeHost, LIMITS } from '../dist/anatomy.js'
test('concealed user information does not become the host; raw and parsed ports stay distinct', () => {
  const r = inspect('HTTPS://trusted.test:p%40ss@actual.example:443/a/../b?x=1#part')
  assert.equal(r.host, 'actual.example'); assert.equal(r.raw.scheme, 'HTTPS'); assert.equal(r.raw.port, '443'); assert.equal(r.port, ''); assert.equal(r.origin, 'https://actual.example')
  assert.equal(r.raw.path, '/a/../b'); assert.equal(r.path, '/b'); assert.equal(r.raw.userinfo, 'trusted.test:p%40ss'); assert.ok(r.warnings.some(x => x.includes('Credentials')))
})
test('Unicode and punycode host forms are equivalent syntax, not reputation', () => {
  assert.equal(inspect('https://bücher.example/').host, 'xn--bcher-kva.example')
  assert.equal(unicodeHost('xn--bcher-kva.example'), 'bücher.example'); assert.equal(unicodeHost('xn--e1afmkfd.xn--p1ai'), 'пример.рф')
  assert.equal(inspect('https://[::1]:8080/').host, '[::1]')
})
test('query entries preserve duplicates, empty entries, exact encoding and malformed percent values', () => {
  const r = inspect('https://example.test/?x=a+b&x=a%20b&&empty=&flag&bad=%GG')
  assert.equal(r.queries.length, 6); assert.equal(r.queries[0].value, 'a b'); assert.equal(r.queries[1].duplicate, true)
  assert.equal(r.queries[4].hasEquals, false); assert.equal(r.queries[5].valid, false)
  assert.equal(sanitize(r, {}).value, r.original)
})
test('explicit cleanup preserves unrelated bytes, order, duplicates and nested links', () => {
  const r = inspect('https://u:p@example.test:443/a?x=a%20b&utm_source=mail&x=2&next=https%3A%2F%2Fnested.test%2F%3Futm_source%3Dkeep&fbclid=abc#route')
  const output = sanitize(r, { tracking: true, credentials: true, fragment: true })
  assert.equal(output.value, 'https://example.test:443/a?x=a%20b&x=2&next=https%3A%2F%2Fnested.test%2F%3Futm_source%3Dkeep')
  assert.equal(output.transformations.length, 4)
  assert.equal(sanitize(inspect('https://e.test/?utm_source=x#'), { tracking: true }).value, 'https://e.test/#')
})
test('nested redirect values reveal host with bounded extra decoding and recursive depth', () => {
  const target = 'https://nested.test/a?url=' + encodeURIComponent('https://third.test/')
  const r = inspect('https://outer.test/?next=' + encodeURIComponent(encodeURIComponent(target)))
  assert.equal(r.nested[0].result.host, 'nested.test'); assert.equal(r.nested[0].steps.length, 2); assert.equal(r.nested[0].result.nested[0].result.host, 'third.test')
  let deep = 'https://end.test/'; for (let i=0;i<8;i++) deep = 'https://level.test/?url=' + encodeURIComponent(deep)
  let node = inspect(deep); let depth = 0; while(node.nested.length) { depth++; node = node.nested[0].result }
  assert.equal(depth, LIMITS.depth); assert.ok(node.warnings.some(x => x.includes('limit')))
})
test('input, total node, query and unsupported scheme limits are explicit', () => {
  assert.throws(() => inspect('x'.repeat(8193))); assert.throws(() => inspect('/relative')); assert.throws(() => inspect(''))
  const r = inspect('https://e.test/?' + Array.from({length:20},(_,i) => `next=${encodeURIComponent(`https://n${i}.test/`)}`).join('&'))
  assert.equal(r.nested.length, 12); assert.ok(r.warnings.some(x=>x.includes('limit')))
  assert.equal(inspect('https://e.test/?'+Array(151).fill('x=1').join('&')).cleanupAllowed, false)
  const script = inspect('javascript:alert(1)'); assert.equal(script.host, ''); assert.equal(script.cleanupAllowed, false); assert.ok(script.warnings.length)
  assert.equal(inspect('https://e.test\\@other.test/').cleanupAllowed, false)
})
test('HTML-like query content is returned as inert text', () => {
  const r = inspect('https://e.test/?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E'); assert.equal(r.queries[0].value, '<img src=x onerror=alert(1)>')
})
test('credential removal treats replacement metacharacters in valid hosts literally', () => {
  for (const host of ['$&.example', "$'.example", '$$.example', '$`.example']) {
    const r = inspect(`https://user:secret@${host}/path?x=1#keep`)
    const output = sanitize(r, { credentials: true })
    assert.equal(output.value, `https://${host}/path?x=1#keep`)
    assert.equal(inspect(output.value).username, '')
    assert.equal(inspect(output.value).password, '')
  }
})
