import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const thumb=id=>'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Garlic_bulbs_and_cloves.jpg/250px-asset-'+id+'.jpg';
const verified=id=>({
 id:'sample-'+id,label:'Sample '+id,aliases:['sample '+id],url:thumb(id),
 filePage:'https://commons.wikimedia.org/wiki/File:Sample_'+id+'.jpg',
 creator:'Test creator',licence:'CC BY-SA 4.0',
 licenceUrl:'https://creativecommons.org/licenses/by-sa/4.0/',verified:true
});
function serviceWorkerHarness(code,photos=[]) {
 const handlers=new Map(),buckets=new Map();
 let online=true,networkRequests=0;
 const caches={
  async open(name){
   if(!buckets.has(name))buckets.set(name,new Map());
   const data=buckets.get(name);
   return {
    match:async key=>data.get(key.url||key)?.clone(),
    put:async(key,value)=>{data.set(key.url||key,value.clone());},
    keys:async()=>[...data.keys()].map(url=>({url})),
    delete:async key=>data.delete(key.url||key)
   };
  },
  keys:async()=>[...buckets.keys()],
  delete:async name=>buckets.delete(name)
 };
 const root='https://tasteit.example/';
 const self={
  registration:{scope:root},
  addEventListener:(type,listener)=>handlers.set(type,listener),
  clients:{matchAll:async()=>[],claim:async()=>{}},
  skipWaiting:async()=>{}
 };
 const fetch=async request=>{
  const url=typeof request==='string'?request:request.url;
  if(url.startsWith('https://thumb.wikimedia.org/'))networkRequests++;
  if(!online)throw Error('Network unavailable');
  if(url.startsWith('https://thumb.wikimedia.org/'))
   return new Response('thumbnail payload',{status:200,headers:{'content-type':'image/jpeg'}});
  if(url.endsWith('/data/ingredient-photos.json'))
   return new Response(JSON.stringify({version:1,photos}),{headers:{'content-type':'application/json'}});
  const html='<meta name="application-name" content="Tasteit">';
  if(url===root||url.endsWith('.html'))
   return new Response(html,{headers:{'content-type':'text/html'}});
  const type=url.endsWith('.js')?'text/javascript':url.endsWith('.css')?'text/css':
   url.endsWith('.svg')?'image/svg+xml':'application/json';
  return new Response('{}',{headers:{'content-type':type}});
 };
 runInNewContext(code,{self,caches,fetch,URL,Request,Response,Promise,AbortController,crypto,Set,Math,Error,setTimeout,clearTimeout});
 async function prepare(){
  let pending;handlers.get('install')({waitUntil:p=>{pending=p;}});await pending;
 }
 async function request(url,destination='image'){
  let response;
  handlers.get('fetch')({request:{url,method:'GET',destination},respondWith:promise=>{response=promise;}});
  return response?await response:null;
 }
 return {prepare,request,cache:async name=>caches.open(name),setOnline(value){online=value;},requests:()=>networkRequests};
}
test('approved previously viewed ingredient thumbnails remain available offline, without caching unapproved URLs',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const worker=serviceWorkerHarness(code,[verified('0'),verified('1')]);
 await worker.prepare();
 assert.equal(await worker.request('https://attacker.invalid/wikipedia/commons/thumb/x/250px-x.jpg'),null);
 assert.equal(await worker.request(thumb('0'),'script'),null);
 const online=await worker.request(thumb('0'));
 assert.equal(online.status,200);
 worker.setOnline(false);
 const cached=await worker.request(thumb('0'));
 assert.equal(await cached.text(),'thumbnail payload');
 const reviewedNeverSeen=await worker.request(thumb('1'));
 assert.equal(reviewedNeverSeen.type,'error','an approved but unseen thumbnail cannot be invented');
 await assert.rejects(worker.request(thumb('unapproved')),/Network unavailable/,'an unreviewed URL bypasses the photo cache');
 assert.equal(worker.requests(),3,'only real image requests are counted, not shell precaching');
});
test('cache only retains 160 approved thumbnails after viewing 162 different ones',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const worker=serviceWorkerHarness(code,Array.from({length:162},(_,n)=>verified(n)));
 await worker.prepare();
 for(let i=0;i<162;i++)assert.equal((await worker.request(thumb(i))).status,200);
 const cache=await worker.cache('tasteit-ingredient-thumbnails-v1'),keys=await cache.keys();
 assert.equal(keys.length,160);
 assert.equal(await cache.match({url:thumb(0)}),undefined);
 assert.equal(await cache.match({url:thumb(1)}),undefined);
 assert.ok(await cache.match({url:thumb(161)}));
 assert.equal(worker.requests(),162,'each viewed photograph triggers at most one first-time request');
});
