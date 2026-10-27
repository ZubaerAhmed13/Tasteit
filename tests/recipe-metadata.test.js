import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {collectedMeal} from '../src/selected-kitchen.js';
import {ingredientsOf} from '../src/model.js';import {scaledIngredients} from '../src/servings.js';
const records=JSON.parse(await readFile('data/selected-recipes.json','utf8')).recipes;
test('planning metadata requires reviewed approved-source identity and preserves explicit unknowns',async()=>{
 const module=await import('../src/recipe-metadata.js').catch(()=>({}));
 assert.equal(typeof module.recipePlanningMetadata,'function');
 const recipe=records.find(x=>x.id==='recipetineats-chicken-curry'),meal=collectedMeal(recipe);
 const row={id:recipe.id,url:recipe.url,verified:true,checkedAt:'2026-10-27',prepMinutes:8,cookMinutes:20,totalMinutes:28,yieldText:'Servings 4'};
 assert.equal(module.recipePlanningMetadata(meal,[row]).totalMinutes,28);
 for(const changed of [{url:'https://example.com/other'},{verified:false},{prepMinutes:-1},{checkedAt:'yesterday'},{totalMinutes:'28'}])assert.equal(module.recipePlanningMetadata(meal,[{...row,...changed}]),null);
 assert.equal(module.recipePlanningMetadata(meal,[]),null);
 assert.ok(ingredientsOf(meal).every(x=>x.measure===''));
 assert.ok(scaledIngredients(meal,4,8).every(x=>x.machineMeasure===''));
});
