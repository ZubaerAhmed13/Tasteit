import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseMeal, shoppingList, usablePantryItem, createPersonalMeal, exportBackup, parseBackup, emptyStore, ingredientsOf } from '../src/model.js';

const fixture = {
  strMeal: 'Vegetable rice',
  strIngredient1: 'Potatoes', strMeasure1: '2',
  strIngredient2: 'Rice', strMeasure2: '1 cup'
};

test('expired ingredients do not count as present', () => {
  const pantry = [
    { name: 'potatoes', quantity: '2', unit: 'pcs', expiry: '2020-01-01' },
    { name: 'rice', quantity: '1', unit: 'kg' }
  ];
  const match = analyseMeal(fixture, pantry);
  assert.deepEqual(match.missing.map(x => x.name), ['Potatoes']);
  assert.deepEqual(shoppingList({ '2026-10-22': '1' }, { '1': { meal: fixture } }, pantry).map(x => x.name), ['Potatoes']);
});
test('zero quantity means not available, unknown amount does not claim sufficiency', () => {
  assert.equal(usablePantryItem({name:'rice',quantity:'0',unit:'g'}), false);
  assert.equal(usablePantryItem({name:'rice',quantity:''}), true);
  assert.equal(analyseMeal(fixture, [{name:'potatoes',quantity:0},{name:'rice'}]).percent,50);
  assert.equal(usablePantryItem({name:'tomatoes',quantity:'2', expiry:'2026-10-22'},new Date(2026,9,22)),true);
  assert.equal(usablePantryItem({name:'tomatoes',quantity:'2', expiry:'2026-10-21'},new Date(2026,9,22)),false);
});
test('creates personal meals compatible with ingredient and planning functions', () => {
  const personal = createPersonalMeal({
    title: ' Family curry ',
    origin: 'Bangladeshi',
    ingredients: 'Chicken | 500 g\nOnion | 2\nTurmeric | 1 tsp',
    instructions: 'Heat oil.\nCook everything thoroughly.'
  }, 'personal-123');
  assert.equal(personal.strPersonal, true);
  assert.equal(personal.strMeal, 'Family curry');
  assert.equal(personal.strArea, 'Bangladeshi');
  assert.deepEqual(ingredientsOf(personal).map(x => x.name), ['Chicken', 'Onion', 'Turmeric']);
  assert.equal(personal.strMeasure2,'2');
  assert.equal(analyseMeal(personal,[{name:'chicken'},{name:'onions'}]).percent,67);
});
test('rejects incomplete or malformed personal recipes', () => {
  const input = { title:'test',ingredients:'Rice',instructions:'Boil rice.' };
  assert.throws(()=>createPersonalMeal({...input,title:''},'personal-123'),/recipe name/i);
  assert.throws(()=>createPersonalMeal({...input,ingredients:' '},'personal-123'),/between 1 and 20/);
  assert.throws(()=>createPersonalMeal(input,'remote-123'),/Invalid personal recipe/);
  assert.throws(()=>createPersonalMeal({...input,ingredients:Array(21).fill('Rice').join('\n')},'personal-123'),/between 1 and 20/);
});
test('exports and imports the full local cookbook', () => {
  const meal = createPersonalMeal({ title:'My rice', ingredients:'Rice | 1 cup', instructions:'Boil.' },'personal-1');
  const original = { pantry:[{id:'p',name:'Rice',quantity:'1',unit:'kg'}], saved:{'personal-1':{meal,usual:true}}, plan:{'2026-10-22':'personal-1'} };
  const backup = exportBackup(original,new Date('2026-10-22T16:00:00Z'));
  const data = JSON.parse(backup);
  assert.equal(data.version,1);
  assert.deepEqual(parseBackup(backup),original);
  assert.equal(parseBackup(exportBackup(emptyStore())).pantry.length,0);
});
test('rejects unsupported, malformed, or oversized backups', () => {
  assert.throws(()=>parseBackup('{'),/valid JSON/);
  assert.throws(()=>parseBackup('{"format":"other","version":1,"data":{}}'),/supported/);
  assert.throws(()=>parseBackup(JSON.stringify({format:'tasteit-backup',version:1,data:{pantry:'bad',saved:{},plan:{}}})),/missing/);
  assert.throws(()=>parseBackup('X'.repeat(2_000_001)),/smaller/);
});
