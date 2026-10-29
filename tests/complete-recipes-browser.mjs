import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createServer} from 'node:http';import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';import {createWorker} from '../server/worker.js';import {collectedMeal} from '../src/selected-kitchen.js';import {emptyStore,parseBackup} from '../src/model.js';
const licensed=JSON.parse(await readFile('data/complete-recipes.json','utf8')).recipes,original=JSON.parse(await readFile('data/selected-recipes.json','utf8')).recipes;
const full=licensed.find(r=>r.id==='wikibooks-13260'),meal=collectedMeal(full),legacy=collectedMeal(original[0]);
const seed={...emptyStore(),saved:{[legacy.idMeal]:{meal:legacy,usual:true,wanted:true,tags:['Keep this']}}};const worker=createWorker(await applicationAssets());
const server=createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser,page;
try{
 browser=await({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});const context=await browser.newContext({viewport:{width:375,height:812},acceptDownloads:true});page=await context.newPage();const errors=[],publisherRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).hostname==='en.wikibooks.org')publisherRequests.push(r.url());});
 await context.addInitScript(data=>{if(!localStorage.getItem('tasteit.local.v1'))localStorage.setItem('tasteit.local.v1',JSON.stringify(data));},seed);
 await context.route(/https:\/\//,r=>r.abort());
 await page.goto(base);await page.locator('[data-action=complete-recipes]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('source')==='wikibooks');await page.locator('.recipe-card').first().waitFor();
 assert.ok((await page.locator('.recipe-availability').allTextContents()).every(s=>s.includes('Full recipe')));
 await page.locator('#recipe-search').fill(full.title);await page.locator('#recipe-search').press('Enter');await page.locator('[data-recipe-id="'+meal.idMeal+'"]').waitFor();
 await page.locator('[data-recipe-id="'+meal.idMeal+'"] .recipe-title').click();await page.locator('[role=dialog] .instruction-list').waitFor();
 assert.deepEqual(await page.locator('.instruction-list > li').allTextContents(),full.method.steps);assert.ok((await page.locator('.recipe-text-credit').innerText()).includes('CC BY-SA 4.0'));assert.equal(await page.locator('.recipe-text-credit a').first().getAttribute('href'),full.method.revisionUrl);
 await page.locator('[role=dialog] [data-action=wanted]').filter({hasText:'Save recipe for offline'}).click();
 await page.locator('#base-servings-input').fill('2');await page.locator('#original-servings-form button[type=submit]').click();await page.locator('[data-action=servings-plus]').click();await page.locator('[data-action=servings-plus]').click();
 assert.ok((await page.locator('.serving-panel').innerText()).includes('do not scale automatically'));
 await page.locator('[data-action=start-cooking]').click();assert.ok((await page.locator('.preparation-checklist').innerText()).includes('Selected portions: 4'));assert.ok((await page.locator('.preparation-checklist').innerText()).includes('Adjust them manually'));await page.getByRole('heading',{name:'Step 1 of '+full.method.steps.length,exact:true}).waitFor();await page.locator('[data-preparation-index="0"]').check();await page.locator('[data-action=step-next]').click();
 await page.getByRole('heading',{name:'Step 2 of '+full.method.steps.length,exact:true}).waitFor();await page.locator('[data-action=timer-preset][data-minutes="5"]').click();await page.locator('[data-action=timer-start]').click();
 await page.keyboard.press('Escape');await page.locator('[role=dialog]').waitFor({state:'hidden'});await page.locator('.site-nav [data-nav=library]').click();
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller)&&document.querySelector('#offline-status')?.textContent==='Ready offline');
 const downloading=page.waitForEvent('download');await page.locator('[data-action=export-data]').click();const download=await downloading,backup=parseBackup(await readFile(await download.path(),'utf8'));
 assert.deepEqual(backup.saved[meal.idMeal].meal.selectedRecipe.method,full.method);assert.deepEqual(backup.saved[legacy.idMeal],seed.saved[legacy.idMeal]);assert.equal(backup.cookingSessions[meal.idMeal].step,1);assert.equal(backup.cookingSessions[meal.idMeal].servings,4);
 await new Promise(r=>{server.close(r);server.closeAllConnections();});await assert.rejects(fetch(base));await page.reload();await page.locator('.recipe-title').filter({hasText:full.title}).click();await page.locator('[role=dialog] .instruction-list').waitFor();
 assert.deepEqual(await page.locator('.instruction-list > li').allTextContents(),full.method.steps);await context.setOffline(true);await page.locator('[data-action=start-cooking]').click();await page.getByRole('heading',{name:'Step 2 of '+full.method.steps.length,exact:true}).waitFor();assert.equal(await page.locator('[data-preparation-index="0"]').isChecked(),true);assert.ok((await page.locator('.recipe-text-credit').innerText()).includes('CC BY-SA 4.0'));
 const session=await page.evaluate(id=>JSON.parse(localStorage.getItem('tasteit.local.v1')).cookingSessions[id],meal.idMeal);assert.ok(session.endsAt>Date.now());
 await page.setViewportSize({width:320,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 while(await page.locator('[data-action=step-next]').count())await page.locator('[data-action=step-next]').click();await page.locator('[data-action=cook-done]').click();await page.locator('#cooking-log-form button[type=submit]').click();await page.locator('#cooking-log-form').waitFor({state:'hidden'});
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')).saved);assert.equal(saved[meal.idMeal].cookedCount,1);assert.deepEqual(saved[legacy.idMeal],seed.saved[legacy.idMeal]);assert.deepEqual(publisherRequests,[]);assert.deepEqual(errors,[]);
 console.log('PASS complete recipes: licensed discovery, numbered steps, cooking/timer/checklist, backup, real offline reload/resume/finish, original collection and 320px reflow.');
}catch(error){if(page)console.log('Complete-recipe diagnostics',await page.evaluate(()=>({url:location.href,dialog:document.querySelector('[role=dialog]')?.innerText,offline:document.getElementById('offline-status')?.textContent})).catch(()=>({})));throw error;}
finally{await browser?.close();if(server.listening)await new Promise(r=>server.close(r));}
