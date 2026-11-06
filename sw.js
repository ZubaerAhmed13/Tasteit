// The build replaces this token with the application-asset digest.
const CACHE='tasteit-shell-__TASTEIT_BUILD__';
const PHOTO_CACHE='tasteit-ingredient-thumbnails-v1';
const MAX_SAVED_PHOTOS=160;
const MAX_RECIPE_PHOTOS=40;
let photoRegistryPromise=null;
function thumbnailUrl(input) {
 try {
  const url=new URL(input),filename=url.pathname.split('/').at(-1)||'';
  return url.protocol==='https:'&&url.hostname==='thumb.wikimedia.org'&&
   !url.port&&!url.search&&!url.hash&&url.pathname.startsWith('/wikipedia/commons/thumb/')&&
   filename.startsWith('250px-')&&['.jpg','.jpeg','.png','.webp'].some(x=>filename.toLowerCase().endsWith(x))&&
   url.href.length<500?url.href:null;
 }catch{return null;}
}
async function approvedPhotoUrls() {
 if(!await ready())return new Set();
 if(!photoRegistryPromise)photoRegistryPromise=(async()=>{
  const response=await (await caches.open(CACHE)).match(new URL('./data/ingredient-photos.json',root).href);
  const payload=await response?.json();
  return new Set((Array.isArray(payload?.photos)?payload.photos:[]).filter(photo=>{
   try {
    const page=new URL(photo.filePage),licence=new URL(photo.licenceUrl);
    return photo.verified===true&&typeof photo.creator==='string'&&Boolean(photo.creator.trim())&&
     page.hostname==='commons.wikimedia.org'&&page.pathname.startsWith('/wiki/File:')&&
     ((licence.hostname==='creativecommons.org'&&
       ['/licenses/by/','/licenses/by-sa/','/publicdomain/zero/','/publicdomain/mark/'].some(x=>licence.pathname.startsWith(x)))||
       (photo.licence==='Public domain'&&licence.href===page.href))&&thumbnailUrl(photo.url);
   }catch{return false;}
  }).map(p=>p.url));
 })().catch(()=>{photoRegistryPromise=null;return new Set();});
 return photoRegistryPromise;
}
const ASSETS=['./','./styles.css','./favicon.svg','./app.webmanifest','./photo-credits.html','./selected-recipes.html','./selected-recipes.css','./data/complete-recipes.json','./data/selected-recipes.json','./data/world-favourites-100.json','./data/ingredient-photos.json',
  './src/recipe-presentation.js','./src/recipe-metadata.js','./src/meal-plan.js','./src/recipe-planning.js','./src/discovery-options.js','./src/recipe-discovery.js','./src/api.js','./src/app.js','./src/cloud-sync.js','./src/cooking.js','./src/editorial.js',
  './src/kitchen-discovery.js','./src/kitchen-flow.js','./src/model.js','./src/navigation.js',
  './src/offline.js','./src/host-auth.js','./src/organise.js','./src/pantry-batches.js','./src/pantry-bulk.js',
  './src/personalisation.js','./src/quantities.js','./src/research-priority.js','./src/research-report.js',
  './src/rights-review.js','./src/servings.js','./src/shopping.js','./src/source-media.js',
  './src/source-overlap.js','./src/world-catalogue.js','./src/selected-kitchen.js',
  './src/selected-sources.js','./src/photo-credits.js','./src/selected-navigation.js','./src/collection-request.js','./src/ingredient-reference.js','./src/ingredient-lightbox.js','./src/ingredient-offline.js','./src/ingredient-photos.js'];
