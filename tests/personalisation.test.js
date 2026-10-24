import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyTasteProfile,createTasteProfile,validTasteProfile,recommendRecipes} from '../src/personalisation.js';
const now=new Date(2026,9,24,12);
const rice={idMeal:'1',strMeal:'Tomato Rice',strArea:'Indian',strCategory:'Vegetarian',strInstructions:'Cook the rice.',strIngredient1:'Rice',strMeasure1:'1 cup',strIngredient2:'Tomato',strMeasure2:'2'};
const aubergine={...rice,idMeal:'2',strMeal:'Roasted Aubergine',strArea:'Turkish',strIngredient1:'Aubergine',strIngredient2:''};
const cake={...rice,idMeal:'3',strMeal:'Rice cake',strArea:'British'};
test('taste inputs normalise duplicates and conservative regional ingredient names',()=>{
  assert.deepEqual(createTasteProfile({cuisines:' Indian, indian\nTurkish ',avoidIngredients:'Aubergines, eggplant\nMilk'}),
    {cuisines:['Indian','Turkish'],avoidIngredients:['eggplant','milk'],hiddenRecipeIds:[]});
  assert.equal(validTasteProfile(undefined),true);
  assert.equal(validTasteProfile(emptyTasteProfile()),true);
});
test('profile bounds reject overlong, malformed and control-character inputs',()=>{
  assert.throws(()=>createTasteProfile({cuisines:Array.from({length:9},(_,i)=>'Cuisine '+i)}),/8/);
  assert.throws(()=>createTasteProfile({avoidIngredients:Array.from({length:21},(_,i)=>'Food '+i)}),/20/);
  assert.throws(()=>createTasteProfile({cuisines:['x'.repeat(81)]}),/80/);
  assert.throws(()=>createTasteProfile({cuisines:'India\u0000'}),/characters/i);
  assert.equal(validTasteProfile({cuisines:[],avoidIngredients:[],hiddenRecipeIds:Array.from({length:301},(_,i)=>String(i))}),false);
});
test('suggestions explain real preferences and preserve their source records',()=>{
  const result=recommendRecipes([cake,rice],{},[],createTasteProfile({cuisines:'Indian'}),4,now);
  assert.deepEqual(result.map(x=>x.meal.idMeal),['1']);
  assert.ok(result[0].reasons.some(x=>x.includes('Indian')));
  assert.equal(result[0].meal,rice);
  assert.deepEqual(recommendRecipes([rice],{},[],emptyTasteProfile(),4,now),[],'no invented personal signal');
});
test('skipped ingredients match aliases without confusing distinct foods',()=>{
  const milk={...rice,idMeal:'4',strIngredient1:'Milk'},oat={...rice,idMeal:'5',strIngredient1:'Oat milk'};
  const profile=createTasteProfile({cuisines:'Indian,Turkish',avoidIngredients:'Eggplant,Milk'});
  assert.deepEqual(recommendRecipes([aubergine,milk,oat],{},[],profile,4,now).map(x=>x.meal.idMeal),['5']);
});
test('unknown summary ingredients are excluded when ingredient skips are active',()=>{
  const summary={idMeal:'2',strMeal:'Roasted Aubergine',strArea:'Turkish'};
  const profile=createTasteProfile({cuisines:'Turkish',avoidIngredients:'eggplant'});
  assert.deepEqual(recommendRecipes([summary],{},[],profile,4,now),[]);
  assert.deepEqual(recommendRecipes([summary],{'2':{meal:aubergine,wanted:true}},[],profile,4,now),[]);
});
test('detailed saved recipes win ID deduplication and hidden recipes remain saved',()=>{
  const saved={'1':{meal:rice,wanted:true}};
  const result=recommendRecipes([{idMeal:'1',strMeal:'Tomato Rice'}],saved,[],emptyTasteProfile(),4,now);
  assert.equal(result.length,1);assert.equal(result[0].meal, rice);
  const profile={...emptyTasteProfile(),hiddenRecipeIds:['1']};
  assert.deepEqual(recommendRecipes([rice],saved,[],profile,4,now),[]);
  assert.equal(saved['1'].wanted,true);
});
test('only usable stock contributes kitchen and use-soon reasons',()=>{
  const pantry=[{id:'old',name:'Rice',quantity:'1',unit:'cups',expiry:'2026-10-23'},
    {id:'zero',name:'Tomato',quantity:'0',unit:'pcs',expiry:'2026-10-25'}];
  assert.deepEqual(recommendRecipes([rice],{},pantry,emptyTasteProfile(),4,now),[]);
  const stock=[{id:'fresh',name:'Rice',quantity:'2',unit:'cups',expiry:'2026-10-25'}];
  const result=recommendRecipes([rice],{},stock,emptyTasteProfile(),4,now);
  assert.ok(result[0].reasons.some(x=>x.includes('1 of 2')));
  assert.ok(result[0].reasons.some(x=>x.toLowerCase().includes('rice')&&x.includes('soon')));
});
test('ranking is bounded, deterministic and leaves all input state unchanged',()=>{
  const candidates=[rice,cake,aubergine],saved={'1':{meal:rice,wanted:true},'3':{meal:cake,favourite:true}};
  const snapshot=JSON.stringify({candidates,saved});
  const result=recommendRecipes(candidates,saved,[],emptyTasteProfile(),1,now);
  assert.deepEqual(result.map(x=>x.meal.idMeal),['1']);
  assert.equal(JSON.stringify({candidates,saved}),snapshot);
});
