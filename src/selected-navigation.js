import {SOURCES,RECIPE_COURSES} from './selected-sources.js';
const owned=['query','source','course','sort','rated','collection','page'];
export function readSelectedRoute(input) {
 const p=new URL(input,'https://tasteit.invalid').searchParams;
 const page=Number(p.get('page')||1),source=p.get('source'),course=p.get('course'),sort=p.get('sort');
 return {query:(p.get('query')||'').trim().slice(0,200),source:SOURCES.some(x=>x.id===source)?source:'',course:RECIPE_COURSES.some(x=>x.id===course)?course:'',sort:['rating','votes'].includes(sort)?sort:'title',ratedOnly:p.get('rated')!=='0',page:Number.isSafeInteger(page)&&page>0?Math.min(page,10000):1,collection:p.get('collection')==='world-favourites-100'?'world-favourites-100':''};
}
export function selectedRouteUrl(input,route={}) {
 const url=new URL(input,'https://tasteit.invalid');for(const key of owned)url.searchParams.delete(key);
 for(const key of ['query','source','course','collection'])if(route[key])url.searchParams.set(key,String(route[key]));
 if(route.sort&&route.sort!=='title')url.searchParams.set('sort',route.sort);
 if(route.ratedOnly===false)url.searchParams.set('rated','0');
 if(Number.isSafeInteger(route.page)&&route.page>1)url.searchParams.set('page',String(route.page));
 return url.href;
}
