import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as discovery from '../src/recipe-discovery.js';
import {collectedMeal} from '../src/selected-kitchen.js';import {emptyStore} from '../src/model.js';
const records=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes;
test('primary search finds real breakfast names and ingredient metadata',()=>{
 const breakfast=records.find(r=>r.id==='swasthi-poha-recipe-kanda-batata-poha');
 assert.ok(discovery.searchRecipeCollection(records,{}, {query:'poha',course:'breakfast'}).some(m=>m.idMeal==='selected-'+breakfast.id));
 assert.ok(discovery.searchRecipeCollection([breakfast],{}, {query:breakfast.ingredients[0]}).length);
 assert.equal(discovery.searchRecipeCollection([breakfast],{}, {course:'dessert'}).length,0);
});
test('catalogue and cookbook overlap is unique and personal flags remain untouched',()=>{
 const meal=collectedMeal(records[0]),personal={idMeal:'personal-x',strPersonal:true,strMeal:'My rice',strInstructions:'Cook.',strIngredient1:'Rice'};
 const saved={[meal.idMeal]:{meal,wanted:true,tags:['Weekly']},[personal.idMeal]:{meal:personal,usual:true}},before=JSON.stringify(saved);
 const all=discovery.searchRecipeCollection(records,saved,{});assert.equal(all.filter(m=>m.idMeal===meal.idMeal).length,1);assert.ok(all.some(m=>m.idMeal===personal.idMeal));assert.equal(JSON.stringify(saved),before);
 assert.deepEqual(discovery.searchRecipeCollection([],saved,{scope:'saved'}).map(m=>m.idMeal).sort(),Object.keys(saved).sort());
 assert.equal(discovery.searchRecipeCollection([],saved,{ratedOnly:true}).some(m=>m.idMeal===personal.idMeal),false);
});
test('publisher and rating filters compose and return actual source metadata',()=>{
 const meals=discovery.searchRecipeCollection(records,{}, {source:'recipetineats',course:'breakfast',ratedOnly:true,sort:'rating'});
 assert.ok(meals.length>20);assert.ok(meals.every(m=>m.selectedRecipe.source==='recipetineats'&&m.selectedRecipe.rating));
 assert.ok(meals[0].selectedRecipe.rating.value>=meals.at(-1).selectedRecipe.rating.value);
});
test('collection loader shares pending work, validates records and retries failures',async()=>{
 let calls=0,release;const loader=discovery.createRecipeCollectionLoader(async()=>{calls++;return new Promise(r=>release=r);});
 const a=loader.load(),b=loader.load();release({recipes:[records[0]]});assert.deepEqual(await a,await b);assert.equal(calls,1);await loader.load();assert.equal(calls,1);
 let fail=true;const retry=discovery.createRecipeCollectionLoader(async()=>{if(fail)throw Error('unavailable');return {recipes:[records[1]]};});await assert.rejects(retry.load());fail=false;assert.equal((await retry.load()).length,1);
 const invalid=discovery.createRecipeCollectionLoader(async()=>({recipes:[{id:'bad'}]}));await assert.rejects(invalid.load());
});
test('late provider directory merges catalogue-only and saved cuisine options',()=>{
 const saved={x:{meal:{idMeal:'personal-x',strMeal:'My dish',strArea:'Home region'}}},catalogue=[{...records[0],cuisine:'South Indian'}];
 const options=discovery.recipeCuisineOptions(['Indian','British'],catalogue,saved);assert.ok(options.includes('South Indian'));assert.ok(options.includes('Home region'));assert.ok(options.includes('Indian'));assert.equal(new Set(options).size,options.length);
});
