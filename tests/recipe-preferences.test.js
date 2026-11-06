import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleRecipeChoice,filterCookbook} from '../src/organise.js';
import {toggleCollectedFlag,collectedMeal} from '../src/selected-kitchen.js';
import {recommendRecipes,emptyTasteProfile} from '../src/personalisation.js';
import {emptyStore,exportBackup,parseBackup} from '../src/model.js';

const record={id:'recipetineats-choice',source:'recipetineats',
  url:'https://www.recipetineats.com/example/',title:'Test rice',
  author:'Author',cuisine:'Indian',category:'Main Course',
  ingredients:['2 cups rice'],rating:null,photoUrl:null,checkedAt:'2026-10-25T10:00:00Z'};

test('Don’t try is reversible and clears only conflicting intention flags',()=>{
 const first={wanted:true,usual:true,favourite:false,cookedCount:3,lastCooked:'2026-10-25',tags:['Home'],ownMethod:'Cook rice'};
 const skipped=toggleRecipeChoice(first,'avoided');
 assert.deepEqual([skipped.wanted,skipped.usual,skipped.avoided],[false,false,true]);
 assert.equal(skipped.cookedCount,3);assert.equal(skipped.lastCooked,first.lastCooked);
 assert.deepEqual(skipped.tags,first.tags);assert.equal(skipped.ownMethod,first.ownMethod);
 assert.equal(first.avoided,undefined,'source object is not mutated');
 const revived=toggleRecipeChoice(skipped,'wanted');
 assert.equal(revived.avoided,false);assert.equal(revived.wanted,true);
 assert.equal(toggleRecipeChoice(revived,'avoided').avoided,true);
 assert.throws(()=>toggleRecipeChoice(first,'invalid'),/Unknown/);
});
test('Don’t try is a dedicated cookbook category while preserving cooked history',()=>{
 const saved={'1':{meal:{idMeal:'1',strMeal:'Rice'},avoided:true,cookedCount:2},'2':{meal:{idMeal:'2',strMeal:'Pasta'},wanted:true}};
 assert.deepEqual(filterCookbook(saved,{collection:'avoided'}).map(x=>x.meal.strMeal),['Rice']);
 assert.equal(filterCookbook(saved,{collection:'cooked'}).length,1);
 assert.equal(filterCookbook(saved,{collection:'all'}).length,2);
});
test('publisher saves maintain Don’t try through offline backup and do not erase past cooking',()=>{
 const state=emptyStore(),meal=collectedMeal(record);
 state.saved[meal.idMeal]={meal,wanted:true,usual:true,cookedCount:4};
 const next=toggleCollectedFlag(state,record,'avoided');
 assert.deepEqual([next.saved[meal.idMeal].wanted,next.saved[meal.idMeal].usual,next.saved[meal.idMeal].avoided],[false,false,true]);
 assert.equal(next.saved[meal.idMeal].cookedCount,4);
 const restored=parseBackup(exportBackup(next));
 assert.equal(restored.saved[meal.idMeal].avoided,true);
 assert.equal(toggleCollectedFlag(restored,record,'usual').saved[meal.idMeal].avoided,false);
 assert.equal(state.saved[meal.idMeal].wanted,true);
});
test('skipped dishes never surface in personalised suggestions, even if previously favourites',()=>{
 const meal={idMeal:'3',strMeal:'Rice',strArea:'Indian',strIngredient1:'Rice',strMeasure1:'2 cups',strInstructions:'Cook rice'};
 const saved={'3':{meal,favourite:true,avoided:true,cookedCount:3}};
 const profile={...emptyTasteProfile(),cuisines:['Indian']};
 assert.deepEqual(recommendRecipes([meal],saved,[],profile),[]);
 assert.equal(recommendRecipes([meal],{'3':{...saved['3'],avoided:false}},[],profile).length,1);
});
