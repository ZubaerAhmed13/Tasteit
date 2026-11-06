import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore,nextSevenDates,shoppingList,exportBackup,parseBackup,readStoreStrict,STORAGE_KEY,localStoreStatus} from '../src/model.js';
import {planRecipe} from '../src/recipe-planning.js';
import {receivePurchases,purchaseReview} from '../src/kitchen-flow.js';
import {shoppingChecklist,toggleRecipeChecked} from '../src/shopping.js';
import {syncData} from '../src/cloud-sync.js';
const day=nextSevenDates()[0].key, breakfast=day+':breakfast';
const rice={idMeal:'rice',strMeal:'Rice',strIngredient1:'Rice',strMeasure1:'100 g'};
test('breakfast and dinner coexist and replacing breakfast clears only breakfast portions',()=>{
 const original={...emptyStore(),saved:{rice:{meal:rice,baseServings:2,usual:true}},plan:{[day]:'rice'},planServings:{[day]:4,[breakfast]:3}};
 const next=planRecipe(original,{...rice,idMeal:'eggs'},day,'breakfast');
 assert.equal(next.plan[day],'rice');assert.equal(next.plan[breakfast],'eggs');
 assert.deepEqual(next.planServings,{[day]:4});assert.deepEqual(original.plan,{[day]:'rice'});
});
test('slot plans survive v2 export strict read and sync; v1 plans remain Dinner',()=>{
 const state=planRecipe(planRecipe(emptyStore(),rice,day),rice,day,'breakfast');
 assert.equal(JSON.parse(exportBackup(state)).version,2);
 const decoded=parseBackup(exportBackup(state));assert.equal(decoded.plan[breakfast],'rice');
 const storage={getItem:key=>key===STORAGE_KEY?JSON.stringify(state):null};
 assert.equal(readStoreStrict(storage).plan[breakfast],'rice');assert.equal(localStoreStatus(storage).status,'ready');
 assert.equal(syncData(state).plan[breakfast],'rice');
 const legacy=JSON.parse(exportBackup({...emptyStore(),plan:{[day]:'rice'}}));legacy.version=1;
 assert.deepEqual(parseBackup(JSON.stringify(legacy)).plan,{[day]:'rice'});
});
test('backups reject impossible calendar dates, unknown slots and orphan portion targets',()=>{
 for(const key of ['2026-02-30','2026-10-27:brunch','2026-10-27:dinner']) {
  assert.throws(()=>parseBackup(exportBackup({...emptyStore(),plan:{[key]:'rice'}})));
 }
 assert.throws(()=>planRecipe(emptyStore(),rice,day,'brunch'));
 assert.throws(()=>parseBackup(exportBackup({...emptyStore(),planServings:{[day+':breakfast']:2}})));
});
test('same recipe in two daily slots doubles shopping and checked purchases remain atomic',()=>{
 let state=planRecipe(planRecipe(emptyStore(),rice,day),rice,day,'breakfast');
 state.pantry=[{id:'old',name:'Rice',quantity:'50',unit:'g'}];
 const list=shoppingList(state.plan,state.saved,state.pantry,state.planServings);
 assert.equal(list[0].label,'150 g short');
 state.shoppingChecked=toggleRecipeChecked({},list[0]);
 const review=purchaseReview(shoppingChecklist(list,[],state.shoppingChecked));
 const selection={key:review[0].key,quantity:'150',unit:'g',location:'Pantry',expiry:''};
 const stocked=receivePurchases(state,review,[selection],'test');
 assert.equal(stocked.pantry.length,2);assert.equal(state.pantry.length,1);
 assert.throws(()=>receivePurchases(stocked,review,[selection],'again'),/changed|already/);
});
