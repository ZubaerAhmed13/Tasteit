import test from 'node:test';
import assert from 'node:assert/strict';
import {kitchenIngredientChoices,initialKitchenSelection,reconcileKitchenSelection,
  searchPantryRows,kitchenMatchDetails,localKitchenRecipes,combineKitchenRecipes,
  MAX_KITCHEN_SEARCH} from '../src/kitchen-discovery.js';

const now = new Date(2026,9,23,12,0);
const pantry = [
  {id:'1',name:'Rice',quantity:'1',unit:'kg',expiry:'2026-10-24'},
  {id:'2',name:'Rice',quantity:'100',unit:'g',expiry:'2026-11-22'},
  {id:'3',name:'Tomatoes',quantity:'5',unit:'pcs'},
  {id:'4',name:'Chickpeas',quantity:'0',unit:'g'},
  {id:'5',name:'Onion',quantity:'2',unit:'pcs',expiry:'2026-10-25'},
  {id:'6',name:'Eggs',quantity:'6',unit:'pcs'},
  {id:'7',name:'Mushrooms',quantity:'1',unit:'kg'},
  {id:'8',name:'Expired',quantity:'1',unit:'pcs',expiry:'2020-01-01'}
];
const rice = {idMeal:'rice',strMeal:'Tomato rice',strIngredient1:'Rice',strMeasure1:'500 g',
  strIngredient2:'Tomatoes',strMeasure2:'2',strIngredient3:'Salt',strMeasure3:'to taste'};
const saved={'rice':{meal:rice,wanted:true}};
test('only usable ingredient names are selectable; batches combine and soon dates lead',()=>{
  const choices=kitchenIngredientChoices(pantry,now);
  assert.deepEqual(choices.map(x=>x.name),['Rice','Onion','Eggs','Mushrooms','Tomatoes']);
  assert.equal(choices[0].batches,2);
  assert.equal(choices[0].soonest,new Date('2026-10-24T12:00:00').getTime());
  assert.equal(initialKitchenSelection(pantry,now).length,MAX_KITCHEN_SEARCH);
  assert.deepEqual(initialKitchenSelection(pantry,now),['rice','onion','egg','mushroom']);
});
test('a selection cannot secretly include missing or expired ingredients',()=>{
  assert.deepEqual(reconcileKitchenSelection(pantry,['rice','expired','rice','egg','mushroom','tomato','onion'],now),
    ['rice','egg','mushroom','tomato']);
  assert.deepEqual(searchPantryRows(pantry,['tomato','rice'],now).map(x=>x.name),['Rice','Tomatoes']);
  assert.deepEqual(reconcileKitchenSelection(pantry,[],now),[]);
});
test('matching explains name coverage separately from quantities',()=>{
  const score=kitchenMatchDetails(rice,pantry);
  assert.equal(score.total,3);
  assert.equal(score.matched,2);
  assert.deepEqual(score.missing,['Salt']);
  assert.equal(score.confirmed,false);
  assert.ok(score.explanation.includes('2 of 3'));
  assert.deepEqual(score.needReview,[]);
});
test('saved dishes with pantry overlap appear in candidate discovery without fake source',()=>{
  const other={idMeal:'other',strMeal:'Unknown',strIngredient1:'Unlisted'};
  assert.deepEqual(localKitchenRecipes({...saved,other:{meal:other}},pantry).map(x=>x.idMeal),['rice']);
  const remote=[{idMeal:'rice',strMeal:'Different copy'},{idMeal:'new',strMeal:'Another dish'}];
  const combined=combineKitchenRecipes(remote,localKitchenRecipes(saved,pantry));
  assert.deepEqual(combined.map(x=>x.idMeal),['rice','new']);
  assert.equal(combined[0].strMeal,'Tomato rice');
});
