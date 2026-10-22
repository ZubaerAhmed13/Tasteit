import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeasure, evaluateQuantity, displayAmount, pantryMeasure } from '../src/quantities.js';
import { shoppingList, analyseMeal, persistStore } from '../src/model.js';

test('parses only unambiguous metric and count measurements', () => {
  assert.deepEqual(parseMeasure('500g'), {quantity:500,unit:'g'});
  assert.deepEqual(parseMeasure('1.5 kg'), {quantity:1500,unit:'g'});
  assert.deepEqual(parseMeasure('1,5 l'), {quantity:1500,unit:'ml'});
  assert.deepEqual(parseMeasure('½ cup'), {quantity:.5,unit:'cup'});
  assert.deepEqual(parseMeasure('1 ½ cups'), {quantity:1.5,unit:'cup'});
  assert.deepEqual(parseMeasure('2'), {quantity:2,unit:'pcs'});
  assert.deepEqual(parseMeasure('2 teaspoons'), {quantity:2,unit:'tsp'});
  assert.equal(parseMeasure('1-2 cups'),null);
  assert.equal(parseMeasure('2 large'),null);
  assert.equal(parseMeasure('to taste'),null);
  assert.equal(parseMeasure('1 bag'),null);
  assert.equal(parseMeasure('0 g'),null);
  assert.equal(parseMeasure('-5 g'),null);
  assert.equal(parseMeasure('2 cups chopped'),null);
  assert.equal(displayAmount(1500,'g'),'1.5 kg');
  assert.equal(displayAmount(1200,'ml'),'1.2 l');
  assert.equal(pantryMeasure({quantity:'',unit:'kg'}),null);
});

test('compares compatible quantities and reports shortages', () => {
  assert.deepEqual(evaluateQuantity(['750 g'],[{quantity:'1',unit:'kg'}]),
    {status:'enough',label:'1 kg available'});
  assert.deepEqual(evaluateQuantity(['500 g','400 g'],[{quantity:'0.5',unit:'kg'}]),
    {status:'short',label:'400 g short'});
  assert.deepEqual(evaluateQuantity(['1/2 l','300 ml'],[{quantity:'750',unit:'ml'}]),
    {status:'short',label:'50 ml short'});
  assert.deepEqual(evaluateQuantity(['250 g'],[]),
    {status:'missing',label:'250 g needed'});
  assert.deepEqual(evaluateQuantity(['a handful'],[{quantity:250,unit:'g'}]),
    {status:'review',label:'Check recipe amounts'});
  assert.deepEqual(evaluateQuantity(['1 cup'],[{quantity:240,unit:'ml'}]),
    {status:'review',label:'Check stock / units'});
  assert.deepEqual(evaluateQuantity(['2 pcs'],[{quantity:'',unit:'pcs'}]),
    {status:'review',label:'Check stock / units'});
});

test('aggregates multiple days and flags a real weekly deficit', () => {
  const meal={strMeal:'Rice and eggs',strIngredient1:'Rice',strMeasure1:'400 g',strIngredient2:'Eggs',strMeasure2:'2'};
  const plan={'2026-10-22':'one','2026-10-23':'one'};
  const saved={one:{meal}};
  const result=shoppingList(plan,saved,[{name:'Rice',quantity:'500',unit:'g'}]);
  assert.equal(result.length,2);
  assert.deepEqual(result.map(item=>[item.name,item.status,item.label]),[
    ['Eggs','missing','4 pcs needed'],
    ['Rice','short','300 g short']
  ]);
  assert.equal(shoppingList(plan,saved,[
    {name:'Rice',quantity:'800',unit:'g'},
    {name:'Eggs',quantity:'4',unit:'pcs'}
  ]).length,0);
});

test('never marks a meal as amount-confirmed when stock units are unknown', () => {
  const meal={strMeal:'Porridge',strIngredient1:'Oats',strMeasure1:'200 g'};
  assert.equal(analyseMeal(meal,[{name:'Oats',quantity:1,unit:'kg'}]).isQuantityConfirmed,true);
  const vague=analyseMeal(meal,[{name:'Oats',quantity:1,unit:'cups'}]);
  assert.equal(vague.percent,100);
  assert.equal(vague.isQuantityConfirmed,false);
  assert.equal(vague.availability[0].status,'review');
});
test('persistence returns false when storage is unavailable', () => {
  assert.equal(persistStore({pantry:[],saved:{},plan:{}},null),false);
  assert.equal(persistStore({pantry:[],saved:{},plan:{}},{setItem(){throw new Error('QuotaExceededError')}}),false);
});
