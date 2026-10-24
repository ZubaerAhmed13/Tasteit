// The build replaces this token with the application-asset digest.
const CACHE='tasteit-shell-__TASTEIT_BUILD__';
const ASSETS=['./','./styles.css','./favicon.svg','./app.webmanifest',
  './src/api.js','./src/app.js','./src/cloud-sync.js','./src/cooking.js','./src/editorial.js',
  './src/kitchen-discovery.js','./src/kitchen-flow.js','./src/model.js','./src/navigation.js',
  './src/offline.js','./src/organise.js','./src/pantry-batches.js','./src/pantry-bulk.js',
  './src/personalisation.js','./src/quantities.js','./src/research-priority.js','./src/research-report.js',
  './src/rights-review.js','./src/servings.js','./src/shopping.js','./src/source-media.js',
  './src/source-overlap.js','./src/world-catalogue.js'];
const root=new URL('./',self.registration.scope).href;
const allowed=new Set(ASSETS.map(path=>new URL(path,root).href));
async function isApp(response) {
  return response.ok && !response.redirected && response.type!=='opaqueredirect' &&
    (response.headers.get('content-type')||'').includes('text/html') &&
    (await response.clone().text()).includes('<meta name="application-name" content="Tasteit">');
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try {
    await Promise.all(ASSETS.map(async path=>{
      const url=new URL(path,root).href;
      const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin',redirect:'error'}));
      if(!response.ok || response.redirected || (url===root?!(await isApp(response)):
        !(response.headers.get('content-type')||'').match(url.endsWith('.js')?/javascript/:url.endsWith('.css')?/text\/css/:url.endsWith('.svg')?/image\/svg/:/json/)))
        throw new Error('The application shell is not available.');
      await cache.put(url,response);
    }));
  } catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('tasteit-shell-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data==='TASTEIT_APPLY_UPDATE')void self.skipWaiting();});
async function navigation(request) {
  const cache=await caches.open(CACHE),controller=new AbortController();let timer;
  try {
    const response=await Promise.race([fetch(request,{signal:controller.signal}),new Promise((_resolve,reject)=>{
      timer=setTimeout(()=>{controller.abort();reject(new Error('Network unavailable.'));},5000);
    })]);
    if(await isApp(response))await cache.put(root,response.clone());
    else await caches.delete(CACHE); // A reachable sign-in/denial must win over a cached shell.
    return response;
  } catch {
    return await cache.match(root) || new Response('Tasteit is not ready offline. Reconnect once to load the app.',{status:503,headers:{'content-type':'text/plain'}});
  } finally {clearTimeout(timer);}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(root);
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  if(request.mode==='navigate' && [scope.pathname,scope.pathname+'index.html'].includes(url.pathname)) {
    event.respondWith(navigation(request));return;
  }
  const key=url.origin+url.pathname;
  if(allowed.has(key)&&key!==root)event.respondWith((async()=>{
    const cache=await caches.open(CACHE);return await cache.match(key)||fetch(request);
  })());
});
