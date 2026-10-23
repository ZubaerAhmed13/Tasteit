import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../src/api.js';

async function withFetch(fetcher, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try { await run(); } finally { globalThis.fetch = original; }
}
const response = meals => ({ok:true,json:async()=>({meals})});

test('ingredient lookup rejects an outage instead of claiming there are no recipes', async()=>{
  await withFetch(async()=>{throw new Error('offline');}, async()=>{
    await assert.rejects(api.pantryCandidates([{name:'outage-rice'}]),/unavailable/i);
  });
});
test('ingredient report distinguishes a genuine empty result', async()=>{
  await withFetch(async()=>response(null), async()=>{
    assert.deepEqual(await api.pantryCandidateReport([{name:'empty-rice'}]),{meals:[],partial:false});
  });
});
test('partial ingredient failures keep usable recipes and expose incomplete results',async()=>{
  const meal={idMeal:'partial-1',strMeal:'Rice',strIngredient1:'Rice'};
  await withFetch(async input=>{
    const url=new URL(input);
    if(url.searchParams.get('i')==='partial-onion')throw new Error('offline');
    return response([meal]);
  },async()=>{
    assert.deepEqual(await api.pantryCandidateReport([{name:'partial-rice'},{name:'partial-onion'}]),
      {meals:[meal],partial:true});
  });
});
test('failed detail requests are an outage, and cancellation is never an empty result',async()=>{
  await withFetch(async input=>{
    if(new URL(input).pathname.endsWith('/lookup.php'))throw new Error('offline');
    return response([{idMeal:'detail-down',strMeal:'Unavailable'}]);
  },async()=>{
    await assert.rejects(api.pantryCandidateReport([{name:'details-outage'}]),/unavailable/i);
    const controller=new AbortController();controller.abort();
    await assert.rejects(api.pantryCandidates([{name:'cancelled-rice'}],controller.signal),{name:'AbortError'});
  });
});
test('composed discovery intersects complete filter IDs before returning summaries',async()=>{
  const area=Array.from({length:35},(_,i)=>({idMeal:String(i),strMeal:'Dish '+i}));
  const wanted=area[34];
  await withFetch(async input=>{
    const u=new URL(input);
    return response(u.searchParams.has('a')?area:[wanted]);
  },async()=>{
    const report=await api.discoverMeals({area:'Combined Area',category:'Combined Course'});
    assert.deepEqual(report,{meals:[wanted],partial:false});
  });
});
test('name, initial, cuisine and category can all restrict the same search',async()=>{
  const meals=[{idMeal:'names-1',strMeal:'Rice one'},{idMeal:'names-2',strMeal:'Apple rice'}];
  await withFetch(async()=>response(meals),async()=>{
    const report=await api.discoverMeals({query:'combined-name',letter:'R',area:'Name Area',category:'Name Course'});
    assert.deepEqual(report.meals,[meals[0]]);
  });
});
test('recipe requests have a deadline even when the service never responds',async()=>{
  // Use a short real deadline through the public request option, without sleeping.
  await withFetch((_url,{signal})=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  }),async()=>{
    await assert.rejects(api.discoverMeals({query:'deadline'},undefined,{timeoutMs:10}),/timed out/i);
  });
});
