import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';
import {createWorker} from '../server/worker.js';
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
 const initial=await page.locator('.selected-card').count();assert.ok(initial>0);
 assert.equal(await page.locator('#selected-source option').count(),17);
 await page.locator('#selected-source').selectOption('recipetineats');await page.locator('#selected-query').fill('Easy Chicken Curry');await page.locator('#selected-filters button[type=submit]').click();
 assert.equal(await page.locator('.selected-card').count(),1);assert.ok((await page.locator('.source-rating').innerText()).includes('4.9'));
 assert.equal(await page.locator('.selected-card a.btn').getAttribute('href'),'https://www.recipetineats.com/chicken-curry/');
 await page.locator('.selected-ingredients summary').click();assert.equal(await page.locator('.selected-ingredients li').count(),11);
 assert.ok(await page.locator('.ingredient-reference figcaption a').count()>0,'real reference photo credits are present');
 assert.ok(await page.locator('.ingredient-photo-missing').count()>0,'unknown/broken images have a visible fallback');
 const photoLinks=await page.locator('.ingredient-reference figcaption a').evaluateAll(links=>links.map(x=>x.href));assert.ok(photoLinks.every(u=>u.startsWith('https://commons.wikimedia.org/')||u.startsWith('https://creativecommons.org/')));
 await page.locator('#selected-source').selectOption('allrecipes');await page.locator('#selected-query').fill('');await page.locator('#selected-filters button[type=submit]').click();await page.locator('#selected-reset').waitFor();
 await page.locator('#selected-reset').click();assert.equal(await page.locator('.selected-card').count(),initial);
 await page.locator('#selected-rated').uncheck();await page.locator('#selected-filters button[type=submit]').click();assert.ok(await page.locator('.selected-card').count()>initial);
 assert.ok((await page.locator('.source-rating').allTextContents()).some(x=>x.includes('Rating not collected')),'uncollected scores do not imply that the publisher has no ratings');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok((await page.locator('#selected-filters button[type=submit]').boundingBox()).height>=44);
 const noPhotos=await browser.newPage();await noPhotos.route('**/data/ingredient-photos.json',route=>route.abort());await noPhotos.goto('http://127.0.0.1:'+server.address().port+'/selected-recipes.html');await noPhotos.waitForFunction(()=>document.querySelector('#selected-status')?.textContent.includes('collected recipes'));assert.ok(await noPhotos.locator('.selected-card').count()>0,'recipe collection survives an unavailable photo registry');
 assert.deepEqual(errors,[]);console.log('PASS selected sources: allowlisted recipe collection, genuine rating/count, ingredient photos/credits, filters, gaps and mobile');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
