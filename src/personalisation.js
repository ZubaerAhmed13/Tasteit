import {ingredientsOf,normalizeIngredient,analyseMeal} from './model.js';
import {recipeUseSoon} from './pantry-batches.js';
import {collectedRecipe} from './selected-kitchen.js';

export const emptyTasteProfile=()=>({cuisines:[],avoidIngredients:[],hiddenRecipeIds:[]});
const idPattern=/^[A-Za-z0-9_-]{1,128}$/;
const cleanText=value=>typeof value==='string' && value.trim().length>0 && value.length<=80 && !/[\u0000-\u001f\u007f]/u.test(value);
function validList(value,max,test=cleanText) {
  return Array.isArray(value) && value.length<=max && value.every(test) &&
    new Set(value.map(x=>x.toLowerCase())).size===value.length;
}
export function validTasteProfile(profile) {
  return profile===undefined || Boolean(profile && typeof profile==='object' && !Array.isArray(profile) &&
    validList(profile.cuisines,8) && validList(profile.avoidIngredients,20) &&
    validList(profile.hiddenRecipeIds,300,value=>typeof value==='string' && idPattern.test(value)));
}
function inputList(value,max,normalise=x=>x.trim()) {
  if(value===undefined || value==='')return [];
  if(typeof value!=='string' && !Array.isArray(value))throw new Error('Enter a list of taste preferences.');
  const values=typeof value==='string'?value.split(/[,\n\r]/):value;
  const result=[];
  for(const raw of values) {
    if(typeof raw!=='string')throw new Error('Use text for each preference.');
    if(!raw.trim())continue;
    if(!cleanText(raw.trim()))throw new Error('Use 1–80 characters per preference, without control characters.');
    const item=normalise(raw);
    if(!item)throw new Error('Enter a recognisable ingredient name.');
    if(!result.some(x=>x.toLowerCase()===item.toLowerCase()))result.push(item);
  }
  if(result.length>max)throw new Error('Use up to '+max+' preferences in this list.');
  return result;
}
export function createTasteProfile(input={}) {
  const profile={cuisines:inputList(input.cuisines,8),
    avoidIngredients:inputList(input.avoidIngredients,20,normalizeIngredient),
    hiddenRecipeIds:[...(input.hiddenRecipeIds||[])]};
  if(!validTasteProfile(profile))throw new Error('Check the skipped recipe list. You can keep up to 300.');
  return profile;
}

// These are explainable suggestions from the current candidate pool, not
// dietary certification or an editorial ranking of worldwide recipes.
export function recommendRecipes(candidates,saved,pantry,profile=emptyTasteProfile(),limit=4,now=new Date()) {
  if(!validTasteProfile(profile) || !profile)return [];
  const pool=new Map();
  for(const meal of [...candidates,...Object.values(saved).map(entry=>entry?.meal)]) {
    if(!meal || !idPattern.test(String(meal.idMeal||'')) || typeof meal.strMeal!=='string')continue;
    const previous=pool.get(meal.idMeal);
    if(!previous || ingredientsOf(meal).length>=ingredientsOf(previous).length)pool.set(meal.idMeal,meal);
  }
  const cuisines=new Set(profile.cuisines.map(x=>x.toLowerCase()));
  const avoided=new Set(profile.avoidIngredients.map(normalizeIngredient));
  const hidden=new Set(profile.hiddenRecipeIds);
  const ranked=[];
  for(const meal of pool.values()) {
    if(hidden.has(meal.idMeal))continue;
    const ingredients=ingredientsOf(meal);
    if(avoided.size && (collectedRecipe(meal)||!ingredients.length || ingredients.some(x=>avoided.has(normalizeIngredient(x.name)))))continue;
    const entry=saved[meal.idMeal]||{},reasons=[];
    let score=0;
    if(entry.wanted){score+=8;reasons.push('On your want-to-try list');}
    if(entry.favourite){score+=6;reasons.push('One of your favourites');}
    if(entry.usual){score+=2;reasons.push('One of your usual dishes');}
    if(cuisines.has(String(meal.strArea||'').toLowerCase())){score+=5;reasons.push(meal.strArea+' is a cuisine you chose');}
    if(ingredients.length) {
      const analysis=analyseMeal(meal,pantry,now);
      if(analysis.have.length) {
        score+=4*analysis.have.length/analysis.total;
        reasons.push(analysis.have.length+' of '+analysis.total+' ingredient names in your kitchen');
      }
      const soon=recipeUseSoon(meal,pantry,now);
      if(soon.length){score+=4;reasons.push('Uses '+soon.slice(0,2).join(', ')+' from your use-soon stock');}
    }
    if(score>0)ranked.push({meal,reasons,score});
  }
  const cap=Number.isInteger(limit)?Math.max(0,Math.min(12,limit)):4;
  return ranked.sort((a,b)=>b.score-a.score || a.meal.strMeal.localeCompare(b.meal.strMeal) || a.meal.idMeal.localeCompare(b.meal.idMeal))
    .slice(0,cap).map(({meal,reasons})=>({meal,reasons}));
}
