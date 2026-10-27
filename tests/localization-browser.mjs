import {chromium} from 'playwright';
import {checkNarrowLayout} from './narrow-layout.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let dnsQueries=0, fontCSS='';
 await context.route('https://cloudflare-dns.com/**',async route=>{dnsQueries++;await route.fulfill({json:{Status:0,Answer:[]}});});
 await context.route('http://local.test/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').pop()||'index.html';const data=await readFile(new URL(name,root));await route.fulfill({body:name.endsWith('.css')?Buffer.concat([data,Buffer.from('\n'+fontCSS)]):data,contentType:/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});
 await page.goto('http://local.test/?lang=de');await page.locator('[data-app-language="de"]').waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'de');
 assert.equal(await page.evaluate(async()=>{const {translate}=await import('/language.js');const el=document.createElement('p');el.textContent='Remove query entry 1: $&$1';document.body.append(el);await new Promise(r=>setTimeout(r,0));const output=el.textContent;el.remove();return translate('Remove query entry 1: $&$1')===output&&output.endsWith('$&$1');}),true);
 const app='unpack-this-url';
 if(app==='rehearsal'){
   assert.match(await page.locator('#purpose').innerText(),/Plane deine Veranstaltung/);
   assert.equal(await page.locator('#title').inputValue(),'Probe der Produkteinführung');
   await page.locator('#title').fill('Keep current event');
   await page.locator('#steps textarea').first().fill('Published records');
   await page.locator('#delayStep').selectOption('demo');await page.locator('#delay').fill('10');
   await page.locator('#unavailable').selectOption('Sam');
   assert.match(await page.locator('#summary').innerText(),/Geschätztes Ende/i);
   assert.match(await page.locator('#simulation-context').innerText(),/fehlt während/);
 }else if(app==='unpack-this-url'){
   await page.locator('#example').click();await page.locator('#remove-tracking').check();await page.locator('#remove-fragment').check();
   assert.match(await page.locator('#status').innerText(),/Auf diesem Gerät/);
   assert.match(await page.locator('#transformations').innerText(),/Abfrageeintrag/);
 }else{
   await page.locator('#purpose-mailbox').check();assert.match(await page.locator('#mailbox-help').innerText(),/E-Mail-Anbieters/);assert.equal(dnsQueries,0);
   await page.locator('#purpose-dns').check();await page.locator('#domain').fill('gmail.com');await page.locator('#demo').click();
   assert.match(await page.locator('#overview').innerText(),/Versandberechtigung/);
   assert.match(await page.locator('#cards').innerText(),/SPF nennt zulässige Versanddienste/);
   assert.match(await page.locator('#cards').innerText(),/Selektor erforderlich/);assert.equal(dnsQueries,0);
 }
 const snapshot=()=>page.evaluate(()=>({values:[...document.querySelectorAll('input,textarea,select')].map(e=>[e.id,e.value,e.checked,e.disabled]),raw:[...document.querySelectorAll('pre,[data-l10n-raw]:not([data-l10n-raw="false"])')].map(e=>e.textContent)}));
 const before=await snapshot();
 await page.locator('[data-app-language="en"]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.deepEqual(await snapshot(),before);
 assert.match(page.url(),/lang=en/);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('arcdrake-language-change',{detail:{language:'de'}})));
 assert.equal(await page.locator('html').getAttribute('lang'),'de');assert.deepEqual(await snapshot(),before);
 assert.equal(await page.evaluate(()=>localStorage.getItem('arcdrake-tools-language')),'de');
 await mkdir(new URL('../artifacts/localization/',import.meta.url),{recursive:true});
 await writeFile(new URL('../artifacts/localization/german.txt',import.meta.url),await page.locator('body').innerText());
 await page.screenshot({path:new URL('../artifacts/localization/german.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
 if(app==='rehearsal'){
   await page.evaluate(()=>{window.__exportBlob=null;URL.createObjectURL=blob=>{window.__exportBlob=blob;return 'blob:test';};document.addEventListener('click',e=>{if(e.target.tagName==='A'&&e.target.download)e.preventDefault();},true);});await page.locator('#export').click();const html=await page.evaluate(()=>window.__exportBlob.text());assert.match(html,/<html lang="de"/);assert.match(html,/Notizen \/ Status/);assert.match(html,/Keep current event/);assert.match(html,/Published records/);assert.doesNotMatch(html,/Test changes:/);
 }else if(app==='unpack-this-url'){
   await page.locator('#url-input').fill('invalid');await page.locator('#inspect-form button[type="submit"]').click();assert.match(await page.locator('#error').innerText(),/Keine gültige absolute URL/);
 }else{
   await page.locator('#domain').fill('invalid');await page.locator('#check').click();assert.match(await page.locator('#error').innerText(),/öffentliche DNS-Domain/);
 }
 await page.goto('http://local.test/?lang=en');assert.equal(await page.locator('html').getAttribute('lang'),'en');
 await page.evaluate(()=>localStorage.setItem('arcdrake-tools-language','de'));await page.goto('http://local.test/');assert.equal(await page.locator('html').getAttribute('lang'),'de');
 await checkNarrowLayout(page,new URL('../artifacts/localization/',import.meta.url),css=>{fontCSS=css;});
 const denied=await context.newPage();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage denied');}}));await denied.goto('http://local.test/?lang=de');assert.equal(await denied.locator('html').getAttribute('lang'),'de');await denied.close();const german=await browser.newContext({locale:'de-DE'});await german.route('http://local.test/**',async route=>{const name=new URL(route.request().url()).pathname.split('/').pop()||'index.html';await route.fulfill({body:await readFile(new URL(name,root)),contentType:/\.m?js$/.test(name)?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});});const native=await german.newPage();await native.goto('http://local.test/');assert.equal(await native.locator('html').getAttribute('lang'),'de');await german.close();
 assert.deepEqual(errors,[]);console.log(app+': German dynamic journey, raw data, EN/DE state retention, shared event, preference/URL precedence, mobile and errors passed.');
}finally{await browser.close();}
