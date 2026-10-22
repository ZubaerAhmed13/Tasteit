import test from 'node:test';
import assert from 'node:assert/strict';
import { dateStatus, expiringBatches, recipeUseSoon, rankByKitchen } from '../src/pantry-batches.js';
import { analyseMeal, shoppingList } from '../src/model.js';

const now = new Date(2026,9,22,12,0,0);
const pantry = [
  { id:'rice-old',name:'Rice',quantity:'250',unit:'g',location:'Pantry',expiry:'2026-10-25' },
  { id:'rice-new',name:'Rice',quantity:'500',unit:'g',location:'Pantry',expiry:'2026-12-30' },
  { id:'rice-past',name:'Rice',quantity:'500',unit:'g',location:'Pantry',expiry:'2020-01-01' },
  { id:'onion',name:'Onions',quantity:'2',unit:'pcs',location:'Fridge',expiry:'2026-10-23' },
  { id:'milk',name:'Milk',quantity:'0',unit:'l',location:'Fridge',expiry:'2026-10-22' }
];
const dish={idMeal:'rice',strMeal:'Rice',strIngredient1:'Rice',strMeasure1:'700 g'};
const second={idMeal:'onion',strMeal:'Onion stew',strIngredient1:'Onions',strMeasure1:'1'};
test('marks best-before dates without assuming food safety',()=>{
  assert.equal(dateStatus('2026-10-22',now).kind,'soon');
  assert.equal(dateStatus('2026-10-25',now).days,3);
  assert.equal(dateStatus('2026-10-26',now).kind,'future');
  assert.equal(dateStatus('2026-10-21',now).kind,'past');
  assert.equal(dateStatus('2026-02-30',now).kind,'invalid');
  assert.equal(dateStatus('',now).kind,'unknown');
});
test('separate purchases retain expiry and stock amounts',()=>{
  const near=expiringBatches(pantry,now);
  assert.deepEqual(near.map(x=>x.id),['onion','rice-old']);
  assert.equal(near[1].dateInfo.days,3);
  // The model aggregates both unexpired rice quantities for one recipe.
  // The expired rice must not be counted.
  assert.equal(analyseMeal(dish,pantry).isQuantityConfirmed,true);
  assert.equal(shoppingList({'2026-10-22':'1'},{'1':{meal:dish}},pantry).length,0);
});
test('use-soon priorities favour available soon-dated stock',()=>{
  assert.deepEqual(recipeUseSoon(second,pantry,now),['Onions']);
  assert.deepEqual(recipeUseSoon(dish,pantry,now),['Rice']);
  assert.deepEqual(recipeUseSoon({strMeal:'Chicken',strIngredient1:'Chicken',strMeasure1:'1'},pantry,now),[]);
  const ranked=rankByKitchen([dish,second],pantry,now);
  assert.equal(ranked.length,2);
  assert.equal(ranked[0].idMeal,'onion'); // the nearer date ranks higher when stock is otherwise sufficient.
});
