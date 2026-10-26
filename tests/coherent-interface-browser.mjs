import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';import {createWorker} from '../server/worker.js';import {collectedMeal} from '../src/selected-kitchen.js';import {emptyStore} from '../src/model.js';
const catalogue=JSON.parse(await readFile('data/selected-recipes.json','utf8')),worker=createWorker(await applicationAssets()),breakfast=catalogue.recipes.find(r=>r.id==='swasthi-poha-recipe-kanda-batata-poha'),id='selected-'+breakfast.id;
const server=createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
try{
 browser=await({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage(),errors=[],providerLookups=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/search.php|lookup.php/.test(r.url()))providerLookups.push(r.url());});
 await context.route(/https:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto(base);await page.locator('[data-recipe-id]').first().waitFor();
 assert.equal(await page.locator('.site-nav [data-nav]').count(),4);assert.equal(await page.evaluate(()=>Boolean(document.getElementById('search-form').compareDocumentPosition(document.getElementById('home-usual'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
 assert.equal(await page.locator('#home-usual .recipe-card').count(),0);assert.equal(await page.locator('#home-wanted .recipe-card').count(),0);
 // Find a new collected breakfast through the primary search, using the keyboard.
 await page.locator('#recipe-search').fill(breakfast.title);await page.locator('#recipe-search').press('Enter');
 const card=page.locator('[data-recipe-id="'+id+'"]');await card.waitFor();assert.equal(await page.locator('.recipe-card').count(),1);
 assert.ok((await card.locator('.source-rating').innerText()).includes(String(breakfast.rating.value)));assert.ok((await card.locator('.source-line').innerText()).includes('Swasthi'));
 const committed=page.url();await card.locator('.quick-save').click();assert.equal(page.url(),committed);
 await card.locator('.recipe-photo').click();await page.locator('#dialog-title').filter({hasText:breakfast.title}).waitFor();
 await page.locator('[role=dialog] [data-action=usual]').click();assert.equal(new URL(page.url()).searchParams.get('q'),breakfast.title);
 const day=await page.locator('#recipe-plan-day').inputValue();await page.locator('#recipe-plan-form button').click();
 assert.equal(await page.evaluate(d=>JSON.parse(localStorage.getItem('tasteit.local.v1')).plan[d],day),id);
 await page.keyboard.press('Escape');await page.locator('[role=dialog]').waitFor({state:'hidden'});assert.equal(page.url(),committed);
 await page.waitForFunction(recipeId=>document.activeElement?.dataset.id===recipeId,id);
 await page.locator('.site-nav [data-nav=discover]').click();await page.locator('#home-usual .recipe-title').filter({hasText:breakfast.title}).waitFor();await page.locator('#home-wanted .recipe-title').filter({hasText:breakfast.title}).waitFor();
 await page.locator('#home-usual .recipe-title').filter({hasText:breakfast.title}).click();await page.locator('[role=dialog]').waitFor();assert.ok((await page.locator('[role=dialog]').innerText()).includes('Open original cooking method'));
 await page.keyboard.press('Escape');await page.locator('.site-nav [data-nav=plan]').click();await page.waitForFunction(({day,id})=>document.querySelector('[data-plan-day="'+day+'"]')?.value===id,{day,id});
 // Full filtered route survives page changes, saves, reload and browser Back.
 await page.goto(base+'?course=breakfast&source=swasthi&sort=rating&rated=1&page=2');await page.locator('#discovery-page-status').filter({hasText:'Page 2'}).waitFor();
 const ids=await page.locator('.recipe-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId));assert.equal(ids.length,24);
 await page.locator('#recipe-search').fill('unsubmitted draft');await page.locator('.main-pagination [data-page="3"]').click();assert.ok(!page.url().includes('unsubmitted'));
 await page.goBack();await page.locator('#discovery-page-status').filter({hasText:'Page 2'}).waitFor();assert.deepEqual(await page.locator('.recipe-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId)),ids);
 await page.reload();await page.locator('#discovery-page-status').filter({hasText:'Page 2'}).waitFor();
 assert.equal(await page.locator('#discover-source').inputValue(),'swasthi');assert.equal(await page.locator('#discover-course').inputValue(),'breakfast');
 await page.locator('.recipe-card .recipe-title').first().click();await page.locator('[role=dialog]').waitFor();const returning=await page.locator('#dialog-title').innerText();await page.goBack();await page.locator('[role=dialog]').waitFor({state:'hidden'});
 await page.waitForFunction(title=>document.activeElement?.textContent===title,returning);assert.ok(page.url().includes('page=2'));
 // Mobile disclosure, readable credits, stable failed image and zoomed layout.
 await page.locator('#discovery-filter-panel').evaluate(n=>n.open=true);await page.locator('#discover-course').focus();assert.equal(await page.locator('#discover-course').evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.recipe-card .recipe-photo').first().click();await page.locator('[role=dialog]').waitFor();
 const reference=page.locator('.ingredient-reference').first();await reference.waitFor();assert.ok(Number.parseFloat(await reference.locator('figcaption').evaluate(n=>getComputedStyle(n).fontSize))>=12);assert.ok(await reference.locator('.ingredient-photo-link').getAttribute('href'));
 const photo=page.locator('.dialog-photo').first();if(await photo.count()){const before=await photo.boundingBox();await photo.dispatchEvent('error');const after=await page.locator('.dialog-photo-unavailable').boundingBox();assert.ok(after.height>=before.height-1);}
 await page.setViewportSize({width:640,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.keyboard.press('Escape');await page.evaluate(()=>document.documentElement.style.fontSize='');
 // Large cookbook stays paginated; overlapping catalogue IDs do not duplicate results.
 const large=emptyStore();for(const record of catalogue.recipes){const m=collectedMeal(record);large.saved[m.idMeal]={meal:m,wanted:true};}
 await page.evaluate(store=>localStorage.setItem('tasteit.local.v1',JSON.stringify(store)),large);await page.goto(base+'?scope=saved&course=breakfast');await page.locator('#discovery-page-status').waitFor();assert.equal(await page.locator('.recipe-card').count(),24);assert.equal(new Set(await page.locator('.recipe-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId))).size,24);
 // Failed collection keeps a saved breakfast and a visible retry, then recovers.
 await page.route('**/data/selected-recipes.json',r=>r.abort());await page.goto(base+'?q='+encodeURIComponent(breakfast.title));await page.locator('[data-recipe-id="'+id+'"]').waitFor();assert.ok((await page.locator('.service-warning').innerText()).includes('catalogue is unavailable'));await page.unroute('**/data/selected-recipes.json');await page.locator('.service-warning [data-action=retry]').click();await page.locator('.service-warning').waitFor({state:'hidden'});
 assert.deepEqual(providerLookups,[]);assert.deepEqual(errors,[]);console.log('PASS coherent interface: collected breakfast search/save/home/open/plan, route paging/Back, keyboard/mobile/zoom, large cookbook and failure recovery');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