const root=new URL('./',self.registration.scope).href;
const allowed=new Set(ASSETS.map(path=>new URL(path,root).href));
const CONTROL='tasteit-offline-control-v1',epochKey=new URL('.offline-epoch',root).href;
async function epoch(){return (await (await caches.open(CONTROL)).match(epochKey))?.text().then(String)||'initial';}
async function notify() {
  for(const client of await self.clients.matchAll?.({type:'window'})||[])client.postMessage('TASTEIT_OFFLINE_CHANGED');
}
async function invalidate() {
  photoRegistryPromise=null;
  await (await caches.open(CONTROL)).put(epochKey,new Response(crypto.randomUUID()));
  for(const name of await caches.keys())if(name.startsWith('tasteit-shell-'))await caches.delete(name);
  await notify();
}
async function isApp(response) {
  return response.ok && !response.redirected && response.type!=='opaqueredirect' &&
    (response.headers.get('content-type')||'').includes('text/html') &&
    (await response.clone().text()).includes('<meta name="application-name" content="Tasteit">');
}
async function valid(url,response) {
  return response.ok && !response.redirected && (url===root?await isApp(response):
    !!(url.endsWith('.html')?await isApp(response):!!(response.headers.get('content-type')||'').match(url.endsWith('.js')?/javascript/:url.endsWith('.css')?/text\/css/:url.endsWith('.svg')?/image\/svg/:/json/)));
}
async function ready() {
  const stamp=await epoch(),cache=await caches.open(CACHE);
  if(await (await cache.match(epochKey))?.text()!==stamp)return false;
  for(const url of allowed)if(!await cache.match(url))return false;
  return stamp===await epoch();
}
let warming=null;
function warm(rootResponse) {
  if(warming)return warming;
  warming=(async()=>{
    const stamp=await epoch(),cache=await caches.open(CACHE);
    try {
      await Promise.all([...allowed].map(async url=>{
        const response=url===root&&rootResponse?rootResponse.clone():await fetch(new Request(url,{cache:'reload',credentials:'same-origin',redirect:'error'}));
        if(!await valid(url,response))throw new Error('The application shell is not available.');
        if(stamp!==await epoch())throw new Error('Offline access was invalidated.');
        await cache.put(url,response);
      }));
      if(stamp!==await epoch())throw new Error('Offline access was invalidated.');
      await cache.put(epochKey,new Response(stamp));
      if(stamp!==await epoch())throw new Error('Offline access was invalidated.');
    } catch(error){await caches.delete(CACHE);throw error;}
    finally {warming=null;await notify();}
  })();
  return warming;
}
self.addEventListener('install',event=>event.waitUntil(warm()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('tasteit-shell-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();await notify();
})()));
self.addEventListener('message',event=>{
  if(event.data==='TASTEIT_OFFLINE_STATUS')event.waitUntil((async()=>event.ports?.[0]?.postMessage({ready:await ready()}))());
  if(event.data==='TASTEIT_APPLY_UPDATE')event.waitUntil((async()=>{if(await ready())await self.skipWaiting();})());
  if(event.data?.type==='TASTEIT_CACHE_RECIPE_PHOTOS')event.waitUntil((async()=>{
    const port=event.ports?.[0],urls=event.data.urls;
    if(!Array.isArray(urls)||!urls.length||urls.length>MAX_RECIPE_PHOTOS||
       new Set(urls).size!==urls.length||urls.some(url=>typeof url!=='string'||!thumbnailUrl(url))) {
      port?.postMessage({ok:false});return;
    }
    const approved=await approvedPhotoUrls();
    if(urls.some(url=>!approved.has(url))){port?.postMessage({ok:false});return;}
    let saved=0,failed=0;
    // User-selected, sequential downloads use only local browser cache.
    for(const url of urls) {
      try {if(await cacheThumbnail(new Request(url,{mode:'no-cors',credentials:'omit',redirect:'error'})))saved++;else failed++;}
      catch{failed++;}
    }
    port?.postMessage({ok:true,saved,failed});
  })());
});
async function navigation(request) {
  const controller=new AbortController();let timer;
  try {
    const response=await Promise.race([fetch(request,{signal:controller.signal}),new Promise((_resolve,reject)=>{
      timer=setTimeout(()=>{controller.abort();reject(new Error('Network unavailable.'));},5000);
    })]);
    if(await isApp(response)) {
      if(await ready())await (await caches.open(CACHE)).put(root,response.clone());
      else {try{await warm(response);}catch{ /* Stay online; do not promise incomplete offline access. */ }}
    } else await invalidate(); // A reachable sign-in/denial invalidates every shell generation.
    return response;
  } catch {
    if(await ready())return (await caches.open(CACHE)).match(root);
    return new Response('Tasteit is not ready offline. Reconnect once to load the app.',{status:503,headers:{'content-type':'text/plain'}});
  } finally {clearTimeout(timer);}
}
// Cache only reviewed 250px Commons ingredient thumbnails. A missing or
// expired network connection never replaces an already-cached photograph.
async function cacheThumbnail(request) {
 const cache=await caches.open(PHOTO_CACHE);
 if(await cache.match(request))return true;
 const response=await fetch(request);
 if(!(response.ok||response.type==='opaque')||response.redirected)return false;
 try {
  await cache.put(request,response.clone());
  const keys=await cache.keys();
  for(const stale of keys.slice(0,Math.max(0,keys.length-MAX_SAVED_PHOTOS)))await cache.delete(stale);
  return true;
 }catch{return false;}
}
async function viewedThumbnail(request) {
 const cache=await caches.open(PHOTO_CACHE);
 const stored=await cache.match(request);
 if(stored)return stored;
 try {
  const response=await fetch(request);
  if((response.ok||response.type==='opaque')&&!response.redirected) {
   try {
    await cache.put(request,response.clone());
    const keys=await cache.keys();
    for(const stale of keys.slice(0,Math.max(0,keys.length-MAX_SAVED_PHOTOS)))await cache.delete(stale);
   }catch{ /* Storage limits must not break the recipe UI. */ }
  }
  return response;
 }catch{return Response.error();}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(root);
  if(request.method==='GET'&&request.destination==='image'&&thumbnailUrl(url.href)) {
    event.respondWith((async()=>{
      if(!(await approvedPhotoUrls()).has(url.href))return fetch(request);
      return viewedThumbnail(request);
    })());return;
  }
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  if(request.mode==='navigate' && [scope.pathname,scope.pathname+'index.html'].includes(url.pathname)) {
    event.respondWith(navigation(request));return;
  }
  const key=url.origin+url.pathname;
  if(allowed.has(key)&&key!==root)event.respondWith((async()=>{
    if(await ready()){const cached=await (await caches.open(CACHE)).match(key);if(cached)return cached;}
    return fetch(request);
  })());
});
