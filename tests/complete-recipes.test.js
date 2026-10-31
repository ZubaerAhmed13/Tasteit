import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import * as sources from '../src/selected-sources.js';import {collectedMeal,toggleCollectedFlag} from '../src/selected-kitchen.js';import {recipeSteps} from '../src/cooking.js';import {emptyStore,exportBackup,parseBackup} from '../src/model.js';
import {method,record} from './helpers/complete-recipe.js';
test('licensed method retains logical source steps and attribution through saving and backup',()=>{
 assert.equal(typeof sources.completeMethod,'function');sources.validateRecipe(record);assert.deepEqual(sources.completeMethod(record),method);
 const meal=collectedMeal(record);assert.deepEqual(recipeSteps(meal),method.steps);assert.ok(meal.strInstructions.includes('Mix the ingredients. Keep'));
 const store={...emptyStore(),saved:{[meal.idMeal]:{meal,wanted:true}}},restored=parseBackup(exportBackup(store));assert.deepEqual(restored.saved[meal.idMeal].meal.selectedRecipe.method,method);assert.deepEqual(recipeSteps(restored.saved[meal.idMeal].meal),method.steps);
});
test('full methods require exact source/revision/licence identity and bounded complete text',()=>{
 for(const change of [{source:'recipetineats',url:'https://www.recipetineats.com/pancakes/'},{id:'wikibooks-1'},{method:{...method,steps:[]}},{method:{...method,steps:['x'.repeat(3001)]}},{method:{...method,license:'unknown'}},{method:{...method,revisionUrl:'https://evil.test/?oldid=4661531'}},{method:{...method,historyUrl:method.historyUrl.replace('Whole_Wheat_Pancakes','Another_Dish')}},{method:{...method,revision:0}},{method:{...method,revisionUrl:method.revisionUrl+'&oldid=1'}},{url:record.url+'?action=edit'},{method:undefined}])assert.throws(()=>sources.validateRecipe({...record,...change}));
});
test('licensed release only appends complete recipes without changing the original collection',async()=>{
 const bytes=await readFile('data/selected-recipes.json');assert.equal(createHash('sha256').update(bytes).digest('hex'),'18c8faacebf59ea2e28484a5e226a5d48a521b47ee77bd8f4e2962cc65f28e67');
 const old=JSON.parse(bytes).recipes,data=JSON.parse(await readFile('data/complete-recipes.json','utf8'));assert.equal(old.length,1108);assert.equal(data.source,'wikibooks');assert.ok(data.recipes.length>=50&&data.recipes.length<=250,'bounded, verifiable recipe total');
 const original200=JSON.parse(await readFile('tests/fixtures/complete-recipe-baseline-200.json','utf8'));
 assert.deepEqual(data.recipes.slice(0,original200.length).map(r=>({id:r.id,title:r.title,revision:r.method.revision,ingredientCount:r.ingredients.length,stepCount:r.method.steps.length})),original200,'original 200 licensed source methods must keep their identity and size');
 const original150=JSON.parse(await readFile('tests/fixtures/complete-recipe-baseline-150.json','utf8'));
 assert.deepEqual(data.recipes.slice(0,original150.length).map(r=>({id:r.id,title:r.title,revision:r.method.revision,ingredientCount:r.ingredients.length,stepCount:r.method.steps.length})),original150,'earlier 150 licensed recipes must retain stable IDs, titles, source revisions and method/ingredient counts');
 const baseline=JSON.parse(await readFile('tests/fixtures/complete-recipe-baseline.json','utf8'));
 assert.deepEqual(data.recipes.slice(0,baseline.length).map(r=>({id:r.id,title:r.title,revision:r.method.revision,steps:r.method.steps,ingredients:r.ingredients})),baseline,'existing licensed recipes must not change when expanding');
 const ids=new Set(old.map(r=>r.id));for(const r of data.recipes){sources.validateRecipe(r);assert.ok(!ids.has(r.id));ids.add(r.id);assert.ok(sources.completeMethod(r).steps.length);assert.equal(r.rating,null);assert.equal(r.photoUrl,null);assert.ok(recipeSteps(collectedMeal(r)).length);}
});
test('collector preserves source section boundaries, preheating, notes and primary quantities',async()=>{const {execFileSync}=await import('node:child_process');const output=execFileSync('python3',['-m','unittest','discover','-s','tests','-p','test_complete_recipe_extraction.py'],{encoding:'utf8',stdio:'pipe'});assert.equal(typeof output,'string');});

test('personal method on an existing publisher recipe is backed up without replacing its original method',async()=>{
 const original=JSON.parse(await readFile('data/selected-recipes.json','utf8')).recipes[0],meal=collectedMeal(original);
 const custom='Prepare the ingredients.\nCook gently.\nServe when safe.';
 const store=emptyStore();store.saved[meal.idMeal]={meal,wanted:true,ownMethod:custom};
 const restored=parseBackup(exportBackup(store));
 assert.equal(restored.saved[meal.idMeal].ownMethod,custom);
 const removed=toggleCollectedFlag(store,original,'wanted');assert.equal(removed.saved[meal.idMeal].ownMethod,custom,'removing the Want to try flag cannot delete user-authored cooking steps');
 assert.equal(sources.completeMethod(original),null);
 assert.equal(restored.saved[meal.idMeal].meal.selectedRecipe.url,original.url);
 const broken=JSON.parse(exportBackup(store));
 broken.data.saved[meal.idMeal].ownMethod='x'.repeat(12001);
 assert.throws(()=>parseBackup(JSON.stringify(broken)),/invalid records/i);
});
