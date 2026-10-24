import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingKey,shoppingFingerprint,shoppingChecklist,shoppingPlainText,validShoppingState,
  addShoppingExtra,removeShoppingExtra,toggleShoppingExtra,toggleRecipeChecked} from '../src/shopping.js';
import {emptyStore,loadStore,exportBackup,parseBackup} from '../src/model.js';

const rice={name:'Rice',label:'300 g short',status:'short',meals:['Family curry']};
const onion={name:'Onion',label:'2 pcs needed',status:'missing',meals:['Family curry']};

test('recipe ingredient purchase flags are reversible and tied to unchanged requirements',()=>{
  const checked=toggleRecipeChecked({},rice);
  assert.equal(shoppingChecklist([rice,onion],[],checked).completedCount,1);
  assert.deepEqual(shoppingChecklist([rice,onion],[],checked).toBuy.map(x=>x.item.name),['Onion']);
  assert.equal(toggleRecipeChecked(checked,rice)[shoppingKey(rice)],undefined);
  assert.equal(shoppingChecklist([{...rice,label:'500 g short'}],[],checked).completedCount,0,
    'a changed quantity must need review again');
  assert.notEqual(shoppingFingerprint(rice),shoppingFingerprint({...rice,meals:['New dish']}));
});
test('personal items can be checked and removed without touching pantry inventory',()=>{
  const extras=addShoppingExtra([],'  Dish   soap  ','manual-one');
  assert.equal(extras[0].name,'Dish soap');
  assert.equal(extras[0].checked,false);
  assert.equal(toggleShoppingExtra(extras,'manual-one')[0].checked,true);
  assert.equal(extras[0].checked,false,'original must remain immutable');
  assert.deepEqual(removeShoppingExtra(extras,'manual-one'),[]);
  assert.throws(()=>addShoppingExtra(extras,'DISH soap','manual-other'),/already/);
  assert.throws(()=>addShoppingExtra(extras,'','manual-other'),/item name/);
  assert.throws(()=>addShoppingExtra(extras,'Coffee','unsafe identifier'),/identifier/);
});
test('copies only outstanding items by default',()=>{
  const extra=addShoppingExtra([],'Bananas','manual-2');
  const checked=toggleRecipeChecked({},rice);
  const state=shoppingChecklist([rice,onion],extra,checked);
  assert.deepEqual([state.total,state.completedCount],[3,1]);
  assert.equal(shoppingPlainText(state).includes('Rice'),false);
  assert.equal(shoppingPlainText(state).includes('Onion'),true);
  assert.equal(shoppingPlainText(state).includes('Bananas'),true);
  assert.ok(shoppingPlainText(state,{includeCompleted:true}).includes('☑ Rice'));
});
test('shopping progress is backed up and old backups remain supported',()=>{
  const store=emptyStore();
  store.shoppingExtras=addShoppingExtra([],'Bananas','manual-2');
  store.shoppingChecked=toggleRecipeChecked({},rice);
  assert.deepEqual(parseBackup(exportBackup(store)),store);
  const old={pantry:[],saved:{},plan:{}};
  assert.deepEqual(parseBackup(exportBackup(old)),old);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).shoppingExtras,[]);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).shoppingChecked,{});
  assert.equal(validShoppingState(store.shoppingChecked,store.shoppingExtras),true);
  assert.equal(validShoppingState({'recipe:rice':99},[]),false);
  assert.equal(validShoppingState({},[{name:'Coffee',id:'evil',checked:false}]),false);
  assert.throws(()=>parseBackup(exportBackup({...store,shoppingExtras:[{id:'bad',name:'x',checked:false}]})),/invalid shopping checklist/);
});
