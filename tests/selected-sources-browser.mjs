import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';
import {createWorker} from '../server/worker.js';
import {parseBackup,emptyStore,exportBackup} from '../src/model.js';
import {collectedMeal} from '../src/selected-kitchen.js';
const catalogue=JSON.parse(await readFile('data/selected-recipes.json','utf8')),registry=JSON.parse(await readFile('data/ingredient-photos.json','utf8'));
const collection=JSON.parse(await readFile('data/world-favourites-100.json','utf8'));
const breakfastBatch=JSON.parse(await readFile('docs/research/2026-10-26-breakfast-100-evidence.json','utf8'));
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
 await page.locator('#selected-course').selectOption('breakfast');await page.locator('#selected-filters button[type=submit]').click();
 const breakfastTotal=Number((await page.locator('#selected-status').innerText()).match(/^([0-9]+) of /)?.[1]);assert.ok(breakfastTotal>=143);
 const breakfastIds=[];for(let n=0;n<50;n++){breakfastIds.push(...await page.locator('.selected-card').evaluateAll(cards=>cards.map(c=>c.dataset.recipeId)));if(await page.locator('[data-page=next]').isDisabled())break;await page.locator('[data-page=next]').click();}
 assert.equal(breakfastIds.length,breakfastTotal);assert.equal(new Set(breakfastIds).size,breakfastTotal);for(const recipe of breakfastBatch.recipes)assert.ok(breakfastIds.includes(recipe.id),'new breakfast is browsable: '+recipe.id);
 await page.locator('#selected-course').selectOption('');
 assert.equal(await page.locator('#selected-source option').count(),18);
 assert.match(await page.locator('#selected-source option[value=wikibooks]').textContent(),/^Wikibooks Cookbook \(\d+\)$/);
 await page.locator('#selected-source').selectOption('recipetineats');await page.locator('#selected-query').fill('Easy Chicken Curry');await page.locator('#selected-filters button[type=submit]').click();
 assert.equal(await page.locator('.selected-card').count(),1);assert.ok((await page.locator('.source-rating').innerText()).includes('4.9'));
 assert.equal(await page.locator('.selected-card a.btn').first().getAttribute('href'),'https://www.recipetineats.com/chicken-curry/');
 await page.locator('.selected-ingredients summary').click();assert.equal(await page.locator('.selected-ingredients li').count(),11);
 assert.ok(await page.locator('.ingredient-reference').count()>0,'ingredient reference slots are present');
 assert.equal(await page.locator('.ingredient-reference figcaption').count(),0,'no caption or source beneath photos');
 // Aborted external image requests finish at different times in each engine.
 // A real image error must always yield the same visible placeholder.
 const firstImage=page.locator('.ingredient-reference img').first();
 if(await firstImage.count())await firstImage.evaluate(image=>image.dispatchEvent(new Event('error',{bubbles:true})));
 await page.locator('.ingredient-photo-missing').first().waitFor({timeout:10000});
 assert.ok(await page.locator('footer a[href="./photo-credits.html"]').count()>0,'photo creators and licences are accessible on a separate page');
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
 // Source-specific credit instructions must be retained on the separate attribution page, never beneath a thumbnail.
 const creditsPage=await browser.newPage();await creditsPage.goto('http://127.0.0.1:'+server.address().port+'/photo-credits.html');
 await creditsPage.waitForFunction(()=>document.querySelector('#photo-credits-status')?.textContent.includes('verified ingredient-photo'));
 for(const [id,ingredient,urls]of [
  ['woksoflife-wonton-soup-recipe','wonton wrappers',['https://www.hungryhuy.com/','https://www.hungryhuy.com/wonton-soup-recipe/']],
  ['woksoflife-pad-thai','garlic chives',['https://www.aziatische-ingredienten.nl/']],
  ['recipetineats-jambalaya-recipe','green capsicum',['https://www.khamtran.com/']]
 ]){
  const recipe=catalogue.recipes.find(r=>r.id===id);assert.ok(recipe);
  await page.locator('#selected-collection').selectOption('');await page.locator('#selected-source').selectOption(recipe.source);await page.locator('#selected-query').fill(recipe.title);await page.locator('#selected-filters button[type=submit]').click();
  assert.equal(await page.locator('.selected-card').count(),1);await page.locator('.selected-ingredients summary').click();
  const row=page.locator('.selected-ingredients li').filter({hasText:ingredient});assert.equal(await row.count(),1);
  assert.equal(await row.locator('.ingredient-reference figcaption').count(),0);
  assert.ok(await row.locator('.ingredient-reference').count()>0,'reference slot remains present even when external Wikimedia image delivery is blocked');
  for(const url of urls)assert.ok(await creditsPage.locator('#photo-credits-list a').evaluateAll((links,url)=>links.some(x=>x.href===url),url),'separate source credit: '+url);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await creditsPage.close();
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
 await kitchenCard.getByRole('link',{name:'Open in my kitchen →',exact:true}).click();await page.locator('[role=dialog] #recipe-tag-input').fill('Keep my draft');
 assert.ok((await page.locator('#home-usual').innerText()).includes(kitchenRecipe.title));assert.ok((await page.locator('#home-wanted').innerText()).includes(kitchenRecipe.title));assert.ok((await page.locator('#home-wanted').innerText()).includes('My other saved dish'));
 assert.equal(await page.locator('.ingredient-list li').count(),kitchenRecipe.ingredients.length);
 holdPhotos=false;assert.ok(releasePhotos);releasePhotos();
 const actualPhoto=page.locator('.ingredient-list .ingredient-reference img').first();await actualPhoto.waitFor();await actualPhoto.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const img=document.querySelector('.ingredient-list .ingredient-reference img');return img?.complete&&img.naturalWidth>0;});await actualPhoto.evaluate(img=>img.decode());assert.ok(await actualPhoto.evaluate(img=>img.naturalWidth>0));
 assert.equal(await page.locator('#recipe-tag-input').inputValue(),'Keep my draft');assert.equal(await page.locator('#recipe-tag-input').evaluate(node=>node===document.activeElement),true);
 assert.ok((await page.locator('[role=dialog]').innerText()).includes('Open original cooking method'));assert.deepEqual(providerLookups,[]);
 await actualPhoto.dispatchEvent('error');assert.ok(await page.locator('.ingredient-list .ingredient-photo-missing').filter({hasText:'Photo unavailable'}).count()>0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.reload();await page.locator('[role=dialog]').waitFor();assert.equal(await page.locator('.ingredient-list li').count(),kitchenRecipe.ingredients.length);assert.deepEqual(providerLookups,[]);
 // The publisher method is still linked, but personal steps can be authored and cooked offline.
 const ownSteps=['Wash and prepare the ingredients.','Cook my preferred way until done safely.','Serve while fresh.'];
 await page.locator('#own-method-input').fill(ownSteps.join('\\n').replaceAll('\\n','\n'));
 await page.locator('#own-method-form button[type=submit]').click();
 assert.deepEqual(await page.locator('.instruction-list > li').allTextContents(),ownSteps);
 await page.locator('[data-action=start-cooking]').click();
 assert.ok((await page.locator('.cook-step').innerText()).includes(ownSteps[0]));
 await page.locator('[data-action=step-next]').click();
 assert.ok((await page.locator('.cook-step').innerText()).includes(ownSteps[1]));
 await page.locator('[data-action=exit-cooking]').click();
 assert.ok((await page.locator('#own-method-input').inputValue()).includes(ownSteps[2]));
 await page.reload();await page.locator('[role=dialog] .instruction-list').waitFor();
 assert.deepEqual(await page.locator('.instruction-list > li').allTextContents(),ownSteps);
 assert.deepEqual(providerLookups,[]);
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
 // API interception gets a fresh context; service-worker continuity is tested above and in its dedicated suite.
 const legacy=await browser.newPage({viewport:{width:375,height:812},serviceWorkers:'block'});legacy.on('pageerror',error=>errors.push(error.message));
 await legacy.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());let screenshotLookup=false;
 await legacy.route('**/lookup.php?i=10042',route=>{screenshotLookup=true;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[screenshotMeal]})});});
 await legacy.goto('http://127.0.0.1:'+server.address().port+'/?recipe=10042');await legacy.locator('[role=dialog] .ingredient-list').waitFor().catch(async error=>{throw new Error(error.message+'; intercepted='+screenshotLookup+'; dialog='+(await legacy.locator('#overlay-root').innerText()));});assert.equal(screenshotLookup,true);
 const screenshotBeef=legacy.locator('[data-ingredient-photo="Minced Beef"]'),screenshotOil=legacy.locator('[data-ingredient-photo="Sesame Seed Oil"]');await screenshotBeef.locator('.ingredient-reference').waitFor();await screenshotOil.locator('.ingredient-reference').waitFor();const {ingredientPhoto}=await import('../src/ingredient-photos.js');assert.equal(ingredientPhoto('Minced Beef',registry.photos)?.id,'beef-ground');assert.equal(ingredientPhoto('Sesame Seed Oil',registry.photos)?.id,'sesame-oil');assert.equal(await screenshotBeef.locator('figcaption').count(),0);assert.equal(await screenshotOil.locator('figcaption').count(),0);
 const noPhotos=await browser.newPage();await noPhotos.route('**/data/ingredient-photos.json',route=>route.abort());await noPhotos.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html');await noPhotos.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));assert.ok(await noPhotos.locator('.selected-card').count()>0,'recipe collection survives an unavailable photo registry');

 // Release 1: primary catalogue is usable while both optional requests are pending.
 const base='http://127.0.0.1:'+server.address().port+'/';
 const loading=await browser.newPage({viewport:{width:375,height:812}});loading.on('pageerror',e=>errors.push(e.message));
 await loading.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 let releaseRegistry,releaseCuration;
 await loading.route('**/data/ingredient-photos.json',async route=>{await new Promise(r=>releaseRegistry=r);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(registry)});});
 await loading.route('**/data/world-favourites-100.json',async route=>{await new Promise(r=>releaseCuration=r);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(collection)});});
 await loading.goto(base+'selected-recipes.html?course=breakfast&page=3');
 await loading.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('Showing 49–72'));
 await loading.locator('#selected-query').fill('draft egg');
 const committedUrl=loading.url(),beforeIds=await loading.locator('.selected-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId));
 releaseRegistry();releaseCuration();
 await loading.waitForFunction(()=>document.querySelector('#selected-load-status')?.textContent.trim()==='');
 assert.deepEqual(await loading.locator('.selected-card').evaluateAll(cs=>cs.map(c=>c.dataset.recipeId)),beforeIds);
 assert.equal(await loading.locator('#selected-query').inputValue(),'draft egg');assert.equal(await loading.locator('#selected-query').evaluate(n=>n===document.activeElement),true);
 assert.equal(loading.url(),committedUrl);
 await loading.locator('.selected-card [data-save-flag=wanted]').first().click();assert.equal(loading.url(),committedUrl);
 await loading.reload();await loading.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('Showing 49–72'));
 assert.equal(await loading.locator('#selected-query').inputValue(),'');
 await loading.locator('[data-page=next]').click();assert.ok(loading.url().includes('page=4'));
 await loading.goBack();await loading.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('Showing 49–72'));
 const returnId=await loading.locator('[data-return-recipe]').first().getAttribute('data-return-recipe');
 await loading.locator('[data-return-recipe]').first().click();await loading.locator('[role=dialog]').waitFor();
 await loading.goBack();await loading.waitForFunction(id=>document.activeElement?.dataset.returnRecipe===id,returnId);
 assert.ok(loading.url().includes('page=3'));
 // Submitted searches and reload share the same validated query identity.
 await loading.locator('#selected-query').fill('q'.repeat(201));await loading.locator('#selected-filters button[type=submit]').click();
 assert.equal(new URL(loading.url()).searchParams.get('query').length,200);assert.equal((await loading.locator('#selected-query').inputValue()).length,200);
 const longQueryStatus=await loading.locator('#selected-status').innerText();await loading.reload();await loading.locator('#selected-reset').waitFor();assert.equal(await loading.locator('#selected-status').innerText(),longQueryStatus);
 // Accessor denial itself must show recovery guidance rather than a blank app.
 const denied=await browser.newPage();denied.on('pageerror',e=>errors.push(e.message));
 await denied.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Storage denied','SecurityError');}}));
 await denied.goto(base+'?view=library');await denied.locator('#recovery-title').filter({hasText:'Browser storage is unavailable'}).waitFor();
 await denied.locator('[data-action=recovery-retry]').click();assert.equal(await denied.locator('#backup-file').count(),0);
 await denied.goto(base+'selected-recipes.html');await denied.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));
 assert.ok((await denied.locator('#selected-save-status').innerText()).includes('Open recovery options'));
 // Requested curated results stay empty until curation resolves, then show exactly 100.
 const pending=await browser.newPage();let releaseWorld;
 await pending.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await pending.route('**/data/world-favourites-100.json',async route=>{await new Promise(r=>releaseWorld=r);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(collection)});});
 await pending.goto(base+'selected-recipes.html?collection=world-favourites-100');
 await pending.locator('#selected-status').filter({hasText:'Loading your world favourites'}).waitFor();assert.equal(await pending.locator('.selected-card').count(),0);
 releaseWorld();await pending.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.startsWith('100 of '));
 // Damaged bytes are never rendered as an empty cookbook or overwritten by an ordinary save.
 const damaged='{incomplete Tasteit records\n',recoverySeed=emptyStore(),offlineRecord=catalogue.recipes.find(r=>/poha/i.test(r.title)),offlineMeal=collectedMeal(offlineRecord);
 recoverySeed.saved[offlineMeal.idMeal]={meal:offlineMeal,wanted:true};
 const recovery=await browser.newPage();recovery.on('pageerror',e=>errors.push(e.message));
 await recovery.route(/https:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await recovery.goto(base+'selected-recipes.html');
 await recovery.evaluate(({damaged,checkpoint})=>{localStorage.setItem('tasteit.local.v1',damaged);localStorage.setItem('tasteit.local.last-good.v1',checkpoint);},{damaged,checkpoint:exportBackup(recoverySeed)});
 await recovery.goto(base+'?view=library');await recovery.locator('#recovery-title').waitFor();
 assert.equal(await recovery.locator('.recipe-card').count(),0);
 const downloadPromise=recovery.waitForEvent('download');await recovery.locator('[data-action=recovery-download]').click();const download=await downloadPromise;
 assert.equal(await readFile(await download.path(),'utf8'),damaged);
 assert.equal(await recovery.evaluate(async()=>{const m=await import('./src/model.js');return m.persistStore(m.emptyStore());}),false);
 // Failed preservation leaves primary bytes untouched and keeps the recovery screen.
 await recovery.evaluate(()=>{window.savedSetter=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='tasteit.local.recovery.v1')throw new DOMException('Full','QuotaExceededError');return window.savedSetter.call(this,k,v);};});
 recovery.once('dialog',d=>d.accept());await recovery.locator('[data-action=recovery-restore]').click();
 await recovery.getByRole('status').filter({hasText:'Could not preserve and restore'}).waitFor();
 assert.equal(await recovery.evaluate(()=>localStorage.getItem('tasteit.local.v1')),damaged);
 await recovery.evaluate(()=>Storage.prototype.setItem=window.savedSetter);
 recovery.once('dialog',d=>d.accept());await recovery.locator('[data-action=recovery-restore]').click();
 await recovery.locator('.recipe-title').filter({hasText:offlineRecord.title}).waitFor();
 assert.equal(await recovery.evaluate(()=>localStorage.getItem('tasteit.local.recovery.v1')),damaged);
 // The same recovery screen supports existing version-1 backup imports.
 await recovery.evaluate(()=>localStorage.setItem('tasteit.local.v1','[broken again'));await recovery.reload();await recovery.locator('#recovery-title').waitFor();
 recovery.once('dialog',d=>d.accept());await recovery.locator('#backup-file').setInputFiles({name:'tasteit.json',mimeType:'application/json',buffer:Buffer.from(exportBackup(recoverySeed))});
 await recovery.locator('.recipe-title').filter({hasText:offlineRecord.title}).waitFor();assert.equal(await recovery.evaluate(()=>localStorage.getItem('tasteit.local.recovery.v1')),'[broken again');
 // A saved publisher recipe has no copied method, but remains discoverable offline.
 await recovery.waitForFunction(()=>Boolean(navigator.serviceWorker.controller)&&document.querySelector('#offline-status')?.textContent==='Ready offline');
 await recovery.context().setOffline(true);await recovery.locator('[data-nav=discover]').click();
 await recovery.locator('#recipe-search').fill('poha');await recovery.locator('#search-form button').click();
 await recovery.locator('.recipe-title').filter({hasText:offlineRecord.title}).waitFor();await recovery.locator('.recipe-title').filter({hasText:offlineRecord.title}).click();
 await recovery.locator('[role=dialog]').waitFor();assert.ok((await recovery.locator('[role=dialog]').innerText()).includes('Open original cooking method'));
 await recovery.context().setOffline(false);
 assert.deepEqual(errors,[]);console.log('PASS selected sources: allowlisted recipe collection, genuine rating/count, ingredient photos/credits, filters, gaps and mobile');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
