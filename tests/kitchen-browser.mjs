import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {emptyStore} from '../src/model.js';
const meal={idMeal:'1',strMeal:'Kitchen test rice',strArea:'Indian',strCategory:'Vegetarian',
  strInstructions:'Prepare the rice.\nCook the rice.',strIngredient1:'Rice',strMeasure1:'1 cup',strMealThumb:''};
const seed=emptyStore();
seed.pantry=[{id:'rice-old',name:'Rice',quantity:'2',unit:'cups',location:'Pantry',expiry:''}];
seed.saved['1']={meal,wanted:true,cookedCount:0};
seed.shoppingExtras=[{id:'manual-rice',name:'Rice',checked:true}];
seed.cookingSessions['1']={step:1,durationSeconds:300,remainingSeconds:300,endsAt:null};
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
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/json/v1/1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:[meal]})}));
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')));
  const block=()=>page.evaluate(()=>{
    window.originalSetItem=Storage.prototype.setItem;
    Storage.prototype.setItem=()=>{throw new DOMException('Storage blocked','QuotaExceededError');};
  });
  const unblock=()=>page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});
  await page.goto(base+'?view=plan');
  await page.locator('[data-action=shopping-receive]').click();
  await page.getByRole('heading',{name:'Review food purchases'}).waitFor();
  await page.locator('[name=pick-0]').check();
  await page.locator('#purchase-amount-0').fill('1');
  await page.locator('#purchase-unit-0').selectOption('kg');

  // Reopening a review must not move old index-based drafts to another product.
  await page.locator('#shopping-extra-input').fill('Onions');
  await page.locator('#shopping-extra-form button').click();
  assert.equal(await page.locator('#purchase-amount-0').inputValue(),'1','incidental renders preserve the same receipt draft');
  assert.equal(await page.locator('[name=pick-0]').isChecked(),true);
  await page.locator('details.completed-shopping').evaluate(node=>{node.open=true;});
  await page.locator('[data-shopping-extra=manual-rice]').click();
  assert.equal((await read()).shoppingExtras.find(row=>row.id==='manual-rice').checked,false);
  // Checking moves the row and changes its accessible name during the click.
  await page.getByRole('checkbox',{name:'Mark Onions purchased'}).click();
  assert.equal((await read()).shoppingExtras.find(row=>row.name==='Onions').checked,true);
  await page.locator('[data-action=shopping-receive]').click();
  assert.ok((await page.locator('.purchase-row legend').innerText()).includes('Onions'));
  assert.equal(await page.locator('[name=pick-0]').isChecked(),false);
  assert.equal(await page.locator('#purchase-amount-0').inputValue(),'');
  await page.locator('[data-action=shopping-receive-cancel]').click();
  await page.locator('details.completed-shopping').evaluate(node=>{node.open=true;});
  await page.getByRole('checkbox',{name:'Mark Onions not purchased'}).click();
  assert.equal((await read()).shoppingExtras.find(row=>row.name==='Onions').checked,false);
  await page.locator('[data-shopping-extra=manual-rice]').click();
  assert.equal((await read()).shoppingExtras.find(row=>row.id==='manual-rice').checked,true);
  await page.locator('[data-action=shopping-receive]').click();
  await page.locator('[name=pick-0]').check();
  await page.locator('#purchase-amount-0').fill('1');
  await page.locator('#purchase-unit-0').selectOption('kg');
  await block();
  await page.locator('#purchase-review-form button[type=submit]').click();
  await page.getByRole('status').filter({hasText:'Could not save purchases'}).waitFor();
  assert.equal((await read()).pantry.length,1);
  assert.equal(await page.locator('#purchase-amount-0').inputValue(),'1');
  await unblock();
  await page.locator('#purchase-review-form button[type=submit]').click();
  await page.locator('#purchase-review-form').waitFor({state:'hidden'});
  let store=await read();
  assert.equal(store.pantry.length,2);assert.equal(store.pantry[0].quantity,'2');assert.equal(store.pantry[1].unit,'kg');
  assert.equal(await page.locator('[data-action=shopping-receive]').isDisabled(),true,'checked purchase cannot be transferred twice');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  await page.locator('.site-nav [data-nav=library]').click();
  await page.locator('.recipe-photo').click();
  await page.locator('[data-action=cook-done]').click();
  await page.locator('#cooking-log-form').waitFor();
  await page.locator('#cooking-log-form summary').getByText('Review ingredients used').click();
  await page.locator('[name=use-0]').check();
  await page.locator('#used-0').fill('1.5');
  await page.locator('#cooking-log-form summary').getByText('Save leftovers').click();
  await page.locator('#leftover-portions').fill('2');
  await page.locator('#cooking-note').fill('First connected kitchen check');
  await block();
  await page.locator('#cooking-log-form button[type=submit]').click();
  await page.getByRole('status').filter({hasText:'Unable to save cooking experience'}).waitFor();
  store=await read();
  assert.equal(store.pantry[0].quantity,'2');assert.equal(store.leftovers.length,0);assert.equal(store.saved['1'].cookedCount,0);
  assert.ok(store.cookingSessions['1']);
  assert.equal(await page.locator('#cooking-note').inputValue(),'First connected kitchen check');
  await unblock();
  await page.locator('#cooking-log-form button[type=submit]').click();
  await page.locator('#cooking-log-form').waitFor({state:'hidden'});
  store=await read();
  assert.equal(store.pantry[0].quantity,'0.5');assert.equal(store.pantry[1].quantity,'1');
  assert.equal(store.leftovers[0].portions,2);assert.equal(store.saved['1'].cookedCount,1);assert.equal(store.cookingSessions['1'],undefined);
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!new URL(location.href).searchParams.has('recipe'));
  await page.locator('.site-nav [data-nav=pantry]').click();
  await page.locator('.leftovers-panel').waitFor();
  await page.locator('[data-action=leftover-use]').click();
  assert.equal((await read()).leftovers[0].portions,1);
  await page.locator('[data-action=leftover-more]').click();
  await page.reload();
  await page.locator('.leftovers-panel').waitFor();
  assert.equal((await read()).leftovers[0].portions,2);
  assert.equal((await read()).pantry[0].quantity,'0.5');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  // Package contents stay unknown; actual package counts can still be confirmed.
  await page.locator('.site-nav [data-nav=plan]').click();
  await page.locator('details.completed-shopping').evaluate(node=>{node.open=true;});
  await page.getByRole('button',{name:'Remove Rice from personal shopping list',exact:true}).click();
  await page.locator('#shopping-extra-input').fill('Rice');
  await page.locator('#shopping-extra-form button').click();
  await page.getByRole('checkbox',{name:'Mark Rice purchased',exact:true}).click();
  assert.equal((await read()).shoppingExtras.find(row=>row.name==='Rice').checked,true);
  await page.locator('[data-action=shopping-receive]').click();
  await page.locator('[name=pick-0]').check();
  await page.locator('#purchase-amount-0').fill('2');
  await page.locator('#purchase-unit-0').selectOption('packs');
  await page.locator('#purchase-review-form button[type=submit]').click();
  await page.locator('#purchase-review-form').waitFor({state:'hidden'});
  await page.locator('.site-nav [data-nav=library]').click();
  await page.locator('.recipe-photo').click();
  await page.locator('[data-action=cook-done]').click();
  await page.locator('#cooking-log-form summary').getByText('Review ingredients used').click();
  const packRow=page.locator('.usage-row').filter({hasText:'2 packs'});
  assert.equal(await packRow.locator('input[type=number]').inputValue(),'');
  await packRow.locator('input[type=checkbox]').check();
  await packRow.locator('input[type=number]').fill('1');
  await page.locator('#cooking-log-form button[type=submit]').click();
  await page.locator('#cooking-log-form').waitFor({state:'hidden'});
  await page.reload();
  await page.locator('[role=dialog]').waitFor();
  store=await read();
  assert.equal(store.pantry.find(row=>row.unit==='packs').quantity,'1');
  assert.equal(store.pantry[0].quantity,'0.5','manual package use leaves other stock batches alone');
  assert.deepEqual(errors,[]);
  console.log('PASS connected kitchen: purchase review, atomic cooking/stock/leftovers, reload and mobile');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
