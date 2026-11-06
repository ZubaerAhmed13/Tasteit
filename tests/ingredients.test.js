import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIngredient, analyseMeal, shoppingList } from '../src/model.js';

test('identifies equivalent ingredient naming variants without unsafe generalisation',() => {
  const equals = [
    ['aubergine','eggplant'],
    ['courgettes','zucchini'],
    ['garbanzo beans','chickpea'],
    ['green onions','scallion'],
    ['bell peppers','capsicum'],
    ['Chick Peas','chickpeas'],
    ['Tomatoes','tomato'],
    ['garlic cloves','garlic']
  ];
  for (const [a,b] of equals) assert.equal(normalizeIngredient(a),normalizeIngredient(b),a+' / '+b);
  for (const stable of ['couscous','asparagus','hummus','citrus']) assert.equal(normalizeIngredient(stable),stable);
  const separate = [
    ['chicken','chicken breast'],
    ['red onion','onion'],
    ['milk','oat milk'],
    ['cilantro','coriander seeds'],
    ['chilli','bell pepper'],
    ['garlic','garlic powder'],
    ['fresh tomato','tomato paste']
  ];
  for (const [a,b] of separate) assert.notEqual(normalizeIngredient(a),normalizeIngredient(b),a+' must remain distinct from '+b);
});
test('pantry suggestions and shopping use the same ingredient identity',()=>{
  const meal={strMeal:'Roasted aubergine',strIngredient1:'aubergine',strMeasure1:'500 g',
    strIngredient2:'chickpeas',strMeasure2:'250 g'};
  const pantry=[{name:'eggplant',quantity:'0.5',unit:'kg'},
    {name:'garbanzo beans',quantity:'150',unit:'g'}];
  const analysis=analyseMeal(meal,pantry);
  assert.equal(analysis.percent,100);
  assert.equal(analysis.isQuantityConfirmed,false);
  assert.deepEqual(analysis.availability.map(x=>x.status),['enough','short']);
  const list=shoppingList({'2026-10-22':'1'},{'1':{meal}},pantry);
  assert.equal(list.length,1);
  assert.equal(list[0].name,'chickpeas');
  assert.equal(list[0].label,'100 g short');
});
