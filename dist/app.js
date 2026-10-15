import { inspect, sanitize } from './anatomy.js'
const $ = id => document.getElementById(id)
let current = null
const element = (tag, text, className) => { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; return el }
function clearResult() { current = null; $('results').hidden = true; $('error').hidden = true; $('copy').disabled = true; $('copy-status').textContent = '' }
function field(parent, name, value) { parent.append(element('dt', name), element('dd', value === null || value === undefined || value === '' ? '(absent / empty)' : value)) }
function preview() {
  if (!current) return
  $('copy-status').textContent = ''
  const choices = { tracking: $('remove-tracking').checked, credentials: $('remove-credentials').checked, fragment: $('remove-fragment').checked }
  const outcome = current.cleanupAllowed ? sanitize(current, choices) : { value: current.original, transformations: [] }
  $('preview').value = outcome.value
  $('transformations').replaceChildren(...outcome.transformations.map(text => element('li', text)))
  if (!outcome.transformations.length) $('transformations').append(element('li', 'No changes selected or applicable.'))
  $('copy').disabled = !current.cleanupAllowed || !outcome.transformations.length
}
function nestedCard(link) {
  const r = link.result; const card = element('article', '', 'nested-card')
  card.append(element('p', `Level ${r.depth} · query entry ${link.index + 1} · ${link.parameter}`, 'eyebrow'), element('h3', r.host || '(no host)', 'nested-host'), element('p', `${r.scheme} · ${r.path}`, 'mono'))
  if (r.unicodeHost !== r.host) card.append(element('p', `Unicode form: ${r.unicodeHost}`, 'mono'))
  for (const warning of r.warnings) card.append(element('p', warning, 'nested-warning'))
  const details = element('details', ''); details.append(element('summary', 'Decoded value & decoding steps'))
  link.steps.forEach((step, i) => { details.append(element('p', i === 0 ? 'Form-query decoded value' : `Extra percent-decoding pass ${i}`, 'muted'), element('pre', step)) })
  card.append(details)
  for (const child of r.nested) card.append(nestedCard(child))
  return card
}
function show(result) {
  current = result; $('results').hidden = false
  $('main-host').textContent = result.host || '(no host in this scheme)'
  $('host-explanation').textContent = result.username || result.password ? 'Read after the @. The text before it is user information, even if it looks like another website.' : 'Read the host separately from the path and query. Names elsewhere in the URL do not change this host.'
  $('host-forms').replaceChildren()
  if (result.unicodeHost !== result.host) { const forms = element('dl', '', 'anatomy'); field(forms, 'ASCII / punycode', result.host); field(forms, 'Unicode display', result.unicodeHost); $('host-forms').append(forms) }
  $('warning-list').replaceChildren(...result.warnings.map(text => element('li', text))); $('warnings').hidden = !result.warnings.length
  const anatomy = $('anatomy'); anatomy.replaceChildren()
  for (const [name, value] of [['Scheme (original)', result.raw.scheme], ['Scheme (parsed)', result.scheme], ['Host (parsed)', result.host], ['Port (original)', result.raw.port], ['Port (parsed)', result.port], ['Origin (parsed)', result.origin], ['Authority (original)', result.raw.authority], ['User information (original)', result.raw.userinfo], ['Username (encoded)', result.username], ['Password (encoded)', result.password], ['Path (original)', result.raw.path], ['Path (parsed)', result.path], ['Query (original)', result.query], ['Fragment (original)', result.fragment]]) field(anatomy, name, value)
  $('original').value = result.original; $('normalized').value = result.normalized
  $('query-count').textContent = `${result.queries.length} EXPANDED`
  $('queries').replaceChildren()
  if (!result.queries.length) $('queries').append(element('p', 'No query entries in this URL.', 'empty'))
  for (const q of result.queries) {
    const entry = element('article', '', 'query-entry'); const heading = element('div', '', 'query-heading'); heading.append(element('span', String(q.index + 1).padStart(2, '0'), 'query-index'), element('strong', q.key || '(empty key)', 'mono'))
    if (q.duplicate) heading.append(element('span', 'duplicate', 'badge'))
    if (q.tracking) heading.append(element('span', 'tracking pattern', 'badge'))
    if (!q.valid) heading.append(element('span', 'encoding malformed', 'badge'))
    entry.append(heading, element('p', q.value || '(empty value)', 'query-value mono'))
    const details = element('details', ''); details.append(element('summary', 'Exact raw entry'), element('pre', q.raw)); entry.append(details); $('queries').append(entry)
  }
  $('nested').replaceChildren(...result.nested.map(nestedCard))
  if (!result.nested.length) $('nested').append(element('p', 'No expandable HTTP(S) link found in the supported parameter names. Links in other fields or deeper encodings may still be present.', 'empty'))
  $('choices').disabled = !result.cleanupAllowed
  for (const id of ['remove-tracking', 'remove-credentials', 'remove-fragment']) $(id).checked = false
  $('cleanup-limit').textContent = result.cleanupAllowed ? 'Cleanup applies only to this outer URL; nested links are not rewritten.' : 'Cleanup is disabled for ambiguous syntax, non-HTTP(S) schemes or more than 150 query entries. The original remains readable.'
  preview(); $('status').textContent = 'Unpacked on this device. No URL was opened.'
  $('host-heading').setAttribute('tabindex', '-1'); $('host-heading').focus()
}
$('inspect-form').addEventListener('submit', event => { event.preventDefault(); clearResult(); try { show(inspect($('url-input').value)) } catch (error) { $('error').textContent = error.message; $('error').hidden = false; $('status').textContent = ''; $('url-input').focus() } })
$('url-input').addEventListener('input', () => { clearResult(); $('status').textContent = 'Input changed. Unpack again to update the analysis.' })
$('url-input').addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); $('inspect-form').requestSubmit() } })
$('example').addEventListener('click', () => { $('url-input').value = 'https://familiar.example@xn--bcher-kva.example:8443/read?tag=one&tag=two&utm_source=newsletter&next=https%3A%2F%2Fexample.org%2Fwelcome%3Fx%3D1#chapter-2'; $('inspect-form').requestSubmit() })
$('clear').addEventListener('click', () => { $('url-input').value = ''; clearResult(); for (const id of ['original', 'normalized', 'preview']) $(id).value = ''; for (const id of ['main-host', 'host-explanation', 'host-forms', 'warning-list', 'anatomy', 'queries', 'nested', 'transformations']) $(id).replaceChildren(); $('status').textContent = 'Cleared. No history is saved by this app.'; $('url-input').focus() })
$('choices').addEventListener('change', preview)
$('copy').addEventListener('click', async () => {
  if (!current || $('copy').disabled) return
  try { await navigator.clipboard.writeText($('preview').value); $('copy-status').textContent = 'Copied exactly as previewed.' }
  catch { $('preview').focus(); $('preview').select(); $('copy-status').textContent = 'Clipboard access is unavailable. The exact preview is selected; copy it with Ctrl / ⌘ + C.' }
})
