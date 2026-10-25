import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';
import {createWorker} from '../server/worker.js';
import {parseBackup} from '../src/model.js';
const catalogue=JSON.parse(await readFile('data/selected-recipes.json','utf8')),registry=JSON.parse(await readFile('data/ingredient-photos.json','utf8'));
const collection=JSON.parse(await readFile('data/world-favourites-100.json','utf8'));
assert.ok(catalogue.recipes.filter(r=>r.rating).length>=1000,'at least 1000 original publisher recipe ratings');
const worker=createWorker(await applicationAssets());
const server=createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url),{});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await ({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
 const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // External-image delivery is tested separately; every UI run has deterministic images.
 await page.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html');
 await page.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));
 const initial=await page.locator('.selected-card').count();assert.equal(initial,24);
 assert.ok((await page.locator('#selected-status').innerText()).startsWith(catalogue.recipes.filter(r=>r.rating).length+' of '+catalogue.recipes.length));
 const firstIds=await page.locator('.selected-card').evaluateAll(cards=>cards.map(c=>c.dataset.recipeId));await page.locator('[data-page=next]').click();assert.equal(await page.locator('.selected-card').count(),24);assert.notDeepEqual(await page.locator('.selected-card').evaluateAll(cards=>cards.map(c=>c.dataset.recipeId)),firstIds);
 await page.locator('#selected-course').selectOption('dessert');await page.locator('#selected-filters button[type=submit]').click();assert.ok((await page.locator('#selected-pagination').innerText()).includes('Page 1 of'));assert.ok(await page.locator('.selected-card').count()>0);
 await page.locator('#selected-course').selectOption('appetiser');await page.locator('#selected-filters button[type=submit]').click();assert.ok(await page.locator('.selected-card').count()>0);
 await page.locator('#selected-course').selectOption('');
 assert.equal(await page.locator('#selected-source option').count(),17);
 await page.locator('#selected-source').selectOption('recipetineats');await page.locator('#selected-query').fill('Easy Chicken Curry');await page.locator('#selected-filters button[type=submit]').click();
 assert.equal(await page.locator('.selected-card').count(),1);assert.ok((await page.locator('.source-rating').innerText()).includes('4.9'));
 assert.equal(await page.locator('.selected-card a.btn').first().getAttribute('href'),'https://www.recipetineats.com/chicken-curry/');
 await page.locator('.selected-ingredients summary').click();assert.equal(await page.locator('.selected-ingredients li').count(),11);
 assert.ok(await page.locator('.ingredient-reference figcaption a').count()>0,'real reference photo credits are present');
 assert.ok(await page.locator('.ingredient-photo-missing').count()>0,'unknown/broken images have a visible fallback');
 const photoLinks=await page.locator('.ingredient-reference figcaption a').evaluateAll(links=>links.map(x=>x.href));assert.ok(photoLinks.every(u=>u.startsWith('https://commons.wikimedia.org/')||u.startsWith('https://creativecommons.org/')));
 await page.locator('#selected-source').selectOption('allrecipes');await page.locator('#selected-query').fill('');await page.locator('#selected-filters button[type=submit]').click();await page.locator('#selected-reset').waitFor();
 await page.locator('#selected-reset').click();assert.equal(await page.locator('.selected-card').count(),initial);
 await page.locator('#selected-rated').uncheck();await page.locator('#selected-filters button[type=submit]').click();assert.ok((await page.locator('#selected-status').innerText()).startsWith(catalogue.recipes.length+' of '+catalogue.recipes.length));
 // Unrated historical entries remain accessible, including on later pages.
 await page.locator('#selected-query').fill(catalogue.recipes.find(r=>!r.rating).title);await page.locator('#selected-filters button[type=submit]').click();
 assert.ok((await page.locator('.source-rating').allTextContents()).some(x=>x.includes('Rating not collected')),'uncollected scores do not imply that the publisher has no ratings');
 await page.locator('#selected-query').fill('');
 await page.locator('#selected-collection').selectOption('world-favourites-100');await page.locator('#selected-filters button[type=submit]').click();assert.equal(await page.locator('.selected-card').count(),24);assert.ok((await page.locator('#selected-status').innerText()).startsWith('100 of '));assert.ok(page.url().includes('collection=world-favourites-100'));
 const worldIds=[];for(let n=0;n<5;n++){worldIds.push(...await page.locator('.selected-card').evaluateAll(cards=>cards.map(c=>c.dataset.recipeId)));if(n<4)await page.locator('[data-page=next]').click();}assert.deepEqual(new Set(worldIds),new Set(collection.recipeIds));
 const sample=catalogue.recipes.find(x=>x.id===collection.recipeIds[0]);await page.locator('#selected-source').selectOption(sample.source);await page.locator('#selected-query').fill(sample.title);await page.locator('#selected-filters button[type=submit]').click();assert.equal(await page.locator('.selected-card').count(),1);
 const direct=await browser.newPage({viewport:{width:375,height:812}});await direct.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());await direct.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html?collection=world-favourites-100');await direct.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.startsWith('100 of '));assert.equal(await direct.locator('#selected-collection').inputValue(),'world-favourites-100');assert.equal(await direct.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const unavailable=await browser.newPage();await unavailable.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());await unavailable.route('**/data/world-favourites-100.json',route=>route.abort());await unavailable.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html?collection=world-favourites-100');await unavailable.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));assert.equal(await unavailable.locator('.selected-card').count(),24);assert.ok(!(await unavailable.locator('#selected-status').innerText()).startsWith('100 of '));assert.ok((await unavailable.locator('#selected-collection-note').innerText()).includes('unavailable'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const submitBox=await page.locator('#selected-filters button[type=submit]').boundingBox();assert.ok(submitBox.height>=44,'Find recipes touch target: '+JSON.stringify(submitBox));
 // Source-specific credit instructions must be visible beside each reference.
 for(const [id,ingredient,urls]of [
  ['woksoflife-wonton-soup-recipe','wonton wrappers',['https://www.hungryhuy.com/','https://www.hungryhuy.com/wonton-soup-recipe/']],
  ['woksoflife-pad-thai','garlic chives',['https://www.aziatische-ingredienten.nl/']],
  ['recipetineats-jambalaya-recipe','green capsicum',['https://www.khamtran.com/']]
 ]){
  const recipe=catalogue.recipes.find(r=>r.id===id);assert.ok(recipe);
  await page.locator('#selected-collection').selectOption('');await page.locator('#selected-source').selectOption(recipe.source);await page.locator('#selected-query').fill(recipe.title);await page.locator('#selected-filters button[type=submit]').click();
  assert.equal(await page.locator('.selected-card').count(),1);await page.locator('.selected-ingredients summary').click();
  const row=page.locator('.selected-ingredients li').filter({hasText:ingredient});assert.equal(await row.count(),1);
  const credits=await row.locator('.ingredient-reference figcaption a').evaluateAll(links=>links.map(a=>a.href));
  for(const url of urls)assert.ok(credits.includes(url),'adjacent source credit: '+url);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 // A real selected-source save must appear on home and open without a provider lookup.
 const kitchenRecipe=catalogue.recipes.find(r=>r.source==='recipetineats'&&r.ingredients.length>20);assert.ok(kitchenRecipe);
 await page.locator('#selected-collection').selectOption('');await page.locator('#selected-source').selectOption(kitchenRecipe.source);await page.locator('#selected-query').fill(kitchenRecipe.title);await page.locator('#selected-filters button[type=submit]').click();
 const kitchenCard=page.locator('[data-recipe-id="'+kitchenRecipe.id+'"]');await kitchenCard.waitFor();
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Storage blocked','QuotaExceededError');};});
 await kitchenCard.locator('[data-save-flag=usual]').click();assert.equal(await kitchenCard.locator('[data-save-flag=usual]').getAttribute('aria-pressed'),'false');assert.ok((await page.locator('#selected-save-status').innerText()).includes('could not save'));
 await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
 await kitchenCard.locator('[data-save-flag=wanted]').click();
 // A newer unrelated record written between the two actions must survive.
 await page.evaluate(()=>{const key='tasteit.local.v1',store=JSON.parse(localStorage.getItem(key));store.saved['personal-neighbour']={meal:{idMeal:'personal-neighbour',strMeal:'My other saved dish',strPersonal:true,strInstructions:'My own method.',strIngredient1:'Rice'},wanted:true};localStorage.setItem(key,JSON.stringify(store));});
 await kitchenCard.locator('[data-save-flag=usual]').click();assert.equal(await kitchenCard.locator('[data-save-flag=usual]').getAttribute('aria-pressed'),'true');
 let holdPhotos=true,releasePhotos;await page.route('**/data/ingredient-photos.json',async route=>{if(holdPhotos)await new Promise(resolve=>{releasePhotos=resolve;});return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(registry)});});
 // Deterministic image bytes test actual IMG rendering, not live Commons uptime.
 await page.route(/https:\/\/(?:upload|thumb)\.wikimedia\.org\//,route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=','base64')}));
 const providerLookups=[];page.on('request',r=>{if(r.url().includes('lookup.php?i=selected-'))providerLookups.push(r.url());});
 await kitchenCard.locator('a[href^="./?recipe="]').click();await page.locator('[role=dialog] #recipe-tag-input').fill('Keep my draft');
 assert.ok((await page.locator('#home-usual').innerText()).includes(kitchenRecipe.title));assert.ok((await page.locator('#home-wanted').innerText()).includes(kitchenRecipe.title));assert.ok((await page.locator('#home-wanted').innerText()).includes('My other saved dish'));
 assert.equal(await page.locator('.ingredient-list li').count(),kitchenRecipe.ingredients.length);
 holdPhotos=false;assert.ok(releasePhotos);releasePhotos();
 const actualPhoto=page.locator('.ingredient-list .ingredient-reference img').first();await actualPhoto.waitFor();await actualPhoto.scrollIntoViewIfNeeded();await actualPhoto.evaluate(img=>img.decode());assert.ok(await actualPhoto.evaluate(img=>img.naturalWidth>0));
 assert.equal(await page.locator('#recipe-tag-input').inputValue(),'Keep my draft');assert.equal(await page.locator('#recipe-tag-input').evaluate(node=>node===document.activeElement),true);
 assert.ok((await page.locator('[role=dialog]').innerText()).includes('Open original cooking method'));assert.deepEqual(providerLookups,[]);
 await actualPhoto.dispatchEvent('error');assert.ok(await page.locator('.ingredient-list .ingredient-photo-missing').filter({hasText:'Photo unavailable'}).count()>0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.reload();await page.locator('[role=dialog]').waitFor();assert.equal(await page.locator('.ingredient-list li').count(),kitchenRecipe.ingredients.length);assert.deepEqual(providerLookups,[]);
 await page.locator('.dialog-close').click();await page.locator('#home-usual [data-action=home-collection]').click();await page.getByRole('heading',{name:'My personal cookbook.'}).waitFor();assert.ok((await page.locator('#app').innerText()).includes(kitchenRecipe.title));
 // Receive the actual long Maangchi rice-cake line under a reviewed pantry name.
 const riceCakeRecipe=catalogue.recipes.find(r=>r.id==='maangchi-recipe-tteokbokki'),riceCakeId='selected-'+riceCakeRecipe.id;
 await page.goto('http://127.0.0.1:'+server.address().port+'/?recipe='+riceCakeId);await page.locator('[role=dialog] [data-action=wanted]').click();await page.locator('.dialog-close').click();
 await page.locator('.site-nav [data-nav=plan]').click();await page.locator('[data-plan-day]').first().selectOption(riceCakeId);
 const riceCakeRow=page.locator('.shopping-row').filter({hasText:'cylinder shaped rice cake'});assert.equal(await riceCakeRow.count(),1);await riceCakeRow.locator('input[type=checkbox]').check();
 await page.locator('[data-action=shopping-receive]').click();assert.equal(await page.locator('#purchase-name-0').inputValue(),'');await page.locator('#purchase-name-0').fill('Rice cakes');await page.locator('#purchase-amount-0').fill('1');await page.locator('#purchase-unit-0').selectOption('kg');await page.locator('#purchase-review-form input[name=pick-0]').check();await page.locator('#purchase-review-form button[type=submit]').click();await page.locator('#purchase-review-form').waitFor({state:'hidden'});
 await page.locator('.site-nav [data-nav=library]').click();const backupDownload=page.waitForEvent('download');await page.locator('[data-action=export-data]').click();const restored=parseBackup(await readFile(await(await backupDownload).path(),'utf8'));assert.ok(restored.pantry.some(row=>row.name==='Rice cakes'&&row.quantity==='1'));assert.ok(restored.saved[riceCakeId]);
 // The next selected-source save still works after the purchase/backup cycle.
 await page.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html');await page.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));await page.locator('[data-save-flag=usual]').first().click();assert.ok((await page.locator('#selected-save-status').innerText()).includes('Saved to'));
 // Exercise the exact legacy-dialog names supplied in the user's screenshot.
 const screenshotMeal={idMeal:'10042',strMeal:'Mapo tofu screenshot fixture',strSource:'https://www.themealdb.com/',strInstructions:'Read the original source method.',strIngredient1:'Tofu',strIngredient2:'Minced Beef',strIngredient3:'Sesame Seed Oil',strIngredient4:'Salt'};
 await page.route('**/lookup.php?i=10042',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[screenshotMeal]})}));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?recipe=10042');await page.locator('[role=dialog] .ingredient-list').waitFor();
 const screenshotBeef=page.locator('[data-ingredient-photo="Minced Beef"]'),screenshotOil=page.locator('[data-ingredient-photo="Sesame Seed Oil"]');await screenshotBeef.locator('.ingredient-reference').waitFor();assert.ok((await screenshotBeef.innerText()).includes('Raw ground beef'));assert.ok((await screenshotOil.innerText()).includes('Sesame oil'));assert.ok(!(await screenshotOil.innerText()).includes('Sesame seeds'));
 const noPhotos=await browser.newPage();await noPhotos.route('**/data/ingredient-photos.json',route=>route.abort());await noPhotos.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html');await noPhotos.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));assert.ok(await noPhotos.locator('.selected-card').count()>0,'recipe collection survives an unavailable photo registry');
 assert.deepEqual(errors,[]);console.log('PASS selected sources: allowlisted recipe collection, genuine rating/count, ingredient photos/credits, filters, gaps and mobile');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
