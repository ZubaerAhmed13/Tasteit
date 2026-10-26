import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';import {createWorker} from '../server/worker.js';import {collectedMeal} from '../src/selected-kitchen.js';import {emptyStore} from '../src/model.js';
const catalogue=JSON.parse(await readFile('data/selected-recipes.json','utf8')),worker=createWorker(await applicationAssets()),breakfast=catalogue.recipes.find(r=>r.id==='swasthi-poha-recipe-kanda-batata-poha'),id='selected-'+breakfast.id;
let failCatalogue=false;
const server=createServer(async(req,res)=>{try{if(failCatalogue&&req.url.split('?')[0]==='/data/selected-recipes.json'){res.writeHead(503,{'cache-control':'no-store','content-type':'application/json'});res.end('{}');return;}const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
try{
 browser=await({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
 const context=await browser.newContext({viewport:{width:375,height:812}}),page=await context.newPage(),errors=[],providerLookups=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/search.php|lookup.php/.test(r.url()))providerLookups.push(r.url());});
 await context.route(/https:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.route(/https:\/\//,r=>r.request().resourceType()==='image'?r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=','base64')}):r.abort());
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
 await page.locator('.recipe-card .recipe-title').first().click();await page.locator('[role=dialog]').waitFor();const returning=await page.locator('#dialog-title').innerText(),returnScroll=await page.evaluate(()=>scrollY);await page.goBack();await page.locator('[role=dialog]').waitFor({state:'hidden'});
 await page.waitForFunction(title=>document.activeElement?.textContent===title,returning).catch(async error=>{throw new Error(error.message+'; return diagnostics='+JSON.stringify(await page.evaluate(()=>({href:location.href,state:history.state,focus:document.activeElement?.outerHTML,scroll:scrollY}))));});assert.ok(page.url().includes('page=2'));assert.ok(Math.abs(await page.evaluate(()=>scrollY)-returnScroll)<2);
 // Mobile disclosure, readable credits, stable failed image and zoomed layout.
 await page.locator('#discovery-filter-panel').evaluate(n=>n.open=true);await page.locator('#discover-course').focus();assert.equal(await page.locator('#discover-course').evaluate(n=>n===document.activeElement),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('.recipe-card .recipe-photo').first().click();await page.locator('[role=dialog]').waitFor();
 const reference=page.locator('.ingredient-reference').first();await reference.waitFor();assert.ok(Number.parseFloat(await reference.locator('figcaption').evaluate(n=>getComputedStyle(n).fontSize))>=12);assert.ok(await reference.locator('.ingredient-photo-link').getAttribute('href'));
 const photo=page.locator('.dialog-photo').first();if(await photo.count()){const before=await photo.boundingBox();await photo.dispatchEvent('error');const after=await page.locator('.dialog-photo-unavailable').boundingBox();assert.ok(after.height>=before.height-1);}
 // 320 CSS px is the reflow width of a 1280px viewport at 400% magnification.
 await page.setViewportSize({width:320,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.ok((await page.locator('#recipe-plan-form button').boundingBox()).height>=44);assert.ok(Number.parseFloat(await reference.locator('figcaption').evaluate(n=>getComputedStyle(n).fontSize))>=12);
 await page.keyboard.press('Escape');await page.setViewportSize({width:640,height:900});
 // Large cookbook stays paginated; overlapping catalogue IDs do not duplicate results.
 const large=emptyStore();for(const record of catalogue.recipes){const m=collectedMeal(record);large.saved[m.idMeal]={meal:m,wanted:true};}
 await page.evaluate(store=>localStorage.setItem('tasteit.local.v1',JSON.stringify(store)),large);await page.goto(base+'?scope=saved&course=breakfast');await page.locator('#discovery-page-status').waitFor();assert.equal(await page.locator('.recipe-card').count(),24);assert.equal(new Set(await page.locator('.recipe-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId))).size,24);
 // Failed collection keeps a saved breakfast and a visible retry, then recovers.
 const failed=await browser.newPage({viewport:{width:375,height:812}});failed.on('pageerror',e=>errors.push(e.message));await failed.route(/https:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await failed.addInitScript(store=>localStorage.setItem('tasteit.local.v1',JSON.stringify(store)),large);failCatalogue=true;await failed.goto(base+'?q='+encodeURIComponent(breakfast.title));await failed.locator('[data-recipe-id="'+id+'"]').waitFor();assert.ok((await failed.locator('.service-warning').innerText()).includes('catalogue is unavailable'));failCatalogue=false;await failed.locator('.service-warning [data-action=retry]').click();await failed.locator('.service-warning').waitFor({state:'hidden'});
 // Offline filters and ingredient search retain the same saved metadata meaning.
 await page.goto(base+'?view=library');await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller)&&document.querySelector('#offline-status')?.textContent==='Ready offline');
 await page.goto(base+'?scope=saved&source=swasthi&course=breakfast&rated=1&sort=rating&page=2');await page.locator('#discovery-page-status').filter({hasText:'of 51'}).waitFor();
 // Exercise offline UI changes directly; continuity-browser separately proves
 // shell reload against a real connection refusal (Firefox automation's global
 // offline navigation can reject before the service worker handles it).
 await context.setOffline(true);await page.locator('.service-warning').filter({hasText:'You are offline'}).waitFor();await page.locator('#discovery-page-status').filter({hasText:'of 51'}).waitFor();assert.equal(await page.locator('.recipe-card').count(),24);
 await page.locator('#recipe-search').fill('beaten rice');await page.locator('#recipe-search').press('Enter');await page.locator('[data-recipe-id="'+id+'"]').waitFor();await context.setOffline(false);
 // A delayed provider directory must preserve a typed catalogue-only cuisine.
 const late=await browser.newPage({viewport:{width:375,height:812}});await late.route(/https:\/\/(?!127\.0\.0\.1)/,r=>r.abort());late.on('pageerror',e=>errors.push(e.message));let releaseAreas,markAreas,areaTimer;const areasRequested=new Promise((resolve,reject)=>{markAreas=resolve;areaTimer=setTimeout(()=>reject(Error('Provider cuisine request did not start')),30000);});
 await late.route('**/api/json/v1/1/**',async route=>{const u=new URL(route.request().url());if(u.pathname.endsWith('list.php')&&u.searchParams.has('a')){await new Promise(r=>{releaseAreas=r;clearTimeout(areaTimer);markAreas();});await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[{strArea:'Indian'}]})});}else await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[]})});});
 await late.goto(base);await areasRequested;await late.locator('.loading-screen').waitFor({state:'hidden'});await late.locator('.recipe-card').first().waitFor();await late.locator('#discovery-filter-panel').evaluate(n=>n.open=true);await late.locator('#discover-cuisine').fill('South Indian');assert.ok(releaseAreas);releaseAreas();
 await late.waitForFunction(()=>[...document.querySelectorAll('#cuisine-options option')].some(n=>n.value==='South Indian'));assert.equal(await late.locator('#discover-cuisine').inputValue(),'South Indian');await late.locator('#discovery-filters button[type=submit]').click();await late.waitForFunction(()=>new URL(location.href).searchParams.get('cuisine')==='South Indian');await late.locator('.recipe-card').first().waitFor();assert.ok(await late.locator('.recipe-card').count()>0);
 // Scope switches update available controls, clear unsupported applied filters,
 // and preserve the unrelated draft query.
 const scoped=await browser.newPage({viewport:{width:375,height:812}});await scoped.route(/https:\/\/(?!127\.0\.0\.1)/,r=>r.abort());scoped.on('pageerror',e=>errors.push(e.message));await scoped.route('**/search.php*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[]})}));
 await scoped.goto(base+'?source=swasthi&course=breakfast&rated=1&sort=rating&q=poha');await scoped.locator('.recipe-card').first().waitFor();await scoped.locator('#discovery-filter-panel').evaluate(n=>n.open=true);await scoped.locator('#recipe-search').fill('unsent draft');await scoped.locator('#discover-scope').focus();await scoped.locator('#discover-scope').selectOption('provider');
 await scoped.locator('#discover-category').waitFor();assert.equal(await scoped.locator('#discover-course').count(),0);assert.equal(await scoped.locator('#recipe-search').inputValue(),'unsent draft');assert.equal(await scoped.locator('#discover-scope').evaluate(n=>n===document.activeElement),true);
 await scoped.locator('#discovery-filters button[type=submit]').click();await scoped.waitForFunction(()=>new URL(location.href).searchParams.get('scope')==='provider');for(const key of ['source','course','rated','sort'])assert.equal(new URL(scoped.url()).searchParams.has(key),false);
 // Removing only the course keeps query, publisher and rating choices.
 await scoped.goto(base+'?source=swasthi&course=breakfast&rated=1&sort=rating&q=poha');await scoped.locator('[data-action=remove-course]').click();await scoped.waitForFunction(()=>!new URL(location.href).searchParams.has('course'));for(const [k,v]of [['source','swasthi'],['rated','1'],['sort','rating'],['q','poha']])assert.equal(new URL(scoped.url()).searchParams.get(k),v);
 assert.deepEqual(providerLookups,[]);assert.deepEqual(errors,[]);console.log('PASS coherent interface: collected breakfast search/save/home/open/plan, route paging/Back, keyboard/mobile/320px reflow, large cookbook and failure recovery');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
