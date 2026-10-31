import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBulkPantry,applyBulkPantry} from '../src/pantry-bulk.js';

test('accepts plain ingredients and single-line comma-separated names with unknown amounts',()=>{
  const list=parseBulkPantry('rice, eggs, tomatoes');
  assert.deepEqual(list.items.map(x=>x.name),['rice','eggs','tomatoes']);
  assert.ok(list.items.every(x=>x.quantity===''&&x.location==='Pantry'));
  assert.equal(list.errors.length,0);
  assert.equal(parseBulkPantry('Olive oil').items[0].name,'Olive oil');
});
test('preserves explicit amounts, storage locations and dates',()=>{
  const v=parseBulkPantry('Rice | 1.5 kg | Pantry\nEggs | 6 pcs | Fridge | 2026-11-03\nChicken breast | 500 g | Freezer');
  assert.equal(v.errors.length,0);
  assert.deepEqual(v.items.map(x=>[x.name,x.quantity,x.unit,x.location,x.expiry]),[
    ['Rice','1.5','kg','Pantry',''],
    ['Eggs','6','pcs','Fridge','2026-11-03'],
    ['Chicken breast','500','g','Freezer','']
  ]);
});
test('rejects ambiguous amounts, invented locations and invalid dates without silently importing',()=>{
  const v=parseBulkPantry('Rice | 4\nEggs | 3 pcs | shelf\nMilk | 500 ml | Fridge | 2026-02-30\nOnion | 3 pcs | Pantry');
  assert.equal(v.items.length,1);
  assert.equal(v.errors.length,3);
  assert.throws(()=>applyBulkPantry([],v,()=>String(Math.random())),/fix the highlighted/);
  assert.equal(parseBulkPantry('rice | 0 g').errors.length,1);
  assert.equal(parseBulkPantry('rice | -10 kg').errors.length,1);
});
test('identifies duplicates, synonyms and preserves previously recorded amounts',()=>{
  const saved=[{id:'original',name:'aubergine',quantity:'200',unit:'g',location:'Fridge',expiry:''}];
  const p=parseBulkPantry('eggplant\nOlive oil | 500 ml\nolive oil',saved);
  assert.deepEqual(p.items.map(x=>x.name),['Olive oil']);
  assert.equal(p.skipped.length,2);
  const result=applyBulkPantry(saved,p,()=> 'newid');
  assert.equal(result.length,2);
  assert.deepEqual(result[0],saved[0]);
  assert.equal(result[1].quantity,'500');
});
test('limits very large batches and treats form text as untrusted data',()=>{
  assert.equal(parseBulkPantry('Rice\n'.repeat(101)).errors[0].message,'Add at most 100 items per batch.');
  const v=parseBulkPantry('<script>alert(1)</script> | 2 kg');
  assert.equal(v.errors.length,0);
  // Rendering code must escape user-provided names; the parser does not return HTML.
  assert.equal(v.items[0].name,'<script>alert(1)</script>');
});
