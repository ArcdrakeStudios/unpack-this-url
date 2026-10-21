import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RELEASE_FILES, verifySource, verifyStaticAssets } from '../tools/verify-static.mjs'

const language = await readFile(new URL('../dist/language.js', import.meta.url), 'utf8')

test('current release passes with preference storage and lang history update', async () => {
  await verifyStaticAssets()
})

test('release scanner and packager inventory cannot silently diverge', async () => {
  const packager = await readFile(new URL('../tools/package-release.py', import.meta.url), 'utf8')
  const declaration = packager.match(/^expected = \{([^}]+)\}/m)
  assert.ok(declaration, 'review the inventory if packager format changes')
  const names = [...declaration[1].matchAll(/"([^"]+)"/g)].map(match => match[1])
  assert.deepEqual(names.sort(), [...RELEASE_FILES].sort())
})

const prohibited = [
  "localStorage.setItem('url', submitted)",
  "window['localStorage']['setItem']('url', submitted)",
  'const save = localStorage; save.url = submitted',
  'sessionStorage.url = submitted',
  "indexedDB.open('urls')", 'document.cookie = submitted', "cookieStore.set('url', submitted)",
  "caches.open('urls')", 'const store = window.caches',
  "history.pushState({}, '', submitted)", "history['replaceState']({}, '', submitted)",
  'location.href = submitted', 'location.assign(submitted)', 'window.open(submitted)',
  'fetch(submitted)', 'const send = fetch; send(submitted)', 'new XMLHttpRequest()',
  'navigator.sendBeacon(submitted)', 'new WebSocket(submitted)', 'new EventSource(submitted)',
  "navigator.serviceWorker.register('save.js')", "new Worker('save.js')",
  "import('./save.js')", 'eval(submitted)', "new Function('return localStorage')()",
]
for (const snippet of prohibited) {
  test(`rejects submitted-data route: ${snippet}`, () => {
    for (const file of ['app.js', 'anatomy.js']) assert.throws(() => verifySource(file, snippet), /Unexpected/)
    assert.throws(() => verifySource('language.js', language + '\n' + snippet), /Unexpected/)
  })
}

for (const [before, after] of [
  ['arcdrake-tools-language', 'saved-url'],
  ['localStorage.setItem(KEY,next)', 'localStorage.setItem(KEY,submitted)'],
  ["url.searchParams.set('lang',next)", "url.searchParams.set('url',submitted)"],
  ["history.replaceState(history.state,'',url)", "history.replaceState(history.state,'',submitted)"],
  ["if(!['de','en'].includes(next))return;", ''],
]) {
  test(`rejects changed language exception: ${before}`, () => {
    assert.throws(() => verifySource('language.js', language.replace(before, after)), /exception changed/)
  })
}

test('language exceptions cannot be reused or moved into submitted-data modules', () => {
  assert.throws(() => verifySource('language.js', language + '\nlocalStorage.setItem(KEY,next);'), /Unexpected/)
  assert.throws(() => verifySource('app.js', language), /Unexpected/)
})

test('unknown files, missing modules and directories fail the inventory', async t => {
  // Remove only disposable fixtures created by this test, never application folders.
  const root = await mkdtemp(join(tmpdir(), 'unpack-static-guard-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const scenario of ['unknown', 'nested', 'missing']) {
    const directory = join(root, scenario)
    await mkdir(directory)
    for (const file of RELEASE_FILES.filter(file => scenario !== 'missing' || file !== 'app.js')) {
      await writeFile(join(directory, file), file === 'language.js' ? language : '')
    }
    if (scenario === 'unknown') await writeFile(join(directory, 'save.js'), "localStorage.url = 'example'")
    if (scenario === 'nested') await mkdir(join(directory, 'extras'))
    await assert.rejects(verifyStaticAssets(directory), /exactly the five/)
  }
})
