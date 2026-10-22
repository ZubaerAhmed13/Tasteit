import test from 'node:test';
import assert from 'node:assert/strict';
import { recordCooking } from '../src/model.js';

test('records notes, date and rating without modifying previous entries', () => {
  const original={meal:{strMeal:'Rice'},wanted:true,cookedCount:0};
  const one=recordCooking(original,{rating:'5',note:'  add turmeric next time  '},new Date('2026-10-22T12:00:00.000Z'));
  assert.equal(original.cookedCount,0);
  assert.equal(one.cookedCount,1);
  assert.equal(one.lastCooked,'2026-10-22T12:00:00.000Z');
  assert.equal(one.cookingHistory[0].rating,5);
  assert.equal(one.cookingHistory[0].note,'add turmeric next time');
  const two=recordCooking(one,{},new Date('2026-10-23T12:00:00.000Z'));
  assert.equal(two.cookedCount,2);
  assert.equal(two.cookingHistory.length,2);
  assert.equal(two.cookingHistory[0].note,'');
});

test('caps history length and rejects malformed journal entries', () => {
  const current={cookedCount:30,cookingHistory:Array.from({length:30},(_,i)=>({date:'2026-10-22',rating:3,note:'note '+i}))};
  assert.equal(recordCooking(current,{rating:4}).cookingHistory.length,30);
  assert.throws(()=>recordCooking(current,{rating:6}),/rating/);
  assert.throws(()=>recordCooking(current,{rating:-2}),/rating/);
  assert.throws(()=>recordCooking(current,{rating:2.5}),/rating/);
  assert.throws(()=>recordCooking(current,{note:'x'.repeat(1001)}),/1,000/);
  assert.throws(()=>recordCooking(current,{},new Date('invalid')),/Invalid cooking date/);
});
