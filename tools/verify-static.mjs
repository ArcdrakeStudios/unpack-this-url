import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

// Keep in sync with package-release.py; the inventory parity test prevents drift.
export const RELEASE_FILES = ['index.html', 'style.css', 'app.js', 'anatomy.js', 'language.js', 'feedback.js', 'feedback-config.js', 'measurement-feedback-client.mjs', 'measurement-contract.mjs']

// Exact reviewed shared sources: only this client may send the allowlisted API
// payloads and store the yes/no preference. Keep inspector modules under the
// existing network/storage prohibition. Re-review any shared source update.
const SHARED_HASHES = {
  'measurement-feedback-client.mjs': '62bc550f93eb220083b7ccc16e42bd4dc306acf44c08046a1fe1fc3873c19c29',
  'measurement-contract.mjs': '9b950f60b5f4b2707e78bb17d65ff925008b9413c88380f1622f11f217553132',
}

// Exact reviewed exceptions: preference changes require deliberate review here and
// in browser tests. No submitted data may reach these statements.
const LANGUAGE_EXCEPTIONS = [
  "const KEY='arcdrake-tools-language';",
  "const explicit=new URL(location.href).searchParams.get('lang');",
  'let saved;try{saved=localStorage.getItem(KEY);}catch{}',
  "function setLanguage(next,announce=false){if(!['de','en'].includes(next))return;language=next;try{localStorage.setItem(KEY,next);}catch{}try{const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(history.state,'',url);}catch{}refresh();if(announce)window.dispatchEvent(new CustomEvent('arcdrake-language-change',{detail:{language:next}}));}",
]

// Conservative source regression check, not a JavaScript parser/data-flow proof.
// Literal API references (including aliases/bracket spelling) fail even in comments
// and strings. Computed names, obfuscation and indirect DOM/network effects still
// require code review, CSP and browser checks. Review false positives deliberately.
const FORBIDDEN = /\b(?:localStorage|sessionStorage|indexedDB|cookieStore|caches|CacheStorage|Storage|IDBFactory|XMLHttpRequest|WebSocket|EventSource|sendBeacon|serviceWorker|SharedWorker|Worker|showSaveFilePicker|getDirectory|cookie)\b|\bfetch\b|\blocation\b|\bhistory\s*(?:\.[A-Za-z_$]|\[|=)|\b(?:pushState|replaceState)\b|\b(?:window|globalThis|self)\s*\.\s*open\b|\bopen\s*\(|\beval\s*\(|\bFunction\s*\(|\bimport\s*\(|@import|https?:\/\/[^'"\s<>]+\.(?:js|css)/

export function verifySource(file, source) {
  if (!RELEASE_FILES.includes(file)) throw Error(`Unreviewed release asset: ${file}`)
  if (SHARED_HASHES[file]) {
    if (createHash('sha256').update(source).digest('hex') !== SHARED_HASHES[file]) throw Error(`Unexpected shared source change in ${file}`)
    return
  }
  if (file === 'language.js') {
    for (const exception of LANGUAGE_EXCEPTIONS) {
      if (source.split(exception).length !== 2) throw Error(`Language preference exception changed or duplicated in ${file}`)
      source = source.replace(exception, '')
    }
  }
  const match = source.match(FORBIDDEN)
  if (match) throw Error(`Unexpected network/storage/navigation API in ${file}: ${match[0]}`)
}

export async function verifyStaticAssets(directory = new URL('../dist/', import.meta.url)) {
  const entries = await readdir(directory, { withFileTypes: true })
  if (entries.length !== RELEASE_FILES.length || entries.some(entry => !entry.isFile() || !RELEASE_FILES.includes(entry.name))) {
    throw Error('dist must contain exactly the approved regular release files; review unknown assets before adding them')
  }
  for (const file of RELEASE_FILES) {
    const path = typeof directory === 'string' ? resolve(directory, file) : new URL(file, directory)
    verifySource(file, await readFile(path, 'utf8'))
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyStaticAssets()
  console.log('Static regression checks passed: reviewed inventory, scoped language persistence and exact shared-client sources. This is not a data-flow/security proof.')
}
