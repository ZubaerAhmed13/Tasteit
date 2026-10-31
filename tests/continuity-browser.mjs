import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium,firefox,webkit} from 'playwright';
import {applicationAssets} from '../scripts/build-site.mjs';
import {createWorker} from '../server/worker.js';
import {sqliteD1} from './helpers/sqlite-d1.js';
import {emptyStore} from '../src/model.js';
const meal={idMeal:'1',strMeal:'Offline rice',strArea:'Indian',strCategory:'Vegetarian',strInstructions:'Prepare the rice.\nCook the rice.',strIngredient1:'Rice',strMeasure1:'1 cup',strMealThumb:''};
const seed={...emptyStore(),saved:{'1':{meal,wanted:true,cookedCount:0}}};
const DB=sqliteD1(),worker=createWorker(await applicationAssets()),apiLog=[],devices=[];
const server=createServer(async(req,res)=>{
  try {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const headers=new Headers(req.headers);
    // Test-only dispatch adapter. Hosted identity is supplied by Sites, never cookies here.
    headers.set('oai-authenticated-user-id',/tasteit_test_account=([^;]+)/.exec(req.headers.cookie||'')?.[1]||'fixture-a');
    const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers,
      ...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,{DB});
    if(req.url==='/api/sync')apiLog.push({method:req.method,account:headers.get('oai-authenticated-user-id'),status:response.status});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/';let browser;
try {
  browser=await ({chromium,firefox,webkit}[process.env.TASTEIT_BROWSER||'chromium']).launch({headless:true});
  const errors=[];
  async function device(data,account='fixture-a') {
    const context=await browser.newContext({viewport:{width:375,height:812}});
    await context.addCookies([{name:'tasteit_test_account',value:account,url:base}]);
    await context.addInitScript(store=>{
      if(!localStorage.getItem('tasteit.local.v1'))localStorage.setItem('tasteit.local.v1',JSON.stringify(store));
    },data);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/json/v1/1/**',route=>{
      const u=new URL(route.request().url());const rows=u.pathname.endsWith('list.php')?(u.searchParams.has('a')?[{strArea:'Indian'}]:[{strCategory:'Vegetarian'}]):[meal];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({meals:rows})});
    });
    await page.goto(base+'?scope=provider&view=library');await page.locator('#cloud-controls').waitFor();
    assert.equal(await page.evaluate(()=>{const button=document.getElementById('sync-enable');window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('offline'));return button?.isConnected;}),true,'focus while sync is off keeps the opt-in button attached');
    devices.push(page);return {page,context,read:()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')))};
  }
  const a=await device(seed);
  assert.equal((await DB.prepare('SELECT count(*) AS count FROM tasteit_sync').first()).count,0,'no upload before opt-in');
  await a.page.locator('#sync-enable').click();
  await a.page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');
  await a.page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller)&&document.querySelector('#offline-status')?.textContent==='Ready offline');
  const b=await device(emptyStore());await b.page.locator('#sync-enable').click();
  await b.page.locator('.recipe-title').getByText('Offline rice').waitFor();
  await b.page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');

  console.log('Offline readiness',await a.page.evaluate(async()=>({controller:!!navigator.serviceWorker.controller,caches:await caches.keys()})));
  // Prove the fallback against a real connection refusal, without relying on
  // an automation browser's global offline navigation implementation.
  const port=server.address().port;
  await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  assert.equal(server.listening,false);await assert.rejects(fetch(base));
  await a.page.reload();
  await a.page.locator('.recipe-title').getByText('Offline rice').waitFor();
  await a.context.setOffline(true);
  await a.page.locator('.recipe-photo').click();
  await a.page.locator('[data-action=cook-done]').click();
  await a.page.locator('#cooking-note').fill('Cooked while offline');
  await a.page.locator('#cooking-log-form button[type=submit]').click();
  await a.page.locator('#cooking-log-form').waitFor({state:'hidden'});
  assert.equal((await a.read()).saved['1'].cookedCount,1);
  await a.page.keyboard.press('Escape');
  await a.page.waitForFunction(()=>!new URL(location.href).searchParams.has('recipe'));
  await a.page.locator('#connection-status').filter({hasText:'offline'}).waitFor();

  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  await b.page.locator('.recipe-photo').click();await b.page.locator('[data-action=favourite]').click();
  await b.page.keyboard.press('Escape');await b.page.waitForFunction(()=>!new URL(location.href).searchParams.has('recipe'));
  await b.page.locator('#sync-now').click();
  await b.page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');
  await a.context.setOffline(false);
  await a.page.locator('.sync-conflict').waitFor();
  assert.equal((await a.read()).saved['1'].cookedCount,1,'conflict preserves offline journal');
  a.page.once('dialog',dialog=>dialog.accept());await a.page.locator('#sync-keep-local').click();
  await a.page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');
  await b.page.locator('#sync-now').click();
  await b.page.waitForFunction(()=>JSON.parse(localStorage.getItem('tasteit.local.v1')).saved['1'].cookedCount===1);
  assert.equal((await b.read()).saved['1'].favourite,undefined);

  const other=await device(emptyStore(),'fixture-b');await other.page.locator('#sync-enable').click();
  await other.page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent==='Synced');
  assert.equal(Object.keys((await other.read()).saved).length,0,'second account cannot read the first account');
  assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.ok((await a.page.locator('#sync-now').boundingBox()).height>=44,'mobile sync controls have usable touch targets');
  a.page.once('dialog',dialog=>dialog.accept());await a.page.locator('#sync-remove').click();
  await a.page.locator('#sync-enable').waitFor();assert.equal((await a.read()).saved['1'].cookedCount,1);
  await b.page.locator('#sync-now').click();await b.page.locator('.sync-conflict').waitFor();
  assert.equal((await b.read()).saved['1'].cookedCount,1);
  assert.deepEqual(errors,[]);
  console.log('PASS continuity: opt-in account sync, offline reload/edit, conflict choice, isolation, cloud removal and mobile');
} catch(error) {
  console.log('Continuity diagnostics',JSON.stringify({apiLog,devices:await Promise.all(devices.map(async page=>{try{return await page.evaluate(()=>({url:location.href,status:document.querySelector('#cloud-controls')?.innerText,offline:document.querySelector('#offline-status')?.textContent,local:localStorage.getItem('tasteit.local.v1'),progress:localStorage.getItem('tasteit.sync-progress.v1'),controller:!!navigator.serviceWorker.controller}));}catch(e){return {error:e.message};}}))}));
  throw error;
} finally {await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));DB.close();}
