import {validateRecipe,completeMethod} from './selected-sources.js';
import {toggleRecipeChoice} from './organise.js';

// Preserve publisher metadata and separately licensed methods in the cookbook envelope.
export function collectedMeal(record) {
 validateRecipe(record);
 return {idMeal:'selected-'+record.id,strMeal:record.title,strArea:record.cuisine,
  strCategory:record.category,strInstructions:completeMethod(record)?.steps.join('\n\n')||'',strSource:record.url,
  strMealThumb:record.photoUrl||'',selectedRecipe:JSON.parse(JSON.stringify(record))};
}
export function collectedRecipe(meal) {
 try {
  const record=validateRecipe(meal?.selectedRecipe);
  return meal.idMeal==='selected-'+record.id&&meal.strMeal===record.title&&meal.strSource===record.url?record:null;
 }catch{return null;}
}
export function toggleCollectedFlag(store,record,field) {
 if(!['wanted','usual','avoided'].includes(field))throw new Error('Unknown recipe collection.');
 const meal=collectedMeal(record),id=meal.idMeal,saved={...store.saved};
 const entry=toggleRecipeChoice({...saved[id],meal},field);
 if(entry.wanted||entry.usual||entry.avoided||entry.favourite||entry.cookedCount>0||entry.tags?.length||entry.baseServings||entry.ownMethod||Object.values(store.plan||{}).includes(id))saved[id]=entry;
 else delete saved[id];
 return {...store,saved};
}
