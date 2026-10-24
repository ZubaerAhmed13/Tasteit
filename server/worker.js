import {handleSync} from './sync-api.js';
export function createWorker(assets) {
  return {async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==='/api/sync')return handleSync(request,env);
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    const path=url.pathname==='/'?'/index.html':url.pathname;
    const asset=assets[path];if(!asset)return new Response('Not found',{status:404});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,
      'cache-control':path==='/sw.js'?'no-cache':'private, max-age=0, must-revalidate',
      'x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow',
      ...(path==='/sw.js'?{'service-worker-allowed':'/'}:{})}});
  }};
}
