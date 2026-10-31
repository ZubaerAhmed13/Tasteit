import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {emptyStore,nextSevenDates} from '../src/model.js';import {collectedMeal} from '../src/selected-kitchen.js';import * as planning from '../src/recipe-planning.js';
const record=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes[0],meal=collectedMeal(record),day=nextSevenDates()[0].key;
test('planning from a recipe saves its metadata atomically and retains personal flags',()=>{
 const state=emptyStore();state.saved[meal.idMeal]={meal,usual:true,tags:['Weekly'],note:'Keep'};const before=JSON.stringify(state),next=planning.planRecipe(state,meal,day);
 assert.equal(next.plan[day],meal.idMeal);assert.equal(next.saved[meal.idMeal].usual,true);assert.equal(next.saved[meal.idMeal].note,'Keep');assert.equal(JSON.stringify(state),before);
 assert.equal(planning.planRecipe(emptyStore(),meal,day).saved[meal.idMeal].meal.idMeal,meal.idMeal);
});
test('planning rejects unavailable dates and clears portions belonging to a replaced recipe',()=>{
 const state=emptyStore();state.plan[day]='other';state.planServings[day]=8;
 assert.throws(()=>planning.planRecipe(state,meal,'2000-01-01'));const next=planning.planRecipe(state,meal,day);assert.equal(next.planServings[day],undefined);
});
