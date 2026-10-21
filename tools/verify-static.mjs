import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Keep in sync with package-release.py; the inventory parity test prevents drift.
export const RELEASE_FILES = ['index.html', 'style.css', 'app.js', 'anatomy.js', 'language.js']

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
    throw Error('dist must contain exactly the five approved regular release files; review unknown assets before adding them')
  }
  for (const file of RELEASE_FILES) {
    const path = typeof directory === 'string' ? resolve(directory, file) : new URL(file, directory)
    verifySource(file, await readFile(path, 'utf8'))
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyStaticAssets()
  console.log('Static regression checks passed: reviewed inventory and scoped language-only persistence. This is not a data-flow/security proof.')
}
