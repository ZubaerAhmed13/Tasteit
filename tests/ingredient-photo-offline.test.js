import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

function serviceWorkerHarness(code) {
  const handlers=new Map(),buckets=new Map();
  let online=true,networkRequests=0;
  const caches={
    async open(name) {
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
  const self={
    registration:{scope:'https://tasteit.example/'},
    addEventListener:(type,listener)=>handlers.set(type,listener),
    clients:{matchAll:async()=>[],claim:async()=>{}}
  };
  const fetch=async()=>{
    networkRequests++;
    if(!online)throw Error('Network unavailable');
    return new Response('thumbnail payload',{status:200,headers:{'content-type':'image/png'}});
  };
  runInNewContext(code,{self,caches,fetch,URL,Request,Response,Promise,AbortController,crypto,Set,Math,Error,setTimeout,clearTimeout});
  async function request(url,destination='image') {
    let response;
    handlers.get('fetch')({request:{url,method:'GET',destination},respondWith:promise=>{response=promise;}});
    return response ? await response : null;
  }
  return {request,cache:async name=>caches.open(name),setOnline(value){online=value;},requests:()=>networkRequests};
}
const thumb=(id)=>'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Garlic_bulbs_and_cloves.jpg/250px-asset-'+id+'.jpg';

test('previously viewed ingredient thumbnails remain available offline; never cache untrusted domains',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const worker=serviceWorkerHarness(code);
 assert.equal(await worker.request('https://attacker.invalid/wikipedia/commons/thumb/x/250px-x.jpg'),null);
 assert.equal(await worker.request(thumb('0'),'script'),null);
 const online=await worker.request(thumb('0'));
 assert.equal(online.status,200);
 worker.setOnline(false);
 const cached=await worker.request(thumb('0'));
 assert.equal(await cached.text(),'thumbnail payload');
 const neverSeen=await worker.request(thumb('unseen'));
 assert.equal(neverSeen.type,'error');
 assert.ok(worker.requests()>=3);
});
test('offline thumbnail storage is bounded at 160 images without prefetch',async()=>{
 const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 const worker=serviceWorkerHarness(code);
 for(let i=0;i<162;i++)assert.equal((await worker.request(thumb(i))).status,200);
 const cache=await worker.cache('tasteit-ingredient-thumbnails-v1'),keys=await cache.keys();
 assert.equal(keys.length,160);
 assert.equal(await cache.match({url:thumb(0)}),undefined);
 assert.equal(await cache.match({url:thumb(1)}),undefined);
 assert.ok(await cache.match({url:thumb(161)}));
 assert.equal(worker.requests(),162,'each image is fetched only when requested');
});
