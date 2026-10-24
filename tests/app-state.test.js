import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {emptyStore} from '../src/model.js';

// Exercise the actual event owner with only the browser boundary replaced.
// A failed persist followed by a mutation or a removed plan must fail these tests.
async function appWithStore(state, persists) {
  let source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const imports=[...source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm)];
  const bindings={};
  for(const match of imports)Object.assign(bindings,await import(new URL('../src/'+match[1].slice(2),import.meta.url)));
  source=source.replace(/^import .*;\n/gm,'').replace(/\n(?:render\(\);|\/\/ Start application\.)[\s\S]*$/,'');
  const meal={idMeal:'unit-1',strMeal:'Rice',strInstructions:'Boil rice.',strIngredient1:'Rice',strMeasure1:'1 cup'};
  const notices=[];
  const handlers={};
  const sandbox={...bindings,loadStore:()=>state,persistStore:()=>persists,
    document:{getElementById:()=>({querySelector:()=>null,focus:()=>{},scrollIntoView:()=>{}}),addEventListener:(name,handler)=>{handlers[name]=handler;}},
    window:{addEventListener:()=>{},location:{href:'https://tasteit.test/app/'}},
    console,URL,AbortController,DOMException,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,
    FormData:class {constructor(target){this.fields=target.fields||{};}get(key){return this.fields[key]??null;}entries(){return Object.entries(this.fields)[Symbol.iterator]();}[Symbol.iterator](){return this.entries();}},
    notices,meal};
  vm.createContext(sandbox);
  vm.runInContext(source+'\nrender=()=>{};renderDialog=()=>{}; notice=m=>notices.push(m); activeMeals=[meal]; globalThis.audit={markRecipe,store,select:()=>{selectedMeal=meal;}};',sandbox);
  return {...sandbox.audit,notices,meal,click:async(action,id,tag)=>{
    const target={dataset:{action,id,tag},closest:selector=>selector==='[data-action]'?target:null};
    await handlers.click({target});
  },submit:async(id,fields)=>handlers.submit({preventDefault:()=>{},target:{id,fields}})};
}
test('failed cookbook save leaves in-memory flags unchanged',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  await app.markRecipe('unit-1','wanted');
  assert.deepEqual(state.saved,{});
  assert.match(app.notices[0],/could not save/i);
});
test('failed flag toggle preserves the existing nested recipe entry',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  state.saved['unit-1']={meal:app.meal,wanted:true};
  await app.markRecipe('unit-1','wanted');
  assert.equal(state.saved['unit-1'].wanted,true);
});
test('removing the final collection flag keeps a scheduled recipe and its portions',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,true);
  state.saved['unit-1']={meal:app.meal,wanted:true};
  state.plan['2026-10-25']='unit-1';state.planServings['2026-10-25']=3;
  await app.markRecipe('unit-1','wanted');
  assert.equal(state.plan['2026-10-25'],'unit-1');
  assert.equal(state.saved['unit-1'].wanted,false);
  assert.equal(state.planServings['2026-10-25'],3);
});
test('failed label removal preserves labels and planned meals',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  state.saved['unit-1']={meal:app.meal,tags:['Family']};
  state.plan['2026-10-25']='unit-1';
  await app.click('remove-tag','unit-1','Family');
  assert.deepEqual(state.saved['unit-1'].tags,['Family']);
  assert.equal(state.plan['2026-10-25'],'unit-1');
});
test('reviewed purchases persist once and failed storage preserves inventory',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore();
    state.shoppingExtras=[{id:'manual-rice',name:'Rice',checked:true}];
    const app=await appWithStore(state,writes);
    await app.click('shopping-receive');
    const fields={'pick-0':'on','amount-0':'1','unit-0':'kg','location-0':'Pantry','expiry-0':''};
    await app.submit('purchase-review-form',fields);
    assert.equal(state.pantry.length,writes?1:0);
    if(writes) {
      await app.submit('purchase-review-form',fields);
      assert.equal(state.pantry.length,1,'repeat submit does not add the same purchase twice');
    } else assert.deepEqual(state.shoppingStocked,{});
  }
});
test('cooking journal, reviewed quantities, session clearing and leftovers commit together',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore(),app=await appWithStore(state,writes);
    state.pantry=[{id:'rice-lot',name:'Rice',quantity:'2',unit:'cups',expiry:''}];
    state.saved['unit-1']={meal:app.meal,wanted:true,cookedCount:0};
    state.cookingSessions['unit-1']={step:0,durationSeconds:300,remainingSeconds:300,endsAt:null};
    app.select();await app.click('cook-done','unit-1');
    await app.submit('cooking-log-form',{rating:'5',note:'Good','use-0':'on','used-0':'1.5',leftoverPortions:'1',leftoverLocation:'Fridge',leftoverReminder:''});
    assert.equal(state.pantry[0].quantity,writes?'0.5':'2');
    assert.equal(state.saved['unit-1'].cookedCount,writes?1:0);
    assert.equal(state.leftovers.length,writes?1:0);
    assert.equal(Boolean(state.cookingSessions['unit-1']),!writes);
    if(writes) {
      await app.submit('cooking-log-form',{rating:'5'});
      assert.equal(state.saved['unit-1'].cookedCount,1,'repeat completion cannot double-deduct');
    }
  }
});
test('taste form saves atomically and a failed write preserves the prior profile',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore();
    const app=await appWithStore(state,writes);
    await app.submit('taste-form',{cuisines:'Indian',avoidIngredients:'Aubergine'});
    assert.equal(state.tasteProfile.cuisines.join(','),writes?'Indian':'');
    assert.equal(state.tasteProfile.avoidIngredients.join(','),writes?'eggplant':'');
    assert.ok(app.notices.some(text=>writes?/taste.*saved/i.test(text):/could not save.*taste/i.test(text)));
  }
});
test('skipping suggestions changes only the profile and can be reversed',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore(),app=await appWithStore(state,writes);
    state.saved['unit-1']={meal:app.meal,wanted:true};
    await app.click('taste-hide','unit-1');
    assert.equal(state.tasteProfile.hiddenRecipeIds.join(','),writes?'unit-1':'');
    assert.equal(state.saved['unit-1'].wanted,true);
    if(writes) {
      await app.click('taste-show-hidden');
      assert.equal(state.tasteProfile.hiddenRecipeIds.length,0);
      assert.equal(state.saved['unit-1'].wanted,true);
    }
  }
});
