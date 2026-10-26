import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.js';
const memory=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem(k,v){values.set(k,v);}};};
const state=name=>({...model.emptyStore(),pantry:[{id:name,name,quantity:'',unit:'',storage:'Pantry',expiry:''}]});
test('ordinary saves cannot overwrite malformed or invalid existing local records',()=>{
 for(const raw of ['{broken','[]','null',JSON.stringify({pantry:'bad',saved:{},plan:{}})]){
  const storage=memory();storage.setItem(model.STORAGE_KEY,raw);
  assert.equal(model.persistStore(state('Rice'),storage),false);
  assert.equal(storage.getItem(model.STORAGE_KEY),raw);
 }
});
test('successful writes retain a validated recovery checkpoint and failed writes keep it',()=>{
 const storage=memory();assert.equal(model.persistStore(state('Rice'),storage),true);
 const first=storage.getItem(model.LAST_GOOD_KEY);assert.equal(model.parseBackup(first).pantry[0].name,'Rice');
 const put=storage.setItem;storage.setItem=(k,v)=>{if(k===model.STORAGE_KEY)throw Error('full');put(k,v);};
 assert.equal(model.persistStore(state('Potato'),storage),false);assert.equal(storage.getItem(model.LAST_GOOD_KEY),first);
 assert.equal(model.loadStore(storage).pantry[0].name,'Rice');
 storage.setItem=(k,v)=>{if(k===model.LAST_GOOD_KEY)throw Error('checkpoint full');put(k,v);};
 assert.equal(model.persistStore(state('Tomato'),storage),true);assert.equal(model.loadStore(storage).pantry[0].name,'Tomato');assert.equal(storage.getItem(model.LAST_GOOD_KEY),first);
});
test('explicit restore retains exact damaged bytes and refuses stale or failed preservation',()=>{
 const storage=memory();model.persistStore(state('Rice'),storage);storage.setItem(model.STORAGE_KEY,'{broken');
 const health=model.localStoreStatus(storage);assert.equal(health.status,'damaged');assert.equal(health.lastGood.data.pantry[0].name,'Rice');
 assert.equal(model.restoreLocalStore(state('Potato'),'stale',storage),false);assert.equal(storage.getItem(model.STORAGE_KEY),'{broken');
 const put=storage.setItem;storage.setItem=(k,v)=>{if(k===model.RECOVERY_KEY)throw Error('full');put(k,v);};
 assert.equal(model.restoreLocalStore(state('Potato'),'{broken',storage),false);assert.equal(storage.getItem(model.STORAGE_KEY),'{broken');
 storage.setItem=put;assert.equal(model.restoreLocalStore(state('Rice'),'{broken',storage),true);
 assert.equal(storage.getItem(model.RECOVERY_KEY),'{broken');assert.equal(model.loadStore(storage).pantry[0].name,'Rice');
 assert.equal(model.restoreLocalStore(state('Potato'),'{broken',storage),false,'another tab already recovered this copy');
});
test('unavailable storage and invalid checkpoints never imply an empty writable cookbook',()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 assert.equal(model.localStoreStatus(denied).status,'unavailable');assert.equal(model.persistStore(state('Rice'),denied),false);
 const storage=memory();storage.setItem(model.STORAGE_KEY,'{broken');storage.setItem(model.LAST_GOOD_KEY,'{also broken');
 assert.equal(model.localStoreStatus(storage).lastGood,null);assert.equal(model.restoreLocalStore({pantry:'bad'},'{broken',storage),false);assert.equal(storage.getItem(model.STORAGE_KEY),'{broken');
});
