import {SOURCES,RECIPE_COURSES} from './selected-sources.js';
export function discoveryOptions(input={}) {
 const page=Number(input.page||1),provider=input.scope==='provider';
 return {scope:['saved','provider'].includes(input.scope)?input.scope:'collection',
  source:!provider&&SOURCES.some(s=>s.id===input.source)?input.source:'',course:!provider&&RECIPE_COURSES.some(c=>c.id===input.course)?input.course:'',
  sort:!provider&&['rating','votes'].includes(input.sort)?input.sort:'title',ratedOnly:!provider&&input.ratedOnly===true,
  page:Number.isSafeInteger(page)&&page>0?Math.min(page,10000):1};
}
