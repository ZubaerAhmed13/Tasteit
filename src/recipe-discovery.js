import {validateRecipe,filterRecipes,recipeCourses} from './selected-sources.js';
import {collectedMeal,collectedRecipe} from './selected-kitchen.js';
import {ingredientsOf} from './model.js';
import {normaliseFilters} from './navigation.js';
import {discoveryOptions} from './discovery-options.js';
import {collectionJson} from './collection-request.js';
const norm=x=>String(x||'').toLocaleLowerCase();
export function searchRecipeCollection(records,saved={},input={}) {
 const f={...normaliseFilters(input),...discoveryOptions(input)},meals=new Map();
 if(f.scope!=='saved')for(const r of filterRecipes(records,f))meals.set('selected-'+r.id,collectedMeal(r));
 for(const entry of Object.values(saved)) {
  const meal=entry?.meal;if(!meal?.idMeal||meals.has(meal.idMeal))continue;
  const r=collectedRecipe(meal);
  if(meal.idMeal.startsWith('selected-')&&!r)continue;
  if(f.source&&r?.source!==f.source||f.ratedOnly&&!r?.rating||f.course&&!recipeCourses(r||{category:meal.strCategory}).includes(f.course))continue;
  if(f.query&&!norm([meal.strMeal,...ingredientsOf(meal).map(x=>x.name)].join(' ')).includes(norm(f.query)))continue;
  meals.set(meal.idMeal,meal);
 }
 return [...meals.values()].filter(m=>(!f.area||norm(m.strArea)===norm(f.area))&&(!f.category||norm(m.strCategory)===norm(f.category))&&(!f.letter||norm(m.strMeal).startsWith(norm(f.letter)))).sort((a,b)=>{
  const ar=a.selectedRecipe?.rating,br=b.selectedRecipe?.rating;
  const value=r=>f.sort==='votes'?(r?.count??-1):(r?r.value/r.best:-1);
  return (f.sort!=='title'?value(br)-value(ar):0)||a.strMeal.localeCompare(b.strMeal)||a.idMeal.localeCompare(b.idMeal);
 });
}
export function createRecipeCollectionLoader(request=collectionJson) {
 let records=null,pending=null;
 return {load({retry=false}={}){
  if(pending)return pending;if(records&&!retry)return Promise.resolve(records);
  pending=(async()=>{const data=await request('./data/selected-recipes.json');if(!Array.isArray(data?.recipes)||data.recipes.length>2500)throw Error('Invalid recipe collection');return data.recipes.map(validateRecipe);})().then(value=>{records=value;return value;}).finally(()=>{pending=null;});
  return pending;
 }};
}

export function recipeCuisineOptions(provider=[],records=[],saved={}) {
 return ['All',...[...new Set([...provider,...records.map(r=>r.cuisine),...Object.values(saved).map(e=>e?.meal?.strArea)].filter(x=>typeof x==='string'&&x.trim()&&x!=='All').map(x=>x.trim()))].sort((a,b)=>a.localeCompare(b))];
}
