import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('offline discovery filters saved details without inventing remote matches',async()=>{
  const {offlineRecipes}=await import('../src/offline.js');
  const saved={'1':{meal:{idMeal:'1',strMeal:'Tomato Rice',strArea:'Indian',strCategory:'Vegetarian',strInstructions:'Cook rice.',strIngredient1:'Rice'}},
    '2':{meal:{idMeal:'2',strMeal:'Tandoori Chicken',strArea:'Indian',strCategory:'Chicken',strInstructions:'Cook chicken.',strIngredient1:'Chicken'}},
    '3':{meal:{idMeal:'3',strMeal:'Summary only'}}};
  assert.deepEqual(offlineRecipes(saved,{query:'rice',area:'Indian',category:'Vegetarian',letter:'T'}).map(x=>x.idMeal),['1']);
  assert.equal(offlineRecipes(saved,{}).length,2);
  assert.equal(offlineRecipes(saved,{area:'Turkish'}).length,0);
});
async function worker({stores=new Map(),network={mode:'online'},version='first',install=true}={}) {
  const handlers={},base='https://tasteit.test/';
  const key=x=>new URL(typeof x==='string'?x:x.url,base).href;
  const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const items=stores.get(name);return{
    async put(req,res){items.set(key(req),res.clone());},async match(req){return items.get(key(req))?.clone();},async delete(req){return items.delete(key(req));}};},
    async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
  const self={registration:{scope:base},location:{href:base+'sw.js',origin:'https://tasteit.test'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>{handlers[name]=fn;}};
  const app='<meta name="application-name" content="Tasteit"><main id="app">Tasteit</main>';
  const sandbox={self,caches,URL,Request,Response,AbortController,setTimeout,clearTimeout,crypto:globalThis.crypto,
    fetch:async request=>{if(network.hold&&key(request).endsWith('/src/api.js'))await network.hold();if(network.mode==='offline')throw new TypeError('Network unavailable');const url=key(request);
      if(url===base){if(network.mode==='login')return new Response('<title>Sign in required</title>',{headers:{'content-type':'text/html'}});
        if(network.mode==='redirect')return new Response('',{status:302,headers:{location:'/signin-with-chatgpt'}});
        return new Response(app,{headers:{'content-type':'text/html'}});}
      return new Response('asset',{headers:{'content-type':url.endsWith('.css')?'text/css':url.endsWith('.svg')?'image/svg+xml':url.endsWith('.webmanifest')?'application/manifest+json':'text/javascript'}});
    }};
  vm.runInNewContext((await readFile('sw.js','utf8')).replace('__TASTEIT_BUILD__',version),sandbox);
  const installation=()=>{let pending;handlers.install({waitUntil:p=>{pending=p;}});return pending;};
  if(install)await installation();
  return {stores,network,installation,mode:v=>{network.mode=v;},
    async ready(){let pending,result;handlers.message({data:'TASTEIT_OFFLINE_STATUS',ports:[{postMessage:value=>{result=value.ready;}}],waitUntil:p=>{pending=p;}});await pending;return result;},
    async asset(path){let response;handlers.fetch({request:new Request(base+path),respondWith:p=>{response=p;}});return response;},async navigate(){let response;handlers.fetch({request:{url:base,method:'GET',mode:'navigate'},respondWith:p=>{response=p;},waitUntil:()=>{}});return response;},
    intercept(url){let handled=false;handlers.fetch({request:{url,method:'GET',mode:'cors'},respondWith:()=>{handled=true;},waitUntil:()=>{}});return handled;}};
}
test('offline worker serves the app shell but never intercepts APIs or external photos',async()=>{
  const w=await worker();w.mode('offline');
  assert.ok((await (await w.navigate()).text()).includes('content="Tasteit"'));
  assert.equal(w.intercept('https://tasteit.test/api/sync'),false);
  assert.equal(w.intercept('https://www.themealdb.com/image.jpg'),false);
  assert.equal(w.intercept('https://tasteit.test/signin-with-chatgpt'),false);
});
test('reachable login pages and redirects win over offline copies and evict the shell',async()=>{
  for(const mode of ['login','redirect']) {
    const w=await worker();w.mode(mode);const online=await w.navigate();
    assert.equal(online.status,mode==='redirect'?302:200);
    w.mode('offline');assert.equal((await w.navigate()).status,503);
  }
});

test('a waiting worker cannot restore a shell invalidated by a reachable sign-in',async()=>{
  const active=await worker(),waiting=await worker({stores:active.stores,network:active.network,version:'next'});
  assert.equal(await waiting.ready(),true);
  active.mode('login');await active.navigate();active.mode('offline');
  assert.equal(await active.ready(),false);assert.equal(await waiting.ready(),false);
  assert.equal((await waiting.navigate()).status,503);
});
test('an installation in progress cannot finish across an authentication invalidation',async()=>{
  const active=await worker();let arrived,release;const started=new Promise(r=>{arrived=r;});
  active.network.hold=()=>{arrived();return new Promise(r=>{release=r;});};
  const waiting=await worker({stores:active.stores,network:active.network,version:'next',install:false});
  const installing=waiting.installation();await started;
  active.mode('login');await active.navigate();active.mode('online');delete active.network.hold;release();
  await assert.rejects(installing,/invalidated/);active.mode('offline');
  assert.equal((await waiting.navigate()).status,503);
});
test('a valid return after sign-in rewarms every shell asset before reporting ready',async()=>{
  const w=await worker();w.mode('login');await w.navigate();assert.equal(await w.ready(),false);
  w.mode('online');await w.navigate();assert.equal(await w.ready(),true);
  w.mode('offline');assert.equal((await w.navigate()).status,200);
  assert.equal((await w.asset('src/app.js')).status,200);
  assert.equal((await w.asset('styles.css')).status,200);
});
