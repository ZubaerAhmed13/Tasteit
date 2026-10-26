import {SOURCES,RECIPE_COURSES} from './selected-sources.js';
export function discoveryOptions(input={}) {
 const page=Number(input.page||1);
 return {scope:['saved','provider'].includes(input.scope)?input.scope:'collection',
  source:SOURCES.some(s=>s.id===input.source)?input.source:'',course:RECIPE_COURSES.some(c=>c.id===input.course)?input.course:'',
  sort:['rating','votes'].includes(input.sort)?input.sort:'title',ratedOnly:input.ratedOnly===true,
  page:Number.isSafeInteger(page)&&page>0?Math.min(page,10000):1};
}
