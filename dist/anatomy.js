export const LIMITS = Object.freeze({ input: 8192, query: 150, depth: 3, nested: 12, decodes: 2 })
const redirects = new Set(['url', 'u', 'target', 'redirect', 'redirect_url', 'redirect_uri', 'next', 'continue', 'return', 'returnurl', 'destination', 'dest', 'link'])
const trackers = new Set(['fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid'])
function decoded(raw) {
  try { return { value: decodeURIComponent(raw.replace(/\+/g, ' ')), valid: true } }
  catch { return { value: raw, valid: false } }
}
// RFC 3492 Bootstring decoding. Browser parsing has already validated this host;
// this bounded display conversion does not establish identity or trust.
function unicodeLabel(label) {
  if (!label.startsWith('xn--')) return label
  const input = label.slice(4); let n = 128, i = 0, bias = 72, offset = 0
  const output = []; const dash = input.lastIndexOf('-')
  if (dash >= 0) { for (const c of input.slice(0, dash)) output.push(c.codePointAt(0)); offset = dash + 1 }
  const adapt = (delta, count, first) => { delta = first ? Math.floor(delta / 700) : delta >> 1; delta += Math.floor(delta / count); let k = 0; while (delta > 455) { delta = Math.floor(delta / 35); k += 36 } return k + Math.floor(36 * delta / (delta + 38)) }
  while (offset < input.length) {
    const old = i; let weight = 1
    for (let k = 36; ; k += 36) {
      if (offset >= input.length) throw Error('Invalid punycode')
      const c = input.charCodeAt(offset++); const digit = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : 36
      if (digit >= 36 || !Number.isSafeInteger(i + digit * weight)) throw Error('Invalid punycode')
      i += digit * weight; const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias
      if (digit < t) break
      weight *= 36 - t; if (!Number.isSafeInteger(weight)) throw Error('Invalid punycode')
    }
    bias = adapt(i - old, output.length + 1, old === 0)
    n += Math.floor(i / (output.length + 1)); i %= output.length + 1
    if (n > 0x10ffff || n < 0 || n >= 0xd800 && n <= 0xdfff || output.length > 63) throw Error('Invalid punycode')
    output.splice(i++, 0, n)
  }
  return String.fromCodePoint(...output)
}
export function unicodeHost(host) {
  try { return host.split('.').map(unicodeLabel).join('.') } catch { return host }
}
function rawParts(input) {
  const hash = input.indexOf('#'); const beforeFragment = hash < 0 ? input : input.slice(0, hash)
  const question = beforeFragment.indexOf('?')
  const base = question < 0 ? beforeFragment : beforeFragment.slice(0, question)
  const query = question < 0 ? null : beforeFragment.slice(question + 1)
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(base)?.[1] ?? ''
  const authority = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/.exec(base)?.[1] ?? null
  const userinfo = authority?.includes('@') ? authority.slice(0, authority.lastIndexOf('@')) : null
  const hostport = authority === null ? '' : authority.slice(authority.lastIndexOf('@') + 1)
  const port = (hostport.startsWith('[') ? /\]:(.*)$/.exec(hostport) : /:(.*)$/.exec(hostport))?.[1] ?? null
  const path = authority === null ? base.slice(scheme.length + 1) : base.slice(scheme.length + 3 + authority.length)
  return { base, query, fragment: hash < 0 ? null : input.slice(hash + 1), scheme, authority, userinfo, port, path }
}
export function inspect(input, budget = { count: 0 }, depth = 0) {
  if (typeof input !== 'string' || input.length > LIMITS.input) throw Error(`Use an absolute URL up to ${LIMITS.input.toLocaleString()} characters.`)
  if (!input.trim()) throw Error('Paste an absolute URL to inspect.')
  let url; try { url = new URL(input) } catch { throw Error('This cannot be parsed as an absolute URL. Include a scheme, such as https://.') }
  const raw = rawParts(input); const warnings = []
  if (url.username || url.password) warnings.push('Credentials are present before the host. Text before @ is user information, not the destination host.')
  if (!['https:', 'http:'].includes(url.protocol)) warnings.push(`The ${url.protocol} scheme is not an ordinary HTTP web address. It may represent code, a local resource or an application handler.`)
  if (url.protocol === 'http:') warnings.push('The scheme is HTTP, which does not specify encrypted transport.')
  if (/\s|[\u0000-\u001f\u007f]/.test(input)) warnings.push('Whitespace or control characters are present. Browser URL parsing may trim or remove them; the original is shown unchanged.')
  if (input.includes('\\')) warnings.push('Backslashes are present. Browser web URL parsing may interpret them as slashes.')
  if (url.hostname.includes('xn--')) warnings.push('This host contains an internationalized label. Compare its ASCII and Unicode forms; similar-looking characters can belong to different hosts.')
  const segments = raw.query === null || raw.query === '' ? [] : raw.query.split('&')
  if (segments.length > LIMITS.query) warnings.push(`Only the first ${LIMITS.query} query entries are expanded. Cleanup is disabled for this input.`)
  const queries = segments.slice(0, LIMITS.query).map((segment, index) => {
    const equal = segment.indexOf('='); const key = decoded(equal < 0 ? segment : segment.slice(0, equal)); const value = decoded(equal < 0 ? '' : segment.slice(equal + 1))
    return { index, raw: segment, key: key.value, value: value.value, valid: key.valid && value.valid, hasEquals: equal >= 0, tracking: /^utm_/i.test(key.value) || trackers.has(key.value.toLowerCase()) }
  })
  const counts = new Map(); for (const q of queries) counts.set(q.key, (counts.get(q.key) ?? 0) + 1)
  for (const q of queries) q.duplicate = counts.get(q.key) > 1
  if (queries.some(q => !q.valid)) warnings.push('Malformed percent encoding is retained literally in the affected query entry.')
  const nested = []; let limited = false
  for (const q of queries) {
    if (!redirects.has(q.key.toLowerCase())) continue
    let candidate = q.value; const steps = [candidate]
    for (let round = 0; round <= LIMITS.decodes; round++) {
      if (/^https?:\/\//i.test(candidate)) {
        if (depth >= LIMITS.depth || budget.count >= LIMITS.nested) { limited = true; break }
        try { budget.count++; nested.push({ parameter: q.key, index: q.index, steps, result: inspect(candidate, budget, depth + 1) }) } catch { /* Syntax only: invalid nested values stay in the query. */ }
        break
      }
      if (round === LIMITS.decodes) { if (/%[0-9a-f]{2}/i.test(candidate)) limited = true; break }
      try { const next = decodeURIComponent(candidate); if (next === candidate) break; candidate = next; steps.push(candidate) } catch { break }
    }
  }
  if (limited) warnings.push('Nested decoding reached a limit. No claim is made about unexpanded values.')
  return { original: input, raw, scheme: url.protocol.slice(0, -1), host: url.hostname, unicodeHost: unicodeHost(url.hostname), port: url.port, origin: url.origin, username: url.username, password: url.password, path: url.pathname, query: raw.query, fragment: raw.fragment, normalized: url.href, queries, nested, warnings, depth,
    cleanupAllowed: ['https:', 'http:'].includes(url.protocol) && raw.authority !== null && !/\s|[\u0000-\u001f\u007f\\]/.test(input) && segments.length <= LIMITS.query }
}
export function sanitize(result, choices) {
  if (!result.cleanupAllowed) throw Error('Cleanup needs an unambiguous HTTP(S) URL within the query limit.')
  let base = result.raw.base; const transformations = []
  if (choices.credentials && result.raw.authority.includes('@')) {
    const authority = result.raw.authority; const clean = authority.slice(authority.lastIndexOf('@') + 1)
    base = base.replace(`//${authority}`, () => `//${clean}`); transformations.push(`Remove user information: ${result.raw.userinfo}@`)
  }
  let query = result.raw.query
  if (choices.tracking && query !== null) {
    const kept = []; for (const q of result.queries) { if (q.tracking) transformations.push(`Remove query entry ${q.index + 1}: ${q.raw}`); else kept.push(q.raw) }
    query = kept.join('&'); if (!kept.length && result.queries.length) query = null
  }
  const fragment = choices.fragment ? null : result.raw.fragment
  if (choices.fragment && result.raw.fragment !== null) transformations.push(`Remove fragment: #${result.raw.fragment}`)
  return { value: base + (query === null ? '' : `?${query}`) + (fragment === null ? '' : `#${fragment}`), transformations }
}
