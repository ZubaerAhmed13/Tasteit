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
    document:{getElementById:()=>({}),addEventListener:(name,handler)=>{handlers[name]=handler;}},
    window:{addEventListener:()=>{},location:{href:'https://tasteit.test/app/'}},
    console,URL,AbortController,DOMException,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,
    notices,meal};
  vm.createContext(sandbox);
  vm.runInContext(source+'\nrender=()=>{}; notice=m=>notices.push(m); activeMeals=[meal]; globalThis.audit={markRecipe,store};',sandbox);
  return {...sandbox.audit,notices,meal,click:async(action,id,tag)=>{
    const target={dataset:{action,id,tag},closest:selector=>selector==='[data-action]'?target:null};
    await handlers.click({target});
  }};
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
