import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {filterRecipes,validateRecipe,approvedSource} from '../src/selected-sources.js';

test('the added breakfasts are discoverable, source-rated and preserve the earlier cookbook catalogue',async()=>{
 const {recipes}=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url)));
 const breakfasts=filterRecipes(recipes,{course:'breakfast',ratedOnly:true});
 assert.ok(filterRecipes(recipes,{course:'breakfast'}).length>=146,'46 earlier breakfasts plus 100 new breakfasts must be discoverable');
 assert.ok(breakfasts.length>=143,'43 earlier rated breakfasts plus 100 new rated breakfasts must be discoverable');
 const evidence=JSON.parse(await readFile(new URL('../docs/research/2026-10-26-breakfast-100-evidence.json',import.meta.url)));
 assert.equal(evidence.recipes.length,100);
 const ids=new Set(evidence.recipes.map(r=>r.id));assert.equal(ids.size,100);
 const priorIds=new Set(evidence.preservedRecipeIds);assert.equal(priorIds.size,1008);
 assert.ok([...ids].every(id=>!priorIds.has(id)),'new recipes do not count earlier entries');
 const prior=recipes.filter(r=>priorIds.has(r.id));assert.equal(prior.length,1008);
 assert.equal(createHash('sha256').update(JSON.stringify(prior)).digest('hex'),evidence.preservedRecordsSha256);
 for(const entry of evidence.recipes){
  const recipe=recipes.find(r=>r.id===entry.id);assert.ok(recipe,entry.id);validateRecipe(recipe);
  assert.ok(breakfasts.some(r=>r.id===recipe.id),recipe.title);
  assert.ok(approvedSource(recipe.url));assert.equal(entry.url,recipe.url);
  assert.ok(recipe.rating?.count>=10,recipe.title);assert.ok(recipe.rating.value/recipe.rating.best>=0.8,recipe.title);
  assert.ok(recipe.photoUrl?.startsWith('https://'));assert.ok(recipe.ingredients.length);
  assert.match(entry.originalHtmlSha256,/^[a-f0-9]{64}$/);assert.ok(Number.isFinite(Date.parse(entry.checkedAt)));
  for(const field of ['instructions','recipeInstructions','reviews','review'])assert.equal(field in recipe,false);
 }
 const canonical=r=>new URL(r.url).hostname.replace(/^www\./,'')+new URL(r.url).pathname.replace(/\/$/,'');
 assert.equal(new Set(recipes.map(canonical)).size,recipes.length,'alternate URL spelling cannot duplicate a recipe');
});
