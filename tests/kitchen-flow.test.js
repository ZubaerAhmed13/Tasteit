import test from 'node:test';
import assert from 'node:assert/strict';
import * as flow from '../src/kitchen-flow.js';
import {emptyStore,exportBackup,parseBackup,loadStore} from '../src/model.js';
import {shoppingChecklist} from '../src/shopping.js';
const now=new Date(2026,9,24,12);
const purchaseStore=()=>({...emptyStore(),shoppingExtras:[{id:'manual-rice',name:'Rice',checked:true}],
  pantry:[{id:'old-rice',name:'Rice',quantity:'250',unit:'g',location:'Pantry',expiry:''}]});
const reviewFor=store=>flow.purchaseReview(shoppingChecklist([],store.shoppingExtras),store.shoppingStocked);
const pick={key:'manual-rice',quantity:'1',unit:'kg',location:'Pantry',expiry:'2026-12-01'};
test('reviewed purchases create separate batches without changing existing stock',()=>{
  const store=purchaseStore(),review=reviewFor(store);
  const next=flow.receivePurchases(store,review,[pick],'receipt-one',now);
  assert.equal(next.pantry.length,2);
  assert.equal(next.pantry[0].quantity,'250');
  assert.equal(next.pantry[1].quantity,'1');assert.equal(next.pantry[1].unit,'kg');
  assert.equal(next.pantry[1].expiry,'2026-12-01');
  assert.equal(store.pantry.length,1);
  assert.equal(reviewFor(next).length,0);
  assert.throws(()=>flow.receivePurchases(next,review,[pick],'receipt-two',now),/already|changed/i);
});
test('purchase review rejects unchecked, changed and invalid rows atomically',()=>{
  const store=purchaseStore(),review=reviewFor(store);
  for(const quantity of ['', '0','-1','NaN'])assert.throws(()=>flow.receivePurchases(store,review,[{...pick,quantity}],'x',now),/amount/i);
  assert.throws(()=>flow.receivePurchases(store,review,[{...pick,expiry:'2026-02-30'}],'x',now),/date/i);
  assert.throws(()=>flow.receivePurchases(store,review,[{...pick,unit:'buckets'}],'x',now),/unit/i);
  assert.throws(()=>flow.receivePurchases({...store,shoppingExtras:[]},review,[pick],'x',now),/changed/i);
  assert.throws(()=>flow.receivePurchases(store,review,[pick,pick],'x',now),/duplicate/i);
  assert.equal(store.pantry.length,1);
});
const pantry=[
  {id:'new',name:'Rice',quantity:'1',unit:'kg',expiry:'2026-12-20'},
  {id:'old',name:'Rice',quantity:'250',unit:'g',expiry:'2026-10-25'},
  {id:'salt',name:'Salt',quantity:'100',unit:'g',expiry:''},
  {id:'vague',name:'Tomatoes',quantity:'',unit:'pcs',expiry:''}
];
const meal={idMeal:'rice',strMeal:'Rice',strIngredient1:'Rice',strMeasure1:'500 g',strIngredient2:'Salt',strMeasure2:'to taste'};
test('usage suggestions use compatible units, serving scale and earlier batches first',()=>{
  const review=flow.consumptionReview(meal,pantry,2,4,now);
  assert.equal(review.find(x=>x.id==='old').suggested,'250');
  assert.equal(review.find(x=>x.id==='new').suggested,'0.75');
  assert.equal(review.find(x=>x.id==='salt').suggested,'');
  assert.equal(pantry[0].quantity,'1');
});
test('confirmed consumption reduces only selected batches and rejects stale stock/overdraw',()=>{
  const review=flow.consumptionReview(meal,pantry,2,2,now);
  const old=review.find(x=>x.id==='old');
  const next=flow.applyConsumption(pantry,[{...old,used:'200'}]);
  assert.equal(next.find(x=>x.id==='old').quantity,'50');
  assert.equal(next.find(x=>x.id==='new').quantity,'1');
  assert.equal(pantry.find(x=>x.id==='old').quantity,'250');
  assert.throws(()=>flow.applyConsumption(pantry,[{...old,used:'251'}]),/available/i);
  assert.throws(()=>flow.applyConsumption(pantry,[{...old,used:'-1'}]),/amount/i);
  assert.throws(()=>flow.applyConsumption(pantry.map(x=>x.id==='old'?{...x,quantity:'100'}:x),[{...old,used:'50'}]),/changed/i);
  assert.throws(()=>flow.applyConsumption(pantry.map(x=>x.id==='old'?{...x,expiry:'2026-10-24'}:x),[{...old,used:'50'}]),/changed/i);
  assert.throws(()=>flow.applyConsumption(pantry,[{...old,used:'10'},{...old,used:'10'}]),/duplicate/i);
});
test('zero stock stays recorded and unknown recipe measures are never guessed',()=>{
  const review=flow.consumptionReview(meal,pantry,2,2,now);
  const old=review.find(x=>x.id==='old');
  assert.equal(flow.applyConsumption(pantry,[{...old,used:'250'}]).find(x=>x.id==='old').quantity,'0');
  assert.equal(review.find(x=>x.id==='salt').suggested,'');
  assert.equal(flow.consumptionReview({...meal,strMeasure1:'a bowl'},pantry,2,2,now).find(x=>x.id==='old').suggested,'');
});
test('leftovers validate portions, dates and locations without inventing a safe storage deadline',()=>{
  const input={id:'leftover-one',mealId:'rice',name:'Rice',portions:2,preparedAt:'2026-10-24',reminderDate:'',location:'Fridge'};
  const rows=flow.addLeftover([],input);
  assert.equal(rows[0].reminderDate,'');assert.equal(rows[0].portions,2);
  assert.throws(()=>flow.addLeftover([],{...input,portions:-2}),/portions/i);
  assert.throws(()=>flow.addLeftover([],{...input,reminderDate:'2026-02-30'}),/date/i);
  assert.throws(()=>flow.addLeftover([],{...input,reminderDate:'2026-10-23'}),/date/i);
  assert.equal(flow.validKitchenState({},rows),true);
});
test('new kitchen records round-trip in v1 backups and older backups remain unchanged',()=>{
  const store=flow.receivePurchases(purchaseStore(),reviewFor(purchaseStore()),[pick],'backup',now);
  store.leftovers=flow.addLeftover([],{id:'leftover-one',mealId:'rice',name:'Rice',portions:2,preparedAt:'2026-10-24',reminderDate:'2026-10-25',location:'Freezer'});
  assert.deepEqual(parseBackup(exportBackup(store)),store);
  const old={pantry:[],saved:{},plan:{}};
  assert.deepEqual(parseBackup(exportBackup(old)),old);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).leftovers,[]);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).shoppingStocked,{});
  assert.throws(()=>parseBackup(exportBackup({...store,leftovers:[{name:'broken'}]})),/invalid kitchen/i);
});
