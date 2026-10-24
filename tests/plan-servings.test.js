import test from 'node:test';
import assert from 'node:assert/strict';
import { shoppingList, exportBackup, parseBackup, emptyStore, loadStore } from '../src/model.js';

const rice={strMeal:'Family rice',strIngredient1:'Rice',strMeasure1:'300 g',strIngredient2:'Eggs',strMeasure2:'1',strIngredient3:'Pepper',strMeasure3:'to taste'};
const saved={rice:{meal:rice,baseServings:2,usual:true}};
const day1='2026-10-23',day2='2026-10-24';
const plan={[day1]:'rice',[day2]:'rice'};
test('shopping quantities reflect different portions on separate days',()=>{
  const pantry=[{name:'Rice',quantity:'800',unit:'g'},{name:'Eggs',quantity:'2',unit:'pcs'}];
  const list=shoppingList(plan,saved,pantry,{[day1]:4,[day2]:2});
  // 600g + 300g = 900g, stock 800g, need 100g.
  assert.equal(list.find(x=>x.name==='Rice').label,'100 g short');
  assert.equal(list.find(x=>x.name==='Eggs').label,'1 pcs short');
  assert.equal(list.find(x=>x.name==='Pepper').status,'missing');
  assert.ok(/Check/.test(list.find(x=>x.name==='Pepper').label));
});
test('no user-confirmed original count means unscaled shopping',()=>{
  const pantry=[{name:'Rice',quantity:'350',unit:'g'}];
  const list=shoppingList({[day1]:'rice'},{rice:{meal:rice}},pantry,{[day1]:12});
  assert.equal(list.find(x=>x.name==='Rice'),undefined,'300g remains as written');
});
test('older backups migrate without guessing original or planned serving sizes',()=>{
  const old={pantry:[],saved,plan};
  assert.deepEqual(parseBackup(exportBackup(old)),old);
  const created=emptyStore();
  assert.deepEqual(created.planServings,{});
  const oldStorage={getItem:()=>JSON.stringify(old)};
  assert.deepEqual(loadStore(oldStorage).planServings,{});
});
test('modern plan serving preferences survive a backup roundtrip',()=>{
  const modern={pantry:[],saved,plan,planServings:{[day1]:4,[day2]:2}};
  assert.deepEqual(parseBackup(exportBackup(modern)),modern);
  assert.throws(()=>parseBackup(JSON.stringify({
    format:'tasteit-backup',version:1,data:{...modern,planServings:{[day1]:0}}
  })),/invalid meal serving/);
});
test('ambiguous and fractional whole units never get silently scaled',()=>{
  const list=shoppingList({[day1]:'rice'},saved,[{name:'Eggs',quantity:'1',unit:'pcs'}],{[day1]:1});
  assert.equal(list.find(x=>x.name==='Eggs').status,'review');
  assert.ok(/Check/.test(list.find(x=>x.name==='Eggs').label));
});
