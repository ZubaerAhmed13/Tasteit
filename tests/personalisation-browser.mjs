import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {emptyStore} from '../src/model.js';
const meals=[
  {idMeal:'1',strMeal:'Tomato Rice',strArea:'Indian',strIngredient1:'Rice'},
  {idMeal:'2',strMeal:'Roasted Aubergine',strArea:'Turkish',strIngredient1:'Aubergine'}
].map(m=>({...m,strInstructions:'Prepare the food.\nCook and serve.',strCategory:'Vegetarian',strMeasure1:'1 cup',strMealThumb:''}));
const seed=emptyStore();
seed.saved={'1':{meal:meals[0],wanted:true,tags:['Weeknight']},'2':{meal:meals[1],wanted:true,tags:['Vegetables']}};
const server=createServer(async(req,res)=>{
  const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  if(!/^(index\.html|styles\.css|favicon\.svg|src\/[a-z-]+\.js)$/.test(file)){res.writeHead(404);res.end();return;}
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(path.join(process.cwd(),file)));}
  catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';
let browser;
try {
  browser=await ({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
  const context=await browser.newContext({viewport:{width:375,height:812}});
  await context.addInitScript(store=>{
    if(!localStorage.getItem('tasteit.local.v1'))localStorage.setItem('tasteit.local.v1',JSON.stringify(store));
  },seed);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/json/v1/1/**',route=>{
    const u=new URL(route.request().url());
    const rows=u.pathname.endsWith('list.php')?(u.searchParams.has('a')?[{strArea:'Indian'},{strArea:'Turkish'}]:[{strCategory:'Vegetarian'}]):meals;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:rows})});
  });
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')));
  await page.goto(base);
  await page.locator('#for-your-table').waitFor();
  assert.equal(await page.locator('.recipe-card').count(),2,'recommended cards are not repeated in the source feed');
  await page.locator('#taste-preferences summary').click();
  await page.locator('#taste-cuisines').fill('Indian');
  await page.locator('#taste-avoid').fill('Aubergines');
  await page.evaluate(()=>{
    window.originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=()=>{throw new DOMException('Storage blocked','QuotaExceededError');};
  });
  await page.locator('#taste-form button[type=submit]').click();
  await page.getByRole('status').filter({hasText:'Could not save your taste'}).waitFor();
  assert.equal((await read()).tasteProfile.cuisines.length,0);
  assert.equal(await page.locator('#taste-cuisines').inputValue(),'Indian');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await page.locator('#taste-form button[type=submit]').click();
  assert.equal((await read()).tasteProfile.avoidIngredients[0],'eggplant');
  assert.equal(await page.locator('#for-your-table .recipe-title').innerText(),'Tomato Rice');
  assert.ok((await page.locator('#for-your-table').innerText()).includes('Indian is a cuisine you chose'));
  await page.reload();
  await page.locator('#for-your-table .recipe-title').waitFor();
  await page.locator('#taste-preferences summary').click();
  assert.equal(await page.locator('#taste-cuisines').inputValue(),'Indian');
  await page.locator('[data-action=taste-hide][data-id="1"]').click();
  assert.equal((await read()).tasteProfile.hiddenRecipeIds[0],'1');
  assert.equal((await read()).saved['1'].wanted,true,'skipping does not delete a saved recipe');
  await page.locator('#taste-form [data-action=taste-show-hidden]').click();
  await page.locator('#for-your-table .recipe-title').waitFor();
  assert.equal((await read()).tasteProfile.hiddenRecipeIds.length,0);

  await page.locator('#taste-cuisines').fill('Turkish');
  // Saving a recipe re-renders the page; an unfinished taste draft must survive.
  await page.locator('#for-your-table .quick-save').click();
  assert.equal(await page.locator('#taste-cuisines').inputValue(),'Turkish');
  assert.equal(await page.locator('#taste-preferences').evaluate(node=>node.open),true);
  assert.equal(await page.locator('#taste-cuisines').evaluate(node=>node.closest('details').open),true);
  await page.locator('[data-action=taste-collection][data-tag=Weeknight]').click();
  await page.getByRole('heading',{name:'My personal cookbook.'}).waitFor();
  assert.equal(await page.locator('.recipe-title').innerText(),'Tomato Rice');
  assert.ok((await page.locator('.cookbook-tag-filters .selected').innerText()).includes('Weeknight'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS personal discovery: taste saves, exclusions, skips, collections, draft preservation and mobile');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
