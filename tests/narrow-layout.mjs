import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

// Exercise inherited system typography and deliberately wider glyph spacing.
// The override is served as CSS by the existing local route; CSP stays enabled.
export async function checkNarrowLayout(page, artifactRoot, setFontCSS) {
 await mkdir(artifactRoot,{recursive:true});
 for(const [name,css] of [['native',''],['wide-arial','*{font-family:Arial,sans-serif!important;letter-spacing:.4px!important}']]){
  setFontCSS(css);
  await page.setViewportSize({width:320,height:800});
  await page.reload();
  await page.locator('[data-app-language="de"]').waitFor();
  assert.equal(await page.locator('html').getAttribute('lang'),'de');
  const details=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,font:getComputedStyle(document.body).fontFamily,nodes:[...document.querySelectorAll('body *')].filter(element=>{const r=element.getBoundingClientRect();return r.width&&(r.right>innerWidth+1||r.left< -1||element.scrollWidth>element.clientWidth+1);}).map(element=>{const r=element.getBoundingClientRect();return {tag:element.tagName,id:element.id,class:element.className,text:element.textContent.trim().slice(0,160),left:r.left,right:r.right,clientWidth:element.clientWidth,scrollWidth:element.scrollWidth};})}));
  await writeFile(new URL(`320-${name}.json`,artifactRoot),JSON.stringify(details,null,2)+'\n');
  await page.screenshot({path:new URL(`320-${name}.png`,artifactRoot).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  assert.ok(details.scrollWidth<=details.viewport,`320px German overflow (${name}): ${JSON.stringify(details)}`);
 }
 setFontCSS('');
}
