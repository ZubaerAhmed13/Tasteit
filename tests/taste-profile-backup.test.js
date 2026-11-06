import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore,exportBackup,parseBackup,loadStore} from '../src/model.js';
const profile={cuisines:['Indian'],avoidIngredients:['eggplant'],hiddenRecipeIds:['42']};
test('taste preferences survive export and import without changing existing records',()=>{
  const store={...emptyStore(),tasteProfile:profile};
  assert.deepEqual(parseBackup(exportBackup(store)).tasteProfile,profile);
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(store)}).tasteProfile,profile);
});
test('older stores load an empty taste profile while old backup shape is preserved',()=>{
  const old={pantry:[],saved:{},plan:{}};
  assert.deepEqual(loadStore({getItem:()=>JSON.stringify(old)}).tasteProfile,
    {cuisines:[],avoidIngredients:[],hiddenRecipeIds:[]});
  assert.deepEqual(parseBackup(exportBackup(old)),old);
});
test('malformed taste preferences cannot enter through a backup',()=>{
  for(const tasteProfile of [null,[],{...profile,cuisines:'Indian'},{...profile,hiddenRecipeIds:['../bad']},{...profile,avoidIngredients:['']}]) {
    assert.throws(()=>parseBackup(exportBackup({...emptyStore(),tasteProfile})),/taste/i);
  }
});
