import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';

const meals=[
  {idMeal:'1',strMeal:'Tomato Rice',strArea:'Indian',strCategory:'Vegetarian'},
  {idMeal:'2',strMeal:'Tandoori Chicken',strArea:'Indian',strCategory:'Chicken'},
  {idMeal:'3',strMeal:'Apple Pie',strArea:'British',strCategory:'Dessert'},
  // Daily featured initials rotate. A + B cover every rotation, so initial
  // discovery remains populated without relying on the test execution date.
  {idMeal:'4',strMeal:'Bean Stew',strArea:'Moroccan',strCategory:'Vegetarian'}
].map(m=>({...m,strInstructions:'Prepare ingredients.\nCook and serve.',strIngredient1:'Rice',strMeasure1:'1 cup',
  strMealThumb:'https://www.themealdb.com/images/media/meals/fixture.jpg'}));
const snapshot=JSON.parse(await readFile('data/world-catalogue-index.json','utf8'));
const areas=snapshot.countries.flatMap(c=>c.areas.map(strArea=>({strArea,strCountry:c.country})));
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
  const context=await browser.newContext({viewport:{width:1300,height:900}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let ingredientFailure=false;
  let releaseDetail=null;
  let detailPending=false;
  await page.route('**/api/json/v1/1/**',async route=>{
    const u=new URL(route.request().url());let results=meals;
    const endpoint=u.pathname.split('/').pop();
    if(endpoint==='list.php')results=u.searchParams.has('a')?areas:snapshot.categories.map(strCategory=>({strCategory}));
    if(endpoint==='filter.php') {
      if(u.searchParams.has('i') && ingredientFailure){await route.abort('failed');return;}
      if(u.searchParams.has('a'))results=meals.filter(x=>x.strArea===u.searchParams.get('a'));
      if(u.searchParams.has('c'))results=meals.filter(x=>x.strCategory===u.searchParams.get('c'));
      results=results.map(({idMeal,strMeal,strMealThumb})=>({idMeal,strMeal,strMealThumb}));
    }
    if(endpoint==='search.php') {
      if(u.searchParams.has('s'))results=meals.filter(x=>x.strMeal.toLowerCase().includes(u.searchParams.get('s').toLowerCase()));
      if(u.searchParams.has('f'))results=meals.filter(x=>x.strMeal.toLowerCase().startsWith(u.searchParams.get('f')));
    }
    if(endpoint==='lookup.php') {
      if(detailPending)await new Promise(resolve=>{releaseDetail=resolve;});
      results=meals.filter(x=>x.idMeal===u.searchParams.get('i'));
    }
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:results.length?results:null})});
  });
  await page.route('**/images/media/meals/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#d9e5d7"/></svg>'}));
  await page.goto(base+'?scope=provider');
  await page.locator('.recipe-card').first().waitFor();
  await page.locator('#discovery-filter-panel').evaluate(n=>n.open=true);await page.locator('#discovery-filters').waitFor({timeout:2500});
  assert.equal(await page.locator('[data-action="area"]').count(),0,'195 regions are options, not 195 buttons');
  await page.locator('#discover-cuisine').fill('Indian');
  await page.locator('#discover-category').selectOption('Vegetarian');
  await page.locator('#discovery-filters button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.recipe-card').length===1);
  assert.equal(await page.locator('.recipe-title').innerText(),'Tomato Rice');
  assert.equal(new URL(page.url()).searchParams.get('cuisine'),'Indian');
  assert.equal(new URL(page.url()).searchParams.get('category'),'Vegetarian');
  await page.reload();
  await page.locator('.recipe-title').getByText('Tomato Rice').waitFor();
  assert.equal(await page.locator('#discover-cuisine').inputValue(),'Indian');
  await page.locator('.recipe-photo').click();
  await page.locator('[role=dialog] h2').getByText('Tomato Rice').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('recipe'),'1');
  await page.goBack();
  await page.locator('[role=dialog]').waitFor({state:'hidden'});
  assert.equal(await page.locator('#discover-category').inputValue(),'Vegetarian');
  await page.goForward();
  await page.locator('[role=dialog] h2').getByText('Tomato Rice').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('[role=dialog]').waitFor({state:'hidden'});

  // A blocked write must not alter the rendered flag or persisted record.
  await page.evaluate(()=>{
    window.originalStorageSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=()=>{throw new DOMException('Storage blocked','QuotaExceededError');};
  });
  await page.locator('.quick-save').click();
  await page.getByRole('status').filter({hasText:'Could not save changes'}).waitFor();
  assert.equal(await page.locator('.quick-save').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSetItem;});
  await page.locator('.quick-save').click();
  await page.waitForFunction(()=>document.querySelector('.quick-save')?.getAttribute('aria-pressed')==='true');
  await page.reload();
  await page.locator('.quick-save.saved').waitFor();

  // Mobile filter layout and individual-filter recovery use the full country directory.
  await page.setViewportSize({width:375,height:812});
  const navBox=await page.locator('.site-nav').boundingBox();
  assert.ok(navBox.y>700 && navBox.y+navBox.height<=813,'mobile navigation stays at the viewport bottom');
  await page.locator('[data-action=remove-filter][data-filter=category]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.recipe-card').length===2);
  assert.equal(await page.locator('#discover-cuisine').inputValue(),'Indian');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok((await page.locator('.active-filters').boundingBox()).width>250,'mobile filter labels get a readable full row');
  assert.ok((await page.locator('.recipe-meta').first().innerText()).includes('Indian'),'source-filtered summaries retain cuisine context');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:process.env.TASTEIT_SCREENSHOT||'/tmp/tasteit-discovery-mobile.png',fullPage:true});

  // A source-summary lookup that finishes after navigation cannot reopen the dialog.
  detailPending=true;
  await page.locator('.recipe-title').getByText('Tandoori Chicken').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('recipe')==='2');
  await page.locator('[data-action=close]').click();
  await page.locator('[role=dialog]').waitFor({state:'hidden'});
  detailPending=false;releaseDetail?.();
  await page.locator('.site-nav [data-nav=library]').click();
  await page.getByRole('heading',{name:'My personal cookbook.'}).waitFor();
  assert.equal(await page.locator('[role=dialog]').count(),0);
  await page.goBack();
  await page.locator('#discovery-filters').waitFor();

  // Failed remote ingredient lookup preserves usable saved recipes and offers retry.
  await page.evaluate(()=>{
    const store=JSON.parse(localStorage.getItem('tasteit.local.v1'));
    store.pantry=[{id:'rice-lot',name:'new-offline-rice',quantity:'2',unit:'cup',location:'Pantry',expiry:''}];
    store.saved['1'].meal.strIngredient1='new-offline-rice';
    localStorage.setItem('tasteit.local.v1',JSON.stringify(store));
  });
  ingredientFailure=true;
  await page.goto(base+'?scope=provider&mode=kitchen');
  await page.locator('.service-warning').filter({hasText:'Showing matching recipes saved'}).waitFor();
  assert.equal(await page.locator('.recipe-title').innerText(),'Tomato Rice');
  assert.equal(await page.locator('.service-warning [data-action=retry]').count(),1);

  // A direct recipe link can open without first appearing in discovery results.
  ingredientFailure=false;
  await page.goto(base+'?scope=provider&recipe=3');
  await page.locator('[role=dialog] h2').getByText('Apple Pie').waitFor();
  await page.locator('[data-action=close]').click();
  await page.locator('[role=dialog]').waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).searchParams.has('recipe'),false);

  // Completing an older request must not erase the next query/filter draft.
  let releaseSearch,searchStarted;
  const started=new Promise(resolve=>{searchStarted=resolve;});
  await page.route('**/search.php?s=draft-pending',async route=>{
    await new Promise(resolve=>{releaseSearch=resolve;searchStarted();});
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[meals[0]]})});
  });
  await page.locator('#recipe-search').fill('draft-pending');
  await page.locator('#search-form button').click();
  await started;
  await page.locator('#recipe-search').fill('Next unsent query');
  if(!await page.locator('#discovery-filter-panel').evaluate(n=>n.open))await page.locator('#discovery-filter-panel>summary').click();
  await page.locator('#discover-category').selectOption('Dessert');
  releaseSearch();
  await page.locator('.recipe-title').getByText('Tomato Rice').waitFor();
  assert.equal(await page.locator('#recipe-search').inputValue(),'Next unsent query');
  assert.equal(await page.locator('#discover-category').inputValue(),'Dessert');
  assert.deepEqual(errors,[]);
  console.log('PASS discovery reliability, composed filters, history, direct links and 375px layout');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
