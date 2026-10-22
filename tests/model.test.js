import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIngredient, ingredientsOf, analyseMeal, shoppingList, loadStore, persistStore, emptyStore, nextSevenDates } from '../src/model.js';

const meal = { strMeal: 'Pasta', strIngredient1: 'Tomatoes', strMeasure1: '2', strIngredient2: 'Garlic', strMeasure2: '1 clove', strIngredient3: 'Pasta', strMeasure3: '200g' };

test('normalises basic plurals and synonyms', () => {
  assert.equal(normalizeIngredient(' TOMATOES '), 'tomato');
  assert.equal(normalizeIngredient('garlic cloves'), 'garlic');
  assert.equal(normalizeIngredient('Potatoes'), 'potato');
});
test('extracts ingredients with measures', () => {
  assert.deepEqual(ingredientsOf(meal), [{name:'Tomatoes',measure:'2'},{name:'Garlic',measure:'1 clove'},{name:'Pasta',measure:'200g'}]);
});
test('identifies missing ingredients without claiming quantities', () => {
  const result = analyseMeal(meal, [{name:'tomato', quantity:'1', unit:'g'},{name:'garlic'}]);
  assert.deepEqual(result.missing.map(x => x.name), ['Pasta']);
  assert.equal(result.percent, 67);
  assert.equal(result.isPresenceMatch, false);
  assert.equal(analyseMeal(meal,[{name:'tomatoes'},{name:'garlic'},{name:'pasta'}]).isPresenceMatch,true);
});
test('creates a deduplicated shopping list from scheduled saved recipes', () => {
  const list = shoppingList({'2026-10-22':'7','2026-10-23':'8'}, {'7':{meal},'8':{meal:{...meal,strMeal:'Pasta again'}}}, [{name:'tomato'}]);
  assert.deepEqual(list.map(x => x.name), ['Garlic','Pasta']);
  assert.equal(list[0].meals.length, 2);
});
test('recovers from malformed browser data', () => {
  const storage = { getItem: () => '{invalid', setItem: () => {} };
  assert.deepEqual(loadStore(storage), emptyStore());
  const items = new Map();
  const mock = { getItem: k => items.get(k), setItem: (k,v) => items.set(k,v) };
  assert.equal(persistStore({pantry:[],saved:{},plan:{}},mock),true);
  assert.deepEqual(loadStore(mock),emptyStore());
});
test('produces seven unique local dates even at month boundary', () => {
  const days = nextSevenDates(new Date(2026, 9, 29));
  assert.equal(days.length,7);
  assert.equal(days[0].key,'2026-10-29');
  assert.equal(days[3].key,'2026-11-01');
});