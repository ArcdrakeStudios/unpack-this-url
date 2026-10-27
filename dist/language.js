import { NOTICES } from './measurement-feedback-client.mjs';
// Local, bundled translations. User input and protocol evidence are never translated.
const KEY='arcdrake-tools-language';
let language='en';
const explicit=new URL(location.href).searchParams.get('lang');
let saved;try{saved=localStorage.getItem(KEY);}catch{}
language=['de','en'].includes(explicit)?explicit:['de','en'].includes(saved)?saved:navigator.language.toLowerCase().startsWith('de')?'de':'en';
const sources=new WeakMap(), attributes=new WeakMap();
const entries=[
 ['{0} query entries match common tracking names. Removing them is optional.', '{0} Abfrageeinträge entsprechen üblichen Tracking-Namen. Das Entfernen ist optional.'],
 ['{0} nested links expanded at the first level. Open all URL details to inspect their hosts.', '{0} verschachtelte Links auf der ersten Ebene aufgeschlüsselt. Öffne alle URL-Details, um ihre Hosts zu prüfen.'],
 ...Object.keys(NOTICES.en).map(key => [NOTICES.en[key], NOTICES.de[key]]),
 ...['on', 'off', 'blocked'].map(key => [NOTICES.en[key] + ' ' + NOTICES.en.pageOnly, NOTICES.de[key] + ' ' + NOTICES.de.pageOnly]),
 ['Optional usage counts and voluntary feedback use this site’s service. If a send cannot be confirmed, your text stays in the form. URL inspection works independently.', 'Optionale Nutzungszählungen und freiwilliges Feedback nutzen den Dienst dieser Website. Wenn der Empfang nicht bestätigt werden kann, bleibt dein Text im Formular. Die URL-Prüfung funktioniert unabhängig davon.'],
 [NOTICES.en.sent + '{0}', NOTICES.de.sent + '{0}'],
 ['URL inspection stays on your device', 'URL-Prüfung bleibt auf deinem Gerät'],
 ['All URL details: anatomy, query entries and nested links', 'Alle URL-Details: Aufbau, Abfrageeinträge und verschachtelte Links'],
 ['Feedback & optional usage counts', 'Feedback und optionale Nutzungszählung'],
 ['Feedback and usage counts are unavailable on this page. URL inspection works independently. You can draft feedback or use the contact link; drafts are not saved.', 'Feedback und Nutzungszählungen sind auf dieser Seite nicht verfügbar. Die URL-Prüfung funktioniert unabhängig davon. Du kannst Feedback entwerfen oder den Kontaktlink nutzen; Entwürfe werden nicht gespeichert.'],
 ['Entered URLs and results are not sent or saved. Optional counts send only product and action type after consent; feedback sends only when you press Send feedback. Language and usage-count choices may be stored. Clear removes the current URL input and results, not a feedback draft or your browser clipboard.', 'Eingegebene URLs und Ergebnisse werden weder gesendet noch gespeichert. Optionale Zählungen senden erst nach Zustimmung Produktcode und Aktionsart; Feedback wird erst mit „Feedback senden“ übertragen. Sprach- und Zählungsauswahl können gespeichert werden. „Leeren“ entfernt die aktuelle URL-Eingabe und Ergebnisse; ein Feedbackentwurf und die Zwischenablage bleiben bestehen.'],
 [
  "Unpack This URL — see what’s inside",
  "Unpack This URL — den Aufbau verstehen"
 ],
 [
  "Read URL anatomy, concealed hosts and nested links on your device. No submitted URL is opened or fetched.",
  "URL-Aufbau, versteckte Hosts und verschachtelte Links auf deinem Gerät lesen. Eingegebene URLs werden weder geöffnet noch abgerufen."
 ],
 [
  "Skip to URL input",
  "Zur URL-Eingabe springen"
 ],
 [
  "A little clarity before the click",
  "Mehr Klarheit vor dem Klick"
 ],
 [
  "See past the",
  "Durchblicke den"
 ],
 [
  "long link.",
  "langen Link."
 ],
 [
  "Find the actual host, untangle query parameters, and reveal URLs tucked inside another URL.",
  "Finde den tatsächlichen Host, entschlüssle Abfrageparameter und entdecke URLs innerhalb einer anderen URL."
 ],
 [
  "We read the text. We never visit it. This is a syntax inspector, not a destination or safety check.",
  "Wir lesen den Text, ohne die Adresse aufzurufen. Dieses Werkzeug prüft die Syntax; es prüft weder das Ziel noch dessen Sicherheit."
 ],
 [
  "What’s in this URL?",
  "Was steckt in dieser URL?"
 ],
 [
  "01 / PASTE",
  "01 / EINFÜGEN"
 ],
 [
  "Absolute URL",
  "Absolute URL"
 ],
 [
  "Up to 8,192 characters. Ctrl / ⌘ + Enter to inspect.",
  "Bis zu 8.192 Zeichen. Strg / ⌘ + Eingabe zum Untersuchen."
 ],
 [
  "Unpack URL",
  "URL aufschlüsseln"
 ],
 [
  "Try an example",
  "Beispiel ausprobieren"
 ],
 [
  "Clear",
  "Leeren"
 ],
 [
  "The host the parser sees",
  "Der vom Parser erkannte Host"
 ],
 [
  "02 / LOOK CLOSER",
  "02 / GENAU HINSEHEN"
 ],
 [
  "This is a parsed host name. It does not confirm who owns it, where it resolves, or whether it is trustworthy.",
  "Dies ist der vom Parser ermittelte Hostname. Er bestätigt weder den Eigentümer noch die aufgelöste Adresse oder die Vertrauenswürdigkeit."
 ],
 [
  "Things the text tells us",
  "Was der Text erkennen lässt"
 ],
 [
  "URL anatomy",
  "URL-Aufbau"
 ],
 [
  "03 / PIECE BY PIECE",
  "03 / TEIL FÜR TEIL"
 ],
 [
  "Browser-parsed fields below; original query and fragment retain their exact spelling. Default ports may disappear from the parsed form.",
  "Unten stehen die vom Browser ermittelten Felder. Die ursprüngliche Abfrage und das Fragment bleiben exakt erhalten. Standardports können in der geparsten Form entfallen."
 ],
 [
  "Original text & browser serialization",
  "Originaltext und Browser-Darstellung"
 ],
 [
  "Original, unchanged",
  "Original, unverändert"
 ],
 [
  "Browser serialization, for comparison",
  "Browser-Darstellung zum Vergleich"
 ],
 [
  "Case, encoding, empty paths, dot segments and default ports may be normalized by the browser. Neither version is opened.",
  "Der Browser kann Großschreibung, Kodierung, leere Pfade, Punktsegmente und Standardports normalisieren. Keine Version wird geöffnet."
 ],
 [
  "Query entries",
  "Abfrageeinträge"
 ],
 [
  "Ordered exactly as written. Decoded labels use form-query rules: “+” becomes a space. Duplicate keys stay separate.",
  "Die ursprüngliche Reihenfolge bleibt erhalten. Dekodierte Bezeichnungen folgen Formular-Abfrageregeln: „+“ wird zum Leerzeichen. Doppelte Schlüssel bleiben getrennt."
 ],
 [
  "Links inside the link",
  "Links innerhalb des Links"
 ],
 [
  "FOLLOW THE TEXT",
  "DEM TEXT FOLGEN"
 ],
 [
  "Only common redirect parameter names are expanded. Up to 3 levels, 12 links, and 2 extra percent-decoding passes per value. A parameter is a clue, not proof of a redirect.",
  "Nur übliche Weiterleitungsparameter werden aufgeschlüsselt: bis zu 3 Ebenen, 12 Links und 2 zusätzliche Prozent-Dekodierungen je Wert. Ein Parameter ist ein Hinweis, kein Beweis für eine Weiterleitung."
 ],
 [
  "Make a cleaner copy",
  "Eine bereinigte Kopie erstellen"
 ],
 [
  "04 / YOUR CHOICE",
  "04 / DEINE WAHL"
 ],
 [
  "Select changes, inspect the exact preview, then copy. Cleanup can change behavior: tracking-looking keys may matter, fragments can route an app, and credentials can be required.",
  "Änderungen wählen, die exakte Vorschau prüfen und dann kopieren. Die Bereinigung kann das Verhalten ändern: Vermeintliche Tracking-Schlüssel können wichtig sein, Fragmente eine App steuern und Zugangsdaten erforderlich sein."
 ],
 [
  "Optional transformations",
  "Optionale Änderungen"
 ],
 [
  "Remove common tracking keys",
  "Übliche Tracking-Schlüssel entfernen"
 ],
 [
  "Remove user information before @",
  "Benutzerinformationen vor @ entfernen"
 ],
 [
  "Remove the fragment after #",
  "Fragment nach # entfernen"
 ],
 [
  "Exact proposed URL",
  "Exakter URL-Vorschlag"
 ],
 [
  "Copy this preview",
  "Diese Vorschau kopieren"
 ],
 [
  "Unselected parts keep their original bytes, query order and duplicates. Nothing is automatically redirected, submitted or opened.",
  "Nicht gewählte Teile behalten ihre ursprünglichen Bytes, Abfragereihenfolge und Duplikate. Nichts wird automatisch weitergeleitet, übermittelt oder geöffnet."
 ],
 [
  "Your link stays here.",
  "Dein Link bleibt hier."
 ],
 [
  "Built to make URL structure legible.",
  "Damit URL-Strukturen lesbar werden."
 ],
 [
  "(absent / empty)",
  "(fehlt / leer)"
 ],
 [
  "No changes selected or applicable.",
  "Keine Änderungen gewählt oder anwendbar."
 ],
 [
  "Level {0} · query entry {1} · {2}",
  "Ebene {0} · Abfrageeintrag {1} · {2}"
 ],
 [
  "(no host)",
  "(kein Host)"
 ],
 [
  "Unicode form: {0}",
  "Unicode-Form: {0}"
 ],
 [
  "Decoded value & decoding steps",
  "Dekodierter Wert und Dekodierungsschritte"
 ],
 [
  "Form-query decoded value",
  "Nach Formular-Abfrageregeln dekodierter Wert"
 ],
 [
  "Extra percent-decoding pass {0}",
  "Zusätzlicher Prozent-Dekodierungsschritt {0}"
 ],
 [
  "(no host in this scheme)",
  "(kein Host in diesem Schema)"
 ],
 [
  "Read after the @. The text before it is user information, even if it looks like another website.",
  "Lies den Teil nach dem @. Davor stehen Benutzerinformationen, auch wenn sie wie eine andere Website aussehen."
 ],
 [
  "Read the host separately from the path and query. Names elsewhere in the URL do not change this host.",
  "Lies den Host getrennt von Pfad und Abfrage. Namen an anderen Stellen der URL ändern diesen Host nicht."
 ],
 [
  "ASCII / punycode",
  "ASCII / Punycode"
 ],
 [
  "Unicode display",
  "Unicode-Darstellung"
 ],
 [
  "Scheme (original)",
  "Schema (Original)"
 ],
 [
  "Scheme (parsed)",
  "Schema (geparst)"
 ],
 [
  "Host (parsed)",
  "Host (geparst)"
 ],
 [
  "Port (original)",
  "Port (Original)"
 ],
 [
  "Port (parsed)",
  "Port (geparst)"
 ],
 [
  "Origin (parsed)",
  "Ursprung (geparst)"
 ],
 [
  "Authority (original)",
  "Authority (Original)"
 ],
 [
  "User information (original)",
  "Benutzerinformationen (Original)"
 ],
 [
  "Username (encoded)",
  "Benutzername (kodiert)"
 ],
 [
  "Password (encoded)",
  "Passwort (kodiert)"
 ],
 [
  "Path (original)",
  "Pfad (Original)"
 ],
 [
  "Path (parsed)",
  "Pfad (geparst)"
 ],
 [
  "Query (original)",
  "Abfrage (Original)"
 ],
 [
  "Fragment (original)",
  "Fragment (Original)"
 ],
 [
  "{0} EXPANDED",
  "{0} AUFGESCHLÜSSELT"
 ],
 [
  "No query entries in this URL.",
  "Keine Abfrageeinträge in dieser URL."
 ],
 [
  "(empty key)",
  "(leerer Schlüssel)"
 ],
 [
  "duplicate",
  "doppelt"
 ],
 [
  "tracking pattern",
  "Tracking-Muster"
 ],
 [
  "encoding malformed",
  "fehlerhafte Kodierung"
 ],
 [
  "(empty value)",
  "(leerer Wert)"
 ],
 [
  "Exact raw entry",
  "Exakter Roheintrag"
 ],
 [
  "No expandable HTTP(S) link found in the supported parameter names. Links in other fields or deeper encodings may still be present.",
  "Kein aufschlüsselbarer HTTP(S)-Link in den unterstützten Parametern gefunden. Andere Felder oder weitere Kodierungsebenen können dennoch Links enthalten."
 ],
 [
  "Cleanup applies only to this outer URL; nested links are not rewritten.",
  "Die Bereinigung gilt nur für die äußere URL; verschachtelte Links bleiben unverändert."
 ],
 [
  "Cleanup is disabled for ambiguous syntax, non-HTTP(S) schemes or more than 150 query entries. The original remains readable.",
  "Die Bereinigung ist bei mehrdeutiger Syntax, anderen Schemata als HTTP(S) oder mehr als 150 Abfrageeinträgen deaktiviert. Das Original bleibt lesbar."
 ],
 [
  "Unpacked on this device. No URL was opened.",
  "Auf diesem Gerät aufgeschlüsselt. Keine URL wurde geöffnet."
 ],
 [
  "Input changed. Unpack again to update the analysis.",
  "Eingabe geändert. Zum Aktualisieren erneut aufschlüsseln."
 ],
 [
  "Cleared. No history is saved by this app.",
  "Geleert. Diese App speichert keinen Verlauf."
 ],
 [
  "Copied exactly as previewed.",
  "Exakt wie in der Vorschau kopiert."
 ],
 [
  "Clipboard access is unavailable. The exact preview is selected; copy it with Ctrl / ⌘ + C.",
  "Kein Zugriff auf die Zwischenablage. Die exakte Vorschau ist markiert; kopiere sie mit Strg / ⌘ + C."
 ],
 [
  "Use an absolute URL up to {0} characters.",
  "Verwende eine absolute URL mit bis zu {0} Zeichen."
 ],
 [
  "Paste an absolute URL to inspect.",
  "Füge eine absolute URL zum Untersuchen ein."
 ],
 [
  "This cannot be parsed as an absolute URL. Include a scheme, such as https://.",
  "Keine gültige absolute URL. Gib ein Schema wie https:// an."
 ],
 [
  "Credentials are present before the host. Text before @ is user information, not the destination host.",
  "Vor dem Host stehen Zugangsdaten. Text vor @ enthält Benutzerinformationen und ist nicht der Zielhost."
 ],
 [
  "The {0} scheme is not an ordinary HTTP web address. It may represent code, a local resource or an application handler.",
  "Das Schema {0} ist keine gewöhnliche HTTP-Webadresse. Es kann Code, eine lokale Ressource oder einen App-Aufruf darstellen."
 ],
 [
  "The scheme is HTTP, which does not specify encrypted transport.",
  "Das Schema ist HTTP und legt keine verschlüsselte Übertragung fest."
 ],
 [
  "Whitespace or control characters are present. Browser URL parsing may trim or remove them; the original is shown unchanged.",
  "Leer- oder Steuerzeichen sind enthalten. Der Browser kann sie kürzen oder entfernen; das Original wird unverändert angezeigt."
 ],
 [
  "Backslashes are present. Browser web URL parsing may interpret them as slashes.",
  "Rückwärtsschrägstriche sind enthalten. Der Browser kann sie als Schrägstriche interpretieren."
 ],
 [
  "This host contains an internationalized label. Compare its ASCII and Unicode forms; similar-looking characters can belong to different hosts.",
  "Dieser Host enthält eine internationalisierte Bezeichnung. Vergleiche ASCII- und Unicode-Form; ähnlich aussehende Zeichen können zu verschiedenen Hosts gehören."
 ],
 [
  "Only the first {0} query entries are expanded. Cleanup is disabled for this input.",
  "Nur die ersten {0} Abfrageeinträge werden aufgeschlüsselt. Die Bereinigung ist für diese Eingabe deaktiviert."
 ],
 [
  "Malformed percent encoding is retained literally in the affected query entry.",
  "Fehlerhafte Prozent-Kodierung bleibt im betroffenen Abfrageeintrag wörtlich erhalten."
 ],
 [
  "Nested decoding reached a limit. No claim is made about unexpanded values.",
  "Die verschachtelte Dekodierung hat eine Grenze erreicht. Über nicht aufgeschlüsselte Werte wird keine Aussage getroffen."
 ],
 [
  "Cleanup needs an unambiguous HTTP(S) URL within the query limit.",
  "Die Bereinigung benötigt eine eindeutige HTTP(S)-URL innerhalb der Abfragegrenze."
 ],
 [
  "Remove user information: {0}",
  "Benutzerinformationen entfernen: {0}"
 ],
 [
  "Remove query entry {0}: {1}",
  "Abfrageeintrag {0} entfernen: {1}"
 ],
 [
  "Remove fragment: {0}",
  "Fragment entfernen: {0}"
 ]
];
const patterns=entries.filter(([s])=>s.includes('{0}')).map(([s,t])=>[new RegExp('^'+s.split(/(\{\d+\})/).map(v=>/^\{\d+\}$/.test(v)?'(.*?)':v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$','s'),t]);
const exact=new Map(entries);
export function translate(value){const raw=String(value);if(language!=='de')return raw;const s=raw.trim();if(!s)return raw;let output=exact.get(s);if(output===undefined){for(const [pattern,target] of patterns){const match=s.match(pattern);if(match){output=target.replace(/\{(\d+)\}/g,(_,i)=>match[Number(i)+1]);break;}}}return output===undefined?raw:raw.replace(s,()=>output);}
export const getLanguage=()=>language;
export function translateHTML(html){const doc=new DOMParser().parseFromString(html,'text/html');const walker=doc.createTreeWalker(doc.documentElement,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement.closest('style,script,[data-l10n-raw]:not([data-l10n-raw="false"])'))continue;const v=n.nodeValue.trim();if(v)n.nodeValue=n.nodeValue.replace(v,()=>translate(v));}doc.documentElement.lang=language;return '<!doctype html>'+doc.documentElement.outerHTML;}
function text(node){const old=sources.get(node);const value=node.nodeValue;if(old&&value===old.output){node.nodeValue=language==='de'?old.output:old.source;old.output=node.nodeValue;if(language==='de')old.output=node.nodeValue=translate(old.source);return;}const trimmed=value.trim();if(!trimmed)return;const translated=translate(trimmed);const output=value.replace(trimmed,()=>translated);sources.set(node,{source:value,output});node.nodeValue=output;}
function refresh(){observer.disconnect();const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement.closest('script,style,textarea,pre,[data-l10n-raw]:not([data-l10n-raw="false"]),.arcdrake-collection-nav'))text(n);}for(const el of document.querySelectorAll('[aria-label],[placeholder],meta[name="description"]')){if(el.closest('[data-l10n-raw]:not([data-l10n-raw="false"]),.arcdrake-collection-nav'))continue;let saved=attributes.get(el);if(!saved){saved={};attributes.set(el,saved);}for(const attr of ['aria-label','placeholder',...(el.matches('meta')?['content']:[])]){if(!el.hasAttribute(attr))continue;const value=el.getAttribute(attr);const old=saved[attr];const source=old&&value===old.output?old.source:value;const output=translate(source);saved[attr]={source,output};el.setAttribute(attr,output);}}document.documentElement.lang=language;for(const b of document.querySelectorAll('[data-app-language]'))b.setAttribute('aria-pressed',String(b.dataset.appLanguage===language));observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});}
const observer=new MutationObserver(refresh);
function setLanguage(next,announce=false){if(!['de','en'].includes(next))return;language=next;try{localStorage.setItem(KEY,next);}catch{}try{const url=new URL(location.href);url.searchParams.set('lang',next);history.replaceState(history.state,'',url);}catch{}refresh();if(announce)window.dispatchEvent(new CustomEvent('arcdrake-language-change',{detail:{language:next}}));}
const control=document.createElement('nav');control.className='language-switch';control.setAttribute('aria-label','Language / Sprache');for(const [value,label] of [['en','English'],['de','Deutsch']]){const button=document.createElement('button');button.type='button';button.dataset.appLanguage=value;button.lang=value;button.textContent=label;control.append(button);}
document.querySelector('header').append(control);control.addEventListener('click',e=>{if(e.target.dataset.appLanguage)setLanguage(e.target.dataset.appLanguage,true);});
window.addEventListener('arcdrake-language-change',e=>setLanguage(e.detail?.language));
refresh();
