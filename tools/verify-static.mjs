import { readFile } from 'node:fs/promises'
for (const file of ['index.html', 'style.css', 'app.js', 'anatomy.js', 'language.js']) {
  const source = await readFile(`dist/${file}`, 'utf8')
  if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|sessionStorage|window\.open|location\.(href|assign|replace)\s*[(=]|@import|https?:\/\/[^'"\s<>]+\.(?:js|css)/.test(source)) throw Error(`Unexpected network/storage/navigation API in ${file}`)
}
console.log('Static assets verified: no submitted-link network, navigation or persistence APIs.')
